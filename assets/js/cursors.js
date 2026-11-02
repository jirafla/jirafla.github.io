// Motor de punteros colaborativos: cursores con nombre que se mueven, seleccionan, arrastran, tipean y comentan.
// Todo vive en una capa decorativa (aria-hidden) en coordenadas de documento, así acompaña al scroll sin recalcular.

export const layer = document.createElement('div');
layer.className = 'multiplayer';
layer.setAttribute('aria-hidden', 'true');
document.body.append(layer);

const live = new Set();

export function abortError() {
    return new DOMException('Escena cancelada', 'AbortError');
}

export const sleep = (ms, signal) =>
    new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const id = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(id);
            reject(abortError());
        }, { once: true });
    });

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 4);
export const lerp = (a, b, t) => a + (b - a) * t;

export function tween(duration, onFrame, signal, ease = easeInOut) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const start = performance.now();
        let raf = 0;
        const abort = () => {
            cancelAnimationFrame(raf);
            reject(abortError());
        };
        signal?.addEventListener('abort', abort, { once: true });
        const frame = (now) => {
            const t = Math.min(1, (now - start) / duration);
            onFrame(ease(t), t);
            if (t < 1) {
                raf = requestAnimationFrame(frame);
            } else {
                signal?.removeEventListener('abort', abort);
                resolve();
            }
        };
        raf = requestAnimationFrame(frame);
    });
}

/** Rectángulo del elemento en coordenadas de documento. */
export function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
}

export function inViewport(el, margin = 40) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > margin + 60 && r.top < innerHeight - margin - 70 && r.right > 0 && r.left < innerWidth;
}

// ─── Cursor ──────────────────────────────────────────────────────────────────
export class Actor {
    constructor({ name, initials, color, scale = 1 }) {
        this.color = color;
        this.initials = initials;
        this.el = document.createElement('div');
        this.el.className = 'mp-cursor';
        this.el.style.setProperty('--c', color);
        this.el.style.setProperty('--s', scale);
        this.el.innerHTML =
            '<svg viewBox="0 0 18 22"><path d="M2 1.5v16.2l4.3-3.9 2.9 6.6 2.7-1.2-2.8-6.4h5.9Z"/></svg>' +
            '<span class="mp-cursor__label"></span>';
        this.label = this.el.querySelector('.mp-cursor__label');
        this.setName(name);
        this.x = -200;
        this.y = -200;
        this.onScreen = false;
        layer.append(this.el);
    }

    setName(name) {
        this.name = name;
        this.label.textContent = name;
    }

    place(x, y) {
        this.x = x;
        this.y = y;
        this.el.style.translate = `${x}px ${y}px`;
    }

    enter(nearX, nearY) {
        const fromLeft = nearX < scrollX + innerWidth / 2;
        const y = Math.min(Math.max(nearY + (Math.random() * 200 - 100), scrollY + 90), scrollY + innerHeight - 110);
        this.place(fromLeft ? scrollX - 40 : scrollX + innerWidth + 20, y);
        this.onScreen = true;
        this.el.classList.add('is-visible');
    }

    leave() {
        this.onScreen = false;
        this.el.classList.remove('is-visible', 'is-pressing');
    }

    isOffscreen() {
        return (
            !this.onScreen ||
            this.y < scrollY - 60 ||
            this.y > scrollY + innerHeight + 60 ||
            this.x < scrollX - 60 ||
            this.x > scrollX + innerWidth + 60
        );
    }

    async moveTo(x, y, signal, { speed = 1 } = {}) {
        if (this.isOffscreen()) this.enter(x, y);
        const x0 = this.x;
        const y0 = this.y;
        const dx = x - x0;
        const dy = y - y0;
        const dist = Math.hypot(dx, dy) || 1;
        const duration = Math.min(1500, 360 + dist * 0.75) / speed;
        // Curva suave, como una mano real: el punto de control se aparta de la recta
        const bend = (Math.random() - 0.5) * 0.4 * dist;
        const cx = x0 + dx / 2 - (dy / dist) * bend;
        const cy = y0 + dy / 2 + (dx / dist) * bend;
        await tween(duration, (e) => {
            const u = 1 - e;
            this.place(u * u * x0 + 2 * u * e * cx + e * e * x, u * u * y0 + 2 * u * e * cy + e * e * y);
        }, signal);
    }

