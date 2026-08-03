import { describe, it, expect } from "vitest";
import { initialState } from "../engine/state";
import { dayPlan } from "../content/objectives";
import { TUTORIAL_BUILDING_IDS, TUTORIAL_STEPS } from "../content/tutorial";
import type { GameState } from "../types";

/** Stav „po tutoriálu" — celé zázemí stojí, survival běží. */
function afterTutorial(over: Partial<GameState> = {}): GameState {
  return {
    ...initialState(),
    started: true,
    built: [...TUTORIAL_BUILDING_IDS],
    tutorialStep: TUTORIAL_STEPS.length,
    ...over,
  };
}

describe("denní plán (dayPlan)", () => {
  it("v tutoriálu vypíše všechny stavby a zamkne ty po aktuálním kroku", () => {
    const plan = dayPlan(initialState());
    expect(plan.tutorial).toBe(true);
    expect(plan.steps).toHaveLength(TUTORIAL_STEPS.length);
    expect(plan.steps.every((s) => s.required)).toBe(true);
    expect(plan.next?.id).toBe(`build_${TUTORIAL_STEPS[0].buildingId}`);
    expect(plan.steps[0].locked).toBeFalsy();
    expect(plan.steps[1].locked).toBe(true);
  });

  it("ráno začíná vypuštěním drůbeže a krmení je povinné", () => {
    const plan = dayPlan(afterTutorial({ phase: "rano" }));
    expect(plan.next?.id).toBe("release");
    const required = plan.steps.filter((s) => s.required).map((s) => s.id);
    expect(required).toEqual(["release", "feed_drubez", "feed_prasata", "feed_stado", "feed_mazlici"]);
    // Nepovinné kroky plán nabízí, ale fázi neblokují.
    expect(plan.steps.find((s) => s.id === "eggs")?.required).toBe(false);
    expect(plan.ready).toBe(false);
  });

  it("krmení drůbeže je zamčené, dokud není vypuštěná", () => {
    const plan = dayPlan(afterTutorial({ phase: "rano" }));
    expect(plan.steps.find((s) => s.id === "feed_drubez")?.locked).toBe(true);
    const after = dayPlan(afterTutorial({ phase: "rano", birdsReleased: true, tasksDone: { release: true } }));
    expect(after.steps.find((s) => s.id === "feed_drubez")?.locked).toBeFalsy();
    expect(after.next?.id).toBe("feed_drubez");
  });

  it("po nakrmení všech je ráno hotové a plán ukazuje na poledne", () => {
    const plan = dayPlan(
      afterTutorial({
        phase: "rano",
        birdsReleased: true,
        tasksDone: {
          release: true,
          feed_drubez: true,
          feed_prasata: true,
          feed_stado: true,
          feed_mazlici: true,
        },
      }),
    );
    expect(plan.ready).toBe(true);
    expect(plan.requiredDone).toBe(plan.requiredTotal);
    expect(plan.nextPhase).toBe("Poledne");
  });

  it("večer je povinné dokrmit, zavřít a jít spát (spánek až po zavření)", () => {
    const plan = dayPlan(afterTutorial({ phase: "vecer" }));
    expect(plan.steps.map((s) => s.id)).toEqual(["evening_feed", "closed", "sleep"]);
    expect(plan.steps.find((s) => s.id === "sleep")?.locked).toBe(true);
  });

  it("kroky ukazují na existující cíle ve světě", () => {
    const ids = new Set([...TUTORIAL_BUILDING_IDS, "studna"]);
    for (const phase of ["rano", "poledne", "vecer"] as const)
      for (const step of dayPlan(afterTutorial({ phase })).steps) {
        if (step.target) expect(ids.has(step.target) || step.target.startsWith("byliny")).toBe(true);
        for (const t of step.targets ?? []) expect(t.startsWith("byliny")).toBe(true);
      }
  });
});
