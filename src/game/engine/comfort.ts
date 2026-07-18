// src/game/engine/comfort.ts
// Jediné místo, které z rozmístění staveb počítá „pohodlí" zvířete.
// Vrací 0–100 (default 70 = neutrálně dobré). Čistá funkce, jen čte stav.
import type { GameState } from "../types";
import { ANIMAL_BY_ID } from "../content/animals";
import { PEN_BY_GROUP } from "../content/tutorial";
import { isMovable, structureCenter, zoneCenterFor } from "../../world/entities";
import { isSolidTile, TS } from "../../world/tiles";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Pohodlí zvířete z rozmístění staveb, 0–100.
 * Default 70, dokud volné rozmístění nemá co hodnotit (zvíře nemá přemístitelný
 * pelíšek). Když pelíšek/bouda existuje a je přemístitelná: kvalita 0..1
 * (0.7·blízkost zóny + 0.3·otevřenost okolí) → 40..100.
 */
export function layoutComfortFor(animalId: string, _s: GameState): number {
  const a = ANIMAL_BY_ID[animalId];
  if (!a) return 70;
  const penId = PEN_BY_GROUP[a.feedGroup];
  if (!penId || !isMovable(penId)) return 70; // MVP: jen buda (mazlíci)
  const pos = structureCenter(penId);
  if (!pos) return 70;

  const zone = zoneCenterFor(a.feedGroup);
  const distTiles = Math.hypot(pos.x - zone.x, pos.y - zone.y) / TS;
  const nearZone = clamp01(1 - distTiles / 8); // do 8 dlaždic od zóny = útulno

  // Penalizace za natěsnání k lesu/vodě/plotu (nepohodlí).
  const tx = Math.round(pos.x / TS);
  const ty = Math.round(pos.y / TS);
  let solid = 0;
  let tot = 0;
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      tot++;
      if (isSolidTile(tx + dx, ty + dy)) solid++;
    }
  const openness = 1 - solid / tot;

  const quality01 = clamp01(nearZone * 0.7 + openness * 0.3);
  return 40 + quality01 * 60;
}
