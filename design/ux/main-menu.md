# UX Spec: Úvodní sekvence + hlavní menu (title screen)

> **Status**: Approved (zadání hráče/PO: profesionální „AAA" dojem, volba orientace místo výzvy k otočení, delší intro, plynulý přechod do menu)
> **Author**: Lukáš + ux-designer (Claude)
> **Last Updated**: 2026-07-02
> **Journey Phase(s)**: První dojem / návrat ke hře (před spuštěním světa)
> **Template**: UX Spec
> **Poznámka**: Projekt nemá game-concept.md ani player-journey.md — spec vychází ze stávající implementace a přímého zadání.

---

## Purpose & Player Need

Hráč přichází s cílem **začít (nebo obnovit) hru** a během prvních sekund si udělat
úsudek o kvalitě titulu. Obrazovka musí: (1) na dotykovém zařízení nechat hráče
**vybrat orientaci** (na šířku / na výšku) místo direktivní výzvy „otoč telefon",
(2) odvyprávět krátké filmové intro (logo azylu + zvířecí stampede),
(3) plynule přejít do čistého, prémiového hlavního menu.

## Player Context on Arrival

- První spuštění: zvědavost, nulová znalost ovládání. Mobil často na výšku.
- Návrat: chce jedním klikem pokračovat v rozehrané hře.
- Emoce: klid, žádný časový tlak — intro lze kdykoli přeskočit klepnutím.

## Navigation Position

Root → **Title sequence** (volba orientace → intro → menu). Menu je kořen navigace:
Pokračovat/Nová hra → svět; O Louce → modal; Rozšíření → DLC modal (vlastní App overlay).

## Entry & Exit Points

| Entry Source | Trigger | Kontext |
|---|---|---|
| Načtení aplikace, `state.started === false` | mount | uložený postup (den, sezóna) |
| `prefers-reduced-motion` | mount | přeskočí volbu i intro → rovnou menu |

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
| Volba orientace | 2 karty + potvrzení | tap/klik, Enter | jen dotyková zařízení na výšku; „Na šířku" = doporučeno, best-effort fullscreen + `screen.orientation.lock` |
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
| Volba orientace | dotyk + na výšku | karty Na šířku (předvolená) / Na výšku + „Spustit" |
| Intro (logo) | po potvrzení volby / rovnou na desktopu | malba loga, stampede, skip klepnutím |
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
- Volba → intro: fade (0.5 s).
- Intro: malba loga 2,4 s → usazení + záře → **outro fade-out 1,6 s souběžně s rozedněním** (odstranění tvrdého střihu) → menu prvky stagger fade-up.
- Menu → hra: crossfade 0.42 s + `game-fade-in` ve světě.
- Vše respektuje `prefers-reduced-motion`.

## Data Requirements
| Data | Zdroj | R/W |
|---|---|---|
| `hasSave`, `day`, `season` | game store (localStorage save) | Read |
| DLC vlastnictví | entitlements | Read (přes DlcStore) |

## Accessibility
- Kompletní ovládání klávesnicí (tab pořadí: volba → potvrzení; menu shora dolů).
- Skip intra i klávesou; reduced-motion bez animací.
- Kontrast: tmavá skla tlačítek na světlém pozadí ≥ 4,5:1; dekorativní prvky `aria-hidden`.
- Žádná informace jen barvou (vybraná karta má i ✓/rámeček + text „doporučeno").

## Localization Considerations
- Texty tlačítek jednořádkové, rezerva ~40 % šířky; detail uloženého dne na vlastním řádku.

## Acceptance Criteria
- [ ] Na dotykovém zařízení na výšku se místo výzvy k otočení zobrazí volba orientace; intro startuje až po potvrzení.
- [ ] Volba „Na šířku" se pokusí o fullscreen + orientation lock; při selhání hra pokračuje bez chyby.
- [ ] Intro trvá ~8 s a končí plynulým prolnutím (logo fade-out + rozednění), žádný tvrdý střih.
- [ ] Klepnutí/klávesa kdykoli během intra přeskočí rovnou do menu.
- [ ] „Pokračovat" zobrazuje den a sezónu uloženého postupu; „Nová hra" s uloženým postupem vyžaduje potvrzení.
- [ ] Menu je plně ovladatelné klávesnicí a respektuje `prefers-reduced-motion`.

## Open Questions
- Player journey map neexistuje (`design/player-journey.md`) — doplnit později.
- Accessibility tier zatím neurčen — baseline WCAG-AA.
