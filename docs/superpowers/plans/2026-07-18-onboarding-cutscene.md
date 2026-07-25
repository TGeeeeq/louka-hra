# Onboarding (Welcome + Guided Free-Build) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Steps use checkbox syntax.

**Goal:** New game starts on an empty meadow with only dog+cat; Tomáš welcomes (camera pan) and guides the player to freely place each core building via the build panel; pens trigger animal arrivals.

**Architecture:** Reuse the existing tutorial engine (`TUTORIAL_STEPS`, `tutorialActive`, `currentStep`, `settledGroups`). Change the completion mechanic from fixed-blueprint `BUILD_STRUCTURE` to tutorial-aware `PLACE_STRUCTURE`. Empty `initialState`. Dog+cat rendered as companions independent of pens. A scripted camera `cinematic` for the welcome.

**Tech Stack:** Vite 5 + React 18 + TS, canvas, reducer, Vitest.

**Branch:** `feature/volne-staveni` (continue on it).

---

## Task 1: Empty start + dog/cat companions (TDD)

**Files:** `src/game/balance.ts`, `src/game/engine/state.ts`, `src/world/entities.ts`, test `src/game/build/onboarding.test.ts`

- [ ] **Step 1: Add companion constant** in `src/game/balance.ts`:
```ts
// Spec 2: hráč začíná jen se psem a kočkou; ostatní zvířata přijedou, až
// postaví jejich výběh. Companion se renderují nezávisle na výběhu.
export const COMPANION_ANIMAL_IDS = ["riky", "roman"]; // pes + kočka
export const COMPANION_POPULATION = 2;
```
(Confirm `riky`/`roman` exist in `ANIMALS_BY_GROUP.mazlici` via `grep -n "riky\|roman" src/game/content/animals.ts`; if not, use the first dog + first cat ids found there.)

- [ ] **Step 2: Failing test** `src/game/build/onboarding.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { initialState } from "../engine/state";

describe("empty onboarding start", () => {
  it("starts empty with tutorial active", () => {
    const s = initialState();
    expect(s.structures).toHaveLength(0);
    expect(s.built).toHaveLength(0);
    expect(s.tutorialStep).toBe(0);
  });
  it("starts with only companion pets counted", () => {
    const s = initialState();
    expect(s.population.mazlici).toBe(2);
    expect(s.population.drubez).toBe(0);
    expect(s.population.stado).toBe(0);
    expect(s.population.prasata).toBe(0);
  });
});
```

- [ ] **Step 3: Run → FAIL** (`npm test`).

- [ ] **Step 4: Update `initialState`** in `src/game/engine/state.ts`:
  - Revert spec-1 pre-build: `structures: []`, `built: []`, `tutorialStep: 0`.
  - Remove the `AUTO_LAYOUT`/`TUTORIAL_BUILDING_IDS`/`TUTORIAL_STEPS` seeding of `built`/`structures` (keep imports only if still used elsewhere in the file; otherwise remove).
  - `population`: start all groups at 0 except `mazlici: COMPANION_POPULATION`. Import `COMPANION_POPULATION` from `../balance`. (Replace `population: { ...STARTING_POPULATION }` with an explicit `{ drubez: 0, prasata: 0, stado: 0, mazlici: COMPANION_POPULATION }`.)

- [ ] **Step 5: Render companions** in `src/world/entities.ts`:
  - In `buildSpawns()` (or a companion pass), always emit spawns for `COMPANION_ANIMAL_IDS` near `PLAYER_START`/spawn, independent of pens. Guard so they aren't double-emitted when `mazlici` later settles (filter the mazlici zone list to exclude companion ids, OR only add companions and let the mazlici zone render the rest). Import `COMPANION_ANIMAL_IDS` from `../game/content/balance`? (correct path: `../game/balance`).
  - Export nothing new required; `ANIMAL_SPAWNS` just includes companions always.
  - NOTE: rendering of a group is gated elsewhere by `settledGroups`. Companions must bypass that gate. Check how `App.tsx`/`WorldCanvas` filters spawns by settled group (`grep -n "settledGroups\|ANIMAL_SPAWNS\|settled" src/ui/world/WorldCanvas.tsx src/App.tsx`) and make companion spawns always visible.

