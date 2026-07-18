# Free Building on a Large Meadow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player freely lay out their homestead — including core buildings — on a large meadow via a build mode (place / move / demolish), paying money and wood.

**Architecture:** `structures: Placed[]` becomes the source of truth in game state. A pure `rebuildInteractables(structures)` regenerates the existing runtime `INTERACTABLES` array each time structures change, so all existing consumers (canvas draw, target-finding, minimap, pathfinding) keep working unchanged. A new `buildables.ts` catalog defines what can be built. Pure placement/economy logic is unit-tested; canvas/UI wiring is integration work verified in a browser.

**Tech Stack:** Vite 5 + React 18 + TypeScript, canvas 2D rendering, reducer state, Vitest (added in Task 1).

**Key implementation rule (low blast-radius):** Do NOT hunt down every `it.tx/it.ty` reader. Keep `INTERACTABLES` as the runtime array those readers use; just regenerate its contents from `structures`. This is the same pattern as the existing `applyPlacements`.

---

## File Structure

- `vitest.config.ts` — **new**, test config.
- `src/game/content/buildables.ts` — **new**, the `Buildable[]` catalog + `BUILDABLE_BY_ID`.
- `src/game/build/placement.ts` — **new**, pure logic: `canPlace`, `structureAt`, `hasBuilt`, `buildableToInteractable`, `rebuildInteractables`, `AUTO_LAYOUT`.
- `src/game/build/placement.test.ts` — **new**, unit tests.
- `src/game/build/save.test.ts` — **new**, migration test.
- `src/game/types.ts` — **modify**, add `Buildable`, `Placed`, `BuildCategory`, `structures` field.
- `src/game/engine/state.ts` — **modify**, seed `structures` from `AUTO_LAYOUT`.
- `src/game/engine/reducer.ts` — **modify**, add `PLACE_STRUCTURE`, `DEMOLISH_STRUCTURE`, rewrite `MOVE_STRUCTURE`, economy.
- `src/game/engine/save.ts` — **modify**, migration v5→v6.
- `src/world/tiles.ts` — **modify**, map 96×72 + central meadow.
- `src/world/entities.ts` — **modify**, drive `INTERACTABLES` from `structures` via `rebuildInteractables`; split authored non-buildable features into `WORLD_FEATURES`.
- `src/ui/world/WorldCanvas.tsx` — **modify**, rebuild on `structures` change; build-mode ghost + tap/click place/move/demolish.
- `src/ui/world/BuildPanel.tsx` — **new**, catalog panel.
- `src/ui/world/Hud.tsx` — **modify**, "Stavět" 🔨 toggle wiring.
- `src/App.tsx` — **modify**, pass `structures`/build handlers down.

---

## Task 1: Test infrastructure (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add devDeps + `test` script)
- Test: `src/game/build/placement.test.ts` (smoke)

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install -D vitest@^2.1.8
```
Expected: adds `vitest` to devDependencies, no peer errors (Vite 5 compatible).

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add `test` script to package.json**

In `"scripts"` add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test**

Create `src/game/build/placement.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run and verify pass**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/game/build/placement.test.ts
git commit -m "test: add Vitest test runner + smoke test"
```

---

## Task 2: Types

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: Add build types**

Near the other type exports in `src/game/types.ts`, add:
```ts
export type BuildCategory = "zaklad" | "upgrade" | "ohrada" | "dekorace";

/** Katalogová definice — CO lze postavit. */
export interface Buildable {
  id: string;
  kind: InteractKind;
  category: BuildCategory;
  label: string;
  fw: number;
  fh: number;
  cost: { money?: number; wood?: number };
  unique: boolean;
  solid: boolean;
}

/** Instance — CO hráč postavil. */
export interface Placed {
  uid: string;
  defId: string;
  tx: number;
  ty: number;
}
```
Note: `InteractKind` already exists in this file (used by `entities.ts`). If it is defined in `entities.ts` instead, import it here or move it here — verify with `grep -n "InteractKind" src/game/types.ts src/world/entities.ts` and keep a single definition.

- [ ] **Step 2: Add `structures` to `GameState`**

In the `GameState` interface, right after the `placements` field, add:
```ts
  /** Volně postavené stavby — zdroj pravdy o tom, co stojí na louce. */
  structures: Placed[];
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: errors ONLY about missing `structures` in `initialState` and reducers (fixed in later tasks). No errors inside `types.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(types): Buildable, Placed, BuildCategory, structures field"
```

---

## Task 3: Buildables catalog

**Files:**
- Create: `src/game/content/buildables.ts`

Cross-reference existing `src/world/entities.ts` `INTERACTABLES` for the `kind` and footprint (`fw/fh`) of each core building, and `src/game/content/buildings.ts` for upgrade prices.

- [ ] **Step 1: Write the catalog**

