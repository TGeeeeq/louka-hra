// Barvy 3D světa — dlaždice podle sezóny, obloha a světlo podle fáze dne.
import { TILE } from "../../world/tiles";
import type { Phase, Season, Weather } from "../../game/types";

// Barvy dlaždic (hex) pro každou sezónu. Vychází z 2D palet v world/draw.ts,
// mírně ztmavené — 3D scéna dostává světlo navrch od slunce.
export const TILE_COLORS: Record<Season, Record<number, string>> = {
  jaro: {
    [TILE.GRASS]: "#6fbf5e",
    [TILE.FOREST]: "#2f6d3a",
    [TILE.WATER]: "#3f7fb8",
    [TILE.PATH]: "#c9a56a",
    [TILE.FLOWERS]: "#6fbf5e",
    [TILE.DIRT]: "#9a7a4e",
    [TILE.FENCE]: "#8a6a42",
    [TILE.BUSH]: "#58a84e",
    [TILE.TALL]: "#6fbf5e",
  },
  leto: {
    [TILE.GRASS]: "#5fae4e",
    [TILE.FOREST]: "#2a6234",
    [TILE.WATER]: "#3a78b0",
    [TILE.PATH]: "#cfa96c",
    [TILE.FLOWERS]: "#5fae4e",
    [TILE.DIRT]: "#a07e50",
    [TILE.FENCE]: "#8a6a42",
    [TILE.BUSH]: "#4d9c44",
    [TILE.TALL]: "#5fae4e",
  },
  podzim: {
    [TILE.GRASS]: "#a3963f",
    [TILE.FOREST]: "#6d5a26",
    [TILE.WATER]: "#3f74a4",
    [TILE.PATH]: "#b9945c",
    [TILE.FLOWERS]: "#a3963f",
    [TILE.DIRT]: "#8e6f46",
    [TILE.FENCE]: "#7c5f3a",
    [TILE.BUSH]: "#997a2e",
    [TILE.TALL]: "#a3963f",
  },
  zima: {
    [TILE.GRASS]: "#dfe7ea",
    [TILE.FOREST]: "#4a6a55",
    [TILE.WATER]: "#7fa8c8",
    [TILE.PATH]: "#c9c2b2",
    [TILE.FLOWERS]: "#dfe7ea",
    [TILE.DIRT]: "#b8ad98",
    [TILE.FENCE]: "#7c6a4e",
    [TILE.BUSH]: "#c2d2cc",
    [TILE.TALL]: "#dfe7ea",
  },
};

export interface Atmosphere {
  sky: string;
  fog: string;
  /** Vzdálenosti mlhy (near, far) — počasí je umí stáhnout. */
  fogNear: number;
  fogFar: number;
  sunColor: string;
  sunIntensity: number;
  ambient: string;
  ambientIntensity: number;
}

export function atmosphereFor(phase: Phase, season: Season, weather: Weather): Atmosphere {
  let a: Atmosphere;
  if (phase === "rano")
    a = { sky: "#bfe0f2", fog: "#cde6f0", fogNear: 28, fogFar: 70, sunColor: "#ffe0b0", sunIntensity: 2.4, ambient: "#dbeaf2", ambientIntensity: 0.85 };
  else if (phase === "poledne")
    a = { sky: "#9fd4f5", fog: "#c2e2ef", fogNear: 28, fogFar: 70, sunColor: "#fff4dc", sunIntensity: 3.0, ambient: "#e6f0f4", ambientIntensity: 0.95 };
  else
    a = { sky: "#5a5f9e", fog: "#7a7aac", fogNear: 28, fogFar: 70, sunColor: "#ffb070", sunIntensity: 1.4, ambient: "#8f93c4", ambientIntensity: 0.7 };
  if (season === "zima") {
    a = { ...a, sky: phase === "vecer" ? "#4e5480" : "#c3d8e8", fog: phase === "vecer" ? "#6a6f96" : "#d5e4ee", sunIntensity: a.sunIntensity * 0.8 };
  }
  // počasí upravuje světlo a mlhu
  switch (weather) {
    case "destivo":
      a = { ...a, sky: shiftTo(a.sky, "#6a7484", 0.55), fog: shiftTo(a.fog, "#7e8896", 0.5), fogNear: 18, fogFar: 48, sunIntensity: a.sunIntensity * 0.45, ambientIntensity: a.ambientIntensity * 0.85 };
      break;
    case "mlha":
      a = { ...a, fog: shiftTo(a.fog, "#cfd4d2", 0.6), fogNear: 6, fogFar: 24, sunIntensity: a.sunIntensity * 0.55 };
      break;
    case "snezeni":
      a = { ...a, sky: shiftTo(a.sky, "#aebcc8", 0.5), fog: shiftTo(a.fog, "#c2ccd4", 0.5), fogNear: 14, fogFar: 40, sunIntensity: a.sunIntensity * 0.6 };
      break;
    case "mraz":
      a = { ...a, sky: shiftTo(a.sky, "#a8c4e0", 0.35), sunColor: "#e8f0ff", ambientIntensity: a.ambientIntensity * 1.05 };
      break;
    case "vedro":
      a = { ...a, sky: shiftTo(a.sky, "#ffd890", 0.18), sunColor: "#fff0c0", sunIntensity: a.sunIntensity * 1.15 };
      break;
    case "polojasno":
      a = { ...a, sunIntensity: a.sunIntensity * 0.85 };
      break;
  }
  return a;
}

/** Posune hex barvu směrem k cílové (t = 0..1). */
function shiftTo(from: string, to: string, t: number): string {
  const f = parseInt(from.slice(1), 16);
  const g = parseInt(to.slice(1), 16);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = mix((f >> 16) & 255, (g >> 16) & 255);
  const gr = mix((f >> 8) & 255, (g >> 8) & 255);
  const b = mix(f & 255, g & 255);
  return `#${((r << 16) | (gr << 8) | b).toString(16).padStart(6, "0")}`;
}
