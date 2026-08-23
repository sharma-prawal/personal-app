from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

SOURCE = Path("public/favicon-master.png")
OUTPUT = Path("public/icons")
OUTPUT.mkdir(parents=True, exist_ok=True)

with Image.open(SOURCE) as opened:
    master = ImageOps.fit(opened.convert("RGB"), (1024, 1024), method=Image.Resampling.LANCZOS)

# The generated master has generous negative space. A tighter crop keeps the
# converging-strokes symbol legible in browser tabs without changing its form.
mark = master.crop((206, 206, 818, 818))
mark = ImageEnhance.Contrast(mark).enhance(1.08)

def square_icon(size: int, padding: float = 0.10) -> Image.Image:
    canvas = Image.new("RGB", (size, size), "#0c0a09")
    inner = max(1, round(size * (1 - 2 * padding)))
    resized = mark.resize((inner, inner), Image.Resampling.LANCZOS)
    if size <= 48:
        resized = resized.filter(ImageFilter.UnsharpMask(radius=.45, percent=130, threshold=2))
    offset = (size - inner) // 2
    canvas.paste(resized, (offset, offset))
    return canvas

for size in (16, 32, 48, 180, 192, 512):
    square_icon(size).save(OUTPUT / f"favicon-{size}x{size}.png", optimize=True)

# Maskable icons retain extra breathing room for circular and rounded masks.
square_icon(512, padding=.18).save(OUTPUT / "maskable-icon-512x512.png", optimize=True)

square_icon(48).save(
    "public/favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)

print("Generated favicon.ico and seven PNG icons")
