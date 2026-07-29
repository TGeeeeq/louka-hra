# UX Spec: Úvodní sekvence + hlavní menu (title screen)

> **Status**: Approved (zadání hráče/PO: profesionální „AAA" dojem, delší intro, plynulý přechod do menu)
> **Revize 2026-07-29**: hra je **landscape-only** — volba orientace zrušena, na výšku ji nahradil zámek `RotateGate` (viz `design/ux/rotate-gate.md`).
> **Author**: Lukáš + ux-designer (Claude)
> **Last Updated**: 2026-07-02
> **Journey Phase(s)**: První dojem / návrat ke hře (před spuštěním světa)
> **Template**: UX Spec
> **Poznámka**: Projekt nemá game-concept.md ani player-journey.md — spec vychází ze stávající implementace a přímého zadání.

---

## Purpose & Player Need

Hráč přichází s cílem **začít (nebo obnovit) hru** a během prvních sekund si udělat
úsudek o kvalitě titulu. Obrazovka musí: (1) odvyprávět krátké filmové intro
(logo azylu + zvířecí stampede), (2) plynule přejít do čistého, prémiového
hlavního menu. Orientaci řeší vrstva nad ní: dokud je telefon na výšku, leží
přes hru `RotateGate` a intro se ani nerozjede.

## Player Context on Arrival

- První spuštění: zvědavost, nulová znalost ovládání. Mobil často na výšku → nejdřív `RotateGate`, teprve pak intro.
- Návrat: chce jedním klikem pokračovat v rozehrané hře.
- Emoce: klid, žádný časový tlak — intro lze kdykoli přeskočit klepnutím.

## Navigation Position

Root → (`RotateGate`, jen na výšku) → **Title sequence** (intro → menu). Menu je kořen navigace:
Pokračovat/Nová hra → svět; O Louce → modal; Rozšíření → DLC modal (vlastní App overlay).

## Entry & Exit Points

| Entry Source | Trigger | Kontext |
|---|---|---|
| Načtení aplikace, `state.started === false` | mount | uložený postup (den, sezóna) |
| `prefers-reduced-motion` | mount | přeskočí intro → rovnou menu |
| Otočení telefonu na šířku | `RotateGate` zmizí | intro se rozjede od začátku (znělka AF) |

| Exit Destination | Trigger | Poznámky |
|---|---|---|
| Svět hry | Pokračovat / Nová hra (+ potvrzení) | crossfade 0.42 s, `sound.ensure()` |
| DLC modal | Rozšíření | zůstává nad menu |
| O Louce modal | O Louce | příběh + průvodci (přesunuto z menu karty) |

## Layout Specification

### Information Hierarchy
1. Titul **Louka** (+ tagline azylu) — brand.
2. Primární akce: **Pokračovat** (s detailem uloženého dne) / **Nová hra**.
3. Sekundární: O Louce, Rozšíření.
4. Terciární (patička): kredit azylu + autora.

### Layout Zones
- **Scéna** (celoplošné pozadí): východ slunce, kopce, pasoucí se zvířata, světelné pyly — plynule navazuje na intro (stejná scéna, žádný střih).
- **Hero** (horní ⅓): titul + tagline.
- **Nav** (střed): svislý sloupec tlačítek, pevná šířka min(320px, 82vw).
- **Patička**: kredity vlevo/vpravo, drobné písmo.

### Component Inventory
| Komponenta | Typ | Interakce | Pozn. |
|---|---|---|---|
| Zámek orientace | blokující obrazovka | tap na „Otočit za mě" | jen na výšku; vlastní spec `design/ux/rotate-gate.md` |
| Logo intro | animace | tap = skip | delší (~8,4 s) + fade-out logo do rozednění (žádný tvrdý střih) |
| Menu tlačítka | button sloupec | hover/tap | primární = plné, sekundární = sklo (blur + hairline) |
| Potvrzení nové hry | modal | 2 tlačítka | jen pokud existuje uložený postup |
| O Louce | modal | zavřít | příběh hry + 3 průvodci |

### ASCII Wireframe (menu)
```
┌──────────────────────────────────────────┐
│                 ☀ (slunce)               │
│                LOUKA                     │
│      — survival azylu Nech mě růst —     │
│            ┌──────────────┐              │
│            │  Pokračovat  │  Den 12·Jaro │
│            │  Nová hra    │              │
│            │  O Louce     │              │
│            │  Rozšíření   │              │
│            └──────────────┘              │
│  🐐 🐑  (pasoucí se zvířata na kopcích) 🐖│
│ kredit azylu              kredit autora  │
└──────────────────────────────────────────┘
```

## States & Variants
| Stav | Trigger | Změna |
|---|---|---|
| Zámek orientace | displej na výšku | přes vše leží `RotateGate`, intro pozastaveno |
| Intro (logo) | naležato (nebo desktop) | malba loga, stampede, skip klepnutím |
| Outro | ~6,8 s | logo se rozpouští, slunce vychází — crossfade do menu |
| Menu bez uložené hry | `!hasSave` | primární = „Začít hrát", bez potvrzení |
| Menu s uloženou hrou | `hasSave` | primární = „Pokračovat (Den X · sezóna)", Nová hra chce potvrzení |
| Reduced motion | media query | vše statické, rovnou menu |

## Interaction Map
Vstupy: dotyk + myš + klávesnice (web). Každé tlačítko: hover/focus stav,
`sound.select()` klik, viditelný focus ring. Skip intra: pointerdown/keydown kdekoli.

## Events Fired
| Akce | Event |
|---|---|
| Pokračovat | dispatch `START` |
| Nová hra (potvrzeno) | dispatch `RESET` (přepis uloženého postupu — potvrzení povinné) |
| Rozšíření | `onDlc()` |

## Transitions & Animations
- Zámek orientace → intro: `RotateGate` odejde prolnutím 0,44 s, intro nastupuje fade 0,5 s.
- Intro: malba loga 2,4 s → usazení + záře → **outro fade-out 1,6 s souběžně s rozedněním** (odstranění tvrdého střihu) → menu prvky stagger fade-up.
- Menu → hra: crossfade 0.42 s + `game-fade-in` ve světě.
- Vše respektuje `prefers-reduced-motion`.

## Data Requirements
| Data | Zdroj | R/W |
|---|---|---|
| `hasSave`, `day`, `season` | game store (localStorage save) | Read |
| DLC vlastnictví | entitlements | Read (přes DlcStore) |

## Accessibility
- Kompletní ovládání klávesnicí (tab pořadí: menu shora dolů).
- Skip intra i klávesou; reduced-motion bez animací.
- Kontrast: tmavá skla tlačítek na světlém pozadí ≥ 4,5:1; dekorativní prvky `aria-hidden`.
- Žádná informace jen barvou.

## Localization Considerations
- Texty tlačítek jednořádkové, rezerva ~40 % šířky; detail uloženého dne na vlastním řádku.
- Tvůrce postavy na nízkých displejích (naležato ≤ 560 px) skrývá eyebrow/lede a zmenšuje náhledy, ať se „Začít" vejde bez scrollu.

## Acceptance Criteria
- [ ] Na displeji na výšku se zobrazí `RotateGate`; intro (včetně znělky AF) startuje teprve po otočení naležato.
- [ ] První gesto na dotykovém zařízení se pokusí o fullscreen + orientation lock; při selhání hra pokračuje bez chyby.
- [ ] Intro trvá ~8 s a končí plynulým prolnutím (logo fade-out + rozednění), žádný tvrdý střih.
- [ ] Klepnutí/klávesa kdykoli během intra přeskočí rovnou do menu.
- [ ] „Pokračovat" zobrazuje den a sezónu uloženého postupu; „Nová hra" s uloženým postupem vyžaduje potvrzení.
- [ ] Menu je plně ovladatelné klávesnicí a respektuje `prefers-reduced-motion`.

## Open Questions
- Player journey map neexistuje (`design/player-journey.md`) — doplnit později.
- Accessibility tier zatím neurčen — baseline WCAG-AA.
