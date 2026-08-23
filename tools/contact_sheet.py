from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

SOURCE = Path("Photos")
OUTPUT = Path(".curation")
OUTPUT.mkdir(exist_ok=True)

files = sorted(
    p for p in SOURCE.iterdir()
    if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".heic"}
)

cell_w, cell_h = 260, 340
cols, rows = 5, 4
font = ImageFont.load_default(size=16)

for sheet_no in range((len(files) + cols * rows - 1) // (cols * rows)):
    canvas = Image.new("RGB", (cell_w * cols, cell_h * rows), "#171412")
    draw = ImageDraw.Draw(canvas)
    subset = files[sheet_no * cols * rows:(sheet_no + 1) * cols * rows]
    for index, path in enumerate(subset):
        x = (index % cols) * cell_w
        y = (index // cols) * cell_h
        try:
            with Image.open(path) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
                thumb = ImageOps.fit(image, (cell_w - 12, cell_h - 48), method=Image.Resampling.LANCZOS)
                canvas.paste(thumb, (x + 6, y + 6))
        except Exception:
            draw.rectangle((x + 6, y + 6, x + cell_w - 6, y + cell_h - 42), fill="#4a2525")
        label = path.name
        if len(label) > 29:
            label = label[:26] + "…"
        draw.text((x + 8, y + cell_h - 34), label, fill="#f2e8dc", font=font)
    canvas.save(OUTPUT / f"sheet-{sheet_no + 1:02d}.jpg", quality=88)

print(f"Created {(len(files) + cols * rows - 1) // (cols * rows)} sheets for {len(files)} images")
