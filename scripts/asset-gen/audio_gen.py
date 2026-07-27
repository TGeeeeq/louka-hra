#!/usr/bin/env python3
"""Generate one SFX clip via Stable Audio Open (HF Space) and save raw output."""
import os
import sys
import shutil
from gradio_client import Client
from huggingface_hub import get_token

def main():
    name = sys.argv[1]
    prompt = sys.argv[2]
    seconds = float(sys.argv[3]) if len(sys.argv) > 3 else 4.0

    c = Client("1inkusFace/Stable-Audio-Open-Zero", token=get_token())
    result = c.predict(
        prompt=prompt,
        seconds_total=seconds,
        steps=100,
        cfg_scale=7.0,
        use_bfloat=False,
        use_eval=False,
        api_name="/predict",
    )
    print("raw output path:", result)
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")
    os.makedirs(out_dir, exist_ok=True)
    dest = os.path.join(out_dir, f"raw_{name}.wav")
    shutil.copy(result, dest)
    print("saved:", dest)

if __name__ == "__main__":
    main()
