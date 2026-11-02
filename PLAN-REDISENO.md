# Plan de rediseño — Jirafla.fig

**Rama:** `rediseno/canvas-en-vivo` · **Publica desde:** `page` (GitHub Pages, `.github/workflows/static.yml`)
**Objetivo:** convertir el portfolio en un archivo de Figma "en vivo", en modo oscuro, con 3D y punteros colaborativos, que en el celular se sienta igual de cuidado que en desktop.
**Contexto estratégico:** `PRODUCT.md`, con la audiencia (empresas que contratan), la personalidad (estratégico, cercano, juguetón), las anti-referencias y la accesibilidad (WCAG 2.2 AA).

**Skills de apoyo**
- **impeccable** (instalada, actualizada a v4.8.0): criterios de marca, tipografía, color, movimiento y anti-patrones, ya aplicados a este plan. En la F6 se usa con `audit` y `polish`.
- **frontend-design** y **audit-suite** (catálogo, opcionales): diseño de interfaz, animación web y auditorías de rendimiento y accesibilidad.
- **Figma** (requiere conectar la cuenta): sirve si quieres que el diseño también quede como archivo en tu Figma.

---

## 1. Diagnóstico del sitio actual

| Tema | Estado actual | Implicación |
|---|---|---|
| Base | Plantilla *ProMan* (HTML Codex): Bootstrap 5 + jQuery 3.4 + 8 librerías (wow, owl, isotope, lightbox, typed, counterup, waypoints, easing) | Mucho JS para lo que hace; se reemplaza por JS propio y liviano |
| Imágenes | **12 MB** en `img/`; `profile.png` 1,36 MB, proyectos de 200–830 KB, sin `srcset` | Es el mayor problema en móvil: hay que optimizar (WebP + tamaños) |
| Contenido | 23 proyectos con descripción, 4 experiencias, 5 estudios, contador de 8+ años y 145 estudiantes, ES/EN | Es muy bueno y se conserva completo |
| Proyectos | Lightbox propio (`openLightbox('clave')`), filtros por empresa | Pasa a ser un panel o una hoja inferior accesible |
| Retrato | `profile.png` ya trae el círculo violeta, el cuadro de selección y el color picker integrados en la imagen | Encaja perfecto con el concepto, pero para separarlo en capas 3D conviene tener el recorte limpio (ver decisiones) |
| **Riesgo detectado** | `sw.js` (de la app de inglés: `menu.html`, `verbos.html`…) tiene scope `/` y sirve **todo** recurso local *cache-first* | Quien haya abierto la app de inglés seguiría viendo el portfolio **viejo** después del lanzamiento. Se corrige en la fase de lanzamiento |
| Recursos compartidos | La app de inglés usa `css/bootstrap.min.css`, `manifest.json`, `icons/` | No se tocan; el portfolio nuevo vive en `assets/` |

---

## 2. Concepto: "Jirafla.fig — un archivo de Figma abierto"

Entrar al portfolio es abrir un archivo donde Andrés y su equipo están trabajando. Cada sección es un **frame** que se "diseña" frente al visitante y luego queda quieto, legible y usable.

**Principios**
1. **El contenido primero.** El HTML trae todo el texto real y se lee completo sin JavaScript. La puesta en escena se monta encima.
2. **Cada animación demuestra una habilidad**: auto layout, design system, prototipado, research, handoff.
3. **Show y luego calma.** Cada frame se anima una sola vez al entrar en pantalla. Después, los cursores pasan a modo inactivo y no compiten con la lectura.
4. **El móvil no es una versión recortada.** Es "Figma en el celular": barra inferior al alcance del pulgar, hojas deslizables y gestos.
5. **Respeto por el visitante.** Con `prefers-reduced-motion` se muestra el estado final directamente, y hay un botón "Pausar colaboradores".

---

## 3. Sistema visual (tokens propuestos)

**Escena que justifica el modo oscuro:** un líder de diseño abre el enlace desde LinkedIn en el celular, de noche o entre reuniones, o en un monitor junto a su propio Figma en modo oscuro. El sitio debe sentirse como "otro archivo de Figma abierto", no como una página de marketing.

