// Chrome del archivo: panel de capas, inspector con valores reales, medidas de frames y capas en móvil.
import { flyTo } from './camera.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const PANELS_KEY = 'jirafla-panels';
const FRAME_KEYS = {
    inicio: 'nav-home',
    'sobre-mi': 'nav-about',
    enfoque: 'nav-focus',
    skills: 'nav-skills',
    proyectos: 'nav-projects',
    contacto: 'nav-contact',
};
const TEAM = [
    { key: 'andres', name: 'mp-andres', initials: 'A', color: 'var(--cursor-andres)' },
    { key: 'pm', name: 'mp-pm', initials: 'PM', color: 'var(--cursor-pm)' },
    { key: 'dev', name: 'mp-dev', initials: 'D', color: 'var(--cursor-dev)' },
    { key: 'ia', name: 'mp-ia', initials: null, color: 'var(--cursor-ia)' },
];

// Cualquier color CSS (incluido oklch) a #RRGGBB, pintándolo en un píxel
const swatchCanvas = document.createElement('canvas');
swatchCanvas.width = swatchCanvas.height = 1;
const swatchCtx = swatchCanvas.getContext('2d', { willReadFrequently: true });
function toHex(color) {
    swatchCtx.clearRect(0, 0, 1, 1);
    swatchCtx.fillStyle = color;
    swatchCtx.fillRect(0, 0, 1, 1);
    const [r, g, b] = swatchCtx.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function storedPanels() {
    try {
        return localStorage.getItem(PANELS_KEY);
    } catch {
        return null;
    }
}

export function initChrome({ t }) {
    const root = document.documentElement;
    const inspector = $('.inspector');
    const sizes = new Map();
    let currentId = 'inicio';
    let castFrame = null;
    let cast = [];

    const frameName = (id) => t(FRAME_KEYS[id] || 'nav-home');
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    // ─── Medidas en vivo en la etiqueta de cada frame ────────────────────────
    const resize = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
            const frame = entry.target.closest('.frame');
            const box = entry.borderBoxSize?.[0];
            const w = Math.round(box ? box.inlineSize : entry.target.offsetWidth);
            const h = Math.round(box ? box.blockSize : entry.target.offsetHeight);
            sizes.set(frame.id, { w, h });
            $('.frame__size', frame).textContent = `${w} × ${h}`;
            if (frame.id === currentId) renderInspector();
        });
    });
    $$('main > .frame > .frame__body').forEach((body) => resize.observe(body));

    // ─── Inspector ───────────────────────────────────────────────────────────
    // Es position: fixed, así que offsetParent no sirve para saber si se ve
    const inspectorShown = () => Boolean(inspector?.getClientRects().length);

    function renderText() {
        const frame = document.getElementById(currentId);
        const text = $('h1, .section-title, .comment__text', frame);
        if (!text) return;
        const style = getComputedStyle(text);
        set('insp-size', `${Math.round(parseFloat(style.fontSize))} px`);
        set('insp-weight', style.fontWeight);
        set('insp-stretch', style.fontStretch);
    }

    function renderInspector() {
        if (!inspectorShown()) return;
        const frame = document.getElementById(currentId);
        const body = $('.frame__body', frame);
        const main = $('main');
        const size = sizes.get(currentId) || { w: body.offsetWidth, h: body.offsetHeight };
        const style = getComputedStyle(body);
        set('insp-frame', frameName(currentId));
        set('insp-w', size.w);
        set('insp-h', size.h);
        set('insp-x', Math.round(body.getBoundingClientRect().left - main.getBoundingClientRect().left));
        set('insp-y', Math.round(body.offsetTop - main.offsetTop));
        set('insp-gap', Math.round(parseFloat(style.rowGap) || 0));
        set('insp-pad', Math.round(parseFloat(style.paddingTop)));
        set('insp-fill', toHex(style.backgroundColor));
        $('#insp-swatch').style.background = style.backgroundColor;
        renderText();
    }

    // El nombre del hero cambia de ancho y peso mientras los cursores lo editan
    const name = $('.hero__name');
    if (name) {
        new MutationObserver(() => {
            if (currentId === 'inicio' && inspectorShown()) renderText();
        }).observe(name, { attributes: true, attributeFilter: ['style'] });
    }

    // ─── Quién está en el archivo ────────────────────────────────────────────
    function renderTeam() {
        const list = $('#insp-team');
        if (!list) return;
        list.replaceChildren();
        const off = root.classList.contains('collab-off');
        TEAM.forEach((member) => {
            const here = !off && castFrame && cast.includes(member.key);
            const status = off
                ? t('insp-paused')
                : here
                    ? t('insp-in').replace('{frame}', frameName(castFrame))
                    : t('insp-elsewhere');
            list.append(teamRow(member.initials || t(member.name), member.color, t(member.name), status, here));
        });
        list.append(teamRow(t('mp-you').slice(0, 2), 'var(--cursor-you)', t('mp-you'), t('insp-viewing').replace('{frame}', frameName(currentId)), true));
    }

    function teamRow(initials, color, label, status, active) {
        const li = document.createElement('li');
        li.classList.toggle('is-active', active);
        li.innerHTML = '<span class="insp__avatar"></span><span class="insp__who"><b></b><span></span></span>';
        const avatar = $('.insp__avatar', li);
        avatar.style.setProperty('--c', color);
        avatar.textContent = initials;
        $('b', li).textContent = label;
        $('.insp__who span', li).textContent = status;
        return li;
    }

    // Avatares junto al frame donde está trabajando cada quien
    function renderAvatars() {
        $$('.layer__avatars').forEach((el) => el.replaceChildren());
        if (!castFrame || root.classList.contains('collab-off')) return;
        $$(`.layer-group[data-frame="${castFrame}"] > .layer .layer__avatars`).forEach((el) => {
            TEAM.filter((member) => cast.includes(member.key)).forEach((member) => {
                const dot = document.createElement('span');
                dot.style.setProperty('--c', member.color);
                dot.textContent = member.initials || t(member.name);
                el.append(dot);
            });
        });
    }

    // ─── Frame actual ────────────────────────────────────────────────────────
    function setFrame(id) {
        if (!FRAME_KEYS[id]) return;
        currentId = id;
        const crumb = $('#current-frame');
        crumb.dataset.i18n = FRAME_KEYS[id];
        crumb.textContent = frameName(id);
        $$('.layer-group').forEach((group) => group.classList.toggle('is-open', group.dataset.frame === id));
        renderInspector();
        renderTeam();
    }

    function setActivity(frameId, keys) {
        castFrame = frameId;
        cast = keys;
        renderAvatars();
        renderTeam();
    }

    // ─── Mostrar u ocultar paneles (Ctrl + \, como en Figma) ─────────────────
    const panelsToggle = $('#panels-toggle');
    function renderPanels(hidden) {
        root.classList.toggle('panels-hidden', hidden);
        panelsToggle.setAttribute('aria-pressed', String(hidden));
        panelsToggle.setAttribute('aria-label', t(hidden ? 'panels-show' : 'panels-hide'));
        panelsToggle.title = `${panelsToggle.getAttribute('aria-label')} (Ctrl + \\)`;
        requestAnimationFrame(renderInspector);
    }
    function togglePanels() {
        const hidden = !root.classList.contains('panels-hidden');
        try {
            localStorage.setItem(PANELS_KEY, hidden ? 'hidden' : 'shown');
        } catch {
            // Sin almacenamiento: vale solo para esta visita.
        }
        renderPanels(hidden);
    }
    panelsToggle.addEventListener('click', togglePanels);
    document.addEventListener('keydown', (event) => {
        if (event.key === '\\' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            togglePanels();
        }
    });
    renderPanels(storedPanels() === 'hidden');

    // ─── Capas en móvil ──────────────────────────────────────────────────────
    const sheet = $('#layers-sheet');
    const tree = $('.layers-sheet__tree', sheet);
    $('#layers-open').addEventListener('click', () => {
        tree.replaceChildren($('.layers__tree > ul').cloneNode(true));
        sheet.showModal();
        root.classList.add('sheet-open');
        $('[aria-current="true"]', tree)?.focus();
    });
    tree.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        event.preventDefault();
        sheet.close();
        root.classList.remove('sheet-open');
        const target = document.querySelector(link.getAttribute('href'));
        if (target) flyTo(target, link.getAttribute('href'));
    });
    $('.sheet__close', sheet).addEventListener('click', () => sheet.close());
    sheet.addEventListener('click', (event) => {
        if (event.target === sheet) sheet.close();
    });
    sheet.addEventListener('close', () => root.classList.remove('sheet-open'));

    addEventListener('resize', () => renderInspector(), { passive: true });

    return {
        setFrame,
        setActivity,
        relabel() {
            $('#current-frame').textContent = frameName(currentId);
            renderPanels(root.classList.contains('panels-hidden'));
            renderInspector();
            renderTeam();
            renderAvatars();
        },
    };
}
