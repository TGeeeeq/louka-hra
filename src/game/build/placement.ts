import type { Placed } from "../types";

type Footprint = { fw: number; fh: number };
type FootprintOf = (defId: string) => Footprint;

interface CanPlaceArgs {
  structures: Placed[];
  isSolid: (tx: number, ty: number) => boolean;
  def: Footprint;
  tx: number;
  ty: number;
  footprintOf?: FootprintOf;
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function canPlace(args: CanPlaceArgs): { ok: boolean; reason?: string } {
  const { structures, isSolid, def, tx, ty, footprintOf } = args;
  for (let dy = 0; dy < def.fh; dy++)
    for (let dx = 0; dx < def.fw; dx++)
      if (isSolid(tx + dx, ty + dy)) return { ok: false, reason: "Sem stavět nejde." };
  if (footprintOf) {
    for (const s of structures) {
      const f = footprintOf(s.defId);
      if (overlaps(tx, ty, def.fw, def.fh, s.tx, s.ty, f.fw, f.fh))
        return { ok: false, reason: "Tady už něco stojí." };
    }
  }
  return { ok: true };
}

export function structureAt(structures: Placed[], tx: number, ty: number, footprintOf: FootprintOf): Placed | null {
  for (const s of structures) {
    const f = footprintOf(s.defId);
    if (tx >= s.tx && tx < s.tx + f.fw && ty >= s.ty && ty < s.ty + f.fh) return s;
  }
  return null;
}

export function hasBuilt(structures: Placed[], defId: string): boolean {
  return structures.some((s) => s.defId === defId);
}

// Auto-rozvržení pro novou hru — 8 základních staveb uvnitř nové 96×72
// domovské louky (viz src/world/tiles.ts), aby zůstala hra hratelná bez
// nutnosti hráče cokoli stavět (spec 1).
export const AUTO_LAYOUT: Placed[] = [
  { uid: "auto-chalupa", defId: "chalupa", tx: 44, ty: 30 },
  { uid: "auto-stanek", defId: "stanek", tx: 50, ty: 32 },
  { uid: "auto-dilna", defId: "dilna", tx: 40, ty: 34 },
  { uid: "auto-ohniste", defId: "ohniste", tx: 46, ty: 36 },
  { uid: "auto-kurnik", defId: "kurnik", tx: 34, ty: 30 },
  { uid: "auto-chlivek", defId: "chlivek", tx: 38, ty: 40 },
  { uid: "auto-pastvina", defId: "pastvina", tx: 52, ty: 38 },
  { uid: "auto-buda", defId: "buda", tx: 48, ty: 28 },
  { uid: "auto-studna", defId: "studna", tx: 42, ty: 28 },
];
