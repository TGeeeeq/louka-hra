import type { Placed } from "../types";
import { BUILDABLE_BY_ID } from "../content/buildables";
import { MAP_H, MAP_W, isSolidTile } from "../../world/tiles";
import { canPlace, claimedBy } from "./placement";

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

/** Proč to sem nejde. `short` do lišty, `long` do hlášky/dialogu. */
export interface PlacementIssue {
  short: string;
  long: string;
}

const defOf = (id: string) => BUILDABLE_BY_ID[id];

/**
 * Dvorek zvířat: cizí příbytek ani ohrada se nesmí nacpat těsně k výběhu,
 * kde už někdo bydlí. `structures` už musí být bez přesouvané stavby.
 */
export function homeClaimIssue(
  structures: Placed[],
  defId: string,
  tx: number,
  ty: number,
): PlacementIssue | null {
  const def = BUILDABLE_BY_ID[defId];
  if (!def) return null;
  const home = claimedBy({ structures, defOf, def, tx, ty });
  if (!home) return null;
  const label = BUILDABLE_BY_ID[home.defId]?.label ?? "jiná stavba";
  return {
    short: `Tady už bydlí ${label}`,
    long: `Tady už bydlí ${label} — zvířata potřebují svůj dvorek. Postav to o kus dál.`,
  };
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
  const check = canPlace({ structures: others, isSolid: isSolidTile, def: footprintOf(defId), tx, ty, footprintOf });
  if (!check.ok)
    return { short: "Sem se to nevejde", long: "Sem se to nevejde — je tam les, voda nebo jiná stavba." };
  return homeClaimIssue(others, defId, tx, ty);
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
 * Zaříznuto na mapu, ať ho hráč nevystrčí mimo svět.
 */
export function nudgeWithinMap(defId: string, tx: number, ty: number, dx: number, dy: number) {
  const { fw, fh } = footprintOf(defId);
  return {
    tx: Math.max(0, Math.min(MAP_W - fw, tx + dx)),
    ty: Math.max(0, Math.min(MAP_H - fh, ty + dy)),
  };
}
