import type { Placed } from "../types";
import { BUILDABLE_BY_ID } from "../content/buildables";
import { MAP_H, MAP_W, isSolidTile } from "../../world/tiles";
import { canPlace } from "./placement";

/**
 * Náhled umístění stavby — sdílený mezi canvasem (zelený/červený půdorys)
 * a UI lištou potvrzení (aktivní tlačítko „Postavit"). Kontrola je schválně
 * shodná s reducerem PLACE_STRUCTURE / MOVE_STRUCTURE, aby náhled nikdy
 * netvrdil něco jiného než samotná akce.
 */

/** fw/fh podle katalogového `defId` (chybějící def = 1×1). */
export function footprintOf(defId: string) {
  const d = BUILDABLE_BY_ID[defId];
  return { fw: d?.fw ?? 1, fh: d?.fh ?? 1 };
}

/** `ignoreUid` = přesouvaná stavba; sama se sebou kolidovat nesmí. */
export function placementValid(
  structures: Placed[],
  defId: string,
  tx: number,
  ty: number,
  ignoreUid?: string,
): boolean {
  const def = BUILDABLE_BY_ID[defId];
  const others = ignoreUid ? structures.filter((s) => s.uid !== ignoreUid) : structures;
  if (!ignoreUid && def?.unique && others.some((s) => s.defId === defId)) return false;
  return canPlace({
    structures: others,
    isSolid: isSolidTile,
    def: footprintOf(defId),
    tx,
    ty,
    footprintOf,
  }).ok;
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