**Estrategia de color:** contenida y con roles definidos, como el editor oscuro de Figma con los cursores de FigJam. Hay un neutro casi negro teñido hacia el violeta de la marca y el violeta como acento (menos del 10 % de la superficie). Los colores de los cursores son roles funcionales, no decoración. Se **conservan los colores de marca que ya tienes** en `css/style.css`: `--primary #3F058A`, `--secondary #FFC448` y `--dark #12141D`. Todo se define en OKLCH, y el contraste se verifica en la F1.

| Token | Valor (OKLCH, aprox.) | Uso |
|---|---|---|
| `--canvas` | `oklch(0.16 0.012 290)` | Fondo del lienzo (neutro teñido al violeta de marca) |
| `--canvas-dot` | `oklch(0.26 0.015 290)` | Cuadrícula de puntos |
| `--frame` | `oklch(0.20 0.014 290)` | Fondo de frames (derivado de tu `--dark #12141D`) |
| `--frame-raised` | `oklch(0.24 0.016 290)` | Paneles y hojas |
| `--border` | `oklch(0.32 0.018 290)` | Bordes de 1 px |
| `--ink` / `--ink-2` / `--ink-3` | `0.96` / `0.80` / `0.66` de luminosidad, croma 0.01 | Texto. `--ink-3` solo en etiquetas grandes; el cuerpo siempre ≥ 4,5:1 |
| `--brand` | `oklch(0.68 0.19 295)` | Tu `#3F058A` aclarado para que se lea sobre oscuro |
| `--brand-deep` | `#3F058A` | Fondos de acento (círculo del retrato, botón primario) |
| `--amber` | `oklch(0.85 0.15 82)` ≈ tu `#FFC448` | Highlights, cursor de IA y pines de comentario |
| `--select` | `oklch(0.66 0.17 255)` | Selección, foco y guías de medida (azul tipo Figma) |
| Cursores | Andrés = `--brand` · PM coral · Dev verde menta · IA = `--amber` · Tú = `--select` | Cada colaborador tiene un color fijo |

**Tipografía** (seguí el procedimiento de la skill: descarta las fuentes "reflejo" de IA como Inter, Space Grotesk o DM Sans)
- **Una sola familia, elegida a propósito: *Archivo*** (variable, ejes de **ancho 62–125** y peso 100–900, en Google Fonts).
  - Los títulos van en ancho *expandido* y peso alto: con cara de póster, juguetón.
  - El texto va en ancho normal: sólido y legible, el lado estratégico.
  - El contraste se logra con el ancho y el peso, no mezclando dos fuentes parecidas.
- **El eje variable es parte del show.** En el hero, el cursor ajusta los sliders de peso y ancho en el panel de propiedades y tu nombre cambia en vivo. Así se ve que es un diseño que se está editando.
- **Sin monoespaciada.** Sería un disfraz "técnico". Las medidas y los hex usan números tabulares (`font-variant-numeric: tabular-nums`) de la misma familia, como hace Figma.
- **Escala fluida con razón ≥ 1,25:**
  - H1 `clamp(2.75rem, 10vw, 6rem)`, con el tope de 6rem de la skill y `letter-spacing` ≥ −0.04em.
  - Cuerpo de 17–18 px, `line-height` +0,05 por ser texto claro sobre oscuro y líneas de 65–75 caracteres como máximo.
  - `text-wrap: balance` en títulos y `pretty` en párrafos.
- Las etiquetas de los frames ("Hero / Mobile") van en tipo de oración, con peso regular y 12 px. Es el sistema de Figma, **no** el clásico "eyebrow" en mayúsculas espaciadas sobre cada sección.

**Espaciado y forma:** base de 4 px con ritmo variado (agrupaciones apretadas y separaciones generosas), radios de 8/12/16 y bordes de 1 px. En oscuro, la profundidad la dan las capas y los bordes, no las sombras. Los z-index siguen una escala semántica (`--z-canvas`, `--z-cursors`, `--z-chrome`, `--z-sheet`, `--z-toast`) y nunca valores como 9999.

---

## 4. Estructura y coreografía por sección

Cada frame lleva su etiqueta arriba a la izquierda, como en Figma (`Hero / Desktop`, `Proyectos / Grid`…).

