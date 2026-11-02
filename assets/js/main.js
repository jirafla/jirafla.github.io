import { translations } from './i18n.js';
import { initChrome } from './chrome.js';
import { heroDepth, startCollaboration, visitorCursor } from './scenes.js';

const LANG_KEY = 'jirafla-lang';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// ─── Idioma ──────────────────────────────────────────────────────────────────
let lang = 'es';
let collab = null;
let you = null;
let chrome = null;

function storedLang() {
    try {
        return localStorage.getItem(LANG_KEY);
    } catch {
        return null;
    }
}

function preferredLang() {
    const saved = storedLang();
    if (saved === 'es' || saved === 'en') return saved;
    const browser = (navigator.languages || [navigator.language]).find(Boolean) || 'es';
    return browser.toLowerCase().startsWith('es') ? 'es' : 'en';
}

const firstSentence = (text) => text.split(/(?<=\.)\s/)[0];

function t(key) {
    return translations[lang][key] ?? translations.es[key] ?? '';
}

function applyTranslations(next) {
    lang = next;
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => {
        const value = t(el.dataset.i18n);
        if (value) el.textContent = value;
    });
    $$('[data-i18n-html]').forEach((el) => {
        const value = t(el.dataset.i18nHtml);
        if (value) el.innerHTML = value;
    });
    $$('[data-i18n-first]').forEach((el) => {
        const value = t(el.dataset.i18nFirst);
        if (value) el.textContent = firstSentence(value);
    });
    $$('[data-i18n-attr]').forEach((el) => {
        el.dataset.i18nAttr.split(';').forEach((pair) => {
            const [attr, key] = pair.split(':');
            const value = t(key);
            if (value) el.setAttribute(attr, value);
        });
    });
    if (sheet.open) fillSheet(visibleProjects()[current]);
    collab?.relabel();
    you?.relabel();
    chrome?.relabel();
}

$('#lang-toggle').addEventListener('click', () => {
    applyTranslations(lang === 'es' ? 'en' : 'es');
    try {
        localStorage.setItem(LANG_KEY, lang);
    } catch {
        // Sin almacenamiento (modo privado): el cambio vale solo para esta visita.
    }
});

// ─── Filtros de proyectos ────────────────────────────────────────────────────
const chips = $$('.chip');
const projects = $$('.project');
const groups = $$('.project-group');
const filterStatus = $('#filter-status');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const visibleProjects = () => projects.filter((project) => !project.hidden);

// FLIP: cada frame se desliza desde donde estaba, como un auto layout que se reacomoda
function flip(mutate) {
    if (reduceMotion.matches) return mutate();
    const before = new Map(visibleProjects().map((project) => [project, project.getBoundingClientRect()]));
    mutate();
    visibleProjects().forEach((project, index) => {
        const from = before.get(project);
        const to = project.getBoundingClientRect();
        const dx = from ? from.left - to.left : 0;
        const dy = from ? from.top - to.top : 0;
        if (from && Math.abs(dy) < 600) {
            if (dx || dy) project.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 480, easing: EASE });
        } else {
            project.animate(
                [{ opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1 }],
                { duration: 360, easing: EASE, delay: Math.min(index, 8) * 30, fill: 'backwards' }
            );
        }
    });
}

chips.forEach((chip) => {
    chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
        flip(() => {
            projects.forEach((project) => {
                project.hidden = filter !== 'all' && project.dataset.company !== filter;
            });
            groups.forEach((group) => {
                group.hidden = !$$('.project', group).some((project) => !project.hidden);
            });
        });
        const count = visibleProjects().length;
        filterStatus.textContent = count === 1 ? t('filter-status-one') : t('filter-status').replace('{n}', count);
    });
});

// ─── Detalle de proyecto ─────────────────────────────────────────────────────
const sheet = $('#project-sheet');
const sheetImg = $('.sheet__media', sheet);
const sheetLink = $('.sheet__link', sheet);
let current = 0;

function fillSheet(project) {
    const title = $('.project__open', project).textContent;
    const detailsLink = $('.project__details a', project);
    const media = $('.project__media', project);
    const largest = media.srcset.split(',').pop().trim().split(' ')[0];

    const tags = $('.project__tags', project);
    const sheetTags = $('.sheet__tags', sheet);
    const list = visibleProjects();

    $('.sheet__company', sheet).textContent = $('.project__company', project).textContent;
    $('.sheet__count', sheet).textContent = `${list.indexOf(project) + 1} / ${list.length}`;
    $('.sheet__title', sheet).textContent = title;
    $('.sheet__desc', sheet).textContent = $('.project__details p', project).textContent;
    sheetTags.replaceChildren(...(tags ? [...tags.children].map((tag) => tag.cloneNode(true)) : []));
    sheetTags.hidden = !tags;
    // Primero la imagen que ya está cargada (la transición la necesita); luego la versión grande
    sheetImg.src = media.currentSrc || largest;
    sheetImg.alt = title;
    const sharp = new Image();
    sharp.onload = () => {
        if (sheetImg.alt === title) sheetImg.src = sharp.src;
    };
    sharp.src = largest;
    sheetLink.hidden = !detailsLink;
    if (detailsLink) sheetLink.href = detailsLink.href;
}

