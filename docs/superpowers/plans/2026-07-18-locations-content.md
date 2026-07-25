# Locations with Content (Satellites) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Checkbox steps.

**Goal:** Turn the two stub satellite clearings into themed, reachable destinations — an east herb meadow and a south pond — by relocating `WORLD_FEATURES` onto the new 96×72 map, adding location signs, and keeping the forest-gate puzzle guarding one satellite.

**Architecture:** Pure placement/authoring in `tiles.ts` (map) + `entities.ts` (WORLD_FEATURES, signs). Guarded by unit tests (on-grass, in-region, reachability). No new systems.

**Branch:** `feature/volne-staveni`.

---

## Task 1: Fix + relocate WORLD_FEATURES onto the new map (TDD)

**Files:** `src/world/entities.ts`, `src/world/tiles.ts`, test `src/game/build/map.test.ts`

Context: WORLD_FEATURES still use OLD small-map coords (byliny at 6,8 / 39,12 / 8,27 / 54,12 / 61,18 / 57,21 / 31,45; brana 44,41; truhla 60,41; seniste 30,38; cedule 24,20). Regions: main (48,34,rx30,ry22), east (84,20,rx10,ry8), south/pond (16,58,rx10,ry8).

- [ ] **Step 1: Failing test** — extend `map.test.ts`:
```ts
import { WORLD_FEATURES } from "../../world/entities";
import { isSolidTile } from "../../world/tiles";
describe("WORLD_FEATURES on the 96x72 map", () => {
  it("every feature sits on a non-solid tile in bounds", () => {
    for (const f of WORLD_FEATURES) {
      expect(f.tx).toBeGreaterThanOrEqual(1);
      expect(f.ty).toBeGreaterThanOrEqual(1);
      expect(f.tx).toBeLessThan(95);
      expect(f.ty).toBeLessThan(71);
      expect(isSolidTile(f.tx, f.ty)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run → FAIL** (some features on forest/water or out of the satellites).

- [ ] **Step 3: Relocate** in `entities.ts` `WORLD_FEATURES`:
  - East herb meadow (region ~78–90 x, 14–26 y): `byliny4`(82,18), `byliny5`(86,21), `byliny6`(84,24) + a sign `cedule_herb` (kind `cedule`) at the entrance ~(80,20).
  - South pond (region ~10–22 x, 52–64 y): `byliny7`(19,60) + a sign `cedule_pond` at ~(20,56).
  - Keep near home: `byliny1`(28,26), `byliny2`(40,26), `byliny3`(60,30) — a couple close so day-one gathering is possible.
  - `seniste` → near the pond side on grass, e.g. (24,58).
  - `brana` + `truhla`: put `brana` on the EAST corridor and `truhla` just inside the east satellite (guard the herb meadow). Update `GATE_TILES` to match `brana`'s new tile column/row (they must physically block the corridor). Verify `openGate()` clears those exact tiles.
  - fox_stopy/fox_misto/jezek_listi: move onto grass within bounds (west forest edge near the home meadow), e.g. fox at (24,44)/(23,46), listi (36,44).
  - Because `carveClearing` runs over WORLD_FEATURES at module load, each will carve its own grass — but a herb spot dropped in deep forest still reads oddly; keep them in/near the region ellipses so they're naturally in clearings.

- [ ] **Step 4: Run → PASS**, `npm run typecheck` clean, full `npm test` green.

- [ ] **Step 5: Commit** `feat(world): relocate world features into east herb meadow + south pond`.

---

## Task 2: Reachability guard (TDD)

**Files:** test `src/game/build/map.test.ts`

- [ ] **Step 1: Failing test** — flood fill from spawn reaches each satellite:
```ts
import { MAP, isSolidTile } from "../../world/tiles";
function reaches(sx: number, sy: number, tx: number, ty: number): boolean {
  const seen = new Set<string>(); const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === tx && y === ty) return true;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x+dx, ny = y+dy, k = `${nx},${ny}`;
      if (nx<0||ny<0||nx>=MAP.w||ny>=MAP.h||seen.has(k)||isSolidTile(nx,ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return false;
}
describe("satellites reachable from spawn", () => {
  it("east herb meadow reachable", () => { expect(reaches(45,33,84,20)).toBe(true); });
  it("south pond reachable", () => { expect(reaches(45,33,16,58)).toBe(true); });
});
```
NOTE: if the east satellite is intentionally gated by `brana` (fence), the flood fill will FAIL until `openGate()` is called. Either (a) call `openGate()` in the test before asserting east, or (b) assert east reachable only after gate open. Pick (a): `import { openGate } from ...; openGate();` at the top of the east assertion.

- [ ] **Step 2: Run → FAIL if a corridor is blocked.** Fix `CORRIDORS`/region sizes in `tiles.ts` until both satellites connect.

- [ ] **Step 3: Run → PASS.** Commit `test(world): satellites reachable from spawn`.

---

## Task 3: Per-sign flavor text

**Files:** `src/world/entities.ts`, and the sign interaction handler (`src/App.tsx` `onInteract` for kind `cedule`, or the dialog it triggers — grep `cedule` in App/WorldCanvas)

- [ ] **Step 1:** Add optional `note?: string` to the `Interactable` (or a side map `SIGN_NOTES: Record<string,string>`), and give the two location signs flavor text (herb: "Tady roste řebříček, kopřiva a heřmánek — trhej, co potřebuješ."; pond: "Rybník. Kachny si sem chodí zaplavat.").
- [ ] **Step 2:** In the `cedule` interaction, show the note if present, else the current default text.
- [ ] **Step 3:** `npm run typecheck` clean, `npm test` green. Commit `feat(world): named location signs (herb meadow, pond)`.

---

## Task 4: End-to-end verification (browser)

- [ ] Start dev, webapp-testing (or inject a tutorial-done save to skip onboarding). Walk east → herb meadow with sign + herbs; open forest gate → chest inside; walk south → pond + sign + herbs. Confirm no console errors, `npm test` + typecheck green. Commit any fixes.

---

## Self-Review Notes
- Coverage: relocate features (T1), reachability (T2), signs (T3), verify (T4).
- Risk: gate must actually block then open the east corridor; flood-fill test encodes this. Ambient ducks were dropped as optional (skip unless trivial). Keep a couple of herb spots near home so day-one isn't a forced trek.
