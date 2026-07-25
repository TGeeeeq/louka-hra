import { describe, it, expect } from "vitest";
import { migrateSave } from "../engine/save";
import { initialState } from "../engine/state";

describe("migrateSave v5→v6", () => {
  it("synthesizes structures for a save that lacks them", () => {
    const old: any = { ...initialState(), saveVersion: 5 };
    delete old.structures;
    const migrated = migrateSave(old);
    expect(Array.isArray(migrated.structures)).toBe(true);
    expect(migrated.structures.length).toBeGreaterThan(0);
    expect(migrated.saveVersion).toBe(6);
  });
  it("keeps existing structures untouched", () => {
    const s: any = { ...initialState(), saveVersion: 6, structures: [{ uid: "x", defId: "chalupa", tx: 1, ty: 1 }] };
    expect(migrateSave(s).structures).toHaveLength(1);
  });
});
