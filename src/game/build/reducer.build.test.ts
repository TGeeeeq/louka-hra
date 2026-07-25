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
    const first = reducer(s, { type: "PLACE_STRUCTURE", defId: "chalupa", tx: 44, ty: 30 });
    const before = first.structures.length;
    expect(before).toBe(1); // sanity: první stavba prošla
    const next = reducer(first, { type: "PLACE_STRUCTURE", defId: "chalupa", tx: 60, ty: 30 });
    expect(next.structures.length).toBe(before); // chalupa už jednou postavená
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
