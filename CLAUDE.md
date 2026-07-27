# Louka — projektová pravidla

## Hra je POUZE 2D

- Louka je a zůstává **2D hra**: Canvas 2D svět (`src/world/draw.ts`), ručně psané SVG sprity (`src/ui/sprites/`), Web Audio syntéza (`src/audio/sound.ts`). Žádný three.js, R3F ani GLB v produkci.
- **3D se řeší JEN tehdy, když to uživatel v dané chvíli výslovně řekne** („teďka řešíme 3D verzi"). Jinak všechny návrhy, plány a implementace směřují výhradně na 2D.
- 3D experiment (2026-07) je zachovaný a odložený stranou — **nemazat, nemergovat, nevyvíjet**:
  - větev `feature/3d-svet` (lokálně i na origin, tip `e6ece2b`)
  - 3D modely v sibling složce `~/Desktop/projekty/louka-3d-modely/`

## Assety

- Fotky zvířat v `public/animals/` jsou skutečné fotky obyvatel azylu z nechmerust.org (použití se svolením) — **nikdy nenahrazovat AI generací**. AI generace patří jen do stylizované vrstvy (ilustrace, textury, audio, store grafika).
- Art styl: ručně malovaný akvarel/storybook, chibi proporce, paleta moss `#2d5a3d` / cream `#f7f2e7` / terracotta `#b85c3c`. Bez násilí (liška se skamarádí, nebojuje se s ní).