```ts
import type { Buildable } from "../types";

// Core functional buildings (unique — one per game). kind + footprint mirror
// the authored INTERACTABLES so rendering is unchanged.
const ZAKLAD: Buildable[] = [
  { id: "chalupa",  kind: "chalupa",  category: "zaklad", label: "Chalupa",            fw: 3, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "stanek",   kind: "stanek",   category: "zaklad", label: "Stánek (obchod)",    fw: 2, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "dilna",    kind: "dilna",    category: "zaklad", label: "Dílna (výroba)",     fw: 2, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "ohniste",  kind: "ohniste",  category: "zaklad", label: "Ohniště & kuchyně",  fw: 2, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "kurnik",   kind: "kurnik",   category: "zaklad", label: "Kurník",             fw: 3, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "chlivek",  kind: "chlivek",  category: "zaklad", label: "Prasečí chlívek",    fw: 3, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "pastvina", kind: "pastvina", category: "zaklad", label: "Pastvina & seník",   fw: 3, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "buda",     kind: "buda",     category: "zaklad", label: "Psí bouda & pelíšky", fw: 2, fh: 2, cost: { money: 0 }, unique: true, solid: true },
];

// Upgrades — money cost from buildings.ts; placing grants the benefit
// (reducer pushes id into state.buildings).
const UPGRADE: Buildable[] = [
  { id: "studna",   kind: "studna",   category: "upgrade", label: "Studna",  fw: 1, fh: 1, cost: { money: 420 }, unique: true, solid: true },
  { id: "zahrada",  kind: "zahrada",  category: "upgrade", label: "Permakulturní zahrada", fw: 2, fh: 2, cost: { money: 600 }, unique: true, solid: false },
];

// Fences / paddocks — wood.
const OHRADA: Buildable[] = [
  { id: "plot", kind: "cedule", category: "ohrada", label: "Plot", fw: 1, fh: 1, cost: { wood: 2 }, unique: false, solid: false },
];

// Decorations — cheap wood or free.
const DEKORACE: Buildable[] = [
  { id: "cedule_deko", kind: "cedule", category: "dekorace", label: "Cedule", fw: 1, fh: 1, cost: { wood: 1 }, unique: false, solid: false },
];

export const BUILDABLES: Buildable[] = [...ZAKLAD, ...UPGRADE, ...OHRADA, ...DEKORACE];

export const BUILDABLE_BY_ID: Record<string, Buildable> = Object.fromEntries(
  BUILDABLES.map((b) => [b.id, b]),
);
```
Note: `kind` values MUST be existing `InteractKind` values that `drawStructure` in `src/world/draw.ts` already handles — verify each against `grep -n "case \"" src/world/draw.ts` (look inside `drawStructure`). If a `kind` is missing a draw case, either reuse an existing visual or add a case in `draw.ts` (small, do it in this task).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no new errors from `buildables.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/game/content/buildables.ts
git commit -m "feat(content): buildables catalog (zaklad/upgrade/ohrada/dekorace)"
```

---

## Task 4: Pure placement + economy logic (TDD)

**Files:**
- Create: `src/game/build/placement.ts`
- Test: `src/game/build/placement.test.ts` (replace the smoke test)

- [ ] **Step 1: Write failing tests**

Replace `src/game/build/placement.test.ts` with:
```ts
import { describe, it, expect } from "vitest";
import { canPlace, structureAt, hasBuilt } from "./placement";
import type { Placed } from "../types";

const wall = new Set(["10,10"]); // one solid tile for tests
const isSolid = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= 20 || ty >= 20 || wall.has(`${tx},${ty}`);

const at = (defId: string, tx: number, ty: number): Placed => ({ uid: `${defId}-${tx}-${ty}`, defId, tx, ty });

describe("canPlace", () => {
  it("accepts a valid free tile", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 5, ty: 5 }).ok).toBe(true);
  });
  it("rejects out of bounds", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 19, ty: 19, }).ok).toBe(true);
    expect(canPlace({ structures: [], isSolid, def: { fw: 2, fh: 2 }, tx: 19, ty: 19 }).ok).toBe(false);
  });
  it("rejects a solid tile under the footprint", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 10, ty: 10 }).ok).toBe(false);
  });
  it("rejects overlap with an existing structure", () => {
    const structures = [at("stanek", 5, 5)]; // fw/fh come from lookup below
    expect(canPlace({ structures, isSolid, def: { fw: 1, fh: 1 }, tx: 5, ty: 5, footprintOf: () => ({ fw: 2, fh: 2 }) }).ok).toBe(false);
    expect(canPlace({ structures, isSolid, def: { fw: 1, fh: 1 }, tx: 9, ty: 9, footprintOf: () => ({ fw: 2, fh: 2 }) }).ok).toBe(true);
  });
});

describe("structureAt", () => {
  it("finds a structure whose footprint covers the tile", () => {
    const structures = [at("stanek", 5, 5)];
    const found = structureAt(structures, 6, 6, () => ({ fw: 2, fh: 2 }));
    expect(found?.defId).toBe("stanek");
    expect(structureAt(structures, 8, 8, () => ({ fw: 2, fh: 2 }))).toBeNull();
  });
});

describe("hasBuilt", () => {
  it("is true when an instance of the def exists", () => {
    expect(hasBuilt([at("dilna", 3, 3)], "dilna")).toBe(true);
    expect(hasBuilt([at("dilna", 3, 3)], "stanek")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test`
