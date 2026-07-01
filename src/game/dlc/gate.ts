// Brána obsahu podle vlastněných DLC. Obsah je tagovaný volitelným `dlc`
// polem — bez tagu je základní hra, s tagem se ukáže jen vlastníkům.
import type { DlcId, GameState } from "../types";

export function hasDlc(s: GameState, id?: DlcId): boolean {
  return !id || s.dlcOwned.includes(id);
}

/** Obecný filtr pro seznamy obsahu (itemy, recepty, stavby, fakta…). */
export function ownedOnly<T extends { dlc?: DlcId }>(s: GameState, list: T[]): T[] {
  return list.filter((x) => hasDlc(s, x.dlc));
}
