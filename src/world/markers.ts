// ---------------------------------------------------------------------------
// Živé značky ve světě — most mezi herní smyčkou na Canvasu a Reactem.
//
// Pozice (hráč, uprchlík, lidé) se mění každý snímek. Kdyby jimi tekl React
// stav, překreslovalo by se celé HUD 60× za sekundu — proto je WorldCanvas
// jen zapisuje do `liveMarkers` (mutace na místě, žádné notifikace) a mapa si
// je čte při svém vlastním rAF.
//
// Naopak SEZNAM akutních věcí („utekla ovce Lucka") React vědět potřebuje —
// ten proto žije v malém observable storu, který se ozve jen při skutečné
// změně (podle id), ne při každém kroku zvířete.
// ---------------------------------------------------------------------------

export interface WorldMarker {
  /** Stabilní id (animalId, npcId) — pro párování napříč snímky. */
  id: string;
  label: string;
  /** World souřadnice v px (ne dlaždice). */
  x: number;
  y: number;
}

export const liveMarkers: {
  player: { x: number; y: number };
  /** Zvířata, která právě utekla z výběhu (kreslí se červeně a pulzují). */
  escapes: WorldMarker[];
  npcs: WorldMarker[];
} = { player: { x: 0, y: 0 }, escapes: [], npcs: [] };

/** Akutní věc, která nesnese odklad — utečené zvíře, ohrožená zahrádka… */
export interface Alert {
  id: string;
  label: string;
  hint: string;
  emoji: string;
  /** Kam ukazovat: id zvířete v `liveMarkers.escapes`. */
  markerId?: string;
}

let alerts: Alert[] = [];
const subs = new Set<() => void>();

/** Nastaví akutní upozornění. Notifikuje jen při skutečné změně obsahu. */
export function setAlerts(next: Alert[]) {
  if (next.length === alerts.length && next.every((a, i) => a.id === alerts[i].id && a.label === alerts[i].label))
    return;
  alerts = next;
  for (const fn of subs) fn();
}

export function getAlerts(): Alert[] {
  return alerts;
}

export function subscribeAlerts(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
