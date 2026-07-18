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
