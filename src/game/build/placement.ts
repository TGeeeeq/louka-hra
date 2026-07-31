import type { Buildable, BuildablePen, Placed } from "../types";

type Footprint = { fw: number; fh: number };
type FootprintOf = (defId: string) => Footprint;

/** Obdélník v dlaždicích — `x1`/`y1` je první dlaždice ZA obdélníkem. */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Minimum z `Buildable`, které geometrie potřebuje znát. */
export interface OccupancyDef {
  fw: number;
  fh: number;
  pen?: BuildablePen;
}

type DefOf = (defId: string) => OccupancyDef | undefined;

interface CanPlaceArgs {
  structures: Placed[];
  isSolid: (tx: number, ty: number) => boolean;
  def: OccupancyDef;
  tx: number;
  ty: number;
  /** Katalog pro obálky už postavených staveb. Bez něj se překryv neřeší. */
  defOf?: DefOf;
}

/** Protínají se dva obdélníky? */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/** Půdorys samotné stavby (bez výběhu). */
export function footprintRect(def: OccupancyDef, tx: number, ty: number): Rect {
  return { x0: tx, y0: ty, x1: tx + def.fw, y1: ty + def.fh };
}

/** Výběh stavby na dané pozici, nebo `null` (stavba žádný nemá). */
export function penRect(def: OccupancyDef, tx: number, ty: number): Rect | null {
  const p = def.pen;
  if (!p) return null;
  return { x0: tx + p.ox, y0: ty + p.oy, x1: tx + p.ox + p.w, y1: ty + p.oy + p.h };
}

/**
 * Kolik místa stavba doopravdy zabere — půdorys i s výběhem. Tohle je jediný
 * zdroj pravdy pro kolize při stavění: díky němu nejde postavit stánek doprostřed
 * výběhu ani výběh přes stánek.
 */
export function occupancyOf(def: OccupancyDef, tx: number, ty: number): Rect {
  const f = footprintRect(def, tx, ty);
  const p = penRect(def, tx, ty);
  if (!p) return f;
  return {
    x0: Math.min(f.x0, p.x0),
    y0: Math.min(f.y0, p.y0),
    x1: Math.max(f.x1, p.x1),
    y1: Math.max(f.y1, p.y1),
  };
}

export function canPlace(args: CanPlaceArgs): { ok: boolean; reason?: string; blocker?: Placed } {
  const { structures, isSolid, def, tx, ty, defOf } = args;
  // Les, voda a okraj mapy vadí jen pod samotnou stavbou — výběh je otevřená
  // louka, kterou hráč projde, takže mu kraj hájku nevadí.
  for (let dy = 0; dy < def.fh; dy++)
    for (let dx = 0; dx < def.fw; dx++)
      if (isSolid(tx + dx, ty + dy)) return { ok: false, reason: "Sem stavět nejde." };
  if (defOf) {
    const mine = occupancyOf(def, tx, ty);
    for (const s of structures) {
      const d = defOf(s.defId);
      if (!d) continue;
      if (rectsOverlap(mine, occupancyOf(d, s.tx, s.ty)))
        return { ok: false, reason: "Tady už něco stojí.", blocker: s };
    }
  }
  return { ok: true };
}

/** Stavby, ve kterých bydlí zvířata (mají výběh). */
export const ANIMAL_HOME_KINDS: readonly string[] = ["kurnik", "chlivek", "pastvina", "buda"];

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