function openSheet(project) {
    current = visibleProjects().indexOf(project);
    const show = () => {
        fillSheet(project);
        if (!sheet.open) {
            sheet.showModal();
            document.documentElement.classList.add('sheet-open');
            history.pushState({ sheet: true }, '');
            collab?.suspend();
        }
        $('.sheet__inner', sheet).scrollTop = 0;
    };
    if (reduceMotion.matches || sheet.open) return show();

    // La imagen de la tarjeta "viaja" hasta la hoja mientras el panel aparece
    const media = $('.project__media', project);
    const from = media.getBoundingClientRect();
    const root = document.documentElement;
    root.classList.add('vt-sheet');
    show();
    const to = sheetImg.getBoundingClientRect();
    const morph = sheetImg.animate(
        [
            { transformOrigin: '0 0', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` },
            { transformOrigin: '0 0', transform: 'none' },
        ],
        { duration: 520, easing: EASE }
    );
    sheet.animate([{ backgroundColor: 'transparent', borderColor: 'transparent' }, {}], { duration: 360, easing: EASE });
    $$('.sheet__inner > :not(.sheet__media)', sheet).forEach((el) => {
        el.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 360, delay: 160, easing: EASE, fill: 'backwards' });
    });
    morph.finished.finally(() => root.classList.remove('vt-sheet'));
}

function stepSheet(step) {
    const list = visibleProjects();
    current = (current + step + list.length) % list.length;
    fillSheet(list[current]);
    const inner = $('.sheet__inner', sheet);
    inner.scrollTop = 0;
    if (!reduceMotion.matches) {
        inner.animate([{ opacity: 0.25, translate: `${step * 18}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 280, easing: EASE });
    }
}

projects.forEach((project) => {
    $('.project__open', project).addEventListener('click', () => openSheet(project));
});

$('.sheet__close', sheet).addEventListener('click', () => sheet.close());
$$('[data-step]', sheet).forEach((button) => {
    button.addEventListener('click', () => stepSheet(Number(button.dataset.step)));
});

// Flechas del teclado: proyecto anterior / siguiente
sheet.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') stepSheet(1);
    if (event.key === 'ArrowLeft') stepSheet(-1);
});

// Clic en el fondo oscuro: cerrar
sheet.addEventListener('click', (event) => {
    if (event.target !== sheet) return;
    const box = sheet.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) sheet.close();
});

sheet.addEventListener('close', () => {
    document.documentElement.classList.remove('sheet-open');
    if (history.state?.sheet) history.back();
    collab?.resume();
});

// Botón "Atrás" del teléfono: cierra la hoja en vez de salir del sitio
window.addEventListener('popstate', () => {
    if (sheet.open) sheet.close();
});

// ─── Pestañas del historial ──────────────────────────────────────────────────
const tabs = $$('.tab');

function selectTab(tab, animate = true) {
    tabs.forEach((other) => {
        const selected = other === tab;
        const panel = document.getElementById(other.getAttribute('aria-controls'));
        const wasHidden = panel.hidden;
        other.setAttribute('aria-selected', String(selected));
        other.tabIndex = selected ? 0 : -1;
        panel.hidden = !selected;
        if (selected && wasHidden && animate && !reduceMotion.matches) {
            panel.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 240, easing: EASE });
        }
    });
}

tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        selectTab(next);
        next.focus();
    });
});
selectTab(tabs[0], false);

// ─── Copiar datos de contacto, con aviso al estilo Figma ─────────────────────
const toast = $('#toast');
let toastTimer = 0;

function showToast(message, ok = true) {
    toast.innerHTML = ok
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
        : '';
    toast.append(message);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

$$('.copy-btn').forEach((button) => {
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(button.dataset.copy);
            showToast(t(button.dataset.toast));
        } catch {
            showToast(t('toast-error'), false);
        }
    });
});

// ─── Sección actual en la navegación ─────────────────────────────────────────
const navLinks = $$('.topbar__nav a, .toolbar a, .layers .layer--frame');
const spy = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const hash = `#${entry.target.id}`;
            chrome?.setFrame(entry.target.id);
            navLinks.forEach((link) => {
                if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
        });
    },
    { rootMargin: '-40% 0px -55% 0px' }
);
$$('main > .frame').forEach((frame) => spy.observe(frame));

chrome = initChrome({ t });
if (preferredLang() !== 'es') applyTranslations(preferredLang());

// ─── El archivo cobra vida: colaboradores, cursor propio y profundidad ───────
collab = startCollaboration({ t, onActivity: (id, keys) => chrome.setActivity(id, keys) });
you = visitorCursor({ t });
heroDepth();