Expected: FAIL — cannot import from `./placement`.

- [ ] **Step 3: Implement `placement.ts`**

```ts
import type { Placed } from "../types";

type Footprint = { fw: number; fh: number };
type FootprintOf = (defId: string) => Footprint;

interface CanPlaceArgs {
  structures: Placed[];
  isSolid: (tx: number, ty: number) => boolean;
  def: Footprint;
  tx: number;
  ty: number;
  footprintOf?: FootprintOf;
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function canPlace(args: CanPlaceArgs): { ok: boolean; reason?: string } {
  const { structures, isSolid, def, tx, ty, footprintOf } = args;
  for (let dy = 0; dy < def.fh; dy++)
    for (let dx = 0; dx < def.fw; dx++)
      if (isSolid(tx + dx, ty + dy)) return { ok: false, reason: "Sem stavět nejde." };
  if (footprintOf) {
    for (const s of structures) {
      const f = footprintOf(s.defId);
      if (overlaps(tx, ty, def.fw, def.fh, s.tx, s.ty, f.fw, f.fh))
        return { ok: false, reason: "Tady už něco stojí." };
    }
  }
  return { ok: true };
}

export function structureAt(structures: Placed[], tx: number, ty: number, footprintOf: FootprintOf): Placed | null {
  for (const s of structures) {
    const f = footprintOf(s.defId);
    if (tx >= s.tx && tx < s.tx + f.fw && ty >= s.ty && ty < s.ty + f.fh) return s;
  }
  return null;
}

export function hasBuilt(structures: Placed[], defId: string): boolean {
  return structures.some((s) => s.defId === defId);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/build/placement.ts src/game/build/placement.test.ts
git commit -m "feat(build): pure placement logic canPlace/structureAt/hasBuilt (TDD)"
```

---

## Task 5: Auto-layout + rebuildInteractables

**Files:**
- Modify: `src/game/build/placement.ts` (add `AUTO_LAYOUT`, `buildableToInteractable`, `rebuildInteractables`)
- Test: extend `src/game/build/placement.test.ts`

Context: read `src/world/entities.ts` for the current authored positions of the 8 core buildings + `buda`/`studna`/`zahrada`. `AUTO_LAYOUT` places these onto the new meadow so a new game (spec 1) stays playable.

- [ ] **Step 1: Add failing test for AUTO_LAYOUT**

Append to `placement.test.ts`:
```ts
import { AUTO_LAYOUT } from "./placement";
describe("AUTO_LAYOUT", () => {
  it("includes the core buildings once each", () => {
    const ids = AUTO_LAYOUT.map((p) => p.defId);
    for (const core of ["chalupa", "stanek", "dilna", "ohniste", "kurnik", "chlivek", "pastvina", "buda"])
      expect(ids.filter((i) => i === core).length).toBe(1);
  });
  it("gives every placement a unique uid", () => {
    const uids = AUTO_LAYOUT.map((p) => p.uid);
    expect(new Set(uids).size).toBe(uids.length);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test` → FAIL (no `AUTO_LAYOUT`).

- [ ] **Step 3: Implement**

Append to `placement.ts` (positions chosen inside the new 96×72 central meadow — see Task 8; keep them all within grass, non-overlapping):
```ts
export const AUTO_LAYOUT: Placed[] = [
  { uid: "auto-chalupa",  defId: "chalupa",  tx: 44, ty: 30 },
  { uid: "auto-stanek",   defId: "stanek",   tx: 50, ty: 32 },
  { uid: "auto-dilna",    defId: "dilna",    tx: 40, ty: 34 },
  { uid: "auto-ohniste",  defId: "ohniste",  tx: 46, ty: 36 },
  { uid: "auto-kurnik",   defId: "kurnik",   tx: 34, ty: 30 },
  { uid: "auto-chlivek",  defId: "chlivek",  tx: 34, ty: 36 },
  { uid: "auto-pastvina", defId: "pastvina", tx: 52, ty: 38 },
  { uid: "auto-buda",     defId: "buda",     tx: 48, ty: 28 },
  { uid: "auto-studna",   defId: "studna",   tx: 42, ty: 28 },
];
```

