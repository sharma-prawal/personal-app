from pathlib import Path
from PIL import Image, ImageOps

SELECTED = [
    "IMG_1057.jpeg", "IMG_1455.jpeg", "IMG_1721.jpeg", "IMG_1783.jpeg",
    "IMG_1866.jpeg", "IMG_1927.jpeg", "IMG_2052.jpeg", "IMG_2203.jpeg",
    "IMG_2281.jpeg", "IMG_2371.jpeg", "IMG_2675.jpeg", "IMG_2894.jpeg",
    "IMG_3260.jpeg", "IMG_3386.jpeg", "IMG_3489.jpeg", "IMG_3585.jpg",
    "IMG_3666.jpeg", "IMG_4137.jpeg", "IMG_4241.jpeg", "IMG_4392.jpeg",
    "IMG_4438.jpg", "IMG_4729.jpg", "IMG_5586.JPEG", "IMG_6018.jpeg",
    "IMG_6616.jpeg", "IMG_8921.jpeg", "IMG_9290.jpeg", "IMG_9879.jpeg",
]

# Sources whose filename would make an unreadable URL.
RENAMED = {
    "c40e6324-bb57-4248-b04c-f49c6b0f0a4a.jpeg": "img_cafe",
}

source_dir = Path("Photos")
output_dir = Path("public/memories")
output_dir.mkdir(parents=True, exist_ok=True)

for filename in SELECTED + list(RENAMED):
    source = source_dir / filename
    stem = RENAMED.get(filename) or source.stem.lower().replace(" ", "-")
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        image.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
        image.save(output_dir / f"{stem}.webp", "WEBP", quality=82, method=6)

print(f"Prepared {len(SELECTED) + len(RENAMED)} selected memories")
