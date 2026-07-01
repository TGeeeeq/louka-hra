import type { Fact, GameState, LogEntry } from "../types";

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const chance = (p: number) => Math.random() < p;

export const invCount = (inv: Record<string, number>, id: string) =>
  inv[id] ?? 0;

export const hasItems = (
  inv: Record<string, number>,
  reqs: { item: string; qty: number }[],
) => reqs.every((r) => (inv[r.item] ?? 0) >= r.qty);

/** Mělká kopie stavu s naklonováním měněných struktur. */
export function cloneState(s: GameState): GameState {
  return {
    ...s,
    inventory: { ...s.inventory },
    buildings: [...s.buildings],
    built: [...s.built],
    welfare: { ...s.welfare },
    population: { ...s.population },
    tasksDone: { ...s.tasksDone },
    knownFacts: [...s.knownFacts],
    seenAnimals: [...s.seenAnimals],
    questCompleted: [...s.questCompleted],
    flags: { ...s.flags },
    log: s.log,
  };
}

/** Přidá repliky do dialogového okna (nebo je připojí k existujícímu). */
export function pushDialog(s: GameState, speaker: string | undefined, lines: string[]) {
  if (s.dialog) s.dialog = { speaker: s.dialog.speaker ?? speaker, lines: [...s.dialog.lines, ...lines] };
  else s.dialog = { speaker, lines: [...lines] };
}

export function addLog(
  s: GameState,
  text: string,
  tone: LogEntry["tone"] = "info",
) {
  const id = s.logSeq + 1;
  s.logSeq = id;
  s.log = [{ id, day: s.day, text, tone }, ...s.log].slice(0, 50);
}

export function flash(
  s: GameState,
  text: string,
  tone: LogEntry["tone"] = "info",
  fact?: Fact,
) {
  s.flash = { id: s.logSeq + 1, text, tone, fact };
  s.logSeq += 1;
}

/** Přičte/odečte předmět (qty může být záporné). Nepustí pod nulu. */
export function give(s: GameState, id: string, qty: number) {
  s.inventory[id] = Math.max(0, (s.inventory[id] ?? 0) + qty);
}

export function take(s: GameState, reqs: { item: string; qty: number }[]) {
  for (const r of reqs) give(s, r.item, -r.qty);
}

/** Objeví nové faktum, vrátí jeho objekt jen když je opravdu nové. */
export function learnFact(
  s: GameState,
  fact: Fact | undefined,
): Fact | undefined {
  if (!fact) return undefined;
  if (s.knownFacts.includes(fact.id)) return undefined;
  s.knownFacts.push(fact.id);
  return fact;
}
