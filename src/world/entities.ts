import { MAP, TILE, TS, isSolidTile, setTile } from "./tiles";
import { ANIMALS_BY_GROUP } from "../game/content/animals";
import { NPCS } from "../game/content/people";
import type { FeedGroup, Placed } from "../game/types";
import { BUILDABLE_BY_ID } from "../game/content/buildables";
import { rebuildInteractables } from "../game/build/placement";
import { COMPANION_ANIMAL_IDS } from "../game/balance";

const SPAWN_TX = 45;
const SPAWN_TY = 33;

// Kde u startu stojí uvítací NPC (dlaždice) — kolem farmy uprostřed louky.
const NPC_POS: Record<string, [number, number]> = {
  tomas: [40, 31],
  maruska: [49, 34],
  tony: [43, 37],
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
  | "zahrada"
  // liščí příběh + divocí sousedé
  | "stopy"
  | "krmne_misto"
  | "listi"
  // Senné DLC
  | "seniste";

export interface Interactable {
  id: string;
  kind: InteractKind;
  label: string;
  tx: number;
  ty: number;
  fw: number; // footprint šířka (dlaždice)
  fh: number; // footprint výška
  solid: boolean;
  note?: string; // volitelný vlastní text cedule (jinak default CEDULE_HELP)
}

const B = (id: string, kind: InteractKind, label: string, tx: number, ty: number, fw = 2, fh = 2, solid = true, note?: string): Interactable => ({ id, kind, label, tx, ty, fw, fh, solid, note });

// Autorské (nikdy „stavitelné") objekty louky — sběr bylin, příběhové
// hlavolamy, cedule apod. Základní stavby (chalupa, stánek, …) i upgrady
// (studna, zahrada) teď žijí ve `structures` a katalogu BUILDABLES — viz
// `setStructures` níže.
export const WORLD_FEATURES: Interactable[] = [
  B("cedule", "cedule", "Cedule", 45, 26, 1, 1, false),
  // sběr bylin — pár blízko domova (den 1), zbytek na satelitech
  B("byliny1", "byliny", "Bylinky", 28, 26, 1, 1, false),
  B("byliny2", "byliny", "Bylinky", 40, 26, 1, 1, false),
  B("byliny3", "byliny", "Bylinky", 60, 30, 1, 1, false),
  // bylinková louka — východní satelit, za lesní bránou
  B(
    "cedule_herb",
    "cedule",
    "Bylinková louka",
    80,
    20,
    1,
    1,
    false,
    "Tady roste řebříček, kopřiva a heřmánek — trhej, co potřebuješ.",
  ),
  B("byliny4", "byliny", "Bylinková louka", 82, 18, 1, 1, false),
  B("byliny5", "byliny", "Bylinková louka", 86, 21, 1, 1, false),
  B("byliny6", "byliny", "Bylinková louka", 84, 24, 1, 1, false),
  // rybník — jižní satelit
  B("cedule_pond", "cedule", "Rybník", 20, 55, 1, 1, false, "Rybník. Kachny si sem chodí zaplavat."),
  B("byliny7", "byliny", "Bylinky u rybníka", 21, 56, 1, 1, false),
  // hlavolam: lesní brána na cestě k bylinkové louce + truhla hned za ní
  B("brana", "brana", "Lesní brána", 71, 25, 1, 1, false),
  B("truhla", "truhla", "Truhla se zásobami", 77, 24, 1, 1, false),
  // liščí příběh: stopy a krmné místo na západním kraji lesa; ježčí listí
  // u zahrádky. Viditelnost řídí App podle postupu příběhu (hiddenIds).
  B("fox_stopy", "stopy", "Liščí stopy", 24, 44, 1, 1, false),
  B("fox_misto", "krmne_misto", "Krmné místo u lesa", 23, 46, 1, 1, false),
  B("jezek_listi", "listi", "Hromada listí", 36, 44, 1, 1, false),
  // Senné DLC: seniště u rybníka (viditelné jen s DLC)
  B("seniste", "seniste", "Seniště — louka na seno", 24, 58, 2, 1, false),
];

/**
 * Runtime seznam interaktivních objektů — kreslení, hledání cíle, minimapa,
 * kolize, pathfinding. Prázdný, dokud jej `setStructures` poprvé nenaplní
 * (voláno z WorldCanvas při mountu i při každé změně `structures`).
 */
export let INTERACTABLES: Interactable[] = [];
export let INTERACTABLE_BY_ID: Record<string, Interactable> = {};

/**
 * Přepočítá INTERACTABLES ze zdroje pravdy (`structures` + katalog
 * BUILDABLES) a spojí je s autorskými WORLD_FEATURES. U unikátních staveb
 * (chalupa, stánek, studna, …) se `id` schválně nastaví na `defId` (ne na
 * instance `uid`) — tutoriál (`TUTORIAL_BUILDING_IDS`, `state.built`) i
 * `onInteract` v App.tsx je čtou podle těchto stabilních id. Neunikátní
 * stavby (plot, cedule_deko, …) dostanou `id = uid`, protože jich může být
 * na louce víc najednou.
 */
export function setStructures(structures: Placed[]) {
  const built = rebuildInteractables(structures, BUILDABLE_BY_ID);
  INTERACTABLES.length = 0;
  INTERACTABLES.push(...built, ...WORLD_FEATURES);
  INTERACTABLE_BY_ID = Object.fromEntries(INTERACTABLES.map((i) => [i.id, i]));
  for (const it of INTERACTABLES) carveClearing(it.tx, it.ty, it.fw, it.fh, 1);
}

// Od volného stavění (v0.12) smí hráč přesunout/zbořit VŠECHNY postavené
// stavby (viz reducer PLACE/MOVE/DEMOLISH_STRUCTURE) — MOVABLE_IDS už
// neomezuje stavební mód. Zůstává jen jako MVP hranice výpočtu pohodlí
// (layoutComfortFor v comfort.ts zatím počítá jen pro budu/mazlíčky).
export const MOVABLE_IDS = new Set<string>(["buda"]);
export const isMovable = (id: string) => MOVABLE_IDS.has(id);

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
for (const it of WORLD_FEATURES) carveClearing(it.tx, it.ty, it.fw, it.fh, 1);
carveClearing(SPAWN_TX, SPAWN_TY, 1, 1, 3);
for (const id of NPCS) carveClearing(NPC_POS[id][0], NPC_POS[id][1], 1, 1, 1);

// Lesní brána přehradí jediný koridor k bylinkové louce (východní satelit),
// dokud hráč nevyřeší hlavolam. Sloupec x=73 je jediné propojení domovské
// louky a východní mýtiny (bez CORRIDORS v tiles.ts se les nepropojí) — proto
// těchto 7 dlaždic skutečně zavírá cestu (viz map.test.ts reachability test).
export const GATE_TILES: [number, number][] = [
  [73, 22], [73, 23], [73, 24], [73, 25], [73, 26], [73, 27], [73, 28],
];
for (const [gx, gy] of GATE_TILES) setTile(gx, gy, TILE.FENCE);

/** Otevře lesní bránu (po vyřešení hlavolamu) — uvolní cestu k bylinkové louce. */
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
  { group: "drubez", label: "Drůbeží výběh", tx: 30, ty: 27, w: 9, h: 8 },
  { group: "prasata", label: "Prasečí výběh", tx: 33, ty: 37, w: 9, h: 8 },
  { group: "stado", label: "Pastvina", tx: 48, ty: 34, w: 15, h: 10 },
];