    moveToEl(el, signal, { at = [0.5, 0.5], dx = 0, dy = 0, speed } = {}) {
        const r = rectOf(el);
        return this.moveTo(r.x + r.w * at[0] + dx, r.y + r.h * at[1] + dy, signal, { speed });
    }

    press(down) {
        this.el.classList.toggle('is-pressing', down);
    }

    async click(signal) {
        this.press(true);
        await sleep(150, signal);
        this.press(false);
    }
}

// ─── Selección con manijas y medidas ─────────────────────────────────────────
export class Selection {
    constructor(color, { size = true } = {}) {
        this.el = document.createElement('div');
        this.el.className = 'mp-select';
        this.el.style.setProperty('--c', color);
        this.el.innerHTML = '<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><i class="mr"></i>' +
            (size ? '<span class="mp-select__size"></span>' : '');
        this.size = this.el.querySelector('.mp-select__size');
        layer.append(this.el);
        live.add(this);
    }

    wrap(target, pad = 4) {
        const r = rectOf(target);
        this.rect = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
        this.el.style.translate = `${this.rect.x}px ${this.rect.y}px`;
        this.el.style.width = `${this.rect.w}px`;
        this.el.style.height = `${this.rect.h}px`;
        if (this.size) this.size.textContent = `${Math.round(r.w)} × ${Math.round(r.h)}`;
        this.el.classList.add('is-visible');
        return this;
    }

    remove() {
        live.delete(this);
        this.el.classList.remove('is-visible');
        setTimeout(() => this.el.remove(), 250);
    }
}

export function clearSelections() {
    live.forEach((selection) => selection.remove());
}

// ─── Comentario con avatar ───────────────────────────────────────────────────
export function comment(actor, x, y, text, { ttl = 5200 } = {}) {
    const el = document.createElement('div');
    el.className = 'mp-comment';
    el.style.setProperty('--c', actor.color);
    el.style.translate = `${x}px ${y}px`;
    el.innerHTML = '<span class="mp-comment__avatar"></span><p class="mp-comment__bubble"><b></b><span></span></p>';
    el.querySelector('.mp-comment__avatar').textContent = actor.initials;
    el.querySelector('b').textContent = actor.name;
    el.querySelector('span:last-child').textContent = text;
    // Que no se salga por la derecha
    layer.append(el);
    const overflow = x + el.offsetWidth - (scrollX + document.documentElement.clientWidth - 12);
    if (overflow > 0) el.style.translate = `${x - overflow}px ${y}px`;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
        el.classList.remove('is-visible');
        setTimeout(() => el.remove(), 300);
    }, ttl);
    return el;
}

// ─── Guía de distancia (las líneas rojas de Figma) ───────────────────────────
export function guide(x1, y, x2) {
    const el = document.createElement('div');
    el.className = 'mp-guide';
    el.style.translate = `${Math.min(x1, x2)}px ${y}px`;
    el.style.width = `${Math.abs(x2 - x1)}px`;
    el.innerHTML = `<span>${Math.round(Math.abs(x2 - x1))}</span>`;
    layer.append(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    return {
        remove() {
            el.classList.remove('is-visible');
            setTimeout(() => el.remove(), 250);
        },
    };
}

// ─── Tipear dentro de un elemento ────────────────────────────────────────────
export async function typeInto(el, text, color, signal, { cps = 22 } = {}) {
    const caret = document.createElement('span');
    caret.className = 'mp-caret';
    caret.style.setProperty('--c', color);
    el.textContent = '';
    el.append(caret);
    try {
        for (const char of text) {
            caret.before(char);
            await sleep(1000 / cps + Math.random() * 45, signal);
        }
        await sleep(900, signal);
    } finally {
        caret.remove();
    }
}
