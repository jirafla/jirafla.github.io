// Profundidad: el retrato del hero como pila de capas 3D y la inclinación de los proyectos destacados.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

export function heroDepth() {
    const hero = $('.hero');
    const stage = $('.hero__stage');
    if (!hero || !stage) return;

    // "Capas en 3D": separa la pila (también con movimiento reducido, solo que sin transición)
    const toggle = $('.stage-toggle', stage);
    toggle.addEventListener('click', () => {
        const exploded = !stage.classList.contains('is-exploded');
        stage.classList.remove('is-intro');
        stage.classList.toggle('is-exploded', exploded);
        toggle.setAttribute('aria-pressed', String(exploded));
    });

    if (reduce.matches) return;

    if (!finePointer.matches) {
        // En táctil, la pila flota sola mientras está en pantalla y se queda quieta al usar el selector
        new IntersectionObserver(([entry]) => stage.classList.toggle('is-floating', entry.isIntersecting)).observe(stage);
        stage.addEventListener('pointerdown', (event) => {
            if (event.target.closest('.picker')) stage.classList.add('is-held');
        });
        return;
    }

    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
        raf = 0;
        stage.style.setProperty('--ry', `${(px * 14).toFixed(2)}deg`);
        stage.style.setProperty('--rx', `${(-py * 10).toFixed(2)}deg`);
    };
    const queue = () => {
        if (!raf) raf = requestAnimationFrame(apply);
    };
    hero.addEventListener('pointermove', (event) => {
        // Sobre el selector la pila se endereza: así se apunta con precisión
        if (event.target.closest('.picker, .stage-toggle')) {
            px = 0;
            py = 0;
        } else {
            const r = hero.getBoundingClientRect();
            px = (event.clientX - r.left) / r.width - 0.5;
            py = (event.clientY - r.top) / r.height - 0.5;
        }
        queue();
    });
    hero.addEventListener('pointerleave', () => {
        px = 0;
        py = 0;
        queue();
    });
}

// La imagen de cada caso destacado se inclina apenas hacia el puntero
export function cardTilt() {
    if (reduce.matches || !finePointer.matches) return;
    const clampHalf = (value) => Math.max(-0.5, Math.min(0.5, value));
    $$('.project--featured').forEach((card) => {
        const media = $('.project__media', card);
        card.addEventListener('pointermove', (event) => {
            const r = media.getBoundingClientRect();
            const x = clampHalf((event.clientX - r.left) / r.width - 0.5);
            const y = clampHalf((event.clientY - r.top) / r.height - 0.5);
            media.style.setProperty('--tilt-y', `${(x * 7).toFixed(2)}deg`);
            media.style.setProperty('--tilt-x', `${(-y * 7).toFixed(2)}deg`);
        });
        card.addEventListener('pointerleave', () => {
            media.style.removeProperty('--tilt-x');
            media.style.removeProperty('--tilt-y');
        });
    });
}
