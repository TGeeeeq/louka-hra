// Mapa Louky: víc mýtin obklopených lesem, propojených cestami — velká a
// cestovatelná. Generuje se jednou, deterministicky (seedovaný RNG).

export const TS = 36; // velikost dlaždice v px (world souřadnice)

export const TILE = {
  GRASS: 0,
  FOREST: 1, // solid
  WATER: 2, // solid
  PATH: 3,
  FLOWERS: 4, // walkable deko
  DIRT: 5,
  FENCE: 6, // solid (brány hlavolamů)
  BUSH: 7, // solid deko
  TALL: 8, // vysoká tráva (walkable)
} as const;

export type Tile = (typeof TILE)[keyof typeof TILE];

export const MAP_W = 72;
export const MAP_H = 52;

interface Region {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

// Mýtiny: hlavní statek + bylinková louka (V) + rybníková louka (J) + hájek (JV).
const REGIONS: Region[] = [
  { cx: 22, cy: 17, rx: 20, ry: 13 },
  { cx: 57, cy: 16, rx: 12, ry: 9 },
  { cx: 25, cy: 41, rx: 15, ry: 8 },
  { cx: 59, cy: 41, rx: 10, ry: 7 },
];

// Cesty (koridory) lesem mezi mýtinami.
const CORRIDORS = [
  { ax: 40, ay: 17, bx: 47, by: 16, half: 2 }, // statek → bylinková
  { ax: 24, ay: 29, bx: 26, by: 34, half: 2 }, // statek → rybník
  { ax: 38, ay: 41, bx: 52, by: 41, half: 2 }, // rybník → hájek (jen přes lesní bránu)
];

function buildMap() {
  const w = MAP_W;
  const h = MAP_H;
  const tiles = new Uint8Array(w * h);
  const idx = (x: number, y: number) => y * w + x;
  const get = (x: number, y: number) => tiles[idx(x, y)] as Tile;
  const set = (x: number, y: number, t: number) => {
    if (x >= 0 && y >= 0 && x < w && y < h) tiles[idx(x, y)] = t;
  };
  // stabilní šum na dlaždici
  const n = (x: number, y: number) => {
    const hh = ((x * 374761393) ^ (y * 668265263)) >>> 0;
    return ((hh ^ (hh >>> 13)) % 1000) / 1000;
  };

  // 1) les + mýtiny (rozmazaný okraj šumem)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let clear = false;
      for (const r of REGIONS) {
        const e = ((x - r.cx) / r.rx) ** 2 + ((y - r.cy) / r.ry) ** 2;
        if (e < 1 - 0.1 + (n(x, y) - 0.5) * 0.5) {
          clear = true;
          break;
        }
      }
      set(x, y, clear ? TILE.GRASS : TILE.FOREST);
    }

  // 2) pevný lesní rám po obvodu
  for (let x = 0; x < w; x++) {
    set(x, 0, TILE.FOREST);
    set(x, 1, TILE.FOREST);
    set(x, h - 1, TILE.FOREST);
    set(x, h - 2, TILE.FOREST);
  }
  for (let y = 0; y < h; y++) {
    set(0, y, TILE.FOREST);
    set(1, y, TILE.FOREST);
    set(w - 1, y, TILE.FOREST);
    set(w - 2, y, TILE.FOREST);
  }

  // 3) cesty mezi mýtinami
  for (const c of CORRIDORS) {
    const steps = Math.max(Math.abs(c.bx - c.ax), Math.abs(c.by - c.ay)) * 2;
    for (let s = 0; s <= steps; s++) {
      const cx = c.ax + ((c.bx - c.ax) * s) / steps;
      const cy = c.ay + ((c.by - c.ay) * s) / steps;
      for (let dx = -c.half; dx <= c.half; dx++)
        for (let dy = -c.half; dy <= c.half; dy++) {
          const x = Math.round(cx + dx);
          const y = Math.round(cy + dy);
          if (x > 1 && y > 1 && x < w - 2 && y < h - 2 && get(x, y) !== TILE.WATER)
            set(x, y, dx === 0 || dy === 0 ? TILE.PATH : TILE.GRASS);
        }
    }
  }

  // 4) rybník v jižní mýtině
  const pondCx = 18;
  const pondCy = 43;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x - pondCx) * 0.82, y - pondCy);
      if (d < 3.6 && get(x, y) === TILE.GRASS) set(x, y, TILE.WATER);
      else if (d < 4.5 && get(x, y) === TILE.GRASS && n(x, y) < 0.5) set(x, y, TILE.DIRT);
    }

  // 5) detaily: květiny, vysoká tráva, keře
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (get(x, y) !== TILE.GRASS) continue;
      const r = n(x * 3 + 1, y * 7 + 2);
      if (r < 0.09) set(x, y, TILE.FLOWERS);
      else if (r < 0.17) set(x, y, TILE.TALL);
      else if (r < 0.195) set(x, y, TILE.BUSH);
    }

  return { w, h, tiles, get };
}

export const MAP = buildMap();

const SOLID: Set<number> = new Set([TILE.FOREST, TILE.WATER, TILE.FENCE, TILE.BUSH]);

export function isSolidTile(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= MAP.w || ty >= MAP.h) return true;
  return SOLID.has(MAP.get(tx, ty));
}

/** Nastaví dlaždici za běhu (hlavolamy otevírající cesty). */
export function setTile(tx: number, ty: number, t: Tile) {
  if (tx >= 0 && ty >= 0 && tx < MAP.w && ty < MAP.h) MAP.tiles[ty * MAP.w + tx] = t;
}