// Zahrádka — sem míří uprchlá zvířata.
export const GARDEN = { x: (33 + 1) * TS, y: (12 + 1) * TS };

// Solidní dlaždice staveb (pro kolize). Přepočítává se podle toho, co už hráč
// postavil (tutoriál) — nepostavený „plán" je průchozí, hotová stavba blokuje.
const solidBuildingTiles = new Set<string>();

/** Nastaví, které stavby už stojí, a přepočítá jejich solidní dlaždice. */
export function setConstructed(builtIds: string[]) {
  solidBuildingTiles.clear();
  const set = new Set(builtIds);
  for (const it of INTERACTABLES) {
    if (!it.solid || !set.has(it.id)) continue;
    for (let dx = 0; dx < it.fw; dx++)
      for (let dy = 0; dy < it.fh; dy++)
        solidBuildingTiles.add(`${it.tx + dx},${it.ty + dy}`);
  }
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

const solidTileOccupied = (key: string) => solidBuildingTiles.has(key);

/**
 * Lze na (tx,ty) postavit půdorys `it`? Ignoruje vlastní současné dlaždice
 * stavby `ignoreId` (aby se dala posunout o kousek přes sebe samu).
 */
export function canPlaceFootprint(
  it: Interactable,
  tx: number,
  ty: number,
  ignoreId?: string,
): boolean {
  const own = new Set<string>();
  if (ignoreId) {
    const o = INTERACTABLE_BY_ID[ignoreId];
    if (o)
      for (let dx = 0; dx < o.fw; dx++)
        for (let dy = 0; dy < o.fh; dy++) own.add(`${o.tx + dx},${o.ty + dy}`);
  }
  for (let dx = 0; dx < it.fw; dx++)
    for (let dy = 0; dy < it.fh; dy++) {
      const x = tx + dx;
      const y = ty + dy;
      if (x < 1 || y < 1 || x >= MAP.w - 1 || y >= MAP.h - 1) return false; // okraj/mimo mapu
      if (isSolidTile(x, y)) return false; // les/voda/plot
      const key = `${x},${y}`;
      if (!own.has(key) && solidTileOccupied(key)) return false; // jiná stavba
    }
  return true;
}

/** Střed zóny skupiny (px) — paddock, nebo statická zóna pro mazlíčky. */
export function zoneCenterFor(group: FeedGroup): { x: number; y: number } {
  const pad = PADDOCKS.find((p) => p.group === group);
  if (pad) return { x: (pad.tx + pad.w / 2) * TS, y: (pad.ty + pad.h / 2) * TS };
  const Z: Partial<Record<FeedGroup, [number, number]>> = { mazlici: [48, 31] }; // zrcadlí ZONES
  const [cx, cy] = Z[group] ?? [SPAWN_TX, SPAWN_TY];
  return { x: (cx + 0.5) * TS, y: (cy + 0.5) * TS };
}

/** Efektivní (aktuální) střed stavby (px) — čte živou pozici z INTERACTABLES,
 *  takže sedí i po přesunutí stavby ve stavebním módu. */
export function structureCenter(id: string): { x: number; y: number } | null {
  const it = INTERACTABLE_BY_ID[id];
  if (!it) return null;
  return { x: (it.tx + it.fw / 2) * TS, y: (it.ty + it.fh / 2) * TS };
}

/**
 * Vysune postavu ven, pokud po dostavění stavby (`addedIds`) zůstala stát tak,
 * že ji stavba schová. Plán stavby je průchozí, takže hráč může stavět i
 * „zevnitř" nebo těsně u boku — po dostavění pak buď:
 *   a) uvázne v solidním půdorysu (`isBlocked`), nebo
 *   b) je schovaný ZA stavbou, protože stojí nad její spodní hranou (baseY) a
 *      překrývá se s ní vodorovně (kreslení podle baseY = malířův algoritmus).
 * Obojí platí pro VŠECHNY stavby tutoriálu (široké i úzké — u úzkých sahá
 * dosah interakce i na průchozí dlaždici vedle půdorysu). Hráče přesuneme na
 * první volnou dlaždici na jih od baseY, kde stojí PŘED stavbou a je vidět.
 * Vrací novou pozici (world px), nebo null, když není třeba nic dělat.
 */
export function unstuckFromBuildings(
  px: number,
  py: number,
  addedIds: readonly string[],
): { x: number; y: number } | null {
  for (const id of addedIds) {
    const it = INTERACTABLE_BY_ID[id];
    if (!it) continue;
    const baseY = (it.ty + it.fh) * TS;
    const depth = Math.max(12, it.fw * TS * 0.26); // 3D bok stavby (dozadu-vpravo)
    const half = TS * 0.85; // půlka šířky sprite postavy (kryje i okraj)
    const left = it.tx * TS - half;
    const right = (it.tx + it.fw) * TS + depth + half;
    const occluded = py < baseY && px >= left && px <= right; // hráč je ZA stavbou
    if (!occluded && !isBlocked(px, py)) continue; // venku a vidět → nech být
    const tx = Math.floor(px / TS);
    // dolů (na jih) na první volnou dlaždici, jejíž střed je pod baseY → hráč
    // se kreslí PŘED stavbou (dveře i mýtina staveb jsou vždy na jihu)
    const fromY = Math.max(it.ty + it.fh, Math.floor(py / TS) + 1);
    for (let y = fromY; y < MAP.h - 1; y++)
      if (!isTileBlocked(tx, y)) return { x: (tx + 0.5) * TS, y: (y + 0.5) * TS };
    // pojistka: spirála se sklonem k jihu, jen dlaždice pod baseY (viditelné)
    const sty = Math.floor(py / TS);
    for (let r = 1; r < 10; r++)
      for (let dy = r; dy >= -r; dy--)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const ny = sty + dy;
          if ((ny + 0.5) * TS >= baseY && !isTileBlocked(tx + dx, ny))
            return { x: (tx + dx + 0.5) * TS, y: (ny + 0.5) * TS };
        }
  }
  return null;
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
  { group: "drubez", cx: 34, cy: 31, spread: 3 },
  { group: "prasata", cx: 37, cy: 41, spread: 2 },
  { group: "stado", cx: 56, cy: 39, spread: 4 },
  { group: "mazlici", cx: 48, cy: 31, spread: 3 },
];

