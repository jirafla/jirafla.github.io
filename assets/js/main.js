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

const visibleProjects = () => projects.filter((project) => !project.hidden);

chips.forEach((chip) => {
    chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
        projects.forEach((project) => {
            project.hidden = filter !== 'all' && project.dataset.company !== filter;
        });
        groups.forEach((group) => {
            group.hidden = !$$('.project', group).some((project) => !project.hidden);
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

    $('.sheet__company', sheet).textContent = $('.project__company', project).textContent;
    $('.sheet__title', sheet).textContent = title;
    $('.sheet__desc', sheet).textContent = $('.project__details p', project).textContent;
    sheetImg.src = largest;
    sheetImg.alt = title;
    sheetLink.hidden = !detailsLink;
    if (detailsLink) sheetLink.href = detailsLink.href;
}

function openSheet(project) {
    current = visibleProjects().indexOf(project);
    fillSheet(project);
    if (!sheet.open) {
        sheet.showModal();
        document.documentElement.classList.add('sheet-open');
        history.pushState({ sheet: true }, '');
        collab?.suspend();
    }
    $('.sheet__inner', sheet).scrollTop = 0;
}

function stepSheet(step) {
    const list = visibleProjects();
    current = (current + step + list.length) % list.length;
    fillSheet(list[current]);
    $('.sheet__inner', sheet).scrollTop = 0;
}

projects.forEach((project) => {
    $('.project__open', project).addEventListener('click', () => openSheet(project));
});

$('.sheet__close', sheet).addEventListener('click', () => sheet.close());
$$('[data-step]', sheet).forEach((button) => {
    button.addEventListener('click', () => stepSheet(Number(button.dataset.step)));
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

function selectTab(tab) {
    tabs.forEach((other) => {
        const selected = other === tab;
        other.setAttribute('aria-selected', String(selected));
        other.tabIndex = selected ? 0 : -1;
        document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
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
selectTab(tabs[0]);

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
