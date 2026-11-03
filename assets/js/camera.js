// Saltos de cámara: al elegir una capa o un enlace interno, el lienzo se aleja, viaja y vuelve a
// acercarse sobre el destino, como "zoom to frame" en Figma. Al llegar, el destino queda seleccionado.
// Con movimiento reducido el salto es directo.

const $ = (selector, root = document) => root.querySelector(selector);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const canvas = $('.canvas');
let flight = null;
let landed = null;
let landedTimer = 0;

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const nextFrame = () => new Promise(requestAnimationFrame);

// Dónde queda el destino, respetando el espacio de la barra superior
function destinationOf(target) {
    const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const max = root.scrollHeight - innerHeight;
    return Math.round(Math.max(0, Math.min(max, target.getBoundingClientRect().top + scrollY - pad)));
}

// Lo que se selecciona al llegar: el cuerpo del frame, o la tarjeta del proyecto
function selectionOf(target) {
    return $(':scope > .frame__body', target) || target;
}

function land(target, hash) {
    history.replaceState(null, '', hash);
    if (!target.matches('a, button, input, [tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    // El marco de selección es del lienzo, no de los colaboradores: se ve aunque estén en pausa
    landed?.classList.remove('is-landed');
    clearTimeout(landedTimer);
    landed = selectionOf(target);
    landed.classList.add('is-landed');
    landedTimer = setTimeout(() => landed?.classList.remove('is-landed'), 1600);
}

export async function flyTo(target, hash = `#${target.id}`) {
    flight?.cancel();
    // Un proyecto oculto por el filtro vuelve a mostrarse antes de viajar hasta él
    if (target.closest('[hidden]')) {
        $('[data-filter="all"]')?.click();
        await nextFrame();
    }
    const from = scrollY;
    const to = destinationOf(target);
    const distance = Math.abs(to - from);
    if (reduce.matches || distance < 8) {
        root.style.scrollBehavior = 'auto';
        scrollTo(0, to);
        root.style.scrollBehavior = '';
        return land(target, hash);
    }

    const screens = distance / innerHeight;
    const depth = Math.min(0.14, 0.05 + screens * 0.012); // cuánto se aleja la cámara
    const duration = Math.min(1100, 480 + screens * 70);
    const me = { cancelled: false, cancel() { this.cancelled = true; } };
    flight = me;
    const stop = () => me.cancel();
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    events.forEach((type) => addEventListener(type, stop, { passive: true }));
    root.style.scrollBehavior = 'auto';
    root.classList.add('is-flying');

    const start = performance.now();
    let p = 0;
    while (p < 1 && !me.cancelled) {
        await nextFrame();
        p = Math.min(1, (performance.now() - start) / duration);
        const y = from + (to - from) * easeInOut(p);
        scrollTo(0, y);
        // Arco: se aleja en la primera mitad y se acerca en la segunda, con el centro de la pantalla fijo
        canvas.style.transformOrigin = `50% ${y + innerHeight / 2 - canvas.offsetTop}px`;
        canvas.style.scale = String(1 - depth * Math.sin(Math.PI * p));
    }

    events.forEach((type) => removeEventListener(type, stop));
    canvas.style.scale = '';
    canvas.style.transformOrigin = '';
    root.style.scrollBehavior = '';
    root.classList.remove('is-flying');
    if (flight === me) flight = null;
    if (!me.cancelled) land(target, hash);
}

// Todos los enlaces internos viajan con la cámara; el de saltar al contenido sigue siendo directo
export function initCamera() {
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href^="#"]:not(.skip-link)');
        const hash = link?.getAttribute('href');
        if (!hash || hash === '#') return;
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (!target || target.closest('dialog')) return;
        event.preventDefault();
        flyTo(target, hash);
    });
}
