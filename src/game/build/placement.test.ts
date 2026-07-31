import { describe, it, expect } from "vitest";
import {
  AUTO_LAYOUT,
  canPlace,
  hasBuilt,
  occupancyOf,
  penRect,
  rectsOverlap,
  structureAt,
  type OccupancyDef,
} from "./placement";
import { BUILDABLE_BY_ID } from "../content/buildables";
import type { Placed } from "../types";

const wall = new Set(["10,10"]); // one solid tile for tests
const isSolid = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= 20 || ty >= 20 || wall.has(`${tx},${ty}`);

const at = (defId: string, tx: number, ty: number): Placed => ({ uid: `${defId}-${tx}-${ty}`, defId, tx, ty });

describe("canPlace", () => {
  it("accepts a valid free tile", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 5, ty: 5 }).ok).toBe(true);
  });
  it("rejects out of bounds", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 19, ty: 19 }).ok).toBe(true);
    expect(canPlace({ structures: [], isSolid, def: { fw: 2, fh: 2 }, tx: 19, ty: 19 }).ok).toBe(false);
  });
  it("rejects a solid tile under the footprint", () => {
    expect(canPlace({ structures: [], isSolid, def: { fw: 1, fh: 1 }, tx: 10, ty: 10 }).ok).toBe(false);
  });
  it("rejects overlap with an existing structure", () => {
    const structures = [at("stanek", 5, 5)];
    const defOf = () => ({ fw: 2, fh: 2 });
    expect(canPlace({ structures, isSolid, def: { fw: 1, fh: 1 }, tx: 5, ty: 5, defOf }).ok).toBe(false);
    expect(canPlace({ structures, isSolid, def: { fw: 1, fh: 1 }, tx: 9, ty: 9, defOf }).ok).toBe(true);
  });
});

describe("occupancyOf (stavba i s výběhem)", () => {
  const kurnik: OccupancyDef = { fw: 3, fh: 2, pen: { ox: -4, oy: -3, w: 9, h: 8, group: "drubez", label: "Drůbeží výběh" } };

  it("bez výběhu je obálka jen půdorys", () => {
    expect(occupancyOf({ fw: 3, fh: 2 }, 5, 5)).toEqual({ x0: 5, y0: 5, x1: 8, y1: 7 });
    expect(penRect({ fw: 3, fh: 2 }, 5, 5)).toBeNull();
  });
  it("s výběhem obálka obalí i ohradu", () => {
    // kurník na 10,10 → ohrada 6..14 × 7..14
    expect(occupancyOf(kurnik, 10, 10)).toEqual({ x0: 6, y0: 7, x1: 15, y1: 15 });
    expect(penRect(kurnik, 10, 10)).toEqual({ x0: 6, y0: 7, x1: 15, y1: 15 });
  });
  it("obálka se posouvá spolu se stavbou", () => {
    const a = occupancyOf(kurnik, 10, 10);
    const b = occupancyOf(kurnik, 13, 12);
    expect(b.x0 - a.x0).toBe(3);
    expect(b.y0 - a.y0).toBe(2);
  });
});

describe("kolize s výběhem", () => {
  const DEFS: Record<string, OccupancyDef> = {
    kurnik: { fw: 3, fh: 2, pen: { ox: -4, oy: -3, w: 9, h: 8, group: "drubez", label: "Drůbeží výběh" } },
    chlivek: { fw: 3, fh: 2, pen: { ox: -5, oy: -3, w: 9, h: 8, group: "prasata", label: "Prasečí výběh" } },
    stanek: { fw: 2, fh: 2 },
    studna: { fw: 1, fh: 1 },
  };
  const defOf = (id: string) => DEFS[id];
  const free = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= 60 || ty >= 60;
  // kurník na 20,20 → ohrada 16..24 × 17..24
  const structures = [at("kurnik", 20, 20)];
  const place = (defId: string, tx: number, ty: number) =>
    canPlace({ structures, isSolid: free, def: DEFS[defId], tx, ty, defOf }).ok;

  it("stánek nejde postavit doprostřed výběhu", () => {
    expect(place("stanek", 18, 22)).toBe(false);
    expect(place("stanek", 16, 17)).toBe(false); // roh ohrady
  });
  it("ani studna nebo cokoli jiného do výběhu nepatří", () => {
    expect(place("studna", 23, 23)).toBe(false);
  });
  it("kousek za ohradou už to jde", () => {
    expect(place("stanek", 25, 25)).toBe(true);
    expect(place("studna", 15, 20)).toBe(true);
  });
  it("výběh nesmí překrýt stojící stavbu", () => {
    const withStanek = [at("stanek", 30, 30)];
    // chlívek na 34,32 → ohrada 29..37 × 29..36, stánek 30..31 × 30..31 je uvnitř
    expect(canPlace({ structures: withStanek, isSolid: free, def: DEFS.chlivek, tx: 34, ty: 32, defOf }).ok).toBe(false);
    expect(canPlace({ structures: withStanek, isSolid: free, def: DEFS.chlivek, tx: 44, ty: 40, defOf }).ok).toBe(true);
  });
  it("dva výběhy se nesmí prolnout", () => {
    expect(place("chlivek", 24, 20)).toBe(false);
    expect(place("chlivek", 31, 20)).toBe(true);
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
  it("žádné dvě obálky (stavba + výběh) se nepřekrývají", () => {
    const boxes = AUTO_LAYOUT.map((p) => ({ p, r: occupancyOf(BUILDABLE_BY_ID[p.defId], p.tx, p.ty) }));
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        expect(
          rectsOverlap(boxes[i].r, boxes[j].r),
          `${boxes[i].p.defId} × ${boxes[j].p.defId}`,
        ).toBe(false);
  });
  it("každý zvířecí příbytek má svůj výběh", () => {
    for (const id of ["kurnik", "chlivek", "pastvina", "buda"])
      expect(BUILDABLE_BY_ID[id].pen, id).toBeDefined();
  });
});
