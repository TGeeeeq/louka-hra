// Mapa Louky: mýtina obklopená lesem. Generuje se jednou, deterministicky
// (seedovaný RNG), takže je při každém renderu stejná.

export const TS = 36; // velikost dlaždice v px (world souřadnice)

export const TILE = {
  GRASS: 0,
  FOREST: 1, // solid
  WATER: 2, // solid
  PATH: 3,
  FLOWERS: 4, // walkable deko
  DIRT: 5,
  FENCE: 6, // solid
  BUSH: 7, // solid deko
  TALL: 8, // vysoká tráva (walkable)
} as const;

export type Tile = (typeof TILE)[keyof typeof TILE];

export const MAP_W = 46;
export const MAP_H = 32;

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMap() {
  const rng = mulberry32(20260617);
  const w = MAP_W;
  const h = MAP_H;
  const tiles = new Uint8Array(w * h);

  // šum tloušťky lesního lemu na každé hraně
  const top: number[] = [];
  const bot: number[] = [];
  for (let x = 0; x < w; x++) {
    top.push(3 + Math.floor(rng() * 3) + (Math.sin(x * 0.4) + 1) * 1.2);
    bot.push(3 + Math.floor(rng() * 3) + (Math.cos(x * 0.3) + 1) * 1.2);
  }
  const left: number[] = [];
  const right: number[] = [];
  for (let y = 0; y < h; y++) {
    left.push(3 + Math.floor(rng() * 3) + (Math.sin(y * 0.5) + 1) * 1.1);
    right.push(3 + Math.floor(rng() * 3) + (Math.cos(y * 0.45) + 1) * 1.1);
  }

  const set = (x: number, y: number, t: number) => {
    tiles[y * w + x] = t;
  };
  const get = (x: number, y: number) => tiles[y * w + x] as Tile;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inForest =
        y < top[x] || y >= h - bot[x] || x < left[y] || x >= w - right[y];
      set(x, y, inForest ? TILE.FOREST : TILE.GRASS);
    }
  }

  // lesní "prst" zasahující dovnitř (rozbije pravidelnost)
  for (let y = 6; y < 14; y++) {
    const fx = 30 + Math.floor(Math.sin(y * 0.6) * 1.5);
    for (let x = fx; x < fx + 2; x++) if (get(x, y) === TILE.GRASS) set(x, y, TILE.FOREST);
  }

  // rybník (vlevo dole)
  const px = 9;
  const py = 23;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x - px) * 0.85, (y - py));
      if (d < 3.4 && get(x, y) === TILE.GRASS) set(x, y, TILE.WATER);
      else if (d < 4.2 && get(x, y) === TILE.GRASS && rng() < 0.5) set(x, y, TILE.DIRT);
    }

  // hlavní cestička (had napříč mýtinou, spojuje stavení)
  const path: [number, number][] = [
    [22, 27], [22, 24], [21, 21], [20, 18], [20, 15], [21, 12], [23, 10], [26, 8], [30, 7],
  ];
  const carvePath = (x: number, y: number) => {
    if (x >= 0 && x < w && y >= 0 && y < h && get(x, y) !== TILE.WATER && get(x, y) !== TILE.FOREST)
      set(x, y, TILE.PATH);
  };
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i];
    const [bx, by] = path[i + 1];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(ax + ((bx - ax) * s) / steps);
      const y = Math.round(ay + ((by - ay) * s) / steps);
      carvePath(x, y);
      carvePath(x + 1, y);
    }
  }

  // deko: květiny, keře, vysoká tráva
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (get(x, y) !== TILE.GRASS) continue;
      const r = rng();
      if (r < 0.05) set(x, y, TILE.FLOWERS);
      else if (r < 0.08) set(x, y, TILE.TALL);
      else if (r < 0.092) set(x, y, TILE.BUSH);
    }

  return { w, h, tiles, get };
}

export const MAP = buildMap();

const SOLID: Set<number> = new Set([TILE.FOREST, TILE.WATER, TILE.FENCE, TILE.BUSH]);

export function isSolidTile(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= MAP.w || ty >= MAP.h) return true;
  return SOLID.has(MAP.get(tx, ty));
}
