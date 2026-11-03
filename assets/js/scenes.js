// Guiones de los colaboradores: qué hace cada persona en cada frame del archivo.
// Regla: el contenido siempre está visible; los cursores solo intervienen encima y luego descansan.
import {
    Actor,
    Selection,
    clearSelections,
    comment,
    easeOut,
    guide,
    inViewport,
    lerp,
    rectOf,
    sleep,
    tween,
    typeInto,
} from './cursors.js';
import { accentTouched, currentHsv, huePoint, previewHsv, restoreAccent } from './picker.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const COLLAB_KEY = 'jirafla-collab';
const rand = (min, max) => min + Math.random() * (max - min);

// ─── Hero: el momento focal ──────────────────────────────────────────────────
// El retrato llega con sus capas separadas en 3D. Andrés acomoda una capa, selecciona el nombre
// y Dev lo estira desde la manija: el ancho y el peso de Archivo cambian en vivo hasta su forma
// final y la pila se aplana. Después Andrés prueba otro color en el selector, que es real.
const NAME_FROM = { stretch: 78, weight: 450 };
const NAME_TO = { stretch: 116, weight: 820 };

function setName(name, e) {
    name.style.fontStretch = `${lerp(NAME_FROM.stretch, NAME_TO.stretch, e)}%`;
    name.style.fontWeight = String(Math.round(lerp(NAME_FROM.weight, NAME_TO.weight, e)));
}

function finishHero() {
    const name = $('.hero__name');
    $('.hero__stage').classList.remove('is-intro');
    restoreAccent();
    name.style.fontStretch = '';
    name.style.fontWeight = '';
    $('.layer-chip--swatch').style.translate = '';
    $('.layer-chip--swatch').style.rotate = '';
    document.documentElement.classList.remove('scene-hero');
}

async function heroScene({ team, t, compact }, signal) {
    const { andres, dev, pm } = team;
    const name = $('.hero__name');
    const swatch = $('.layer-chip--swatch');
    const role = $('.hero__role');
    const stage = $('.hero__stage');
    let stretched;
    const nameDone = new Promise((resolve) => (stretched = resolve));
    setName(name, 0);
    stage.classList.add('is-intro');
    document.documentElement.classList.remove('scene-hero');

    try {
        await Promise.all([
            (async () => {
                // Andrés arrastra la muestra de color a su lugar en el retrato
                if (!compact) {
                    swatch.style.translate = '-46px 54px';
                    swatch.style.rotate = '-7deg';
                    await andres.moveToEl(swatch, signal, { at: [0.3, 0.5] });
                    andres.press(true);
                    const sel = new Selection(andres.color, { size: false }).wrap(swatch, 3);
                    const start = { x: andres.x, y: andres.y };
                    await tween(560, (e) => {
                        swatch.style.translate = `${lerp(-46, 0, e)}px ${lerp(54, 0, e)}px`;
                        swatch.style.rotate = `${lerp(-7, 0, e)}deg`;
                        andres.place(start.x + lerp(0, 46, e), start.y + lerp(0, -54, e));
                        sel.wrap(swatch, 3);
                    }, signal, easeOut);
                    andres.press(false);
                    await sleep(250, signal);
                    sel.remove();
                }
                // ...y selecciona el nombre
                await andres.moveToEl(name, signal, { at: [0.2, 0.25] });
                await andres.click(signal);
                const nameSel = new Selection(andres.color).wrap(name, 6);
                name.dataset.selected = '';
                // Dev toma la manija derecha y estira el texto
                await sleep(200, signal);
                const handle = () => ({ x: nameSel.rect.x + nameSel.rect.w, y: nameSel.rect.y + nameSel.rect.h / 2 });
                await dev.moveTo(handle().x + 2, handle().y, signal);
                dev.press(true);
                await tween(1250, (e) => {
                    setName(name, e);
                    nameSel.wrap(name, 6);
                    dev.place(handle().x + 2, handle().y);
                }, signal);
                dev.press(false);
                stretched();
                stage.classList.remove('is-intro');
                await sleep(600, signal);
                nameSel.remove();
                delete name.dataset.selected;
                if (compact || accentTouched()) await andres.moveToEl(role, signal, { at: [0.15, 1.8], speed: 0.8 });
                else await tryAccent(andres, t, signal);
            })(),
            (async () => {
                // Cuando el nombre queda listo, PM comenta en el espacio libre a su derecha
                if (compact) return;
                await nameDone;
                await sleep(300, signal);
                const r = rectOf(name);
                await pm.moveTo(r.x + r.w + 26, r.y + 18, signal);
                await pm.click(signal);
                comment(pm, r.x + r.w + 30, r.y + 4, t('mp-c-hero'));
                await sleep(700, signal);
                await pm.moveTo(pm.x + 40, pm.y + 120, signal, { speed: 0.7 });
            })(),
        ]);
    } finally {
        finishHero();
    }
}

