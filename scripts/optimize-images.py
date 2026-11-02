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
    "profile.png": ("retrato", (560, 1100)),
    "team-1.png": ("jirafa", (360, 550)),
    "about-1.jpg": ("taller", (480, 930)),
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
        for w in widths:
            w = min(w, im.width)
            h = round(im.height * w / im.width)
            dest = OUT / f"{stem}-{w}.webp"
            im.resize((w, h), Image.LANCZOS).save(dest, "WEBP", quality=80, method=6)
            after += dest.stat().st_size
    print(f"img/ original: {before / 1e6:.1f} MB -> assets/img/: {after / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
