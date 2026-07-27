# Generování assetů zdarma — open-source toolchain (ověřeno 2026-07-27)

Ověřený postup, jak generovat 2D obsah pro Louku **zdarma a bez lokálního GPU** — vše běží na Hugging Face Spaces (cloud), slabý laptop stačí. Alternativa k placenému Higgsfieldu pro běžnou produkci; Higgsfield nechat na věci, které free nástroje neumí (video, pokročilé úpravy).

> Prozkoumané a zamítnuté: repo `Anil-matcha/Open-Generative-AI` — tváří se jako open source, ale je to jen frontend placené API služby MuAPI.ai (chybí LICENSE, žádný free tier, žádná 3D/SFX generace). Nepoužívat.

## Předpoklady

- Python 3 + `gradio_client` (nainstalováno)
- Přihlášený HF účet (`hf auth login`, účet AntoninFigueroa) — token si `gradio_client` bere přes `huggingface_hub.get_token()`
- Pozor: v `gradio_client` 2.5.0 se token předává jako `Client(space, token=...)`, **ne** `hf_token=` (to vyhodí TypeError)

## 1. Obrázky — FLUX.1 [schnell]

| | |
|---|---|
| Licence | **Apache-2.0** — komerční použití bez omezení |
| Space | `black-forest-labs/FLUX.1-schnell` (ZeroGPU) |
| Rychlost | ~10 s / obrázek, 4 kroky, v testu bez front a bez kvótových problémů |
| Použití | ilustrace bylin do herbáře, feature graphic pro Google Play, UI ilustrace, koncepty |

API: endpoint `/infer`, signatura `predict(prompt, seed, randomize_seed, width, height, num_inference_steps) -> (result, seed)`. Výstup je webp (dict s `path`) — převést přes PIL na PNG.

```python
from gradio_client import Client
from huggingface_hub import get_token

c = Client("black-forest-labs/FLUX.1-schnell", token=get_token())
result, seed = c.predict(
    prompt=PROMPT, seed=0, randomize_seed=True,
    width=1024, height=1024, num_inference_steps=4,
    api_name="/infer",
)
```

### Stylové prompty (ověřené, EN)

Základ stylu Louky přidat ke každému promptu:

> hand-painted watercolor, storybook style, soft brush strokes, muted natural earth tones, moss green #2d5a3d, cream background #f7f2e7, terracotta accents, gentle children's book illustration, no text

- **Herbář** (ověřeno, `flux-a-hermanek`): `Hand-painted watercolor botanical illustration of a chamomile plant (Matricaria chamomilla), storybook herbarium style, + styl výše` — 1024×1024
- **Feature graphic** (ověřeno, `flux-b-feature-graphic`): `Hand-painted watercolor storybook illustration of a peaceful Czech meadow animal sanctuary at golden hour, cute chibi farm animals grazing, small wooden cottage, rolling hills and forest, wide banner composition, + styl výše` — 1024×512 (Play vyžaduje 1024×500 → doříznout)

## 2. Audio (SFX + hudba) — Stable Audio Open

| | |
|---|---|
| Licence | **Stability AI Community License** — komerčně zdarma do $1M/rok obratu (pro Louku OK) |
| Space | primárně `1inkusFace/Stable-Audio-Open-Zero` (rezervuje jen 60 s GPU/klip); záloha `artificialguybr/Stable-Audio-Open-Zero` (rezervuje 180 s → rychle vyčerpá kvótu) |
| Výstup | 44,1 kHz stereo; **model vždy vrátí 47,55 s** bez ohledu na `seconds_total` → lokálně oříznout (stdlib `wave`, příp. `soundfile` pro FLAC) |
| Kvóta | ZeroGPU limit na účet: prakticky **~5–10 klipů denně zdarma**, reset po 24 h |
| Použití | SFX a hudba dle `docs/audio-events-spec.md` (ta slouží jako hotový generační brief) |

Ověřené prompty (výstupy ve scratchpadu session 2026-07-27):
- `single chicken clucking, close-up, clean recording, no background noise` (3 s)
- `soft footsteps walking on grass, gentle rustling, clean foley recording` (4 s)
- `gentle pastoral acoustic folk loop, warm guitar and soft flute, peaceful summer meadow morning, calm children's game background music` (20 s)

⚠️ **MusicGen (Meta) nepoužívat pro vydanou hru** — váhy CC-BY-NC (nekomerční). Jen na prototypy.

## Pravidla

- **Fotky zvířat v `public/animals/` nikdy nenahrazovat AI** — skutečné fotky z nechmerust.org, emoční jádro hry. AI patří jen do stylizované vrstvy.
- Hra je pouze 2D (viz `CLAUDE.md`) — žádná 3D generace.
- Vygenerované assety před nasazením zoptimalizovat jako ostatní (webp q72 pro obrázky, komprimované audio — viz `scripts/fetch-photos.mjs` jako vzor).
