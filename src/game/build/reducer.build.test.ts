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

describe("dvorek zvířat", () => {
  // kurník na 40,30 zabírá 40-42 × 30-31, dvorek má 39-43 × 29-32
  function withKurnik() {
    const s = afterTutorial();
    s.inventory.drevo = 20;
    return reducer(s, { type: "PLACE_STRUCTURE", defId: "kurnik", tx: 40, ty: 30 });
  }

  it("nepustí ohradu kolem cizího výběhu a řekne proč", () => {
    const s = withKurnik();
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: "plot", tx: 39, ty: 29 });
    expect(hasBuilt(next.structures, "plot")).toBe(false);
    expect(next.flash?.text).toContain("Tady už bydlí");
    expect(next.flash?.text).toContain("Kurník");
  });

  it("ohradu o dlaždici dál už postavit jde", () => {
    const s = withKurnik();
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: "plot", tx: 38, ty: 28 });
    expect(hasBuilt(next.structures, "plot")).toBe(true);
  });

  it("nepustí druhý výběh těsně vedle prvního", () => {
    const s = withKurnik();
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: "chlivek", tx: 43, ty: 30 });
    expect(hasBuilt(next.structures, "chlivek")).toBe(false);
    expect(next.flash?.text).toContain("Tady už bydlí");
    // s dlaždicí mezery to projde
    expect(hasBuilt(reducer(s, { type: "PLACE_STRUCTURE", defId: "chlivek", tx: 44, ty: 30 }).structures, "chlivek")).toBe(true);
  });

  it("studna u výběhu vadit nemusí", () => {
    const s = withKurnik();
    const next = reducer(s, { type: "PLACE_STRUCTURE", defId: "studna", tx: 39, ty: 29 });
    expect(hasBuilt(next.structures, "studna")).toBe(true);
  });

  it("hlídá dvorek i při přesouvání hotové stavby", () => {
    let s = withKurnik();
    s = reducer(s, { type: "PLACE_STRUCTURE", defId: "chlivek", tx: 50, ty: 30 });
    const inst = s.structures.find((x) => x.defId === "chlivek")!;
    const next = reducer(s, { type: "MOVE_STRUCTURE", uid: inst.uid, tx: 43, ty: 30 });
    expect(next.structures.find((x) => x.uid === inst.uid)!.tx).toBe(50); // zůstal, kde byl
    expect(next.flash?.text).toContain("Tady už bydlí");
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