**Tesis de movimiento** (criterio de la skill: *un momento focal ensayado, no una animación de entrada en cada sección*)
- **Momento focal (uno solo):** el hero se termina de diseñar en vivo frente al visitante. Los cursores tipean, ajustan los ejes de la fuente, sueltan el retrato en su capa y aplanan la vista 3D. Dura como máximo **6 s**, se puede saltar con cualquier scroll o clic y el contenido nunca espera: el nombre y el CTA se pueden leer desde el primer segundo.
- **Resto de secciones: sin animaciones de entrada.** El contenido ya está ahí. Los cursores solo hacen **una intervención contextual** cuando pasan por la sección: un pin de comentario, arrastrar un slider o encajar una tarjeta. Es como ver al equipo trabajando, no un *fade-up* repetido.
- **Continuidad:** tarjeta → detalle con View Transition, filtros que reordenan con FLIP y hojas que salen del borde.
- **Feedback:** hover, press y foco en 100–150 ms. Cambios de estado en 150–300 ms. Overlays en 300–500 ms. Solo el momento focal llega a 500–800 ms. La curva base es `cubic-bezier(0.16, 1, 0.3, 1)`, sin rebotes ni elásticos, y las salidas son más rápidas que las entradas.
- **Robustez:** el estado por defecto es "todo visible". La animación se ejecuta con Web Animations API, no con clases que dejan contenido oculto si el JS falla. Los bucles se detienen cuando la sección sale de pantalla o la pestaña se oculta.

**Anti-patrones que este rediseño evita a propósito**
- **El "hero de métricas"** (número gigante + etiqueta, al estilo SaaS). Los 8+ años y los 145 estudiantes van dentro del texto o en el panel de propiedades, no en una fila de cifras grandes.
- **Grilla de tarjetas idénticas.** Los casos destacados son frames de tamaños y proporciones distintas, como en un lienzo real de Figma. El archivo es una lista compacta.
- **Eyebrows en mayúsculas sobre cada sección**, numeración 01/02/03, texto con gradiente, bordes laterales de color en tarjetas, glassmorphism decorativo y glow neón.
- **Títulos que se desbordan:** cada título se prueba a 360 px, porque el ancho expandido de Archivo es el riesgo principal.

### 0 · Chrome del archivo (siempre visible)
- **Barra superior:** logo + `Jirafla.fig / Portfolio 2026`, pila de avatares de colaboradores, ES/EN, botón **Exportar CV** (descarga el PDF actual) y "Pausar colaboradores".
- **Panel de capas (izquierda, ≥1200 px):** es la navegación. Cada sección es una capa, con la actual resaltada (`aria-current`).
- **Panel de propiedades (derecha, ≥1440 px; antes ≥1280, ver F5):** contextual. Muestra datos de la sección visible (por ejemplo, en Skills, los sliders; en Proyectos, rol, empresa y año).
- **Barra inferior:** indicador de zoom + herramientas (mover, frame, texto, comentario). La herramienta de comentario lleva a Contacto.

### 1 · Hero
- **Contenido:** saludo, nombre, roles rotativos, CTA de CV y contacto, retrato.
- **Coreografía (el momento focal):** el cursor de Andrés selecciona el nombre y aparecen el cuadro de selección y las medidas. El cursor Dev arrastra los sliders de peso y ancho de Archivo en el panel de propiedades, y el nombre se transforma en vivo hasta su forma final. Los roles se seleccionan y se reescriben (en lugar de typed.js). El retrato llega **en vista explotada 3D** (capas separadas en Z) y se "aplana" cuando los cursores terminan.
- **Extra:** el color picker es **real**. El visitante puede cambiar el `--accent` de todo el sitio.

### 2 · Sobre mí
- **Contenido:** párrafo, checklist (B2B/B2C/B2B2C…), 8+ años y 145 estudiantes.
- **Intervención:** los datos van dentro del texto, resaltados como texto seleccionado, no como una fila de cifras gigantes. El cursor PM deja un **pin de comentario** sobre la checklist ("¿B2B, B2C y B2B2C? ✅").

### 3 · Enfoque
- **Contenido:** los 8 puntos actuales.
- **Coreografía:** se convierten en un **flujo tipo FigJam** (Investigo → Genero ideas → Itero → Esquematizo → Design System → Front → IA). El cursor IA dibuja los conectores.

