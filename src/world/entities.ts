import { MAP, TILE, TS, isSolidTile } from "./tiles";
import { ANIMALS_BY_GROUP } from "../game/content/animals";

const SPAWN_TX = 22;
const SPAWN_TY = 20;

export type InteractKind =
  | "kurnik"
  | "chlivek"
  | "pastvina"
  | "buda"
  | "studna"
  | "ohniste"
  | "dilna"
  | "stanek"
  | "chalupa"
  | "cedule"
  | "byliny";

export interface Interactable {
  id: string;
  kind: InteractKind;
  label: string;
  tx: number;
  ty: number;
  fw: number; // footprint šířka (dlaždice)
  fh: number; // footprint výška
  solid: boolean;
}

const B = (id: string, kind: InteractKind, label: string, tx: number, ty: number, fw = 2, fh = 2, solid = true): Interactable => ({ id, kind, label, tx, ty, fw, fh, solid });

export const INTERACTABLES: Interactable[] = [
  B("chalupa", "chalupa", "Chalupa", 31, 7, 3, 2),
  B("stanek", "stanek", "Stánek (obchod)", 35, 10),
  B("dilna", "dilna", "Dílna (výroba)", 27, 11),
  B("ohniste", "ohniste", "Ohniště & kuchyně", 24, 14, 2, 2),
  B("kurnik", "kurnik", "Kurník", 13, 9, 3, 2),
  B("chlivek", "chlivek", "Prasečí chlívek", 11, 15, 3, 2),
  B("pastvina", "pastvina", "Pastvina (seno)", 19, 24, 3, 2),
  B("buda", "buda", "Psí bouda & pelíšky", 27, 20, 2, 2),
  B("studna", "studna", "Studna", 16, 19, 1, 1),
  B("cedule", "cedule", "Cedule", 24, 20, 1, 1, false),
  // sběr bylin na okrajích lesa
  B("byliny1", "byliny", "Bylinky", 6, 7, 1, 1, false),
  B("byliny2", "byliny", "Bylinky", 39, 18, 1, 1, false),
  B("byliny3", "byliny", "Bylinky", 8, 27, 1, 1, false),
];

export const INTERACTABLE_BY_ID: Record<string, Interactable> = Object.fromEntries(
  INTERACTABLES.map((i) => [i.id, i]),
);

// Vyčistí mýtinku (les/keř/voda → tráva) pod stavbami i kolem nich a kolem
// startu, aby byly stavby vždy v mýtině a dostupné — bez ohledu na náhodný les.
function carveClearing(tx: number, ty: number, w: number, h: number, margin: number) {
  for (let y = ty - margin; y < ty + h + margin; y++)
    for (let x = tx - margin; x < tx + w + margin; x++) {
      if (x < 1 || y < 1 || x >= MAP.w - 1 || y >= MAP.h - 1) continue;
      const t = MAP.get(x, y);
      if (t === TILE.FOREST || t === TILE.BUSH || t === TILE.WATER)
        MAP.tiles[y * MAP.w + x] = TILE.GRASS;
    }
}
for (const it of INTERACTABLES) carveClearing(it.tx, it.ty, it.fw, it.fh, 1);
carveClearing(SPAWN_TX, SPAWN_TY, 1, 1, 2);

// Solidní dlaždice staveb (pro kolize).
const solidBuildingTiles = new Set<string>();
for (const it of INTERACTABLES) {
  if (!it.solid) continue;
  for (let dx = 0; dx < it.fw; dx++)
    for (let dy = 0; dy < it.fh; dy++)
      solidBuildingTiles.add(`${it.tx + dx},${it.ty + dy}`);
}

/** Kolize ve world (px) souřadnicích — terén i stavby. */
export function isBlocked(px: number, py: number): boolean {
  const tx = Math.floor(px / TS);
  const ty = Math.floor(py / TS);
  if (isSolidTile(tx, ty)) return true;
  return solidBuildingTiles.has(`${tx},${ty}`);
}

// --- Rozmístění zvířat po zónách ----------------------------------------
export interface AnimalSpawn {
  animalId: string;
  hx: number;
  hy: number;
  radius: number;
}

interface ZoneDef {
  group: keyof typeof ANIMALS_BY_GROUP;
  cx: number; // tile
  cy: number;
  spread: number; // tiles
}

const ZONES: ZoneDef[] = [
  { group: "drubez", cx: 14, cy: 12, spread: 3 },
  { group: "prasata", cx: 12, cy: 18, spread: 2 },
  { group: "stado", cx: 20, cy: 22, spread: 4 },
  { group: "mazlici", cx: 28, cy: 22, spread: 4 },
];

function buildSpawns(): AnimalSpawn[] {
  const out: AnimalSpawn[] = [];
  for (const z of ZONES) {
    const list = ANIMALS_BY_GROUP[z.group];
    list.forEach((a, i) => {
      // rozmístění do mřížky kolem středu zóny
      const cols = Math.ceil(Math.sqrt(list.length));
      const gx = i % cols;
      const gy = Math.floor(i / cols);
      let tx = z.cx + (gx - cols / 2) * 1.1;
      let ty = z.cy + (gy - cols / 2) * 1.1;
      // odstrč z pevných dlaždic
      if (isSolidTile(Math.floor(tx), Math.floor(ty))) {
        tx = z.cx;
        ty = z.cy;
      }
      out.push({
        animalId: a.id,
        hx: (tx + 0.5) * TS,
        hy: (ty + 0.5) * TS,
        radius: z.spread * TS * 0.5,
      });
    });
  }
  return out;
}

export const ANIMAL_SPAWNS = buildSpawns();

// Startovní pozice hráče — uprostřed mýtiny na cestě (zaručeně průchozí).
export const PLAYER_START = { x: (SPAWN_TX + 0.5) * TS, y: (SPAWN_TY + 0.5) * TS };
