// Registry 3D modelů zvířat (Quaternius, CC0 — poly.pizza). Druhy bez modelu
// (kočka, králík, drůbež…) zatím jedou na placeholder primitivech; doplní je
// AI generace (TRELLIS/TripoSG) v další fázi M2.
import type { Species } from "../../game/types";

export interface AnimalModelDef {
  url: string;
  /** Cílová výška modelu v jednotkách (dlaždicích) při animalScale=1. */
  baseHeight: number;
  /** Otočení modelu tak, aby koukal na +x (naše konvence „doprava"). */
  yaw: number;
  /** Síla přebarvení podle palety jedince (0 = nechat texturu, 1 = plná barva). */
  tint: number;
}

const M = (file: string, baseHeight: number, tint = 0.35): AnimalModelDef => ({
  url: `/models/animals/${file}.glb`,
  baseHeight,
  yaw: -Math.PI / 2, // Quaternius modely koukají na +Z
  tint,
});

export const ANIMAL_MODELS: Record<string, AnimalModelDef> = {
  sheep: M("Sheep", 0.62),
  pig: M("Pig", 0.6),
  cow: M("Cow", 0.68, 0.45),
  bull: M("Bull", 0.68, 0.45),
  donkey: M("Donkey", 0.72, 0.3),
  shiba: M("ShibaInu", 0.62, 0.3),
  husky: M("Husky", 0.62, 0.3),
  pug: M("Pug", 0.6, 0.3),
  deer: M("Deer", 0.72, 0.4),
  horse: M("Horse", 0.75, 0.3),
  fox: M("Fox", 0.6, 0.2),
  wolf: M("Wolf", 0.65, 0.2),
};

/** Výchozí model pro druh (chybějící druhy = placeholder primitiva). */
export const SPECIES_MODEL: Partial<Record<Species, string>> = {
  ovce: "sheep",
  prase: "pig",
  krava: "cow",
  osel: "donkey",
  pes: "shiba",
  muflon: "deer", // dočasně — rohatý divoch; věrný muflon přijde z AI generace
};

/** Individuální výjimky (konkrétní zvíře → jiný model, než má druh). */
export const ANIMAL_MODEL_OVERRIDE: Record<string, string> = {
  kesy: "husky", // „obří chlupatý medvěd"
  list: "pug", // štěně
  avala: "cow",
  kveta: "bull", // statnější z páru
};

export function modelForAnimal(animalId: string, species: Species): AnimalModelDef | null {
  const key = ANIMAL_MODEL_OVERRIDE[animalId] ?? SPECIES_MODEL[species];
  return key ? ANIMAL_MODELS[key] : null;
}

// --- Postavy (Quaternius Ultimate Modular Men + Cube Woman, CC0) ------------

export interface PersonModelDef {
  url: string;
  /** Cílová výška postavy v jednotkách (dlaždicích). */
  height: number;
}

export const PERSON_MODELS: Record<string, PersonModelDef> = {
  ty: { url: "/models/people/Adventurer.glb", height: 1.38 }, // hráč — batoh sedí k hospodáři
  tomas: { url: "/models/people/Farmer.glb", height: 1.42 },
  maruska: { url: "/models/people/Woman.glb", height: 1.34 },
  tony: { url: "/models/people/Worker.glb", height: 1.4 },
};
