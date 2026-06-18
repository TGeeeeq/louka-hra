import { MAP, TILE, TS, isSolidTile, setTile } from "./tiles";
import { ANIMALS_BY_GROUP } from "../game/content/animals";
import { NPCS } from "../game/content/people";
import type { FeedGroup } from "../game/types";

const SPAWN_TX = 22;
const SPAWN_TY = 20;

// Kde u startu stojí uvítací NPC (dlaždice).
const NPC_POS: Record<string, [number, number]> = {
  tomas: [19, 18],
  maruska: [26, 18],
  tony: [22, 15],
};

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
  | "byliny"
  | "brana"
  | "truhla"
  | "zahrada";

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
  B("pastvina", "pastvina", "Pastvina & seník", 19, 24, 3, 2),
  B("buda", "buda", "Psí bouda & pelíšky", 27, 20, 2, 2),
  B("studna", "studna", "Studna", 16, 19, 1, 1),
  B("cedule", "cedule", "Cedule", 24, 20, 1, 1, false),
  // sběr bylin — nejvíc na „bylinkové louce" na východě
  B("byliny1", "byliny", "Bylinky", 6, 8, 1, 1, false),
  B("byliny2", "byliny", "Bylinky", 39, 12, 1, 1, false),
  B("byliny3", "byliny", "Bylinky", 8, 27, 1, 1, false),
  B("byliny4", "byliny", "Bylinková louka", 54, 12, 1, 1, false),
  B("byliny5", "byliny", "Bylinková louka", 61, 18, 1, 1, false),
  B("byliny6", "byliny", "Bylinková louka", 57, 21, 1, 1, false),
  B("byliny7", "byliny", "Bylinky u rybníka", 31, 45, 1, 1, false),
  // hlavolam: lesní brána na cestě k hájku + truhla se zásobami v hájku
  B("brana", "brana", "Lesní brána", 44, 41, 1, 1, false),
  B("truhla", "truhla", "Truhla se zásobami", 60, 41, 1, 1, false),
  // permakulturní zahrádka (pozor na uprchlíky z výběhů!)
  B("zahrada", "zahrada", "Zahrádka", 33, 12, 2, 2, false),
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
carveClearing(SPAWN_TX, SPAWN_TY, 1, 1, 3);
for (const id of NPCS) carveClearing(NPC_POS[id][0], NPC_POS[id][1], 1, 1, 1);

// Lesní brána přehradí cestu k hájku, dokud hráč nevyřeší hlavolam.
export const GATE_TILES: [number, number][] = [
  [44, 39], [44, 40], [44, 41], [44, 42], [44, 43],
];
for (const [gx, gy] of GATE_TILES) setTile(gx, gy, TILE.FENCE);

/** Otevře lesní bránu (po vyřešení hlavolamu) — uvolní cestu k hájku. */
export function openGate() {
  for (const [gx, gy] of GATE_TILES) setTile(gx, gy, TILE.PATH);
}

// Výběhy (ohrady) zvířat — jen vizuální ploty, hráč jimi projde.
export interface Paddock {
  group: FeedGroup;
  label: string;
  tx: number;
  ty: number;
  w: number;
  h: number;
}
export const PADDOCKS: Paddock[] = [
  { group: "drubez", label: "Drůbeží výběh", tx: 10, ty: 10, w: 8, h: 6 },
  { group: "prasata", label: "Prasečí výběh", tx: 8, ty: 15, w: 8, h: 6 },
  { group: "stado", label: "Pastvina", tx: 14, ty: 20, w: 13, h: 8 },
];

// Zahrádka — sem míří uprchlá zvířata.
export const GARDEN = { x: (33 + 1) * TS, y: (12 + 1) * TS };

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

/** Kolize na úrovni dlaždice — terén i stavby. Pro pathfinding NPC. */
export function isTileBlocked(tx: number, ty: number): boolean {
  if (isSolidTile(tx, ty)) return true;
  return solidBuildingTiles.has(`${tx},${ty}`);
}

// --- Rozmístění zvířat po zónách ----------------------------------------
export interface Bounds { x0: number; y0: number; x1: number; y1: number }
export interface AnimalSpawn {
  animalId: string;
  group: FeedGroup;
  hx: number;
  hy: number;
  radius: number;
  bounds?: Bounds; // ohrada (px) — mimo ni se zvíře nedostane (kromě útěku)
}

interface ZoneDef {
  group: keyof typeof ANIMALS_BY_GROUP;
  cx: number;
  cy: number;
  spread: number;
}

const ZONES: ZoneDef[] = [
  { group: "drubez", cx: 14, cy: 12, spread: 3 },
  { group: "prasata", cx: 12, cy: 18, spread: 2 },
  { group: "stado", cx: 20, cy: 24, spread: 4 },
  { group: "mazlici", cx: 30, cy: 14, spread: 4 },
];

function buildSpawns(): AnimalSpawn[] {
  const out: AnimalSpawn[] = [];
  for (const z of ZONES) {
    const list = ANIMALS_BY_GROUP[z.group];
    const pad = PADDOCKS.find((p) => p.group === z.group);
    const bounds: Bounds | undefined = pad
      ? { x0: (pad.tx + 0.6) * TS, y0: (pad.ty + 0.6) * TS, x1: (pad.tx + pad.w - 0.6) * TS, y1: (pad.ty + pad.h - 0.6) * TS }
      : undefined;
    const cols = Math.ceil(Math.sqrt(list.length));
    const rows = Math.ceil(list.length / cols);
    list.forEach((a, i) => {
      const gx = i % cols;
      const gy = Math.floor(i / cols);
      let hx: number;
      let hy: number;
      if (bounds) {
        hx = bounds.x0 + ((gx + 0.5) / cols) * (bounds.x1 - bounds.x0);
        hy = bounds.y0 + ((gy + 0.5) / rows) * (bounds.y1 - bounds.y0);
      } else {
        let tx = z.cx + (gx - cols / 2) * 1.2;
        let ty = z.cy + (gy - cols / 2) * 1.2;
        if (isSolidTile(Math.floor(tx), Math.floor(ty))) { tx = z.cx; ty = z.cy; }
        hx = (tx + 0.5) * TS;
        hy = (ty + 0.5) * TS;
      }
      out.push({ animalId: a.id, group: z.group, hx, hy, radius: z.spread * TS * 0.5, bounds });
    });
  }
  return out;
}

export const ANIMAL_SPAWNS = buildSpawns();

// Startovní pozice hráče — uprostřed mýtiny na cestě (zaručeně průchozí).
export const PLAYER_START = { x: (SPAWN_TX + 0.5) * TS, y: (SPAWN_TY + 0.5) * TS };