function buildSpawns(): AnimalSpawn[] {
  const out: AnimalSpawn[] = [];
  for (const z of ZONES) {
    // Pes a kočka (companion) se renderují zvlášť, nezávisle na výběhu —
    // vynech je tady, ať se nezdvojí, až se skupina mazlíci nastěhuje.
    const list = ANIMALS_BY_GROUP[z.group].filter(
      (a) => z.group !== "mazlici" || !COMPANION_ANIMAL_IDS.includes(a.id),
    );
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
  // Companions: pes + kočka jsou na Louce od první chvíle, volně pobíhají
  // poblíž hráčova startu — nezávisle na tom, jestli výběh (buda) stojí.
  COMPANION_ANIMAL_IDS.forEach((id, i) => {
    const tx = SPAWN_TX + 1.4 * (i + 1);
    const ty = SPAWN_TY + 1.2;
    out.push({ animalId: id, group: "mazlici", hx: (tx + 0.5) * TS, hy: (ty + 0.5) * TS, radius: 2.5 * TS * 0.5 });
  });
  return out;
}

export const ANIMAL_SPAWNS = buildSpawns();

// Startovní pozice hráče — uprostřed mýtiny na cestě (zaručeně průchozí).
export const PLAYER_START = { x: (SPAWN_TX + 0.5) * TS, y: (SPAWN_TY + 0.5) * TS };