// Andrés arrastra el tono hasta el ámbar de Jirafla, lo mira y lo devuelve: invita a probarlo
async function tryAccent(andres, t, signal) {
    const [from, s, v] = currentHsv();
    const to = 42 + 360; // por el camino corto: magenta, rojo, naranja, ámbar
    const drag = async (a, b, duration) => {
        andres.press(true);
        await tween(duration, (e) => {
            const h = lerp(a, b, e) % 360;
            previewHsv([h, s, v]);
            const p = huePoint(h);
            andres.place(p.x, p.y);
        }, signal);
        andres.press(false);
    };
    const start = huePoint(from);
    await andres.moveTo(start.x, start.y, signal);
    if (accentTouched()) return;
    await drag(from, to, 1100);
    await sleep(1300, signal);
    if (accentTouched()) return;
    await drag(to, from, 900);
    restoreAccent();
    const r = rectOf($('.picker'));
    await sleep(250, signal);
    // Encima del selector y a la derecha de la cara (debajo lo taparía la barra inferior en tablet)
    comment(andres, r.x + r.w * 0.3, r.y - 10, t('mp-c-picker'), { above: true });
    await andres.moveTo(andres.x - 60, andres.y + 70, signal, { speed: 0.7 });
}

// ─── Sobre mí ────────────────────────────────────────────────────────────────
async function aboutScene({ team, t, compact }, signal) {
    const { pm, andres } = team;
    const mark = $('#about-title mark');
    const item = $$('.checklist li')[1];
    await Promise.all([
        (async () => {
            await pm.moveToEl(mark, signal, { at: [0.85, 0.85] });
            await pm.click(signal);
            const sel = new Selection(pm.color).wrap(mark, 2);
            await sleep(1600, signal).finally(() => sel.remove());
        })(),
        (async () => {
            await sleep(compact ? 1800 : 900, signal);
            const actor = compact ? pm : andres;
            await actor.moveToEl(item, signal, { at: [0, 0.5], dx: 9 });
            await actor.click(signal);
            item.classList.add('is-unchecked');
            await sleep(450, signal);
            await actor.click(signal);
            item.classList.remove('is-unchecked');
            const r = rectOf(item);
            comment(actor, r.x + Math.min(r.w, 420) + 8, r.y - 8, t('mp-c-about'));
        })().finally(() => item.classList.remove('is-unchecked')),
    ]);
}

// ─── Enfoque ─────────────────────────────────────────────────────────────────
async function focusScene({ team, t }, signal) {
    const { ia } = team;
    const sticky = $('.focus__question');
    const steps = $$('.flow li');
    // IA despega el post-it y lo deja un poco más torcido (se queda así: es un archivo vivo)
    await ia.moveToEl(sticky, signal, { at: [0.75, 0.5] });
    ia.press(true);
    sticky.classList.add('is-dragging');
    const start = { x: ia.x, y: ia.y };
    await tween(650, (e) => {
        sticky.style.translate = `${lerp(0, 14, e)}px ${lerp(0, -10, e)}px`;
        sticky.style.rotate = `${lerp(-2, 3, e)}deg`;
        ia.place(start.x + lerp(0, 14, e), start.y + lerp(0, -10, e));
    }, signal, easeOut);
    ia.press(false);
    sticky.classList.remove('is-dragging');
    // ...y recorre el flujo marcando cada paso
    for (const step of steps) {
        if (!inViewport(step, 0)) continue;
        await ia.moveToEl(step, signal, { at: [0, 0], dx: 7, dy: 12, speed: 1.6 });
        step.classList.add('is-done');
        await sleep(120, signal);
    }
    const last = steps.findLast((step) => step.classList.contains('is-done')) || steps[0];
    const r = rectOf(last);
    comment(ia, r.x + 24, r.y + r.h + 6, t('mp-c-focus'));
}

