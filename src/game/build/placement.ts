import type { Buildable, Placed } from "../types";

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

// --- Dvorek zvířat ----------------------------------------------------------
// Zvířecí příbytek si kolem sebe drží kus louky. Nejde tak postavit chlívek a
// pak kolem něj obehnat ohradu pro někoho jiného ani nacpat dva výběhy na sebe
// — každá parta zvířat musí mít svoje místo.

/** Stavby, ve kterých bydlí zvířata (drží si dvorek). */
export const ANIMAL_HOME_KINDS: readonly string[] = ["kurnik", "chlivek", "pastvina", "buda"];

/** Kolik dlaždic kolem sebe si příbytek nárokuje. */
export const HOME_CLAIM_MARGIN = 1;

/** Minimum z `Buildable`, které pravidlo dvorku potřebuje znát. */
export interface ClaimDef {
  kind: string;
  category: string;
  fw: number;
  fh: number;
}

interface ClaimArgs {
  structures: Placed[];
  defOf: (defId: string) => ClaimDef | undefined;
  def: ClaimDef;
  tx: number;
  ty: number;
}

/** Zabírá tahle stavba dvorek nějakého příbytku? Vrací ten příbytek, jinak `null`. */
export function claimedBy({ structures, defOf, def, tx, ty }: ClaimArgs): Placed | null {
  // Dvorek respektují jen další příbytky a ohrady — studna, cedule nebo
  // dekorace u výběhu nikomu nevadí.
  const respects = ANIMAL_HOME_KINDS.includes(def.kind) || def.category === "ohrada";
  if (!respects) return null;
  const m = HOME_CLAIM_MARGIN;
  for (const s of structures) {
    const d = defOf(s.defId);
    if (!d || !ANIMAL_HOME_KINDS.includes(d.kind)) continue;
    if (overlaps(tx, ty, def.fw, def.fh, s.tx - m, s.ty - m, d.fw + m * 2, d.fh + m * 2)) return s;
  }
  return null;
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

// --- Instance → runtime Interactable (regeneruje src/world/entities.ts) ----
// Strukturně identické s `Interactable` (world/entities.ts) — vyhýbáme se
// importu odsud tam, abychom nevytvořili hodnotový cyklus (entities.ts už
// importuje z tohoto souboru `rebuildInteractables`).
export interface RuntimeInteractable {
  id: string;
  kind: Buildable["kind"];
  label: string;
  tx: number;
  ty: number;
  fw: number;
  fh: number;
  solid: boolean;
}

/**
 * U unikátních staveb (chalupa, stánek, studna, …) je `id` schválně `defId`
 * (stabilní přes celou hru), u neunikátních (plot, cedule_deko, …) je to
 * instance `uid`, protože jich může na louce stát víc najednou.
 */
export function buildableToInteractable(def: Buildable, inst: Placed): RuntimeInteractable {
  return {
    id: def.unique ? def.id : inst.uid,
    kind: def.kind,
    label: def.label,
    tx: inst.tx,
    ty: inst.ty,
    fw: def.fw,
    fh: def.fh,
    solid: def.solid,
  };
}

export function rebuildInteractables(structures: Placed[], byId: Record<string, Buildable>): RuntimeInteractable[] {
  return structures.filter((s) => byId[s.defId]).map((s) => buildableToInteractable(byId[s.defId], s));
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
