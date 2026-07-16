import type { GameState } from "../types";
import { initialState } from "./state";
import { TUTORIAL_BUILDING_IDS, TUTORIAL_STEPS } from "../content/tutorial";
import { initialAnimalStates } from "../content/characters";

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
    // Migrace v2 → v3: lineární questLine se stal linkou "main".
    if (parsed.saveVersion === undefined) {
      merged.questProgress = { main: Math.max(0, parsed.questLine ?? 0) };
      merged.saveVersion = 3;
    }
    // Migrace v3 → v4: charaktery zvířat, volné rozmístění a profil pečovatele.
    if (!merged.profile || !merged.profile.appearance) merged.profile = initialState().profile;
    if ((parsed.saveVersion ?? 0) < 4) {
      merged.animals = { ...initialAnimalStates(), ...(parsed.animals ?? {}) };
      merged.placements = parsed.placements ?? {};
      merged.saveVersion = 4;
    }
    // Migrace v4 → v5: DLC systém zrušen, nahrazen jedním entitlementem
    // fullVersion (bez tagů dlc u obsahu). Staré pole `dlcOwned` už do
    // GameState nepatří a prostě se ignoruje; fullVersion se stejně vždy
    // dotahuje z entitlements v GameProvideru — tahle migrace je jen pro pořádek.
    if ((parsed.saveVersion ?? 0) < 5) {
      merged.saveVersion = 5;
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