- [ ] **Step 6: Run → PASS**, `npm run typecheck` clean.

- [ ] **Step 7: Commit** `feat(onboarding): empty meadow start with dog+cat companions`.

---

## Task 2: Tutorial-aware PLACE_STRUCTURE (TDD)

**Files:** `src/game/engine/reducer.ts`, `src/game/content/tutorial.ts`, test `src/game/build/onboarding.test.ts` (extend)

- [ ] **Step 1: Failing tests** (append):
```ts
import { reducer } from "../engine/reducer";
import { TUTORIAL_STEPS } from "../content/tutorial";
import { STARTING_POPULATION } from "../balance";

describe("guided tutorial placement", () => {
  it("placing the current step's building advances the tutorial", () => {
    const s = initialState(); // step 0 = chalupa
    const step = TUTORIAL_STEPS[0];
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: step.buildingId, tx: 45, ty: 33 });
    expect(next.tutorialStep).toBe(1);
    expect(next.built).toContain(step.buildingId);
    expect(next.structures.some(x => x.defId === step.buildingId)).toBe(true);
  });
  it("rejects placing a non-current building during the tutorial", () => {
    const s = initialState(); // current = chalupa, not stanek
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: "stanek", tx: 45, ty: 33 });
    expect(next.tutorialStep).toBe(0);
    expect(next.structures).toHaveLength(0);
  });
  it("building a pen bumps that group's population to full", () => {
    // advance to the kurnik step then place it
    let s = initialState();
    const idxKurnik = TUTORIAL_STEPS.findIndex(t => t.buildingId === "kurnik");
    for (let i = 0; i < idxKurnik; i++) {
      s = reducer(s, { type: "PLACE_STRUCTURE", defId: TUTORIAL_STEPS[i].buildingId, tx: 40 + i, ty: 30 });
    }
    const before = s.population.drubez;
    s = reducer(s, { type: "PLACE_STRUCTURE", defId: "kurnik", tx: 34, ty: 30 });
    expect(before).toBe(0);
    expect(s.population.drubez).toBe(STARTING_POPULATION.drubez);
  });
});
```
(Placement coords must be on grass on the 96×72 map; pick central tiles. If `canPlace` rejects overlap between consecutive placements, spread coordinates.)

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement in `reducer.ts` `PLACE_STRUCTURE`.** Currently `PLACE_STRUCTURE` early-returns when `tutorialActive`. Change so during the tutorial it is ALLOWED only for the current step's building:
```ts
case "PLACE_STRUCTURE": {
  const def = BUILDABLE_BY_ID[action.defId];
  if (!def) return state;
  const tut = tutorialActive(state);
  if (tut) {
    const step = currentStep(state);
    if (!step || action.defId !== step.buildingId)
      return warnReturn(state, "Teď postav to, co ti Tomáš ukázal.");
  }
  // ... existing unique/canPlace/cost checks (during tutorial, treat cost as free) ...
  const s = cloneState(state);
  if (!tut) { /* deduct money/wood as today */ }
  s.structures = [...s.structures, { uid: nextUid(), defId: def.id, tx: action.tx, ty: action.ty }];
  if (def.category === "upgrade" && !s.buildings.includes(def.id)) s.buildings.push(def.id);
  if (tut) {
    const step = currentStep(state)!;
    if (!s.built.includes(step.buildingId)) s.built.push(step.buildingId);
    s.tutorialStep += 1;
    // pen arrival: bump population + settle
    const grp = step.settleGroup;
    if (grp) s.population = { ...s.population, [grp]: STARTING_POPULATION[grp] };
    if (s.tutorialStep < TUTORIAL_STEPS.length) {
      pushDialog(s, "Tomáš", [...step.done, ...TUTORIAL_STEPS[s.tutorialStep].intro]);
    } else {
      pushDialog(s, "Tomáš", step.done);
      // survival begins — mirror the old BUILD_STRUCTURE final step:
      s.day = 1; s.dayInSeason = 1; s.phase = "rano";
      s.maxEnergy = SEASON_ENERGY[s.season]; s.energy = SEASON_ENERGY[s.season];
      s.questLine = 0; s.questProgress.main = 0; s.flags.tutorial_done = true;
      flash(s, "Louka je postavená! Teď začíná to hlavní — přežít. 🌱", "good");
    }
    addLog(s, `Postavil jsi: ${step.buildLabel}. 🔨`, "good");
  } else {
    addLog(s, `Postavil jsi: ${def.label}. 🔨`, "good");
  }
  return s;
}
```
Add imports: `currentStep`, `TUTORIAL_STEPS` from `../content/tutorial`; `STARTING_POPULATION`, `SEASON_ENERGY` from `../balance` (check existing imports first). Reuse the real helper names for `pushDialog`/`flash` (grep to confirm).
Then **retire `BUILD_STRUCTURE`**: remove its case and the `BUILD_STRUCTURE` action from the union (grep `BUILD_STRUCTURE` across `src` and remove dispatchers; the old walk-to-blueprint UI path). Keep `MOVE_STRUCTURE`/`DEMOLISH_STRUCTURE` as is (both still blocked during tutorial — fine).

