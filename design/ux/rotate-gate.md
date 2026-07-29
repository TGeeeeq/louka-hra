# UX Spec: Zámek orientace („Otoč telefon na šířku")

> **Status**: Approved
> **Author**: Lukáš + ux-designer (Claude)
> **Last Updated**: 2026-07-29
> **Journey Phase(s)**: První dojem (před intrem) + kdykoli za běhu hry, když se telefon překlopí
> **Template**: UX Spec
> **Implementace**: `src/ui/components/RotateGate.tsx`, `src/ui/orientation.ts`, `.rotate-gate` v `src/styles/global.css`

---

## Purpose & Player Need

Louka je **landscape-only**: herní výřez (~35×22 dlaždic) plus HUD nahoře a
dotykový kříž dole se na výšku nedají poskládat tak, aby hráč viděl, kam jde.
Dřívější řešení (nabídka „na šířku / na výšku") slibovalo hratelnost, kterou hra
na výšku nedodrží — proto ji nahrazuje jeden jasný stav: **dokud je telefon na
výšku, hra nezačíná**.

Obrazovka musí hráče (1) beze slov naučit, *co* má udělat, (2) neznít jako
chybová hláška, ale jako první záběr Louky, (3) nechat ho pokračovat bez jediného
dalšího kliknutí, jen otočením telefonu.

## Player Context on Arrival

- Nejčastěji **první sekunda po spuštění** — hráč drží telefon na výšku, o hře
  neví nic a nemá trpělivost na text.
- Vzácněji **za běhu hry** (telefon se překlopí v ruce, tablet vytažený ze
  stojanu) — hráč je uprostřed úkolu a chce se rychle vrátit; postup je uložený
  (`flushSave` běží na pozadí), takže hrozí jen ztráta rytmu, ne dat.
- Emoce: mírná nejistota („rozbilo se to?“). Design ji musí okamžitě vyvrátit —
  proto stejná akvarelová scéna jako v intru, brand „Louka“ a klidný tón.

## Navigation Position

Nejvyšší vrstva aplikace (mount v `main.tsx`, `z-index: 999`) — leží nad intrem,
menu i rozehranou hrou. Není to destinace v navigaci, ale **stavová bariéra**:
nemá žádný „zpět“ a nedá se zavřít, jen splnit.

## Entry & Exit Points

| Entry Source | Trigger | Kontext |
|---|---|---|
| Spuštění / PWA / web | `isPortraitBlocked()` při mountu | intro se nerozjede (`held` v `Intro.tsx`) |
| Rotace za běhu hry | `resize` / `orientationchange` | hra pod tím zůstává, jen je zakrytá |
| Úzké okno na desktopu | výška > šířka **a** šířka < 620 px | fallback, aby se hra nekreslila do sloupce |

| Exit Destination | Trigger | Poznámky |
|---|---|---|
| Intro / menu / hra (odkud hráč přišel) | displej naležato | odchod prolnutím 0,44 s (`OUT_MS`), pak unmount |
| Fullscreen + zámek orientace | „Otočit za mě“ | jen kde `screen.orientation.lock` existuje; selhání je bez chyby |

Nativní Android tuhle obrazovku nikdy neuvidí — `AndroidManifest.xml` má
`android:screenOrientation="sensorLandscape"`, PWA manifest `orientation: "landscape"`.
Gate je tedy pojistka pro web/PWA a pro shelly, kde zámek neplatí (iOS Safari).

## Layout Specification

### Information Hierarchy
1. **Animace telefonu**, který se otočí naležato — nese celé sdělení bez textu.
2. **Výzva** „Otoč telefon na šířku“ (Fraunces, největší text na scéně).
3. **Důvod** — proč naležato (celá pastvina, zvířata, cesta k lesu).
4. **Zkratka** „Otočit za mě“ (fullscreen + orientation lock), jen kde to jde.
5. **Ujištění** „Hra se rozběhne sama, jak telefon otočíš.“ — hráč nemusí nic hledat.
6. Patička s brandem azylu (dekorace, `aria-hidden`).

### Layout Zones
- **Scéna** (celoplošně): úsvitový gradient + slunce + dva pásy kopců + pyly —
  identická paleta jako `.intro`, aby gate působil jako součást titulní sekvence.
- **Jeviště** (svislý střed, max 460 px): animace → výzva → důvod → akce → ujištění.
- **Patička** (spodní okraj, respektuje `safe-area-inset`).

### Component Inventory
| Komponenta | Typ | Interaktivní | Pozn. |
|---|---|---|---|
| Rám telefonu | CSS blok + SVG | ne | otáčí se 0° → −90°, cyklus 4,4 s |
| Miniatura louky | inline SVG | ne | **protiotočka** +90° drží svět vzpřímený → naležato je vidět celý |
| Oblouk se šipkou | SVG path + polygon | ne | dokresluje se `stroke-dashoffset` přesně v okamžiku otáčení |
| Záře (halo) | CSS gradient | ne | pulz v momentě „hotovo naležato“ |
| „Otočit za mě“ | button | ano | `tryLockLandscape()`; renderuje se jen když `canLockLandscape()` |
| Pyly / kopce / slunce | SVG + CSS | ne | `aria-hidden` |

### ASCII Wireframe
```
┌────────────────────────────────┐
│            (úsvit)             │
│          ╭──────╮  ↰ oblouk    │
│          │ ▓▓▓▓ │  se šipkou   │
│          │ ▓▓▓▓ │ → otočí se   │
│          ╰──────╯   naležato   │
│                                │
│             LOUKA              │
│    Otoč telefon na šířku       │
│  Louka se hraje naležato…      │
│      [ Otočit za mě ]          │
│   • Hra se rozběhne sama…      │
│  ～～～ (kopce) ～～～           │
│   AZYL PRO ZVÍŘATA NECH MĚ RŮST│
└────────────────────────────────┘
```

## States & Variants
| Stav | Trigger | Změna |
|---|---|---|
| Default | displej na výšku | plná scéna + smyčka animace |
| Bez zkratky | `canLockLandscape() === false` (iOS Safari) | tlačítko „Otočit za mě“ se nerenderuje |
| Nízký displej | `max-height: 520px` | menší telefon/oblouk, skryté „proč“ a patička |
| Odchod | otočeno naležato | 0,44 s fade + scale(1.03), pak unmount |
| Reduced motion | media query | telefon **staticky naležato**, oblouk dokreslený, žádný pohyb |

## Interaction Map
Vstupy: dotyk (primární), myš, klávesnice.

| Akce | Vstup | Feedback | Výsledek |
|---|---|---|---|
| Fyzické otočení telefonu | senzor | scéna se prolne pryč | intro/hra pokračuje |
| „Otočit za mě“ | tap / klik / Enter | press-squash, focus ring | fullscreen + `screen.orientation.lock("landscape")` |
| Tap kamkoli jinam | dotyk | nic | **schválně nic** — nesmí přeskočit intro pod gate |
| První gesto po otočení | tap / klávesa | — | `sound.startMenuMusic()` + best-effort zámek naležato |

## Events Fired
| Akce | Event | Data |
|---|---|---|
| Zobrazení / skrytí gate | žádný | čistě prezentační vrstva, herní stav nemění |
| „Otočit za mě“ | žádný (jen Web API) | `requestFullscreen` + `orientation.lock` |

## Transitions & Animations
- **Nástup**: fade 0,5 s; texty stagger fade-up 0,1–0,42 s.
- **Smyčka (4,4 s, jedno `--rg-flip` pro všechny vrstvy)**: 0–16 % klid na výšku →
  16–40 % otočení (+ kreslení oblouku) → 40–82 % držení naležato (pulz záře) →
  82 % návrat na výšku ve chvíli, kdy je blok neviditelný (mizení 81–84 %) —
  čitelnější než zpětné otáčení, které by hráče mátlo.
- **Odchod**: fade + scale(1.03), 0,44 s.
- **Reduced motion**: bez pohybu, telefon leží naležato (informace zůstává, mizí jen pohyb).

## Data Requirements
| Data | Zdroj | R/W | Pozn. |
|---|---|---|---|
| Orientace displeje | `window.innerHeight/Width`, `matchMedia` | Read | `usePortraitBlocked()` |
| Podpora zámku | `screen.orientation.lock` | Read | rozhoduje o zobrazení tlačítka |

Gate nečte ani nezapisuje herní stav — leží mimo `GameProvider` logiku, takže
rotace nikdy neshodí rozehranou hru.

## Accessibility
- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` (výzva) + `aria-describedby` (důvod) —
  čtečka ohlásí, co se stalo a co udělat.
- Jediný fokusovatelný prvek je „Otočit za mě“ (viditelný focus ring), takže se
  fokus nemá kam zamotat; dekorace jsou `aria-hidden`.
- `body { overflow: hidden }` po dobu zámku — nic pod tím neodscrolluje.
- Kontrast: krémový text (#f7f2e7) na tmavém úsvitovém gradientu + vinětace ≥ 4,5:1;
  sdělení nikdy nezávisí jen na barvě (ikona + text + animace).
- Respektuje `prefers-reduced-motion`; `safe-area-inset` na všech stranách (notch).

## Localization Considerations
- Výzva se vejde na dvě řádky do 22 em; `clamp()` velikost titulku snese ~40 % delší překlad.
- „Otočit za mě“ musí zůstat na jedné řádce — u delších jazyků zkrátit, ne zalamovat.
- Nepevná výška bloku: text může narůst, layout se posune, nic se nepřekryje.

## Acceptance Criteria
- [ ] Na telefonu na výšku se zobrazí zámek do jednoho vteřinového rámce po načtení; intro (ani znělka AF) se nerozjede.
- [ ] Otočení naležato zámek prolne pryč (< 0,5 s) a intro startuje od začátku.
- [ ] Rotace na výšku **za běhu hry** zakryje hru a po otočení zpět hra pokračuje ve stejném stavu (nic se neresetuje).
- [ ] Tap mimo tlačítko nic nedělá — po otočení není intro přeskočené.
- [ ] „Otočit za mě“ se zobrazí jen tam, kde API existuje; jeho selhání nevyhodí chybu ani nezasekne obrazovku.
- [ ] Při `prefers-reduced-motion` je telefon staticky naležato a nic se nehýbe.
- [ ] Čtečka přečte výzvu i důvod; jediný tabovatelný prvek je „Otočit za mě“.
- [ ] Na desktopu s myší se zámek neobjeví, dokud okno není užší než 620 px.

## Open Questions
- Player journey map neexistuje (`design/player-journey.md`) — kontext hráče je odvozený ze zadání a implementace.
- iOS Safari neumí zámek ani fullscreen z webu; zvážit v PWA instrukcích („přidat na plochu“), jestli se chování zlepší.