### 4 · Skills
- **Contenido:** las 6 skills.
- **Coreografía:** aparecen como **panel de propiedades con sliders**. El cursor Dev arrastra cada slider hasta su valor y aparece el número en mono.

### 5 · Experiencia y educación
- **Contenido:** 4 trabajos y 5 estudios.
- **Coreografía:** un **historial de versiones** (`v2016 Comfama → v2023 CentroHub · actual`), con pestañas Experiencia/Educación como las páginas de Figma.

### 6 · Proyectos
- **Contenido:** los 23 proyectos, sus filtros y enlaces.
- **Coreografía:** los filtros son las **páginas** del archivo (Todos · CentroHub · AIRA · Geostigma · Propio). Cada tarjeta es un frame con nombre. Al entrar, los cursores **arrastran** 2 o 3 tarjetas a su lugar en la grilla con auto layout (con guías de medida en `--select`).
- **Interacción:**
  - En desktop, inclinación 3D en hover y "Ver caso".
  - El detalle se abre en un panel lateral en desktop y en una hoja inferior a pantalla completa en móvil, con imagen, rol, descripción, enlace y anterior/siguiente.

### 7 · Contacto
- **Contenido:** ubicación, teléfono, correo, LinkedIn y WhatsApp.
- **Coreografía:** es un **hilo de comentarios**. Andrés escribe "Trabajemos juntos en proyectos ganadores 🔥" y el campo de respuesta tiene los botones WhatsApp · Email · LinkedIn (sin formulario ni backend).

---

## 5. Motor de punteros colaborativos

**Arquitectura** (`assets/js/cursors.js` + `assets/js/scenes.js`)
- `Actor { nombre, color }` con acciones encadenables y `async`: `moveTo(objetivo)`, `click()`, `select(el)`, `drag(el, destino)`, `type(el, texto)`, `measure(a, b)`, `comment(el, texto)`, `idle()`.
- Cada sección tiene un **guion**, que se dispara una sola vez con `IntersectionObserver` cuando el frame está al menos al 40 % en pantalla.
- **Movimiento humano:** curvas Bézier con ligero *overshoot*, duración según la distancia (tipo Fitts), micro-temblor y pausas. Solo se anima `transform`/`opacity` con `requestAnimationFrame`, sin *layout shift*.
- Los elementos reservan su espacio final desde el inicio (CLS ≈ 0). La animación solo "revela" lo que ya está ahí.

**El visitante como colaborador**
- **Desktop (puntero fino):** cursor estilo Figma con la etiqueta "Tú", que sigue al mouse. Sobre enlaces y botones se mantiene el feedback nativo.
- **Táctil:** al tocar el lienzo aparece un *ping* (onda + etiqueta "Tú"), sin cursor permanente.

**Reglas de móvil:** máximo 2 actores a la vez, etiquetas compactas, guiones de 3 s o menos por sección y sin arrastrar elementos grandes.

**Accesibilidad:** la capa de cursores es `aria-hidden` y `pointer-events: none`. Nada depende de la animación. Con *reduced motion* se muestra el estado final, y la pausa queda guardada en `localStorage`.

---

## 6. 3D

**Recomendación: 3D con CSS** (`perspective`, `preserve-3d`) en lugar de Three.js para el sitio base.
- Mantiene el texto nítido, seleccionable y accesible, algo clave en un portfolio de diseño.
- No suma librerías (Three.js pesa unos 170 KB gzip).
- Va fluido en Android de gama media.

**Dónde se usa**
1. **Hero en vista explotada:** 5–6 capas (cuadrícula del frame · círculo + selección · retrato · color picker · nombre · badges).
   - Desktop: paralaje con el mouse, y la pila se aplana al hacer scroll.
   - Móvil: 3 capas con menos profundidad. Usa el giroscopio si el usuario toca "Activar 3D" (iOS pide permiso); si no, hace una órbita lenta automática.
   - *Hecho en F5:* sin giroscopio (pedía permiso en iOS y mueve el retrato mientras se lee). En táctil, la pila flota sola y se queda quieta al tocar el selector; el botón "Vista 3D" separa las capas en cualquier pantalla.
