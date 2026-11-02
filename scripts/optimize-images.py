"""Genera las imágenes WebP del portfolio en assets/img/.

Uso:  python scripts/optimize-images.py
Requiere Pillow (pip install pillow). Vuelve a ejecutarlo cuando cambies algo en img/.
"""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img"
OUT = ROOT / "assets" / "img"

# nombre de origen -> (nombre de salida, anchos)
JOBS = {
    "profile.png": ("retrato", (560, 800, 1100)),
    "team-1.png": ("jirafa", (96, 200, 360, 550)),
    "about-1.jpg": ("taller", (480, 640, 930)),
    "logo.png": ("logo", (188,)),
}
for n in [*range(1, 16), *range(18, 26)]:  # 16 y 17 no se usan en el sitio
    JOBS[f"project-{n}.jpg"] = (f"proyecto-{n}", (480, 1000))


def knock_out_background(im):
    """Vuelve transparente el fondo claro conectado a los bordes (la ilustración tiene fondo blanco)."""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    queue = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while queue:
        x, y = queue.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b, _ = px[x, y]
        if min(r, g, b) <= 190 or max(r, g, b) - min(r, g, b) >= 70:
            continue
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                queue.append((nx, ny))
    return im


# Elementos que profile.png trae "pintados" y que el sitio recrea en código como capas 3D.
# Coordenadas en píxeles de profile.png (1103 × 1395).
CIRCLE = (121, 49, 215)  # círculo morado detrás del retrato
SELECTION = (85, 109, 234)  # cuadro de selección azul alrededor del círculo
SELECTION_BOX = (39, 577, 357, 900)
PANEL = (596, 684, 1103, 1250, 24)  # color picker: x0, y0, x1, y1, radio de las esquinas
DOT = (582, 734, 31)  # muestra de color redonda a la izquierda del picker: cx, cy, radio


def portrait_layer(im):
    """Deja solo a la persona: quita el círculo, la selección y el picker (van en sus propias capas)."""
    import numpy as np

    a = np.asarray(im, dtype=np.float64).copy()
    rgb, alpha = a[..., :3], a[..., 3]
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w]
    dist = lambda color: np.abs(rgb - color).sum(axis=2)  # noqa: E731

    # Círculo: color plano, solo en su zona (el picker tiene morados parecidos)
    zone = (xx < 420) & (yy > 540) & (yy < 930)
    circle = zone & (dist(CIRCLE) < 70)

    # Selección: líneas de ~4 px y manijas cuadradas en las esquinas.
    # El lado derecho y el inferior se esconden detrás de la persona: solo se limpia lo visible.
    x0, y0, x1, y1 = SELECTION_BOX
    near_line = (
        (np.abs(xx - x0 - 1.5) <= 4)
        | ((np.abs(xx - x1) <= 4) & (yy < 700))
        | (np.abs(yy - y0 - 1.5) <= 4)
        | ((np.abs(yy - y1) <= 4) & (xx < 140))
    ) & (xx >= x0 - 12) & (xx <= x1 + 12) & (yy >= y0 - 12) & (yy <= y1 + 12)
    bluish = (rgb[..., 2] - rgb[..., 0] > 45) & (rgb[..., 2] - rgb[..., 1] > 25)
    handles = np.zeros_like(near_line)
    for cx, cy in ((x0 + 1.5, y0 + 1.5), (x1, y0 + 1.5), (x0 + 1.5, y1 - 1.5)):
        handles |= (np.abs(xx - cx) <= 15) & (np.abs(yy - cy) <= 15)
    whitish = rgb.min(axis=2) > 200
    selection = (near_line & (bluish | (dist(SELECTION) < 160))) | (handles & (whitish | bluish))

    removed = circle | selection

    # Borde entre círculo y saco: separa la mezcla para no dejar un halo morado
    def grow(mask, steps):
        for _ in range(steps):
            m = mask.copy()
            m[1:] |= mask[:-1]
            m[:-1] |= mask[1:]
            m[:, 1:] |= mask[:, :-1]
            m[:, :-1] |= mask[:, 1:]
            mask = m
        return mask

    def box_blur(v, size):
        pad = size // 2
        s = np.pad(v, pad, mode="edge").cumsum(0).cumsum(1)
        s = np.pad(s, ((1, 0), (1, 0)))
        return (s[size:, size:] - s[:-size, size:] - s[size:, :-size] + s[:-size, :-size]) / (size * size)

    ring = grow(circle, 2) & ~removed & (alpha > 0)
    solid = ~grow(removed, 3) & (alpha > 250)
    weights = box_blur(solid.astype(float), 9)
    person = np.stack([box_blur(rgb[..., i] * solid, 9) for i in range(3)], axis=2)
    person = person / np.maximum(weights, 1e-6)[..., None]
    c = np.array(CIRCLE, dtype=float)
    diff = c - person
    mix = ((rgb - person) * diff).sum(axis=2) / np.maximum((diff * diff).sum(axis=2), 1)
    mix = np.clip(mix, 0, 1) * ring
    keep = 1 - mix
    rgb[ring] = np.clip((rgb[ring] - mix[ring][:, None] * c) / np.maximum(keep[ring], 0.05)[:, None], 0, 255)
    alpha[ring] *= keep[ring]

    alpha[removed] = 0

    # Picker: rectángulo redondeado + su sombra; la muestra redonda de la izquierda
    px0, py0, px1, py1, r = PANEL
    inside = (xx >= px0) & (xx < px1) & (yy >= py0) & (yy < py1)
    for cx, cy in ((px0 + r, py0 + r), (px0 + r, py1 - r)):
        corner = (np.abs(xx - cx) < r) & (np.abs(yy - cy) < r) & ((xx - cx) * (px0 + r - cx) > 0)
        corner &= (yy - cy) * (cy - (py0 + py1) / 2) > 0
        inside &= ~(corner & ((xx - cx) ** 2 + (yy - cy) ** 2 > r * r))
    shadow = (xx >= px0 - 10) & (yy >= py0 - 10) & (yy < py1 + 70) & (alpha < 120) & (rgb[..., 2] < 45)
    dx, dy, dr = DOT
    dot = (xx - dx) ** 2 + (yy - dy) ** 2 <= dr * dr
    alpha[inside | shadow | dot] = 0

    a[..., 3] = alpha
    return Image.fromarray(a.round().astype(np.uint8), "RGBA")


