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