2. **Tarjetas de proyecto:** inclinación en hover (desktop). En móvil, una rotación sutil ligada al scroll del carrusel.
3. **Transición tarjeta → detalle:** "zoom al frame" con View Transitions API, con *fallback* de fade.

**Opcional (fase extra, solo desktop, carga diferida):** "Modo exploración" con Three.js, una vista 3D de todos los frames del archivo flotando en el espacio.

---

## 7. Móvil en detalle

**Breakpoints:** ≤599 teléfono · 600–1023 tablet · 1024–1199 laptop · 1200–1439 con panel de capas · ≥1440 chrome completo (capas + inspector).

```
TELÉFONO 390×844                       DETALLE DE PROYECTO (hoja)
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ ◆ Jirafla.fig    ●●● ES  ⏸  │ 52px   │            ───               │ ← arrastrar para cerrar
├──────────────────────────────┤       │ ┌──────────────────────────┐ │
│ Hero / Mobile                │       │ │      imagen 4:3          │ │
│ 👋 Hola, soy                 │       │ └──────────────────────────┘ │
│ Andrés Felipe                │       │ Retiro sin Tarjeta           │
│ Londoño▌      ◣ Andrés       │       │ Banco Bolivariano · CentroHub│
│ Sr Product Designer          │       │ Rol · Año · Plataforma       │
│ ┌─────── retrato 3D ───────┐ │       │ Descripción…                 │
│ │  capas (3) + picker      │ │       │                              │
│ └──────────────────────────┘ │       │ [ Ver sitio ↗ ]              │
│ [  Exportar CV  ] [Contacto] │       │ ‹ Anterior        Siguiente ›│
│                              │       └──────────────────────────────┘
│ ╭────────────────────────╮   │
│ │ ⌂   ☺   ≡   ▦   ✉  │ 56px│ ← barra flotante (zona del pulgar) + "Capas" abre hoja
│ ╰────────────────────────╯   │
└──────────────────────────────┘
```

- **Barra superior fija de 52 px** con `env(safe-area-inset-*)`. ~~Barra inferior flotante de 56 px con 5 destinos.~~ **Decidido en F6:** un solo botón flotante "Capas" abajo a la derecha (hasta 1200 px), que abre el árbol completo en una hoja inferior: la navegación vive en las capas, como en Figma.
- **Frames a ancho completo** con margen lateral de 16 px. La etiqueta del frame queda fija mientras se recorre la sección.
- **Proyectos:**
  - Filtros como chips con scroll horizontal (`scroll-snap`).
  - **Destacados** a ancho completo (imagen + resumen) y **Archivo** en una grilla de 2 columnas compacta. *(Cambio en la F1: reemplaza el carrusel porque se escanea mejor y funciona igual con los filtros.)*
  - El detalle se abre en una hoja con *drag handle* y se cierra deslizando hacia abajo o con el botón Atrás del teléfono (`history.pushState`). Mantiene el foco atrapado mientras está abierta.
- **Skills:** sliders a ancho completo. **Historial:** lista vertical con entradas colapsables. **Contacto:** botones WhatsApp/Email/LinkedIn de 48 px.
- **Ergonomía:** áreas táctiles de 44 px o más, nada que dependa del hover, cuerpo de texto de al menos 16 px y `100dvh` en lugar de `100vh`.

**Presupuesto de rendimiento (Android gama media, 4G)**

| Métrica | Meta |
|---|---|
| LCP | < 2,5 s |
| CLS | < 0,05 |
| INP | < 200 ms |
| JS propio | < 60 KB gzip, sin librerías externas |
| Imágenes de la carga inicial | < 400 KB |
| Fuentes | 3 familias, subset latino, `font-display: swap`, *preload* solo de la display |
| Lighthouse móvil | Rendimiento ≥ 90 · Accesibilidad 100 |

**Imágenes:** un script con Python/PIL (ya está instalado) genera WebP en 480/800/1000 px con `srcset`/`sizes` y `loading="lazy"` fuera del primer pantallazo. Estimado: de 12 MB a unos 2 MB en total. El retrato queda alrededor de 120 KB.

