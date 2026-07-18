# Design: Free Building on a Large Meadow

**Date:** 2026-07-18
**Status:** Approved (design), pending implementation plan
**Author:** Antonín Figueroa + Claude

## Problem

Louka currently ships a fixed, hand-authored world: the farm buildings (chalupa,
stánek, dílna, ohniště, kurník, chlívek, pastvina, studna) sit at hard-coded map
positions and the player can only *reposition* one of them (the dog house).
There is no way to freely lay out your own homestead. The map is also small
(72×52) with a cramped main clearing.

The player wants a **sandbox**: arrive on a large open meadow and freely lay out
their homestead — including the core functional buildings — on a grid, paying
with money and gathered materials.

## Vision

> "I have a big meadow in front of me where I can build the basic structures
> wherever I want. It's my layout, it's up to me."

This design is **sub-project 1 of 3**:

1. **This spec** — large meadow + free-building engine (catalog + instances,
   build-mode UI, placement validation, build economy, interaction rewiring).
2. **Spec 2 (later)** — new onboarding: Tomáš welcome cutscene, meadow tour,
   start with only dog + cat, guided first-placement tutorial. Replaces the
   temporary auto-layout with an empty start.
3. **Spec B (later)** — satellite locations (herb meadow, pond, grove) with
   their own content.

## Out of Scope (this spec)

- Tomáš cutscene / narrative onboarding (spec 2).
- Empty-meadow start + guided placement (spec 2).
- Satellite locations with dedicated content (spec B).
- Stone and materials beyond wood (future).
- Deeper character/dialogue work (separate track).

## Principles

- **Every intermediate state ships.** After spec 1 alone the game must be fully
  playable. Empty start depends on the tutorial (spec 2), so spec 1 keeps a
  working auto-layout for new games.
- **Reuse existing infrastructure.** Footprints (`fw/fh`), collision
  (`isSolidTile`, `SOLID`), clearing carve (`carveClearing`), draw-by-`kind`
  (`drawStructure`), and position override (`placements`/`applyPlacements`)
  already exist and are the foundation.
- **No save data loss.** Existing saves migrate cleanly.

## Constraints

- Stack: Vite 5 + React 18 + TypeScript, canvas rendering (`src/world/draw.ts`),
  reducer-based state (`src/game/engine/reducer.ts`). No new runtime deps.
- Target platform includes Google Play (Capacitor) → build UX must work with
  **touch** as well as mouse.
- Performance: rendering must stay viewport-culled on the larger map.

## Goal

The player can enter a build mode on a large meadow, pick a structure from a
categorized catalog, place it on any valid grid tile (paying money and/or wood),
and later move or demolish it. All existing interactions (shop, crafting,
cooking, feeding) work against player-chosen positions.

## Data Model

```ts
type BuildCategory = "zaklad" | "upgrade" | "ohrada" | "dekorace";

// Catalog definition — WHAT can be built
interface Buildable {
  id: string;              // "stanek", "kurnik", "plot", "zahon"...
  kind: InteractKind;      // drives rendering (existing)
  category: BuildCategory;
  label: string;
  fw: number; fh: number;  // footprint in tiles (existing convention)
  cost: { money?: number; wood?: number };
  unique: boolean;         // core buildings true (one per game); fences/decor false
  solid: boolean;
}

// Placed instance — WHAT the player has built
interface Placed {
  uid: string;             // unique instance id
  defId: string;           // → Buildable.id
  tx: number; ty: number;
}
```

New game state field:

```ts
structures: Placed[];      // source of truth for what stands on the meadow
```

`structures` replaces the fixed `INTERACTABLES` array as the runtime source of
truth for what exists on the map. The catalog `Buildable[]` lives in
`src/game/content/buildables.ts` (new). Non-buildable authored points that are
*not* player structures (herb-gathering spots, fox trail, forest gate, chest,
signs) stay as authored world features, kept separate from `structures`.

### Helpers

- `hasBuilt(state, defId): boolean` — is at least one instance of this def placed.
- `structureAt(tx, ty): Placed | null` — footprint-aware lookup.
- `canPlace(state, def, tx, ty): { ok: boolean; reason?: string }` — validation.

## The Meadow

- Expand the map to **~96×72** tiles.
- One **large central home meadow** of open grass, bordered by forest, with 1–2
  path exits stubbed toward future satellite locations.
- Collision unchanged: forest / water / fence remain solid; structures may be
  placed only on grass/dirt tiles, no overlap with other structures or solids,
  fully inside map bounds.
- `carveClearing` continues to guarantee a structure's footprint sits on
  walkable ground (applied at placement time for player-built structures).
