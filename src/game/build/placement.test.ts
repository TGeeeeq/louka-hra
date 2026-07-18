import { describe, it, expect } from "vitest";
import { canPlace, structureAt, hasBuilt, AUTO_LAYOUT } from "./placement";
import type { Placed } from "../types";

const wall = new Set(["10,10"]); // one solid tile for tests
const isSolid = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= 20 || ty >= 20 || wall.has(`${tx},${ty}`);

const at = (defId: string, tx: number, ty: number): Placed => ({ uid: `${defId}-${tx}-${ty}`, defId, tx, ty });

describe("canPlace", () => {
  it("accepts a valid free tile", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 5, ty: 5 }).ok).toBe(true);
  });
  it("rejects out of bounds", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 19, ty: 19, }).ok).toBe(true);
    expect(canPlace({ structures: [], isSolid, def: { fw: 2, fh: 2 }, tx: 19, ty: 19 }).ok).toBe(false);
  });
  it("rejects a solid tile under the footprint", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 10, ty: 10 }).ok).toBe(false);
  });
  it("rejects overlap with an existing structure", () => {
    const structures = [at("stanek", 5, 5)]; // fw/fh come from lookup below
    expect(canPlace({ structures, isSolid, def: { fw: 1, fh: 1 }, tx: 5, ty: 5, footprintOf: () => ({ fw: 2, fh: 2 }) }).ok).toBe(false);
    expect(canPlace({ structures, isSolid, def: { fw: 1, fh: 1 }, tx: 9, ty: 9, footprintOf: () => ({ fw: 2, fh: 2 }) }).ok).toBe(true);
  });
});

describe("structureAt", () => {
  it("finds a structure whose footprint covers the tile", () => {
    const structures = [at("stanek", 5, 5)];
    const found = structureAt(structures, 6, 6, () => ({ fw: 2, fh: 2 }));
    expect(found?.defId).toBe("stanek");
    expect(structureAt(structures, 8, 8, () => ({ fw: 2, fh: 2 }))).toBeNull();
  });
});

describe("hasBuilt", () => {
  it("is true when an instance of the def exists", () => {
    expect(hasBuilt([at("dilna", 3, 3)], "dilna")).toBe(true);
    expect(hasBuilt([at("dilna", 3, 3)], "stanek")).toBe(false);
  });
});

describe("AUTO_LAYOUT", () => {
  it("includes the core buildings once each", () => {
    const ids = AUTO_LAYOUT.map((p) => p.defId);
    for (const core of ["chalupa", "stanek", "dilna", "ohniste", "kurnik", "chlivek", "pastvina", "buda"])
      expect(ids.filter((i) => i === core).length).toBe(1);
  });
  it("gives every placement a unique uid", () => {
    const uids = AUTO_LAYOUT.map((p) => p.uid);
    expect(new Set(uids).size).toBe(uids.length);
  });
});