**Pruebas:** 360×800 (Android), 390×844 (iPhone), 768 (tablet), horizontal, Safari iOS (safe areas, rendimiento de `backdrop-filter`, permiso de giroscopio).

---

## 8. Accesibilidad y SEO
- **Estructura:** landmarks semánticos, un solo `h1` y orden de lectura lógico. Enlace "Saltar al contenido".
- **Foco:** foco visible con contorno `--select` (como la selección de Figma).
- **Idioma:** ES/EN cambia `<html lang>` y queda guardado.
- **Hojas y paneles:** `role="dialog"`, foco atrapado y cierre con Esc.
- **SEO:** meta descripción, Open Graph/Twitter con una imagen nueva de 1200×630 y JSON-LD `Person`.

---

## 9. Arquitectura técnica (sin build, compatible con GitHub Pages)

```
index.html                 ← reescrito: contenido real y semántico (ES por defecto)
assets/
  css/  tokens.css · base.css · chrome.css · sections.css
  js/   i18n.js (diccionario actual migrado) · main.js (nav, hojas, filtros)
        cursors.js (motor) · scenes.js (guiones) · depth.js (3D)
  img/  WebP optimizadas + retrato en capas
scripts/optimize-images.py
```

- **No se toca** nada de la app de inglés: `menu.html`, `verbos.html`, `phrasal-verbs.html`, `objetos.html`, `manifest.json`, `icons/` ni `css/bootstrap.min.css`.
- `lib/`, `js/main.js`, `css/style.css` y `scss/`: se confirma que la app de inglés no los usa antes de retirarlos.
- **`sw.js`:** limitar el *fetch* a las rutas de la app de inglés y subir la versión de caché, para que el portfolio nunca quede atrapado en caché.

---

## 10. Plan de acción

| Fase | Entregable | Verificación |
|---|---|---|
| **F0 · Preparación** ✅ | Rama ✔ · imágenes optimizadas (11,8 MB → 1,9 MB, `scripts/optimize-images.py`) · jirafa recortada para fondo oscuro. *Lighthouse queda para la F6 (no hay Lighthouse instalado aquí).* | Comparativa de peso antes/después |
| **F1 · Esqueleto y contenido** ✅ | `index.html` semántico con todo el contenido, i18n migrado (`assets/js/i18n.js`), tokens y layout responsive **sin animación**. Filtros, hoja de detalle, pestañas y ES/EN funcionando. La página anterior quedó como `index-anterior.html` solo como referencia | Se lee completo a 360 px y sin JS; sin desbordes horizontales a 360 px |
| **F2 · Chrome de Figma** ✅ | Barra superior con migas del frame actual · panel de capas (≥1200 px) con avatares de quién está en cada frame · inspector (≥1280 px) con valores reales del frame (W, H, X, Y, espacio, padding, relleno, tipografía en vivo, equipo, exportar CV) · ocultar paneles con Ctrl + \ · barra inferior hasta 1200 px con botón Capas (hoja en móvil) · medidas en vivo en cada etiqueta · hover de frames | Probado a 390, 1024 y 1440 px |
| 🔎 **Revisión contigo** | Vista previa en móvil y desktop | Tu visto bueno a estructura y estética |
| **F3 · Secciones** ✅ | Enfoque con pasos nombrados (01–08) como formas de FigJam · caso principal a toda la fila + etiquetas de industria y método en los 6 destacados · filtros que reacomodan con FLIP · detalle con contador, etiquetas, flechas del teclado y la imagen que viaja desde la tarjeta · copiar correo y teléfono con aviso · historial con transición · hero en dos columnas desde 768 px | Probado a 390, 768 y 1440 px |
| **F4 · Punteros colaborativos** ✅ (adelantada a pedido) | Motor (`assets/js/cursors.js`) + guiones por sección (`assets/js/scenes.js`), cursor "Tú" / ping táctil, presencia y pausa, *reduced motion*. Hero con nombre que se estira en vivo y capas 3D que siguen el mouse | Probado a 390 y 1440 px; sin desborde horizontal |
| 🔎 **Revisión contigo** | La coreografía completa | Ajustes de ritmo y personalidad |
| **F5 · 3D** ✅ | Retrato separado en capas reales (`retrato-capa`, generado por `scripts/optimize-images.py`): retícula, elipse, selección, foto + selector, chips, con profundidad compensada para que de frente se vea igual que la foto · llega en vista explotada y se aplana cuando Dev termina el nombre · botón "Vista 3D" (también con movimiento reducido, sin transición) · **selector de color real**: brillo/saturación, tono, hex, 5 muestras, contraste en vivo; cambia el acento de todo el sitio y nunca baja del contraste original (AAA); dura la visita (`sessionStorage`) · Andrés prueba el ámbar y lo devuelve, e invita a probarlo (no toca el color si el visitante ya eligió uno) · selector compacto cuando el retrato mide menos de 300 px · nombre del hero medido contra el frame (`cqi`) · inspector desde 1440 px · inclinación sutil de los destacados · el lienzo ya no se ensancha durante los filtros | Probado a 375, 905, 1280 y 1440 px, ES/EN, teclado. Pendiente: movimiento reducido real y Safari iOS (F6) |
| **F6 · QA** ✅ (salvo Safari iOS) | Móvil con un solo botón flotante "Capas" · Lighthouse con servidor tipo GitHub Pages (gzip + caché): **escritorio 98 / 100 / 100 / 100**, **móvil 85–90 / 100 / 100 / 100** (rendimiento / accesibilidad / buenas prácticas / SEO) · favicon propio (no existía: daba 404) · imágenes intermedias (retrato 800, jirafa 96/200, taller 640) · botón de idioma con el texto visible en su nombre accesible · objetivos táctiles del selector de 24 px · texto mínimo de 11 px en el selector · título de Enfoque sin desborde · foco visible y en orden en todo el recorrido con teclado · 225 claves de texto completas en ES y EN · movimiento reducido verificado con Chrome sin interfaz (sin colaboradores, pila plana, sin transiciones ni scroll suave) · "Vista 3D" con ícono de cubo para no confundirse con "Capas" | Pendiente: Safari iOS en un iPhone real; el rendimiento móvil depende sobre todo de la hoja de Google Fonts (ver decisión 7) |
| **F7 · Lanzamiento** | Corrección de `sw.js`, imagen OG, borrar `index-anterior.html`, merge a `page` y verificación en vivo | Sitio publicado; la app de inglés sigue funcionando |
| *Extra* | Modo exploración con Three.js (opcional) | Solo desktop, carga diferida |

