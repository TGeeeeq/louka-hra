import type { GameState } from "../types";
import { initialState } from "./state";

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
    return { ...initialState(), ...parsed } as GameState;
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
