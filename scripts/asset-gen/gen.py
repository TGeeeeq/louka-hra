#!/usr/bin/env python3
import sys, json, time, traceback
from pathlib import Path
from gradio_client import Client
from huggingface_hub import get_token
from PIL import Image

STYLE_TAIL = (
    "hand-painted watercolor, storybook style, soft brush strokes, "
    "muted natural earth tones, moss green #2d5a3d, cream background #f7f2e7, "
    "terracotta accents, gentle children's book illustration, no text"
)

SCRATCH = Path(__file__).parent
RESULTS_FILE = SCRATCH / "results.json"

def load_results():
    if RESULTS_FILE.exists():
        return json.loads(RESULTS_FILE.read_text())
    return {}

def save_result(key, data):
    r = load_results()
    r[key] = data
    RESULTS_FILE.write_text(json.dumps(r, indent=2, ensure_ascii=False))

def get_client():
    return Client("black-forest-labs/FLUX.1-schnell", token=get_token())

def generate(client, prompt, width, height, out_path, seed=0, retries=3):
    last_err = None
    for attempt in range(retries):
        try:
            result, used_seed = client.predict(
                prompt=prompt, seed=seed, randomize_seed=True,
                width=width, height=height, num_inference_steps=4,
                api_name="/infer",
            )
            img = Image.open(result["path"]) if isinstance(result, dict) else Image.open(result)
            img = img.convert("RGB")
            img.save(out_path)
            print(f"OK -> {out_path} seed={used_seed}")
            return used_seed
        except Exception as e:
            last_err = e
            print(f"attempt {attempt+1} failed: {e}")
            time.sleep(5)
    raise last_err

if __name__ == "__main__":
    print("module loaded ok")
