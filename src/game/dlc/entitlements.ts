// Vlastnictví DLC — ZÁMĚRNĚ mimo herní save (vlastní localStorage klíč).
// Reset hry ani smazání uložené pozice nikdy nesmí smazat nákupy.
// Zdrojem pravdy je tenhle modul (později synchronizovaný s obchodem);
// GameState.dlcOwned je jen zrcadlo pro čistý reducer.
import type { DlcId } from "../types";

const KEY = "louka-dlc-v1";

export function getOwnedDlc(): DlcId[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is DlcId => x === "senne");
  } catch {
    return [];
  }
}

export function grantDlc(id: DlcId): DlcId[] {
  const owned = getOwnedDlc();
  if (!owned.includes(id)) owned.push(id);
  try {
    localStorage.setItem(KEY, JSON.stringify(owned));
  } catch {
    /* privátní režim — vlastnictví platí aspoň pro běžící session */
  }
  return owned;
}

export function revokeDlc(id: DlcId): DlcId[] {
  const owned = getOwnedDlc().filter((d) => d !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(owned));
  } catch {
    /* ignore */
  }
  return owned;
}
