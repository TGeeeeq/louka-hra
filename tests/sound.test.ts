// Test proti "chrčení" u FM syntézy: hloubka modulace nesmí stáhnout
// okamžitou frekvenci k nule/zápornu (aliasing, nejhorší u sawtooth).
import { describe, expect, it } from "vitest";
import { clampModGain } from "../src/audio/sound";

describe("clampModGain", () => {
  it("nechá nízkou hloubku beze změny", () => {
    expect(clampModGain(100, 0.3)).toBeCloseTo(30);
  });

  it("ořízne hloubku >= 1 na strop 0.85× carrier", () => {
    expect(clampModGain(100, 1.2)).toBeCloseTo(85);
    expect(clampModGain(100, 1.8)).toBeCloseTo(85);
  });

  it("minimální okamžitá frekvence (carrier - modGain) je vždy kladná", () => {
    for (const modDepth of [0.1, 0.5, 1.0, 1.2, 1.5, 1.8, 3.5]) {
      const carrier = 90;
      const modGain = clampModGain(carrier, modDepth);
      expect(carrier - modGain).toBeGreaterThan(0);
    }
  });
});