- [ ] **Step 4: Run to verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/build/placement.ts src/game/build/placement.test.ts
git commit -m "feat(build): AUTO_LAYOUT for playable spec-1 new game"
```

---

## Task 6: Seed initial state + save migration (TDD)

**Files:**
- Modify: `src/game/engine/state.ts`
- Modify: `src/game/engine/save.ts`
- Test: `src/game/build/save.test.ts`

- [ ] **Step 1: Seed `structures` in `initialState`**

In `src/game/engine/state.ts`, import at top:
```ts
import { AUTO_LAYOUT } from "../build/placement";
```
In the returned object, right after `placements: {},` add:
```ts
    structures: AUTO_LAYOUT.map((p) => ({ ...p })),
```

- [ ] **Step 2: Write failing migration test**

Create `src/game/build/save.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { migrateSave } from "../engine/save";
import { initialState } from "../engine/state";

describe("migrateSave v5→v6", () => {
  it("synthesizes structures for a save that lacks them", () => {
    const old: any = { ...initialState(), saveVersion: 5 };
    delete old.structures;
    const migrated = migrateSave(old);
    expect(Array.isArray(migrated.structures)).toBe(true);
    expect(migrated.structures.length).toBeGreaterThan(0);
    expect(migrated.saveVersion).toBe(6);
  });
  it("keeps existing structures untouched", () => {
    const s: any = { ...initialState(), saveVersion: 6, structures: [{ uid: "x", defId: "chalupa", tx: 1, ty: 1 }] };
    expect(migrateSave(s).structures).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run to verify fail** — `npm test` → FAIL (no `migrateSave` export).

- [ ] **Step 4: Refactor `save.ts` to expose `migrateSave` + add v5→v6**

In `src/game/engine/save.ts`, extract the merge/migration block from `loadGame` into an exported pure function and call it. Add the v6 migration:
```ts
export function migrateSave(parsed: Partial<GameState>): GameState {
  const merged = { ...initialState(), ...parsed } as GameState;
  if (parsed.built === undefined) {
    merged.built = [...TUTORIAL_BUILDING_IDS];
    merged.tutorialStep = TUTORIAL_STEPS.length;
  }
  if (parsed.saveVersion === undefined) {
    merged.questProgress = { main: Math.max(0, parsed.questLine ?? 0) };
    merged.saveVersion = 3;
  }
  if (!merged.profile || !merged.profile.appearance) merged.profile = initialState().profile;
  if ((parsed.saveVersion ?? 0) < 4) {
    merged.animals = { ...initialAnimalStates(), ...(parsed.animals ?? {}) };
    merged.placements = parsed.placements ?? {};
    merged.saveVersion = 4;
  }
  if ((parsed.saveVersion ?? 0) < 5) merged.saveVersion = 5;
  // v5 → v6: volné stavění. Staré uložení nemá `structures` — dopočítej z
  // auto-rozvržení (respektuj případné `placements` override budy/studny).
  if (parsed.structures === undefined) {
    merged.structures = AUTO_LAYOUT.map((p) => {
      const ov = parsed.placements?.[p.defId];
      return ov ? { ...p, tx: ov.tx, ty: ov.ty } : { ...p };
    });
    merged.saveVersion = 6;
  }
  return merged;
}
```
Add import: `import { AUTO_LAYOUT } from "../build/placement";`. Then in `loadGame`, replace the inline merge/migration with `const merged = migrateSave(parsed);`. Bump the initial `saveVersion` in `state.ts` to `6`.

- [ ] **Step 5: Run to verify pass** — `npm test` → PASS. Then `npm run typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/game/engine/state.ts src/game/engine/save.ts src/game/build/save.test.ts
git commit -m "feat(save): seed structures + migrate old saves to v6 (TDD)"
```

---

## Task 7: Reducer actions (place / demolish / move + economy) (TDD)

**Files:**
- Modify: `src/game/engine/reducer.ts`
- Test: `src/game/build/reducer.build.test.ts` (new)

Context: the reducer uses `cloneState`, `warnReturn`, `addLog`, `flash`, and a `take(s, [{item, qty}])` helper for consuming inventory. The `Action` union is around `reducer.ts:87-113`. `drevo` is the wood item id. `invCount(inv, id)` reads inventory.

- [ ] **Step 1: Write failing tests**

Create `src/game/build/reducer.build.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { reducer } from "../engine/reducer";
import { initialState } from "../engine/state";
import { hasBuilt } from "./placement";

function afterTutorial() {
  const s = initialState();
  s.tutorialStep = 999; // force survival phase (movement/build allowed)
  return s;
}

describe("PLACE_STRUCTURE", () => {
  it("places a wood-cost structure and deducts wood", () => {
    const s = afterTutorial();
    s.inventory.drevo = 5;
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: "plot", tx: 60, ty: 30 });
    expect(hasBuilt(next.structures, "plot")).toBe(true);
    expect(next.inventory.drevo).toBe(3); // plot costs 2 wood
  });
  it("refuses when wood is insufficient", () => {
    const s = afterTutorial();
    s.inventory.drevo = 1;
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: "plot", tx: 60, ty: 30 });
    expect(hasBuilt(next.structures, "plot")).toBe(false);
  });
  it("refuses a second unique building", () => {
    const s = afterTutorial();
    const before = s.structures.length;
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: "chalupa", tx: 60, ty: 30 });
    expect(next.structures.length).toBe(before); // chalupa already in AUTO_LAYOUT
  });
});

describe("DEMOLISH_STRUCTURE", () => {
  it("removes the instance and refunds 50% wood", () => {
    let s = afterTutorial();
    s.inventory.drevo = 5;
    s = reducer(s, { type: "PLACE_STRUCTURE", defId: "plot", tx: 60, ty: 30 }); // -2 wood → 3
    const uid = s.structures.find((x) => x.defId === "plot")!.uid;
    const next = reducer(s, { type: "DEMOLISH_STRUCTURE", uid });
    expect(hasBuilt(next.structures, "plot")).toBe(false);
    expect(next.inventory.drevo).toBe(4); // 3 + floor(2*0.5)=1
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test` → FAIL (actions unknown).

- [ ] **Step 3: Add actions to the `Action` union**

In `reducer.ts` union add:
```ts
  | { type: "PLACE_STRUCTURE"; defId: string; tx: number; ty: number }
  | { type: "DEMOLISH_STRUCTURE"; uid: string }
```
Keep the existing `MOVE_STRUCTURE` but change its handler (Step 4) to operate on `structures`.

- [ ] **Step 4: Implement handlers**

Add imports at top of `reducer.ts`:
```ts
import { BUILDABLE_BY_ID } from "../content/buildables";
import { canPlace } from "../build/placement";
import { isSolidTile } from "../../world/tiles";
```
Add a `uid` counter helper near the top of the module:
```ts
let uidSeq = 0;
const nextUid = () => `s${Date.now().toString(36)}-${uidSeq++}`;
```
Add cases in the reducer switch:
```ts
    case "PLACE_STRUCTURE": {
      if (tutorialActive(state)) return state; // guided placement is spec 2
      const def = BUILDABLE_BY_ID[action.defId];
      if (!def) return state;
      if (def.unique && state.structures.some((s) => s.defId === def.id))
        return warnReturn(state, "Tohle už na louce máš.");
      const footprintOf = (id: string) => {
        const d = BUILDABLE_BY_ID[id];
        return { fw: d?.fw ?? 1, fh: d?.fh ?? 1 };
      };
      const check = canPlace({ structures: state.structures, isSolid: isSolidTile, def, tx: action.tx, ty: action.ty, footprintOf });
      if (!check.ok) return warnReturn(state, check.reason ?? "Sem stavět nejde.");
      if (def.cost.money && state.money < def.cost.money) return warnReturn(state, "Na tohle ti chybí peníze.");
      if (def.cost.wood && (state.inventory.drevo ?? 0) < def.cost.wood) return warnReturn(state, "Na tohle ti chybí dřevo.");
      const s = cloneState(state);
      if (def.cost.money) s.money -= def.cost.money;
      if (def.cost.wood) take(s, [{ item: "drevo", qty: def.cost.wood }]);
      s.structures = [...s.structures, { uid: nextUid(), defId: def.id, tx: action.tx, ty: action.ty }];
      if (def.category === "upgrade" && !s.buildings.includes(def.id)) s.buildings.push(def.id);
      addLog(s, `Postavil jsi: ${def.label}. 🔨`, "good");
      return s;
    }

    case "DEMOLISH_STRUCTURE": {
      if (tutorialActive(state)) return state;
      const inst = state.structures.find((x) => x.uid === action.uid);
      if (!inst) return state;
      const def = BUILDABLE_BY_ID[inst.defId];
      const s = cloneState(state);
      s.structures = s.structures.filter((x) => x.uid !== action.uid);
      if (def?.cost.wood) s.inventory.drevo = (s.inventory.drevo ?? 0) + Math.floor(def.cost.wood * 0.5);
      if (def?.category === "upgrade") s.buildings = s.buildings.filter((b) => b !== def.id);
      addLog(s, `Zbořil jsi: ${def?.label ?? inst.defId}. 🧹`, "ok");
      return s;
    }

    case "MOVE_STRUCTURE": {
      if (tutorialActive(state)) return state;
      const inst = state.structures.find((x) => x.uid === action.uid);
      if (!inst) return state;
      const def = BUILDABLE_BY_ID[inst.defId];
      const footprintOf = (id: string) => { const d = BUILDABLE_BY_ID[id]; return { fw: d?.fw ?? 1, fh: d?.fh ?? 1 }; };
      const others = state.structures.filter((x) => x.uid !== action.uid);
      const check = canPlace({ structures: others, isSolid: isSolidTile, def: { fw: def?.fw ?? 1, fh: def?.fh ?? 1 }, tx: action.tx, ty: action.ty, footprintOf });
      if (!check.ok) return warnReturn(state, check.reason ?? "Sem to nejde.");
      const s = cloneState(state);
      s.structures = s.structures.map((x) => (x.uid === action.uid ? { ...x, tx: action.tx, ty: action.ty } : x));
      return s;
    }
```
Change the old `MOVE_STRUCTURE` action signature in the union to `{ type: "MOVE_STRUCTURE"; uid: string; tx: number; ty: number }` (was keyed by `id`). Update any existing dispatcher of `MOVE_STRUCTURE` (search `grep -rn "MOVE_STRUCTURE" src`) to pass `uid`.

- [ ] **Step 5: Run to verify pass** — `npm test` → PASS. `npm run typecheck` → resolve any `MOVE_STRUCTURE` caller mismatches.

- [ ] **Step 6: Commit**

```bash
git add src/game/engine/reducer.ts src/game/build/reducer.build.test.ts
git commit -m "feat(reducer): PLACE/DEMOLISH/MOVE_STRUCTURE + build economy (TDD)"
```

---

## Task 8: Larger meadow (96×72)

**Files:**
- Modify: `src/world/tiles.ts`

- [ ] **Step 1: Enlarge map + central meadow**

In `tiles.ts` change:
```ts
export const MAP_W = 96;
export const MAP_H = 72;
```
Replace `REGIONS` with a single large central home meadow plus (optional) smaller satellite clearings stubbed for spec B:
```ts
const REGIONS: Region[] = [
  { cx: 48, cy: 34, rx: 30, ry: 22 }, // velká domovská louka
  { cx: 84, cy: 20, rx: 10, ry: 8 },  // stub: východní lokace (spec B)
  { cx: 16, cy: 58, rx: 10, ry: 8 },  // stub: jižní lokace (spec B)
];
```
Adjust `CORRIDORS` and the pond (`pondCx/pondCy`) so they sit inside the new bounds (pond into a satellite region, e.g. `pondCx = 16; pondCy = 58`). Keep the forest frame loops (they already use `w`/`h`).

- [ ] **Step 2: Verify AUTO_LAYOUT tiles are on grass**

Run: `npm run typecheck` (map builds at import).
Then a quick sanity script — add a temporary test `src/game/build/map.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isSolidTile } from "../../world/tiles";
import { AUTO_LAYOUT } from "./placement";
import { BUILDABLE_BY_ID } from "../content/buildables";
describe("AUTO_LAYOUT fits the meadow", () => {
  it("no core building sits on a solid tile", () => {
    for (const p of AUTO_LAYOUT) {
      const d = BUILDABLE_BY_ID[p.defId];
      for (let dy = 0; dy < d.fh; dy++)
        for (let dx = 0; dx < d.fw; dx++)
          expect(isSolidTile(p.tx + dx, p.ty + dy)).toBe(false);
    }
  });
});
```
Run: `npm test`. Expected: PASS. (If it fails, nudge `AUTO_LAYOUT` coords in Task 5 until all are on grass — the `carveClearing` in entities.ts also clears under structures, so this is belt-and-suspenders.)

- [ ] **Step 3: Commit**

```bash
git add src/world/tiles.ts src/game/build/map.test.ts
git commit -m "feat(world): 96x72 map with large central home meadow"
```

---

## Task 9: Drive INTERACTABLES from structures

**Files:**
- Modify: `src/world/entities.ts`
- Modify: `src/game/build/placement.ts` (add `buildableToInteractable`, `rebuildInteractables`)

Goal: keep every existing `it.tx/it.ty` reader working by regenerating `INTERACTABLES` from `structures`. Split the authored NON-buildable features (herb spots `byliny*`, `brana`, `truhla`, `fox_*`, `jezek_listi`, `seniste`, `cedule`) into a separate constant `WORLD_FEATURES` that stays authored.

- [ ] **Step 1: Add mapping helpers to `placement.ts`**

```ts
import type { Buildable, Placed } from "../types";
// Minimal Interactable shape the world already uses:
export interface RuntimeInteractable {
  id: string; kind: string; label: string; tx: number; ty: number; fw: number; fh: number; solid: boolean;
}
export function buildableToInteractable(def: Buildable, inst: Placed): RuntimeInteractable {
  return { id: inst.uid, kind: def.kind, label: def.label, tx: inst.tx, ty: inst.ty, fw: def.fw, fh: def.fh, solid: def.solid };
}
export function rebuildInteractables(structures: Placed[], byId: Record<string, Buildable>): RuntimeInteractable[] {
  return structures.filter((s) => byId[s.defId]).map((s) => buildableToInteractable(byId[s.defId], s));
}
```
Note: import `RuntimeInteractable` type from here in `entities.ts`, or align it with the existing `Interactable` interface (prefer reusing the existing `Interactable` type — verify its fields with `grep -n "interface Interactable" src/world/entities.ts` and match names, especially `id` vs instance uid).

- [ ] **Step 2: Split authored features + make INTERACTABLES mutable-from-structures**

In `entities.ts`:
- Move the non-buildable `B(...)` entries (`byliny*`, `brana`, `truhla`, `fox_*`, `jezek_listi`, `seniste`, `cedule`) into `export const WORLD_FEATURES: Interactable[] = [...]`.
- Change `export let INTERACTABLES: Interactable[] = []` (now empty initially; regenerated from structures).
- Add:
```ts
import { rebuildInteractables } from "../game/build/placement";
import { BUILDABLE_BY_ID } from "../game/content/buildables";
import type { Placed } from "../game/types";

export function setStructures(structures: Placed[]) {
  const built = rebuildInteractables(structures, BUILDABLE_BY_ID) as unknown as Interactable[];
  INTERACTABLES.length = 0;
  INTERACTABLES.push(...built, ...WORLD_FEATURES);
  for (const it of INTERACTABLES) carveClearing(it.tx, it.ty, it.fw, it.fh, 1);
}
```
- Replace the old `applyPlacements(placements)` call sites (WorldCanvas) with `setStructures(structures)`. Keep `applyPlacements` only if still referenced; otherwise delete it and `AUTHORED_POS`.
- `INTERACTABLE_BY_ID` must be recomputed inside `setStructures` (make it a `let` and rebuild it there), since consumers look up by id.

- [ ] **Step 3: Typecheck + existing tests**

Run: `npm run typecheck` then `npm test`.
Expected: typecheck clean; tests still pass. Fix any consumer that imported `AUTHORED_POS` / `applyPlacements`.

- [ ] **Step 4: Commit**

```bash
git add src/world/entities.ts src/game/build/placement.ts
git commit -m "feat(world): regenerate INTERACTABLES from structures; split WORLD_FEATURES"
```

---

## Task 10: Build-mode input on the canvas

**Files:**
- Modify: `src/ui/world/WorldCanvas.tsx`

Context: `WorldCanvas` already receives `editMode`, `placements`, `onMoveStructure`, `onEditReject` props and rebuilds on `[built, placements]`. Repurpose this for the new model.

- [ ] **Step 1: Change the rebuild effect to use `structures`**

Replace the `placements` prop with `structures: Placed[]` and a `buildSelection: string | null` (the def id the player is currently placing, or null). In the effect that currently calls `applyPlacements(placements)`, call `setStructures(structures)` and depend on `[structures]`.

- [ ] **Step 2: Add ghost + placement input**

When `editMode` is on and `buildSelection` is set:
- Convert pointer/tap position to tile coords (reuse the existing screen→world→tile math already in this file for movement/target picking — find it via `grep -n "TS" src/ui/world/WorldCanvas.tsx`).
- Draw a translucent ghost of footprint `fw×fh` (green if `canPlace(...)` passes, red otherwise) each frame. Reuse `canPlace` with `isSolidTile` and a `footprintOf` from `BUILDABLE_BY_ID`.
- On confirm tap: call `onPlaceStructure(buildSelection, tx, ty)`.
When `editMode` is on and `buildSelection` is null:
- Tapping an existing structure selects it and shows Move/Demolish (dispatch via `onMoveStructure(uid, tx, ty)` after a second tap, and `onDemolishStructure(uid)`).

New props (typed):
```ts
buildSelection: string | null;
onPlaceStructure: (defId: string, tx: number, ty: number) => void;
onDemolishStructure: (uid: string) => void;
onMoveStructure: (uid: string, tx: number, ty: number) => void;
```

- [ ] **Step 3: Manual smoke (deferred to Task 13)** — no unit test for canvas; verify visually later. Ensure `npm run typecheck` passes.

- [ ] **Step 4: Commit**

```bash
git add src/ui/world/WorldCanvas.tsx
git commit -m "feat(ui): build-mode ghost + place/move/demolish input on canvas"
```

---

## Task 11: Build catalog panel + HUD toggle

**Files:**
- Create: `src/ui/world/BuildPanel.tsx`
- Modify: `src/ui/world/Hud.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: `BuildPanel.tsx`**

A bottom panel with 4 tabs (Základ/Upgrady/Ohrady/Dekorace) listing `BUILDABLES` of that category; each item shows label + cost (money/💰 or wood/🪵) and is disabled if unaffordable or (unique && already built). Selecting an item calls `onSelect(defId)`; the current selection is highlighted. Props:
```ts
interface Props {
  money: number; wood: number; structures: Placed[];
  selection: string | null;
  onSelect: (defId: string | null) => void;
}
```
Use `BUILDABLES`/`BUILDABLE_BY_ID` from `../../game/content/buildables` and `hasBuilt` from `../../game/build/placement`. Follow the styling patterns of the existing `Shop.tsx`/`Craft.tsx` components.

- [ ] **Step 2: HUD toggle**

In `Hud.tsx`, relabel the existing edit toggle (🪑 "Zabydlit") to 🔨 "Stavět" and keep the `editMode`/`onToggleEdit` wiring. When leaving build mode, clear the selection.

- [ ] **Step 3: Wire in `App.tsx`**

- Hold `buildSelection` state.
- Render `<BuildPanel>` when `editMode` is true.
- Pass `structures`, `buildSelection`, and the three dispatch handlers to `WorldCanvas`:
```tsx
onPlaceStructure={(defId, tx, ty) => dispatch({ type: "PLACE_STRUCTURE", defId, tx, ty })}
onDemolishStructure={(uid) => dispatch({ type: "DEMOLISH_STRUCTURE", uid })}
onMoveStructure={(uid, tx, ty) => dispatch({ type: "MOVE_STRUCTURE", uid, tx, ty })}
```
- Remove the now-unused `placements` prop threading.

- [ ] **Step 4: Typecheck** — `npm run typecheck` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/world/BuildPanel.tsx src/ui/world/Hud.tsx src/App.tsx
git commit -m "feat(ui): build catalog panel + Stavět toggle wired through App"
```

---

## Task 12: Interaction "not built yet" hints

**Files:**
- Modify: `src/game/engine/reducer.ts`

- [ ] **Step 1: Gate structure-dependent actions**

For actions that require a specific building (shop=`stanek`, craft=`dilna`, cook=`ohniste`, etc.), add an early `hasBuilt` guard using the reducer's `state.structures`. Example for crafting:
```ts
if (!hasBuilt(state.structures, "dilna")) return warnReturn(state, "Nejdřív potřebuješ postavit dílnu.");
```
Add `import { hasBuilt } from "../build/placement";`. Apply the analogous guard to each structure-gated action. In spec 1 the AUTO_LAYOUT guarantees these exist, so this is defensive; but it is required so that once the player demolishes/relocates, the game stays coherent.

- [ ] **Step 2: Run tests + typecheck** — `npm test` && `npm run typecheck` → all clean.

- [ ] **Step 3: Commit**

```bash
git add src/game/engine/reducer.ts
git commit -m "feat(reducer): gentle hints when a required building isn't built"
```

---

## Task 13: End-to-end verification (browser)

**Files:** none (verification only)

- [ ] **Step 1: Kill orphan vite, start dev**

```bash
pkill -f 'node_modules/.bin/vite' || true
npm run dev
```

- [ ] **Step 2: Use webapp-testing skill to drive the browser**

Verify, on a NEW game (auto-layout) and after skipping the tutorial:
1. Core buildings appear on the large meadow; shop/craft/cook/feed all work.
2. 🔨 Stavět opens the catalog; selecting a plot shows a green/red ghost.
3. Placing a plot deducts 2 wood; a second unique building (e.g. studna) is blocked once built.
4. Move relocates a structure (ghost validates); demolish removes it and refunds 1 wood.
5. Demolish the dílna → crafting shows the "Nejdřív potřebuješ dílnu" hint.
6. Reload the page → the built layout persists (save/load round-trip).
7. Touch works (emulate mobile in devtools).

- [ ] **Step 3: Fix any defects found, re-run `npm test` + `npm run typecheck`, commit fixes.**

- [ ] **Step 4: Final commit / ready for review**

```bash
git add -A && git commit -m "test: e2e verification of free-building meadow"
```

---

## Self-Review Notes

- **Spec coverage:** data model (T2), catalog (T3), meadow 96×72 (T8), build mode UX (T10/T11), economy money+wood + 50% refund (T7), interaction rewiring/hasBuilt (T9/T12), auto-layout shippability (T5/T6), old-save migration (T6), test strategy (T4/T6/T7/T8/T13). All spec sections mapped.
- **Type consistency:** `Placed` uses `uid/defId/tx/ty` throughout; `MOVE_STRUCTURE` keyed by `uid` everywhere; `canPlace` signature identical in tests and callers; `footprintOf` used consistently.
- **Known risk:** T9/T10 touch the large `WorldCanvas.tsx`/`entities.ts` — the "regenerate INTERACTABLES" strategy keeps blast radius small, but the agent must grep existing readers of `applyPlacements`/`AUTHORED_POS`/`placements` and update them. These two tasks are the ones to review most carefully.