def favicons():
    """Íconos sobre un cuadro morado de marca: la "J" del logotipo para la pestaña (a 32 px la
    jirafa se vuelve una mancha) y la jirafa de línea para la pantalla de inicio."""
    from PIL import ImageDraw, ImageFilter

    logo = Image.open(SRC / "logo.png").convert("RGBA")
    giraffe = logo.crop((4, 6, 68, 91))
    ImageDraw.Draw(giraffe).rectangle((44, 34, 64, 85), fill=(0, 0, 0, 0))  # quita la "J" que se cruza
    letter = logo.crop((48, 36, 70, 80))
    for size, name, mark_src, height, thicken in (
        (32, "favicon-32.png", letter, 0.64, 3),
        (180, "apple-touch-icon.png", giraffe, 0.78, 1),
    ):
        scale = 8
        big = size * scale
        tile = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        ImageDraw.Draw(tile).rounded_rectangle((0, 0, big - 1, big - 1), radius=big // 5, fill=(63, 5, 138, 255))
        mark_h = round(big * height)
        mark = mark_src.resize((round(mark_src.width * mark_h / mark_src.height), mark_h), Image.LANCZOS)
        # En tamaños chicos el trazo fino se pierde: se engrosa antes de reducir
        alpha = mark.split()[3].filter(ImageFilter.MaxFilter(scale * thicken | 1))
        white = Image.new("RGBA", mark.size, (255, 255, 255, 255))
        white.putalpha(alpha)
        tile.alpha_composite(white, ((big - mark.width) // 2, (big - mark_h) // 2))
        tile.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    before = after = 0
    for name, (stem, widths) in JOBS.items():
        src = SRC / name
        if not src.exists():
            continue
        before += src.stat().st_size
        im = Image.open(src)
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        if name == "team-1.png":
            im = knock_out_background(im)
        versions = [(stem, im)]
        if name == "profile.png":
            versions.append(("retrato-capa", portrait_layer(im)))
        for out_stem, image in versions:
            for w in widths:
                w = min(w, image.width)
                h = round(image.height * w / image.width)
                dest = OUT / f"{out_stem}-{w}.webp"
                image.resize((w, h), Image.LANCZOS).save(dest, "WEBP", quality=80, method=6)
                after += dest.stat().st_size
    favicons()
    print(f"img/ original: {before / 1e6:.1f} MB -> assets/img/: {after / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
