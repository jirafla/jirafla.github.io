// Selector de color real del hero: el visitante cambia el acento de todo el sitio.
// El color elegido pinta tal cual el círculo y la muestra. El acento toma su tono, su croma y su
// luminosidad, pero nunca más oscuro que el de la marca: así el texto oscuro sobre el acento y el
// acento sobre el lienzo conservan, como mínimo, el contraste del diseño original (AAA).
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const KEY = 'jirafla-accent';
export const ORIGINAL = '#7931D7';
const BRAND = { l: 0.72, maxL: 0.86, hoverL: 0.06, hoverC: 0.88, h: 296, c: 0.17 }; // como en tokens.css
const ON_BRAND = { l: 0.17, c: 0.04 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// ─── Conversión de color ─────────────────────────────────────────────────────
function hexToRgb(hex) {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!match) return null;
    const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
}

const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

function hsvToRgb([h, s, v]) {
    const f = (n) => {
        const k = (n + h / 60) % 6;
        return 255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)));
    };
    return [f(5), f(3), f(1)];
}

function rgbToHsv(rgb) {
    const [r, g, b] = rgb.map((v) => v / 255);
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    let h = 0;
    if (d) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
    }
    return [h, max ? d / max : 0, max];
}

// sRGB ↔ OKLCH (Björn Ottosson, "A perceptual color space for image processing")
const toLinear = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklch(rgb) {
    const [r, g, b] = rgb.map(toLinear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function oklchToLinear([L, C, H]) {
    const a = C * Math.cos((H * Math.PI) / 180);
    const b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
}

const oklchToRgb = (lch) => oklchToLinear(lch).map((c) => fromLinear(clamp(c, 0, 1)));

// El croma más alto que cabe en sRGB para una luminosidad y un tono
function maxChroma(L, H) {
    let lo = 0;
    let hi = 0.37;
    for (let i = 0; i < 16; i += 1) {
        const mid = (lo + hi) / 2;
        if (oklchToLinear([L, mid, H]).every((c) => c >= -0.0005 && c <= 1.0005)) lo = mid;
        else hi = mid;
    }
    return lo;
}

const luminance = (rgb) => {
    const [r, g, b] = rgb.map(toLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

// Del color elegido al acento del sitio
function accentFrom(hex) {
    let { l, h, c } = BRAND;
    if (hex !== ORIGINAL) {
        const [L, C, H] = rgbToOklch(hexToRgb(hex));
        if (C > 0.02) h = H;
        l = clamp(L, BRAND.l, BRAND.maxL);
        c = Math.min(C, maxChroma(l, h), maxChroma(l + BRAND.hoverL, h) / BRAND.hoverC);
    }
    const onBrand = oklchToRgb([ON_BRAND.l, Math.min(ON_BRAND.c, maxChroma(ON_BRAND.l, h)), h]);
    return {
        hex,
        l: Number(l.toFixed(3)),
        h: Number(h.toFixed(1)),
        c: Number(c.toFixed(3)),
        ratio: contrast(oklchToRgb([l, c, h]), onBrand),
    };
}

// ─── Estado compartido (también lo usan los colaboradores del hero) ──────────
const root = document.documentElement;
let hsv = rgbToHsv(hexToRgb(ORIGINAL));
let committed = ORIGINAL;
let touched = false;
let ui = null;

function paint(hex, keepHsv = false) {
    if (!keepHsv) {
        const next = rgbToHsv(hexToRgb(hex));
        // En el blanco, el negro o los grises el tono no existe: se conserva el anterior
        if (!next[1] || !next[2]) next[0] = hsv[0];
        hsv = next;
    }
    const accent = accentFrom(hex);
    root.style.setProperty('--pick', hex);
    ['l', 'h', 'c'].forEach((key) => {
        if (hex === ORIGINAL) root.style.removeProperty(`--brand-${key}`);
        else root.style.setProperty(`--brand-${key}`, accent[key]);
    });
    ui?.render(hex, accent);
}

function save(hex) {
    committed = hex;
    try {
        if (hex === ORIGINAL) sessionStorage.removeItem(KEY);
        else {
            const { l, h, c } = accentFrom(hex);
            sessionStorage.setItem(KEY, JSON.stringify({ hex, l, h, c }));
        }
    } catch {
        // Sin almacenamiento: el color dura hasta recargar.
    }
}

const currentHex = () => rgbToHex(hsvToRgb(hsv));

export const accentTouched = () => touched;
export const currentHsv = () => [...hsv];

// Un colaborador prueba un color sin guardarlo (si el visitante ya tocó el selector, no se mete)
export function previewHsv(next) {
    if (touched) return;
    hsv = next;
    paint(currentHex(), true);
}

export function restoreAccent() {
    if (!touched) paint(committed);
}

// Dónde queda el pulgar del tono para un valor dado (coordenadas del documento)
export function huePoint(h) {
    const input = $('.picker__hue');
    const r = input.getBoundingClientRect();
    const layerWidth = input.closest('.stage-layer--photo').clientWidth;
    const thumb = Math.max(13, layerWidth * 0.04);
    return {
        x: r.left + scrollX + thumb / 2 + (h / 359) * (r.width - thumb),
        y: r.top + scrollY + r.height / 2,
    };
}

// ─── Interfaz ────────────────────────────────────────────────────────────────
export function initPicker({ t }) {
    const el = $('.picker');
    if (!el) return { relabel() {} };
    const sv = $('.picker__sv', el);
    const hue = $('.picker__hue', el);
    const hexInput = $('.picker__hex input', el);
    const swatches = $$('.picker__swatches button', el);
    const chipHex = $('.layer-chip__hex');

    const svText = () =>
        t('picker-sv-value')
            .replace('{s}', Math.round(hsv[1] * 100))
            .replace('{v}', Math.round(hsv[2] * 100));

    ui = {
        render(hex, accent) {
            el.style.setProperty('--hue', hsv[0].toFixed(1));
            el.style.setProperty('--s', hsv[1].toFixed(3));
            el.style.setProperty('--v', hsv[2].toFixed(3));
            hue.value = Math.round(hsv[0]);
            sv.setAttribute('aria-valuenow', Math.round(hsv[1] * 100));
            sv.setAttribute('aria-valuetext', svText());
            if (document.activeElement !== hexInput) hexInput.value = hex.slice(1);
            $('.picker__ratio', el).textContent = accent.ratio.toFixed(1);
            $('.picker__aa b', el).textContent = accent.ratio >= 7 ? 'AAA' : 'AA';
            swatches.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.color === hex)));
            if (chipHex) chipHex.textContent = hex;
        },
    };

    const setHsv = (next, commit = false) => {
        touched = true;
        hsv = next;
        const hex = currentHex();
        paint(hex, true);
        if (commit) save(hex);
    };

    // Saturación (horizontal) y brillo (vertical), con puntero o teclado
    sv.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        sv.focus({ preventScroll: true });
        sv.setPointerCapture(event.pointerId);
        const move = (e) => {
            const r = sv.getBoundingClientRect();
            setHsv([hsv[0], clamp((e.clientX - r.left) / r.width, 0, 1), clamp(1 - (e.clientY - r.top) / r.height, 0, 1)]);
        };
        const end = () => {
            sv.removeEventListener('pointermove', move);
            save(currentHex());
        };
        move(event);
        sv.addEventListener('pointermove', move);
        sv.addEventListener('pointerup', end, { once: true });
        sv.addEventListener('pointercancel', end, { once: true });
    });

    sv.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 0.1 : 0.02;
        const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
        const delta = moves[event.key];
        if (!delta) return;
        event.preventDefault();
        setHsv([hsv[0], clamp(hsv[1] + delta[0], 0, 1), clamp(hsv[2] + delta[1], 0, 1)], true);
    });

    hue.addEventListener('input', () => setHsv([Number(hue.value), hsv[1], hsv[2]]));
    hue.addEventListener('change', () => save(currentHex()));

    // Hex: se aplica mientras se escribe si es válido; al salir, se guarda o se restaura
    hexInput.addEventListener('input', () => {
        const rgb = hexToRgb(hexInput.value);
        if (rgb && hexInput.value.replace('#', '').length === 6) {
            touched = true;
            paint(rgbToHex(rgb));
        }
    });
    hexInput.addEventListener('change', () => {
        const rgb = hexToRgb(hexInput.value);
        if (rgb) {
            touched = true;
            paint(rgbToHex(rgb));
            save(rgbToHex(rgb));
        }
        hexInput.value = currentHex().slice(1);
    });
    hexInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') hexInput.blur();
    });

    swatches.forEach((button) => {
        button.addEventListener('click', () => {
            touched = true;
            paint(button.dataset.color);
            save(button.dataset.color);
        });
    });

    // El color de esta visita (el script del <head> ya lo pintó antes de cargar)
    let stored = null;
    try {
        stored = JSON.parse(sessionStorage.getItem(KEY))?.hex;
    } catch {
        stored = null;
    }
    committed = (stored && hexToRgb(stored) && stored.toUpperCase()) || ORIGINAL;
    touched = committed !== ORIGINAL; // ya eligió un color en esta visita: nadie se lo cambia
    paint(committed);

    return {
        relabel() {
            sv.setAttribute('aria-valuetext', svText());
        },
    };
}
