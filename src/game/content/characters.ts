// src/game/content/characters.ts
// Charaktery Louky — které zvíře má vlastní náladu, potřeby a přátelství.
// Jediný zdroj pravdy: seznam postav + popisky nálady/přátelství + seed.
// Filozofie zůstává: trpělivost, ne trest — přátelství roste péčí.
import type { AnimalMood, AnimalState } from "../types";

/**
 * Vybraná zvířata s hlubším charakterem. Začínáme mazlíčky (psi, kočky)
 * a pár vlajkovými tvářemi (osel Karel, prasata Princezna a Flíček).
 * Rozšiřitelné — přidání dalšího id nevyžaduje migraci (noční logika i karta
 * si stav líně doplní).
 */
export const CHARACTER_ANIMAL_IDS = [
  "kesy",
  "riky",
  "atila", // psi
  "denis",
  "roman",
  "safir", // kočky
  "karel", // osel
  "princezna",
  "flicek", // prasata
] as const;

export const CHARACTER_SET = new Set<string>(CHARACTER_ANIMAL_IDS);

// Pět laskavých stupňů nálady (nejhorší = „stýská se", ne utrpení).
export const MOOD_LABEL: Record<AnimalMood, string> = {
  radostny: "Září štěstím",
  spokojeny: "Spokojený",
  pohoda: "V pohodě",
  posmutnely: "Trochu posmutnělý",
  styska: "Stýská se mu",
};

export const MOOD_EMOJI: Record<AnimalMood, string> = {
  radostny: "😄",
  spokojeny: "🙂",
  pohoda: "😌",
  posmutnely: "🙁",
  styska: "🥺",
};

// Mapuje náladu na tón barevného štítku (sdílí .zone-mood good/ok/low/bad).
export const MOOD_TONE: Record<AnimalMood, "good" | "ok" | "low" | "bad"> = {
  radostny: "good",
  spokojeny: "good",
  pohoda: "ok",
  posmutnely: "low",
  styska: "bad",
};

/** Stupně přátelství 0–100 (jen roste / jemně kolísá). */
export function bondTier(bond: number): string {
  if (bond >= 90) return "Rodina Louky";
  if (bond >= 70) return "Blízký přítel";
  if (bond >= 45) return "Kamarád";
  if (bond >= 20) return "Zná tě";
  return "Ještě se poznáváte";
}

/** Výchozí stav pro každou postavu — vlažně přátelský začátek. */
export function initialAnimalStates(): Record<string, AnimalState> {
  const out: Record<string, AnimalState> = {};
  for (const id of CHARACTER_ANIMAL_IDS) {
    out[id] = {
      bond: 15,
      social: 70,
      comfort: 70,
      mood: "pohoda",
      lastPlayDay: 0,
    };
  }
  return out;
}
