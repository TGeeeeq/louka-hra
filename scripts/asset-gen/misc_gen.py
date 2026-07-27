#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from gen import get_client, generate, save_result, STYLE_TAIL, SCRATCH

FEATURE_PROMPT = (
    "Hand-painted watercolor storybook illustration of a peaceful Czech meadow "
    "animal sanctuary at golden hour, cute chibi farm animals grazing, small "
    "wooden cottage, rolling hills and forest, wide banner composition, " + STYLE_TAIL
)

GAMEOVER_PROMPT = (
    "quiet Czech meadow at dusk, empty wooden fence, soft fading warm light, "
    "melancholic but hopeful mood, wide composition, " + STYLE_TAIL
)

FULLVERSION_PROMPT = (
    "sunlit summer meadow with small wooden cottage and cute chibi farm animals "
    "grazing in the distance, warm inviting golden light, wide banner composition, "
    + STYLE_TAIL
)

def gen_feature():
    client = get_client()
    out_dir = SCRATCH / "feature"
    out_dir.mkdir(exist_ok=True)
    seeds = {}
    for i in range(3):
        out_path = out_dir / f"feature_{i}.png"
        seed = generate(client, FEATURE_PROMPT, 1024, 512, out_path)
        seeds[f"feature_{i}"] = seed
    save_result("feature_graphic_candidates", {"prompt": FEATURE_PROMPT, "seeds": seeds})

def gen_gameover():
    client = get_client()
    out_dir = SCRATCH / "gameover"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "gameover.png"
    seed = generate(client, GAMEOVER_PROMPT, 1024, 512, out_path)
    save_result("gameover", {"prompt": GAMEOVER_PROMPT, "seed": seed})

def gen_fullversion():
    client = get_client()
    out_dir = SCRATCH / "fullversion"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "fullversion.png"
    seed = generate(client, FULLVERSION_PROMPT, 1024, 512, out_path)
    save_result("fullversion", {"prompt": FULLVERSION_PROMPT, "seed": seed})

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("all", "feature"):
        gen_feature()
    if which in ("all", "gameover"):
        gen_gameover()
    if which in ("all", "fullversion"):
        gen_fullversion()