- [ ] **Step 4: Run → PASS**, `npm run typecheck` clean, full `npm test` green.

- [ ] **Step 5: Commit** `feat(onboarding): guided free placement advances tutorial + animal arrival`.

---

## Task 3: BuildPanel restriction + HUD hint during tutorial

**Files:** `src/ui/world/BuildPanel.tsx`, `src/ui/world/Hud.tsx`, `src/App.tsx`

- [ ] **Step 1:** `BuildPanel` gains an optional prop `restrictTo?: string | null` (the current tutorial building id). When set, only that buildable is enabled/selectable and shown; auto-select it. Compute in `App.tsx` via `tutorialActive(state) ? currentStep(state)?.buildingId : null` and pass down.
- [ ] **Step 2:** During the tutorial, auto-open build mode (App: force `editMode` true while `tutorialActive`, or open on the relevant step) and show a HUD hint "🔨 Postav: <buildLabel>" (from `currentStep(state).buildLabel`).
- [ ] **Step 3:** `npm run typecheck` clean. Commit `feat(onboarding): build panel guided to the current tutorial step`.

---

## Task 4: Welcome cinematic (camera pan + greeting)

**Files:** `src/ui/world/WorldCanvas.tsx`, `src/App.tsx`

- [ ] **Step 1:** Add `cinematic?: { tx: number; ty: number } | null` prop to `WorldCanvas`. In the camera update block (around the existing `cam.current` lerp), when `cinematic` is set, target `cinematic.tx/ty` (in px) instead of the player, and skip player-follow + movement input.
- [ ] **Step 2:** In `App.tsx`, on first world entry with `tutorialStep===0` and `!flags.welcome_seen`: run a short sequence — set `cinematic` to the meadow center (~tile 48,34) for ~2.5s, then to the player (~45,33) for ~1s, then clear `cinematic`; then the step-1 Tomáš dialog (already dispatched by tutorial start) shows. Set `flags.welcome_seen` (dispatch a `SET_FLAG`). Keep it skippable (any tap clears the cinematic early). Use `setTimeout`/state; do NOT block the reducer.
- [ ] **Step 3:** `npm run typecheck` clean. Commit `feat(onboarding): Tomáš welcome camera pan over the empty meadow`.

---

## Task 5: End-to-end verification (browser)

- [ ] Start dev, use webapp-testing. New game (creator → Začít): welcome pan plays, Tomáš greets, build panel is restricted to "chalupa"; place it anywhere → praise + next step; build kurnik → chickens arrive; dog+cat present from the very start; finish tutorial (place stanek) → survival begins with the player's own layout. Verify `npm test` + `npm run typecheck` green and no console errors. Commit any fixes.

---

## Self-Review Notes
- Spec coverage: empty start (T1), companions (T1), guided placement (T2), arrivals (T2), panel restriction/hint (T3), welcome pan (T4), verification (T5).
- Risk: T1 companion rendering must bypass `settledGroups` gate — verify the actual filter path. T2 reducer must exactly mirror the retired `BUILD_STRUCTURE` final-step transition. T4 cinematic must not deadlock input if a dialog is open.
