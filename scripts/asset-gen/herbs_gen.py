#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from gen import get_client, generate, save_result, STYLE_TAIL, SCRATCH

HERBS = [
    ("f_rebricek", "yarrow", "Achillea millefolium"),
    ("f_mesicek", "pot marigold", "Calendula officinalis"),
    ("f_trezalka", "St. John's wort", "Hypericum perforatum"),
    ("f_kopriva", "stinging nettle", "Urtica dioica"),
    ("f_hermanek", "chamomile", "Matricaria chamomilla"),
    ("f_podbel", "coltsfoot", "Tussilago farfara"),
    ("f_mata", "peppermint", "Mentha piperita"),
    ("f_medunka", "lemon balm", "Melissa officinalis"),
    ("f_jitrocel", "ribwort plantain", "Plantago lanceolata"),
    ("f_sedmikraska", "common daisy", "Bellis perennis"),
    ("f_pampeliska", "dandelion", "Taraxacum officinale"),
    ("f_sipek_c", "dog rose with rose hips", "Rosa canina"),
    ("f_bez", "elderberry (elder branch with berries)", "Sambucus nigra"),
    ("f_lipa", "linden (lime tree) blossom branch", "Tilia cordata"),
    ("f_kontryhel", "lady's mantle", "Alchemilla vulgaris"),
]

def main():
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    client = get_client()
    out_dir = SCRATCH / "herbs"
    out_dir.mkdir(exist_ok=True)
    for herb_id, en_name, latin in HERBS:
        if only and herb_id not in only:
            continue
        prompt = (
            f"Hand-painted watercolor botanical illustration of a {en_name} plant "
            f"({latin}), storybook herbarium style, single plant centered on plain "
            f"cream background, " + STYLE_TAIL
        )
        out_path = out_dir / f"{herb_id}.png"
        print(f"=== {herb_id} ({en_name}) ===")
        try:
            seed = generate(client, prompt, 1024, 1024, out_path)
            save_result(herb_id, {"prompt": prompt, "seed": seed, "raw": str(out_path)})
        except Exception as e:
            print(f"FAILED {herb_id}: {e}")
            save_result(herb_id, {"prompt": prompt, "error": str(e)})

if __name__ == "__main__":
    main()
