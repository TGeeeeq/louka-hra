import { describe, it, expect } from "vitest";
import { initialState } from "../engine/state";
import { reducer } from "../engine/reducer";
import { TUTORIAL_STEPS } from "../content/tutorial";
import { STARTING_POPULATION } from "../balance";

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

// Volná pozice pro každý krok tutoriálu v pořadí TUTORIAL_STEPS. Zvířecí
// příbytky si nesou svůj výběh (Buildable.pen), takže potřebují pořádný odstup —
// bereme rovnou rozvržení z AUTO_LAYOUT, o kterém placement.test.ts hlídá, že se
// v něm žádné dvě obálky nepřekrývají.
// pořadí: chalupa, ohniště, studna, dílna, kurník, chlívek, pastvina, bouda, stánek
const STEP_TX = [44, 46, 42, 40, 34, 38, 52, 48, 50];
const STEP_TY = [30, 36, 28, 34, 30, 40, 38, 28, 32];

describe("guided tutorial placement", () => {
  it("placing the current step's building advances the tutorial", () => {
    const s = initialState(); // step 0 = chalupa
    const step = TUTORIAL_STEPS[0];
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: step.buildingId, tx: 45, ty: 33 });
    expect(next.tutorialStep).toBe(1);
    expect(next.built).toContain(step.buildingId);
    expect(next.structures.some((x) => x.defId === step.buildingId)).toBe(true);
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
    const idxKurnik = TUTORIAL_STEPS.findIndex((t) => t.buildingId === "kurnik");
    for (let i = 0; i < idxKurnik; i++) {
      s = reducer(s, { type: "PLACE_STRUCTURE", defId: TUTORIAL_STEPS[i].buildingId, tx: STEP_TX[i], ty: STEP_TY[i] });
    }
    const before = s.population.drubez;
    s = reducer(s, { type: "PLACE_STRUCTURE", defId: "kurnik", tx: STEP_TX[idxKurnik], ty: STEP_TY[idxKurnik] });
    expect(before).toBe(0);
    expect(s.population.drubez).toBe(STARTING_POPULATION.drubez);
  });
  it("completing the final step ends the tutorial and starts survival", () => {
    let s = initialState();
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      s = reducer(s, { type: "PLACE_STRUCTURE", defId: TUTORIAL_STEPS[i].buildingId, tx: STEP_TX[i], ty: STEP_TY[i] });
    }
    expect(s.tutorialStep).toBe(TUTORIAL_STEPS.length);
    expect(s.flags.tutorial_done).toBe(true);
    expect(s.day).toBe(1);
    expect(s.dayInSeason).toBe(1);
    expect(s.phase).toBe("rano");
    expect(s.questLine).toBe(0);
    expect(s.questProgress.main).toBe(0);
  });
});