- Rendering must remain viewport-culled (verify current canvas draw loop culls
  by camera; extend if it iterates the whole map).

## Build Mode (UX)

The existing edit-mode toggle (🪑 "Zabydlit") becomes **"Stavět" 🔨**.

1. Bottom catalog panel with tabs: **Základ · Upgrady · Ohrady · Dekorace**.
2. Select a buildable → a ghost preview follows the grid cursor/tap; valid tiles
   highlight green, invalid red (with the failure reason).
3. Tap/click confirms → deduct cost, append a `Placed` instance.
4. Selecting an existing structure offers **Přesunout** (move) and **Zbourat**
   (demolish).
5. Works with both mouse and touch (target: Google Play).

Build-mode interactions dispatch new reducer actions (see below); they never
mutate `INTERACTABLES` directly.

## Economy

Materials in this spec: **money + wood** (`drevo`, already an item; gathered via
the existing `ChopWood` minigame). Stone/other deferred.

| Category   | Cost |
|------------|------|
| Základ     | free during tutorial (spec 2 waives); modest money cost otherwise (rebuild after demolish) |
| Upgrade    | money — reuse existing prices from `buildings.ts` |
| Ohrada     | wood |
| Dekorace   | wood (small) or free |

**Demolish refund:** returns **50% of wood cost**, no money. Prevents money
farming; keeps material experimentation cheap.

The existing abstract `buildings[]` upgrade-benefit system (economy effects of
studna/seník/etc.) is preserved; building the physical structure is what now
grants the benefit (placing a `upgrade` structure adds its id to `buildings[]`).

## Interaction Rewiring

Today interactions assume a structure exists at a fixed position. Changes:

- Target-finding (nearest interactable), minimap, and pathfinding iterate
  `structures` (+ authored world features) instead of the static `INTERACTABLES`
  positions.
- Each structure-gated action checks `hasBuilt(defId)`. If absent, show a gentle
  hint (e.g. "Nejdřív potřebuješ dílnu na výrobu.") instead of failing silently.
- Animal-feeding actions gated on their pen (kurník/chlívek/pastvina) being
  built. In spec 1 the auto-layout guarantees they exist; spec 2's tutorial
  guarantees they get built before animals depend on them.

## Migration & Shippability

**Sequencing risk:** an empty meadow with no tutorial is unplayable. Therefore:

- **New game (spec 1):** auto-place the core layout — the current authored
  buildings, repositioned onto the larger meadow — into `structures[]`. Build
  mode layers on top (move / demolish / build more). Fully playable.
- **Empty start + Tomáš guidance:** arrives in spec 2; it replaces the
  auto-layout with an empty `structures[]` and drives guided placement.
- **Old saves:** on load, if `structures[]` is absent, synthesize it from the
  current authored `INTERACTABLES` plus any `placements` overrides, so no world
  is lost. Bump the save version in `src/game/engine/save.ts`.

## Test Strategy

- **Unit** (placement + economy):
  - `canPlace` rejects: out of bounds, on solid tile, overlapping another
    structure, footprint partly off-meadow. Accepts valid grass placement.
  - Cost deduction (money + wood), insufficient-funds rejection.
  - Demolish refunds 50% wood, no money; removes instance.
  - `unique` enforcement (cannot place a second core building).
  - `hasBuilt` reflects placed instances.
- **Migration:** an old save (no `structures`) loads with structures synthesized
  from authored positions + placements; world matches pre-migration.
- **Manual (webapp-testing):** enter build mode, place a structure, move it,
  demolish it; confirm shop/craft/cook/feed all work against the new positions;
  confirm touch and mouse both work.

## Open Questions

None blocking. Meadow size (96×72) and 50% wood refund are provisional and easy
to tune during implementation.

## Files Touched (anticipated)

- `src/game/content/buildables.ts` — **new** catalog.
- `src/game/types.ts` — `Buildable`, `Placed`, `BuildCategory`, `structures`.
- `src/game/engine/state.ts` — initial `structures` (auto-layout).
- `src/game/engine/reducer.ts` — `PLACE_STRUCTURE`, `DEMOLISH_STRUCTURE`,
  updated `MOVE_STRUCTURE`; `hasBuilt`/`canPlace` wiring.
- `src/game/engine/save.ts` — version bump + migration.
- `src/world/tiles.ts` — larger map + central meadow.
- `src/world/entities.ts` — separate authored features from player structures;
  drive rendering/targeting from `structures`.
- `src/ui/world/WorldCanvas.tsx` — build-mode ghost, place/move/demolish input.
- `src/ui/world/Hud.tsx` — "Stavět" toggle + catalog panel.
- New catalog panel component under `src/ui/world/`.
