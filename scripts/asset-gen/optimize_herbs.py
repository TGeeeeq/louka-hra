#!/usr/bin/env python3
import sys
from pathlib import Path
from PIL import Image

SCRATCH = Path(__file__).parent
REPO_HERBS = Path("/home/tonyfg/Desktop/projekty/hra/public/herbs")

def optimize_one(herb_id):
    src = SCRATCH / "herbs" / f"{herb_id}.png"
    if not src.exists():
        print(f"MISSING raw: {src}")
        return False
    img = Image.open(src).convert("RGB")
    img = img.resize((512, 512), Image.LANCZOS)
    out = REPO_HERBS / f"{herb_id}.webp"
    img.save(out, "WEBP", quality=72)
    size_kb = out.stat().st_size / 1024
    print(f"{herb_id}: {out} ({size_kb:.1f} KB)")
    return True

if __name__ == "__main__":
    ids = sys.argv[1:]
    if not ids:
        ids = [p.stem for p in (SCRATCH / "herbs").glob("*.png")]
    for hid in sorted(ids):
        optimize_one(hid)
