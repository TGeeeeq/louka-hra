import { describe, it, expect } from "vitest";
import { canPlace, claimedBy, structureAt, hasBuilt, AUTO_LAYOUT, type ClaimDef } from "./placement";
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

describe("claimedBy (dvorek zvířat)", () => {
  const DEFS: Record<string, ClaimDef> = {
    chlivek: { kind: "chlivek", category: "zaklad", fw: 3, fh: 2 },
    kurnik: { kind: "kurnik", category: "zaklad", fw: 3, fh: 2 },
    plot: { kind: "cedule", category: "ohrada", fw: 1, fh: 1 },
    studna: { kind: "studna", category: "upgrade", fw: 1, fh: 1 },
    cedule_deko: { kind: "cedule", category: "dekorace", fw: 1, fh: 1 },
  };
  const defOf = (id: string) => DEFS[id];
  // chlívek na 5,5 zabírá 5-7 × 5-6, jeho dvorek je 4-8 × 4-7
  const structures = [at("chlivek", 5, 5)];
  const claim = (defId: string, tx: number, ty: number) =>
    claimedBy({ structures, defOf, def: DEFS[defId], tx, ty });

  it("nepustí ohradu do dvorku cizího příbytku", () => {
    expect(claim("plot", 4, 4)?.defId).toBe("chlivek"); // roh dvorku
    expect(claim("plot", 8, 7)?.defId).toBe("chlivek"); // protilehlý roh
    expect(claim("plot", 6, 4)?.defId).toBe("chlivek"); // těsně nad chlívkem
  });
  it("pustí ohradu o dlaždici dál", () => {
    expect(claim("plot", 3, 3)).toBeNull();
    expect(claim("plot", 9, 5)).toBeNull();
    expect(claim("plot", 5, 8)).toBeNull();
  });
  it("nepustí druhý výběh těsně vedle", () => {
    expect(claim("kurnik", 8, 5)?.defId).toBe("chlivek"); // dotýká se dvorku
    expect(claim("kurnik", 9, 5)).toBeNull(); // dlaždice mezera stačí
  });
  it("studny, cedule a dekorace u výběhu nevadí", () => {
    expect(claim("studna", 4, 4)).toBeNull();
    expect(claim("cedule_deko", 6, 4)).toBeNull();
  });
  it("bez zvířecího příbytku v okolí nic neblokuje", () => {
    expect(claimedBy({ structures: [], defOf, def: DEFS.plot, tx: 5, ty: 5 })).toBeNull();
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
  it("respects every animal's yard", () => {
    const defs: Record<string, ClaimDef> = {
      chalupa: { kind: "chalupa", category: "zaklad", fw: 3, fh: 2 },
      stanek: { kind: "stanek", category: "zaklad", fw: 2, fh: 2 },
      dilna: { kind: "dilna", category: "zaklad", fw: 2, fh: 2 },
      ohniste: { kind: "ohniste", category: "zaklad", fw: 2, fh: 2 },
      kurnik: { kind: "kurnik", category: "zaklad", fw: 3, fh: 2 },
      chlivek: { kind: "chlivek", category: "zaklad", fw: 3, fh: 2 },
      pastvina: { kind: "pastvina", category: "zaklad", fw: 3, fh: 2 },
      buda: { kind: "buda", category: "zaklad", fw: 2, fh: 2 },
      studna: { kind: "studna", category: "upgrade", fw: 1, fh: 1 },
    };
    for (const p of AUTO_LAYOUT) {
      const others = AUTO_LAYOUT.filter((o) => o.uid !== p.uid);
      expect(
        claimedBy({ structures: others, defOf: (id) => defs[id], def: defs[p.defId], tx: p.tx, ty: p.ty }),
      ).toBeNull();
    }
  });
});
