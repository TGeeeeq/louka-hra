# Design: Locations with Content (Satellites)

**Date:** 2026-07-18
**Status:** Approved direction (autonomous build authorized), sub-project 3 (spec B).
**Depends on:** Spec 1 (map 96×72, WORLD_FEATURES split). Independent of spec 2.

## Problem

The 96×72 map (spec 1) has one big central home meadow plus two **stub** satellite
clearings (east `(84,20)`, south `(16,58)`) that have no identity or content.
Worse, the authored `WORLD_FEATURES` (herb spots `byliny*`, `brana`, `truhla`,
`seniste`, `cedule`) still sit at the OLD small-map coordinates — they cluster in
and around the central meadow instead of being out in the world. Exploring the map
has no payoff.

## Vision

Give the world places worth walking to: distinct, themed, reachable satellite
locations with their own gathering content, so the meadow feels like the center of
a small world (a step toward the original "locations around the main meadow" idea,
done in 2D).

## Goal

Two themed satellite locations, each a real clearing connected by a forest path,
with relocated + a little new content and a naming sign:
1. **Bylinková louka (herb meadow)** — east satellite: a cluster of herb-gathering
   spots + sign. The place you go to collect byliny for salves/tea.
2. **Rybník (pond)** — south satellite: the pond, a few ducks wandering, herb
   spots "u rybníka" + sign.

Plus: fix the stray `WORLD_FEATURES` coordinates so nothing floats in the wrong
place, and keep the existing **forest-gate puzzle + chest** as a small locked
beat guarding one of the satellites.

## Out of Scope

- Brand-new mechanics (fishing, mining) — gathering reuses existing `byliny`.
- 7 full locations — two themed satellites now; more can follow the same pattern.
- New art beyond existing sprites/tiles.

## Principles

- Reuse existing content: `byliny` gathering, `brana`/`truhla` puzzle, duck
  sprites already exist. This is placement + theming, not new systems.
- Keep the map generation deterministic (seeded), as today.
- Every satellite must be reachable on foot (carved clearing + path corridor).

## Design

### Map (`src/world/tiles.ts`)
- Keep REGIONS: main `(48,34)`, east `(84,20)`, south `(16,58)`. Ensure both
  satellites are generously sized and the CORRIDORS actually connect them to the
  main meadow (verify paths are walkable end-to-end, not blocked by forest/water).
- Pond sits inside the south satellite (`pondCx/pondCy` ≈ `(16,58)`); keep a grassy
  bank around it (DIRT ring) so it reads as a pond, not a lake filling the clearing.

### World features (`src/world/entities.ts`)
Relocate `WORLD_FEATURES` onto the new map:
- **East herb meadow:** `byliny4/5/6` clustered around `(82–88, 17–23)` + a
  `cedule` sign labelled "Bylinková louka" at the clearing entrance.
- **South pond:** `byliny7` ("u rybníka") near the pond bank `(14–20, 54–60)` + a
  `cedule` sign "Rybník". Add a small flock of ducks wandering the pond (reuse the
  existing `kachny`/duck sprite via an ambient spawn near the pond, cosmetic; if
  ambient wildlife spawning doesn't exist, skip the ducks — signs + herbs are the
  MVP).
- **Near/around the home meadow:** keep a couple of `byliny` close (`byliny1/2`)
  for early game so the player isn't forced to travel on day one. Put the rest in
  the satellites.
- **Forest-gate puzzle:** move `brana` (`GATE_TILES`) onto the corridor leading to
  ONE satellite (e.g. east), and `truhla` (chest) just inside that satellite, so
  opening the gate rewards reaching the location. Verify `GATE_TILES` coordinates
  match `brana`'s new position and `openGate()` clears the right tiles.
- Re-run the `carveClearing` pass so all relocated features sit on walkable ground.
- Verify `seniste` (hay meadow, DLC) sits somewhere sensible on grass (near the
  south/pond side reads well) — just fix its coordinate.

### Signs (`cedule`)
`cedule` currently renders a generic help dialog. Allow per-instance sign text:
give the two location signs their own short flavor lines (e.g. herb meadow: "Tady
roste řebříček, kopřiva a heřmánek — trhej, co potřebuješ."; pond: "Rybník. Kachny
si sem chodí zaplavat."). Minimal approach: add an optional `note` to the sign
interactable and show it in the dialog when present, else the default.

## Test Strategy

- **Unit** (extend `map.test.ts`): every `WORLD_FEATURES` entry and both location
  signs sit on non-solid tiles and within map bounds; the herb-meadow byliny are
  inside the east region ellipse; the pond byliny near the pond; `GATE_TILES`
  match `brana`'s tile.
- **Reachability test:** a simple flood-fill from `PLAYER_START` over non-solid
  tiles reaches at least one herb spot in each satellite (guards against a
  satellite sealed off by forest). If a flood-fill helper is too much, assert the
  corridor tiles between main and each satellite are non-solid.
- **Manual (webapp-testing):** walk east → reach herb meadow, sign shows its text,
  gather byliny; walk south → pond with ducks + sign; open the forest gate puzzle
  and reach the chest. No console errors.

## Files Touched (anticipated)

- `src/world/tiles.ts` — satellite sizing, corridors, pond placement, `GATE_TILES`.
- `src/world/entities.ts` — relocate `WORLD_FEATURES`, add location signs with
  `note`, (optional) ambient ducks near pond.
- `src/world/draw.ts` — only if a sign needs a variant; likely none.
- `src/game/build/map.test.ts` — extend with location + reachability assertions.