// ─── Skills ──────────────────────────────────────────────────────────────────
async function skillsScene({ team, t, compact }, signal) {
    const { dev, andres } = team;
    // Dev prueba la variante de Front: la sube un nivel, la mira y la devuelve a su sitio
    const prop = $$('.prop')[4] || $('.prop');
    const value = $('.prop__value', prop);
    const original = Number(prop.dataset.level);
    const setLevel = (n) => {
        prop.dataset.level = n;
        value.textContent = t(`level-${n}`);
    };
    await Promise.all([
        (async () => {
            const cells = $$('.prop__level i', prop);
            const up = cells[Math.min(original, cells.length - 1)];
            if (!up || !inViewport(up, 0)) return;
            try {
                await dev.moveToEl(up, signal, { at: [0.5, 0.5] });
                await dev.click(signal);
                setLevel(Math.min(original + 1, 4));
                await sleep(900, signal);
                await dev.moveToEl(cells[original - 1], signal, { at: [0.5, 0.5] });
                await dev.click(signal);
            } finally {
                setLevel(original);
            }
            const r = rectOf(value);
            comment(dev, r.x - 220, r.y + r.h + 10, t('mp-c-skills'));
        })(),
        (async () => {
            if (compact) return;
            await sleep(900, signal);
            const current = $('.version--current');
            if (!current || current.closest('[hidden]')) return;
            await andres.moveToEl(current, signal, { at: [0.6, 0.3] });
            await andres.click(signal);
            const sel = new Selection(andres.color).wrap(current, 6);
            await sleep(1800, signal).finally(() => sel.remove());
        })(),
    ]);
}

// ─── Proyectos ───────────────────────────────────────────────────────────────
async function projectsScene({ team, t, compact }, signal) {
    const { andres, pm } = team;
    const archive = $$('.archive-grid .project').filter((project) => !project.hidden);
    const featured = $$('.featured-grid .project').find((project) => !project.hidden);
    await Promise.all([
        (async () => {
            // Andrés arrastra un frame del archivo hacia su vecino, mide y lo devuelve a su sitio
            const [first, second] = archive;
            if (!first || !second) return;
            const media = $('.project__media', second);
            if (!inViewport(media, 0)) return;
            await andres.moveToEl(media, signal, { at: [0.5, 0.45] });
            await andres.click(signal);
            const sel = new Selection(andres.color).wrap(second, 4);
            andres.press(true);
            second.classList.add('is-dragging');
            const a = rectOf(first);
            const b = rectOf(second);
            const distance = b.x - a.x;
            const start = { x: andres.x, y: andres.y };
            let line;
            try {
                await tween(800, (e) => {
                    const dx = -distance * 0.55 * e;
                    second.style.translate = `${dx}px ${-8 * e}px`;
                    andres.place(start.x + dx, start.y - 8 * e);
                    sel.wrap(second, 4);
                }, signal);
                line = guide(a.x + a.w, b.y + b.h / 2 - 8, b.x - distance * 0.55);
                await sleep(700, signal);
                line.remove();
                line = null;
                await tween(600, (e) => {
                    const dx = -distance * 0.55 * (1 - e);
                    second.style.translate = `${dx}px ${-8 * (1 - e)}px`;
                    andres.place(start.x + dx, start.y - 8 * (1 - e));
                    sel.wrap(second, 4);
                }, signal, easeOut);
            } finally {
                line?.remove();
                second.style.translate = '';
                second.classList.remove('is-dragging');
                andres.press(false);
                sel.remove();
            }
        })(),
        (async () => {
            if (!featured || compact) return;
            await sleep(1200, signal);
            const title = $('.project__title', featured);
            if (!inViewport(title, 0)) return;
            await pm.moveToEl(title, signal, { at: [1, 0.5], dx: 12 });
            await pm.click(signal);
            const r = rectOf(title);
            comment(pm, Math.min(r.x + r.w + 12, r.x + 260), r.y - 10, t('mp-c-projects'));
        })(),
    ]);
}

