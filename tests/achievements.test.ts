// Testy achievement logiky — čistě nad initialState(), bez DOM.
import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, newlyUnlocked } from "../src/game/achievements";
import { initialState } from "../src/game/engine/state";
import { reducer } from "../src/game/engine/reducer";
import { FACTS } from "../src/game/content/facts";

const HERB_IDS = FACTS.filter((f) => f.category === "byliny").map((f) => f.id);

describe("achievements", () => {
  it("mají unikátní id", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("na čerstvém startu není nic odemčené (kromě tutoriálových migrací)", () => {
    const s = initialState();
    expect(newlyUnlocked(s).map((a) => a.id)).toEqual([]);
  });

  it("první noc se odemkne po prvním přežitém dni", () => {
    const s = initialState();
    s.daysSurvived = 1;
    expect(newlyUnlocked(s).map((a) => a.id)).toContain("a_prvni_noc");
  });

  it("už odemčené achievementy se nehlásí znovu", () => {
    const s = initialState();
    s.daysSurvived = 1;
    s.achievements = ["a_prvni_noc"];
    expect(newlyUnlocked(s).map((a) => a.id)).not.toContain("a_prvni_noc");
  });

  it("kompletní herbář vyžaduje všechny bylinkové fakty", () => {
    const s = initialState();
    s.knownFacts = HERB_IDS.slice(0, -1);
    expect(newlyUnlocked(s).map((a) => a.id)).not.toContain("a_herbar");
    s.knownFacts = [...HERB_IDS];
    expect(newlyUnlocked(s).map((a) => a.id)).toContain("a_herbar");
  });

  it("kvízový mistr: HERB_QUIZ_RESULT sčítá odpovědi a v 15 odemkne", () => {
    let s = { ...initialState(), started: true };
    for (let i = 0; i < 15; i++) s = reducer(s, { type: "HERB_QUIZ_RESULT", correct: 1 });
    expect(s.herbQuizCorrect).toBe(15);
    expect(s.achievements).toContain("a_kvizovy_mistr");
  });

  it("HERB_QUIZ_RESULT ignoruje nesmyslné hodnoty", () => {
    const s = initialState();
    const after = reducer(s, { type: "HERB_QUIZ_RESULT", correct: -3 });
    expect(after.herbQuizCorrect).toBe(0);
  });

  it("reducer zapíše odemčení do achievements i logu", () => {
    let s = { ...initialState(), started: true };
    s.daysSurvived = 1; // podmínka splněná — libovolná další akce ji sebere
    s = reducer(s, { type: "HERB_QUIZ_RESULT", correct: 1 });
    expect(s.achievements).toContain("a_prvni_noc");
    expect(s.log.some((l) => l.text.includes("Úspěch odemčen"))).toBe(true);
  });
});