---

## 11. Decisiones pendientes (tuyas)

1. ~~**Retrato:** ¿tienes el recorte limpio?~~ Resuelto en F5: el círculo, la selección y el picker se quitaron de la foto con un script y se recrearon en código. Si algún día hay un recorte nuevo, basta con reemplazar `img/profile.png` y ajustar las coordenadas del script.
2. **Proyectos destacados:** propongo 6 casos arriba (Retiro sin Tarjeta, Transferencias Internacionales VISA Direct, miKia, Metro de Quito, Liberati, Operion) y el resto como "Archivo". ¿Estás de acuerdo o eliges otros?
3. **Colaboradores:** ¿roles genéricos (PM, Dev, IA) o nombres de personas reales (con su permiso)?
4. **Skills en %:** ¿se mantienen como valores de slider o pasan a niveles (Experto / Avanzado…)?
5. **Tipografía:** propongo *Archivo* como única familia (con sus ejes variables como parte del show). ¿Te gusta, o tienes una fuente de marca que quieras mantener?
6. **Modo exploración con Three.js:** ¿lo incluimos como fase extra?
7. **Fuente Archivo alojada en el sitio:** hoy la hoja de Google Fonts bloquea la primera pintura en móvil (~0,9 s simulados). Alojar el archivo `.woff2` (licencia OFL, unos 90 KB) en `assets/fonts/` con `preload` la quita del camino crítico y evita pedir datos a Google. Requiere descargar ese archivo.

---

## 12. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Animación que distrae del contenido | Una sola vez por sección, modo inactivo después y botón de pausa |
| Lentitud en Android de gama baja | Solo `transform`/`opacity`, menos actores y capas en móvil, se desactiva con `saveData` o pocos núcleos |
| Caché del service worker | Corrección de `sw.js` en F7 |
| Romper la app de inglés | No se tocan sus archivos; se prueba antes del merge |
