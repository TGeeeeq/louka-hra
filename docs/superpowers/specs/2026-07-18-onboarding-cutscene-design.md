# Design: New Onboarding — Tomáš Welcome + Guided Free-Build Tutorial

**Date:** 2026-07-18
**Status:** Approved direction (autonomous build authorized), sub-project 2 of 3
**Depends on:** Spec 1 (free-building meadow) — merged into `feature/volne-staveni`.

## Problem

Spec 1 made a new game start with a pre-built farm and **disabled** the old
tutorial, because the old tutorial placed buildings at fixed positions (walk to
a glowing blueprint, press space) — incompatible with free placement. That is a
deliberate interim: a new player now gets no onboarding and no sense of "I laid
out my own meadow."

## Vision (from the user)

> "A welcome cutscene where Tomáš greets me and shows me the whole meadow, gives
> a few tips. I have a big empty meadow in front of me where I place the basic
> structures wherever I want — it's my layout. Start with just the dog and cat;
> the other animals arrive later via cutscenes."

The existing `TUTORIAL_STEPS` content is ALREADY this story ("Hráč přijde na
prázdnou louku, potká Tomáše a postupně postaví celé zázemí"). Spec 2 keeps the
writing and rewires the *mechanic* from fixed-blueprint to **free placement**,
plus an empty start, a welcome pan, dog+cat-only start, and animal-arrival beats.

## Goal

A new game: character creator → Tomáš welcome (camera pan over the empty meadow +
greeting) → the player, guided by Tomáš, freely places each core building via the
build panel; each placement advances the tutorial and (for pens) triggers an
animal group's arrival. The player starts accompanied by only the dog and cat.

## Out of Scope

- Full free camera cutscene director (we do ONE scripted welcome pan, reusing the
  existing camera lerp).
- Voice / animated cinematics — dialogs + camera pan + sprites only.
- New animal-arrival art — reuse existing sprites; "arrival" = settle + dialog.
- Spec B location content (separate spec).

## Principles

- **Reuse the tutorial engine.** `TUTORIAL_STEPS`, `tutorialActive`,
  `currentStep`, `settledGroups` stay. We change how a step is *completed*
  (free placement instead of walking to a fixed blueprint) and the start state.
- **Every intermediate state ships.** The build engine (spec 1) is unchanged;
  we drive it from the tutorial.
- **No save loss.** Existing (spec-1) saves keep working; only NEW games get the
  empty start + tutorial.

## Design

### 1. Empty start + dog & cat companions

`initialState` (spec 1 currently seeds the full farm + tutorial done). Change to:
- `structures: []` (empty meadow).
- `built: []`, `tutorialStep: 0` (tutorial runs).
- Animals: only the **dog + cat** present from the start as free-roaming
  companions, NOT gated on a pen. Introduce `COMPANION_ANIMAL_IDS` (e.g. one dog
  `riky`, one cat `roman`) rendered from game start near the player, independent
  of `settledGroups`. All other groups render only once their pen is built
  (existing `settledGroups` behavior) — so an empty meadow shows just you + dog +
  cat.
- `population` starts with only the companions counted (mazlici = 2); each group's
  full population is added when its pen is built + the group "arrives" (see §4).

### 2. Welcome cutscene (camera pan + greeting)

On entering the world with `tutorialStep === 0` and no welcome-seen flag:
- Add a lightweight scripted camera move: `WorldCanvas` gains an optional
  `cinematic?: { tx: number; ty: number } | null` prop. When set, the camera
  lerps to that tile (reusing the existing `cam.current` lerp at ~`dt*8`) instead
  of following the player, and player input is paused.
- Sequence (driven by App + a few dialog lines already in step 1's `intro`):
  pan slowly across the meadow center → return to the player → release camera →
  Tomáš's greeting dialog (step-1 `intro`) shows. Set `flags.welcome_seen = true`.
- Keep it skippable (tap dismisses dialogs; the pan is short, ~3–4 s).

### 3. Guided free placement

Replace the "walk to glowing blueprint + spacebar (`BUILD_STRUCTURE`)" mechanic:
- While the tutorial is active, the build panel is **restricted to the current
  step's building** (`currentStep(s).buildingId`): only that item is enabled;
  Tomáš's `intro` lines explain it. A small HUD hint says "Postav: <buildLabel>".
- The build toggle 🔨 auto-opens (or is highlighted) during the tutorial.
- When the player places the step's building via `PLACE_STRUCTURE`, the reducer
  (if `tutorialActive` and `defId === currentStep.buildingId`):
  - adds the structure (free position chosen by the player),
  - pushes the id to `built`,
  - advances `tutorialStep`,
  - fires the step's `done` dialog + next step's `intro`,
  - if the step has `settleGroup`, triggers that group's arrival (§4).
- Remove/retire `BUILD_STRUCTURE` (fixed-blueprint) and the blueprint glow
  rendering path, OR keep the glow only as an optional "suggested spot" (NON-
  binding). Decision: **remove the fixed blueprint**; guidance is via dialog +
  the restricted panel + HUD hint. The last step (`stanek`) completes the
  tutorial exactly as today (survival begins).

### 4. Animal arrival beats

When a pen is built during the tutorial (or rebuilt later), its group "arrives":
- Add the group to a settled set (already implicit via `built` → `settledGroups`).
- Bump `population[group]` to its full `STARTING_POPULATION[group]`.
- Fire a short Tomáš arrival dialog (reuse the step's `done` lines, which already
  say e.g. "slepice se hrnou dovnitř").
- Dog + cat (mazlici companions) are present from the start; building `buda`
  brings the rest of mazlici (rabbits, more pets) — arrival bumps the count.

### 5. Reconcile with spec 1's new-game behavior

Spec 1 set `initialState` to pre-build the farm and skip the tutorial. Spec 2
reverts that: empty structures, tutorial active. The spec-1 rationale (buildings
must be visible) is satisfied because during the tutorial each building becomes
visible the moment the player places it (`built` gets the id → gated draw shows
it at the chosen position).

## Test Strategy

- **Unit:**
  - `initialState`: `structures` empty, `built` empty, `tutorialStep` 0,
    `population.mazlici === COMPANION count`.
  - Reducer: `PLACE_STRUCTURE` of the current tutorial building advances
    `tutorialStep`, adds to `built`, and (for a pen) bumps `population[group]`.
  - Reducer: `PLACE_STRUCTURE` of a NON-current building during the tutorial is
    rejected with a hint.
  - Completing the last step sets `tutorialStep === TUTORIAL_STEPS.length` and
    the survival flags (mirroring the old `BUILD_STRUCTURE` final step).
  - Migration: a spec-1 save (farm pre-built, tutorial done) is untouched.
- **Manual (webapp-testing):** new game → welcome pan + Tomáš greeting → build
  panel restricted to "chalupa" → place it anywhere → Tomáš praises + next step →
  build a pen → animals arrive → finish tutorial → survival with a
  player-designed layout; dog + cat present from the very start.

## Files Touched (anticipated)

- `src/game/balance.ts` — `COMPANION_ANIMAL_IDS` or companion population.
- `src/game/engine/state.ts` — empty start + tutorial active + companions.
- `src/game/engine/reducer.ts` — tutorial-aware `PLACE_STRUCTURE` (advance step,
  settle group, dialogs, population bump); retire `BUILD_STRUCTURE`.
- `src/game/content/tutorial.ts` — minor: helper for "current build target",
  keep steps; adjust step-1 intro to mention the build panel.
- `src/world/entities.ts` — render dog+cat companions independent of pens.
- `src/ui/world/WorldCanvas.tsx` — `cinematic` camera prop + pause input; drop
  blueprint-glow requirement.
- `src/ui/world/BuildPanel.tsx` — restrict to current step during tutorial.
- `src/ui/world/Hud.tsx` — tutorial build hint; auto-open build mode.
- `src/App.tsx` — welcome cutscene sequencing; pass `cinematic`; wire restriction.
