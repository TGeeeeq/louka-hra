import type { GameState } from "../types";
import { initialState } from "./state";
import { TUTORIAL_BUILDING_IDS, TUTORIAL_STEPS } from "../content/tutorial";

const KEY = "louka-save-v2";

export function saveGame(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* localStorage nemusí být dostupný (privátní režim) — hra běží dál v paměti */
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (typeof parsed.day !== "number" || typeof parsed.inventory !== "object")
      return null;
    // Sloučení s výchozím stavem ošetří chybějící pole z budoucích verzí.
    const merged = { ...initialState(), ...parsed } as GameState;
    // Migrace: uložení z doby před tutoriálem nemá `built` — považuj ho za
    // plně dostavěné, ať stávající hráč pokračuje v survivalu (ne v tutoriálu).
    if (parsed.built === undefined) {
      merged.built = [...TUTORIAL_BUILDING_IDS];
      merged.tutorialStep = TUTORIAL_STEPS.length;
    }
    return merged;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
