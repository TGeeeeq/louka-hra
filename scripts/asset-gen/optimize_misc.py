#!/usr/bin/env python3
"""Post-process feature graphic, gameover, fullversion banner into final repo assets."""
import sys
from pathlib import Path
from PIL import Image

SCRATCH = Path(__file__).parent
REPO = Path("/home/tonyfg/Desktop/projekty/hra")

def make_feature_graphic(chosen_index):
    src = SCRATCH / "feature" / f"feature_{chosen_index}.png"
    img = Image.open(src).convert("RGB")  # 1024x512
    # center-crop to 1024x500 (Play requirement)
    w, h = img.size
    target_h = 500
    top = (h - target_h) // 2
    cropped = img.crop((0, top, w, top + target_h))
    out = REPO / "assets" / "store" / "feature-graphic.png"
    cropped.save(out, "PNG", optimize=True)
    size_kb = out.stat().st_size / 1024
    print(f"feature-graphic: {out} {cropped.size} ({size_kb:.1f} KB)")
    if size_kb > 1000:
        # fall back to JPEG q90 if PNG too big
        out_jpg = REPO / "assets" / "store" / "feature-graphic.jpg"
        cropped.save(out_jpg, "JPEG", quality=90)
        print(f"PNG too big, also saved JPEG fallback: {out_jpg} ({out_jpg.stat().st_size/1024:.1f} KB)")

def make_gameover():
    src = SCRATCH / "gameover" / "gameover.png"
    img = Image.open(src).convert("RGB")
    img = img.resize((768, 384), Image.LANCZOS)
    out = REPO / "public" / "ui" / "gameover.webp"
    img.save(out, "WEBP", quality=72)
    print(f"gameover: {out} ({out.stat().st_size/1024:.1f} KB)")

def make_fullversion():
    src = SCRATCH / "fullversion" / "fullversion.png"
    img = Image.open(src).convert("RGB")
    img = img.resize((768, 384), Image.LANCZOS)
    out = REPO / "public" / "ui" / "fullversion-banner.webp"
    img.save(out, "WEBP", quality=72)
    print(f"fullversion: {out} ({out.stat().st_size/1024:.1f} KB)")

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "feature":
        make_feature_graphic(int(sys.argv[2]))
    elif cmd == "gameover":
        make_gameover()
    elif cmd == "fullversion":
        make_fullversion()