// ─── Contacto ────────────────────────────────────────────────────────────────
async function contactScene({ team, t, compact }, signal) {
    const { andres, dev } = team;
    const prompt = $('.reply__prompt');
    const cta = $('.reply__actions .btn--primary');
    await Promise.all([
        (async () => {
            await andres.moveToEl(prompt, signal, { at: [0.05, 0.5], dx: 4 });
            await andres.click(signal);
            prompt.classList.add('is-typing');
            await typeInto(prompt, t('mp-c-contact'), andres.color, signal);
        })(),
        (async () => {
            if (compact) return;
            await sleep(1600, signal);
            await dev.moveToEl(cta, signal, { at: [0.7, 0.6] });
            cta.classList.add('is-hovered');
            await sleep(1600, signal).finally(() => cta.classList.remove('is-hovered'));
        })(),
    ]);
}

const SCENES = {
    inicio: { run: heroScene, cast: ['andres', 'dev', 'pm'], compactCast: ['andres', 'dev'] },
    'sobre-mi': { run: aboutScene, cast: ['pm', 'andres', 'dev'], compactCast: ['pm'] },
    enfoque: { run: focusScene, cast: ['ia', 'pm'], compactCast: ['ia'] },
    skills: { run: skillsScene, cast: ['dev', 'andres', 'ia'], compactCast: ['dev'] },
    proyectos: { run: projectsScene, cast: ['andres', 'pm', 'ia'], compactCast: ['andres', 'pm'] },
    contacto: { run: contactScene, cast: ['andres', 'dev'], compactCast: ['andres'] },
};

// ─── Reposo: los colaboradores siguen revisando el frame, sin prisa ──────────
async function idle(frame, actors, signal) {
    const targets = $$('h2, h3, h4, mark, img, .btn, .chip, .prop, .version, .flow li, .checklist li, dd', frame);
    await Promise.all(actors.map(async (actor, index) => {
        await sleep(1800 + index * 1300, signal);
        for (;;) {
            const visible = targets.filter((el) => inViewport(el));
            if (visible.length) {
                const el = visible[Math.floor(Math.random() * visible.length)];
                await actor.moveToEl(el, signal, { at: [rand(0.15, 0.85), rand(0.2, 0.8)], speed: 0.6 });
                if (Math.random() < 0.3) {
                    const sel = new Selection(actor.color).wrap(el, 3);
                    await sleep(1300, signal).finally(() => sel.remove());
                }
            }
            await sleep(rand(2800, 6000), signal);
        }
    }));
}

