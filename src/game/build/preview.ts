import type { Placed } from "../types";
import { BUILDABLE_BY_ID } from "../content/buildables";
import { MAP_H, MAP_W, isSolidTile } from "../../world/tiles";
import { WORLD_FEATURES } from "../../world/entities";
import { canPlace, footprintRect, occupancyOf, penRect, rectsOverlap, type Rect } from "./placement";

/**
 * Náhled umístění stavby — sdílený mezi canvasem (zelený/červený půdorys),
 * lištou potvrzení a reducerem, aby náhled nikdy netvrdil něco jiného než
 * samotná akce.
 */

/** fw/fh podle katalogového `defId` (chybějící def = 1×1). */
export function footprintOf(defId: string) {
  const d = BUILDABLE_BY_ID[defId];
  return { fw: d?.fw ?? 1, fh: d?.fh ?? 1 };
}

const defOf = (id: string) => BUILDABLE_BY_ID[id];

/** Obálka (stavba + výběh) podle `defId` — pro náhled, ořez i kolize. */
export function occupancyRect(defId: string, tx: number, ty: number): Rect {
  const d = BUILDABLE_BY_ID[defId];
  return occupancyOf(d ?? { fw: 1, fh: 1 }, tx, ty);
}

/** Výběh podle `defId` na dané pozici, nebo `null`. */
export function penRectOf(defId: string, tx: number, ty: number): Rect | null {
  const d = BUILDABLE_BY_ID[defId];
  return d ? penRect(d, tx, ty) : null;
}

/** Proč to sem nejde. `short` do lišty, `long` do hlášky/dialogu. */
export interface PlacementIssue {
  short: string;
  long: string;
}

/**
 * Výběh zvířat: příbytek si kolem sebe nese ohradu, takže do ní nejde nacpat
 * cizí stavbu ani druhý výběh. `structures` už musí být bez přesouvané stavby.
 */
export function homeClaimIssue(
  structures: Placed[],
  defId: string,
  tx: number,
  ty: number,
): PlacementIssue | null {
  const def = BUILDABLE_BY_ID[defId];
  if (!def) return null;
  const mine = occupancyOf(def, tx, ty);
  for (const s of structures) {
    const d = defOf(s.defId);
    if (!d?.pen) continue;
    if (!rectsOverlap(mine, occupancyOf(d, s.tx, s.ty))) continue;
    return {
      short: `Tady už bydlí ${d.label}`,
      long: `Tady už bydlí ${d.label} — zvířata potřebují svůj výběh. Postav to o kus dál.`,
    };
  }
  return null;
}

/** Stojí půdorys stavby na autorském bodu zájmu (bylinky, cedule, truhla, …)? */
function featureIssue(defId: string, tx: number, ty: number): PlacementIssue | null {
  const foot = footprintRect(BUILDABLE_BY_ID[defId] ?? { fw: 1, fh: 1 }, tx, ty);
  for (const f of WORLD_FEATURES) {
    const r: Rect = { x0: f.tx, y0: f.ty, x1: f.tx + f.fw, y1: f.ty + f.fh };
    if (!rectsOverlap(foot, r)) continue;
    return {
      short: `Přes ${f.label} to nejde`,
      long: `Tady je ${f.label} — na to se stavět nedá. Posuň stavbu o kus dál.`,
    };
  }
  return null;
}

/** `ignoreUid` = přesouvaná stavba; sama se sebou kolidovat nesmí. */
export function placementIssue(
  structures: Placed[],
  defId: string,
  tx: number,
  ty: number,
  ignoreUid?: string,
): PlacementIssue | null {
  const def = BUILDABLE_BY_ID[defId];
  const others = ignoreUid ? structures.filter((s) => s.uid !== ignoreUid) : structures;
  if (!ignoreUid && def?.unique && others.some((s) => s.defId === defId))
    return { short: "Tohle už na louce máš", long: "Tohle už na louce máš — postavit se to dá jen jednou." };
  // Výběh nesmí vylézt z mapy, i když stavba sama uvnitř je.
  const occ = occupancyRect(defId, tx, ty);
  if (occ.x0 < 0 || occ.y0 < 0 || occ.x1 > MAP_W || occ.y1 > MAP_H)
    return { short: "Sem se to nevejde", long: "Sem se to nevejde — výběh by přetekl z louky ven." };
  // Nejdřív ohlas výběh (má hezčí hlášku), pak obecnou kolizi.
  const claim = homeClaimIssue(others, defId, tx, ty);
  if (claim) return claim;
  const check = canPlace({ structures: others, isSolid: isSolidTile, def: def ?? { fw: 1, fh: 1 }, tx, ty, defOf });
  if (!check.ok)
    return { short: "Sem se to nevejde", long: "Sem se to nevejde — je tam les, voda nebo jiná stavba." };
  return featureIssue(defId, tx, ty);
}

export function placementValid(
  structures: Placed[],
  defId: string,
  tx: number,
  ty: number,
  ignoreUid?: string,
): boolean {
  return placementIssue(structures, defId, tx, ty, ignoreUid) === null;
}

/**
 * Posun rozestavěného půdorysu o dlaždice (šipky u potvrzení stavby).
 * Zaříznuto na mapu i s výběhem, ať ho hráč nevystrčí mimo svět.
 */
export function nudgeWithinMap(defId: string, tx: number, ty: number, dx: number, dy: number) {
  const occ = occupancyRect(defId, tx, ty);
  // O kolik obálka přesahuje stavbu na každou stranu.
  const padL = tx - occ.x0;
  const padT = ty - occ.y0;
  const padR = occ.x1 - tx;
  const padB = occ.y1 - ty;
  return {
    tx: Math.max(padL, Math.min(MAP_W - padR, tx + dx)),
    ty: Math.max(padT, Math.min(MAP_H - padB, ty + dy)),
  };
}