// ─── Director ────────────────────────────────────────────────────────────────
export function startCollaboration({ t, onActivity = () => {} }) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const compactQuery = matchMedia('(max-width: 767px), (pointer: coarse)');
    const toggle = $('#collab-toggle');
    const root = document.documentElement;

    const team = {
        andres: new Actor({ name: t('mp-andres'), initials: 'A', color: 'var(--cursor-andres)' }),
        pm: new Actor({ name: t('mp-pm'), initials: 'PM', color: 'var(--cursor-pm)' }),
        dev: new Actor({ name: t('mp-dev'), initials: 'D', color: 'var(--cursor-dev)' }),
        ia: new Actor({ name: t('mp-ia'), initials: t('mp-ia'), color: 'var(--cursor-ia)' }),
    };
    const played = new Set();
    let controller = null;
    let currentId = null;
    let suspended = 0;
    let enabled = !reduce.matches && storedPreference() !== 'off';

    function storedPreference() {
        try {
            return localStorage.getItem(COLLAB_KEY);
        } catch {
            return null;
        }
    }

    function stop() {
        controller?.abort();
        controller = null;
        clearSelections();
        Object.values(team).forEach((actor) => actor.leave());
    }

    async function run(id) {
        stop();
        currentId = id;
        const scene = SCENES[id];
        if (!scene || !enabled || suspended) {
            onActivity(id, []);
            return;
        }
        controller = new AbortController();
        const { signal } = controller;
        const compact = compactQuery.matches;
        const keys = compact ? scene.compactCast : scene.cast;
        const cast = keys.map((key) => team[key]);
        onActivity(id, keys);
        try {
            if (!played.has(id)) {
                played.add(id);
                if (id === 'inicio') await Promise.race([document.fonts.ready, sleep(1200)]);
                await scene.run({ team, t, compact }, signal);
            }
            await idle(document.getElementById(id), cast.slice(0, compact ? 1 : 2), signal);
        } catch (error) {
            if (error?.name !== 'AbortError') console.error(error);
        }
    }

    function render() {
        toggle.setAttribute('aria-pressed', String(!enabled));
        toggle.setAttribute('aria-label', t(enabled ? 'collab-pause' : 'collab-play'));
        toggle.title = toggle.getAttribute('aria-label');
        root.classList.toggle('collab-off', !enabled);
    }

    toggle.addEventListener('click', () => {
        enabled = !enabled;
        try {
            localStorage.setItem(COLLAB_KEY, enabled ? 'on' : 'off');
        } catch {
            // Sin almacenamiento: la preferencia vale solo para esta visita.
        }
        render();
        if (enabled) run(currentId);
        else {
            stop();
            finishHero();
            onActivity(currentId, []);
        }
    });

    reduce.addEventListener('change', () => {
        enabled = !reduce.matches && storedPreference() !== 'off';
        render();
        if (enabled) run(currentId);
        else stop();
    });

    // El frame que ocupa el centro de la pantalla es donde trabaja el equipo
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.target.id !== currentId) run(entry.target.id);
            });
        },
        { rootMargin: '-38% 0px -38% 0px' }
    );
    $$('main > .frame').forEach((frame) => observer.observe(frame));

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else run(currentId);
    });

    render();
    if (!enabled) finishHero();

    return {
        relabel() {
            team.andres.setName(t('mp-andres'));
            team.pm.setName(t('mp-pm'));
            team.dev.setName(t('mp-dev'));
            team.ia.setName(t('mp-ia'));
            team.ia.initials = t('mp-ia');
            render();
        },
        // Mientras la hoja de un proyecto está abierta, el equipo espera
        suspend() {
            suspended += 1;
            stop();
        },
        resume() {
            suspended = Math.max(0, suspended - 1);
            if (!suspended) run(currentId);
        },
    };
}

// ─── El visitante también es colaborador ─────────────────────────────────────
export function visitorCursor({ t }) {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // En táctil: un "ping" con tu nombre donde tocas el lienzo
        document.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'touch' || event.target.closest('a, button, dialog, .layers-fab, .topbar')) return;
            const ping = document.createElement('div');
            ping.className = 'mp-ping';
            ping.style.translate = `${event.pageX}px ${event.pageY}px`;
            ping.innerHTML = `<span>${t('mp-you')}</span>`;
            document.querySelector('.multiplayer').append(ping);
            setTimeout(() => ping.remove(), 1200);
        }, { passive: true });
        return { relabel() {} };
    }
    const tag = document.createElement('div');
    tag.className = 'mp-you';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = t('mp-you');
    document.body.append(tag);
    let raf = 0;
    let x = 0;
    let y = 0;
    document.addEventListener('pointermove', (event) => {
        x = event.clientX;
        y = event.clientY;
        tag.classList.add('is-visible');
        if (!raf) {
            raf = requestAnimationFrame(() => {
                raf = 0;
                tag.style.translate = `${x + 16}px ${y + 20}px`;
            });
        }
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => tag.classList.remove('is-visible'));
    return {
        relabel() {
            tag.textContent = t('mp-you');
        },
    };
}
