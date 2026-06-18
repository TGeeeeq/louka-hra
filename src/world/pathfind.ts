// A* hledání cesty po dlaždicové mapě — pro chození NPC mezi stanovišti.
// Mapa je malá (72×52), cesta se počítá jen při změně cíle (pár× za den
// na NPC), takže prostá implementace bohatě stačí.
import { MAP_W, MAP_H, TS } from "./tiles";
import { isTileBlocked } from "./entities";

export interface Pt { x: number; y: number }

const inBounds = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;
const walkable = (tx: number, ty: number) => inBounds(tx, ty) && !isTileBlocked(tx, ty);
const idx = (tx: number, ty: number) => ty * MAP_W + tx;
const center = (tx: number, ty: number): Pt => ({ x: (tx + 0.5) * TS, y: (ty + 0.5) * TS });

/** Nejbližší průchozí dlaždice (spirálovité hledání) — pojistka, kdyby
 *  zadané stanoviště padlo na stavbu nebo do lesa. */
export function nearestWalkable(tx: number, ty: number): { tx: number; ty: number } {
  if (walkable(tx, ty)) return { tx, ty };
  for (let r = 1; r < 8; r++) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // jen okraj prstence
        if (walkable(tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy };
      }
  }
  return { tx, ty };
}

/** Cesta z dlaždice (sx,sy) do (gx,gy) jako waypointy ve world-px (středy
 *  dlaždic). Vrací jen body, kde se mění směr (vyhlazení). Prázdné = bez cesty
 *  nebo už na místě. */
export function findPath(sx: number, sy: number, gx: number, gy: number): Pt[] {
  const start = nearestWalkable(sx, sy);
  const goal = nearestWalkable(gx, gy);
  if (start.tx === goal.tx && start.ty === goal.ty) return [];

  const si = idx(start.tx, start.ty);
  const gi = idx(goal.tx, goal.ty);
  const h = (tx: number, ty: number) => Math.abs(tx - goal.tx) + Math.abs(ty - goal.ty);

  const g = new Map<number, number>([[si, 0]]);
  const f = new Map<number, number>([[si, h(start.tx, start.ty)]]);
  const cameFrom = new Map<number, number>();
  const open = new Set<number>([si]);

  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (open.size) {
    // uzel s nejmenším f
    let cur = -1;
    let best = Infinity;
    for (const n of open) {
      const fn = f.get(n) ?? Infinity;
      if (fn < best) { best = fn; cur = n; }
    }
    if (cur === gi) break;
    open.delete(cur);
    const ctx = cur % MAP_W;
    const cty = (cur - ctx) / MAP_W;
    const cg = g.get(cur) ?? Infinity;
    for (const [dx, dy] of NB) {
      const nx = ctx + dx;
      const ny = cty + dy;
      if (!walkable(nx, ny)) continue;
      const ni = idx(nx, ny);
      const tentative = cg + 1;
      if (tentative < (g.get(ni) ?? Infinity)) {
        cameFrom.set(ni, cur);
        g.set(ni, tentative);
        f.set(ni, tentative + h(nx, ny));
        open.add(ni);
      }
    }
  }

  if (!cameFrom.has(gi) && si !== gi) return [];

  // rekonstrukce dlaždicové cesty
  const tiles: number[] = [gi];
  let node = gi;
  while (cameFrom.has(node)) { node = cameFrom.get(node)!; tiles.unshift(node); }

  // vyhlazení: ponech jen body, kde se mění směr (+ cíl)
  const out: Pt[] = [];
  for (let i = 1; i < tiles.length; i++) {
    const px = tiles[i] % MAP_W;
    const py = (tiles[i] - px) / MAP_W;
    const prev = tiles[i - 1];
    const ppx = prev % MAP_W;
    const ppy = (prev - ppx) / MAP_W;
    const last = tiles[i + 1];
    const isLast = i === tiles.length - 1;
    let turn = isLast;
    if (!isLast && last !== undefined) {
      const lpx = last % MAP_W;
      const lpy = (last - lpx) / MAP_W;
      const d1x = px - ppx, d1y = py - ppy;
      const d2x = lpx - px, d2y = lpy - py;
      turn = d1x !== d2x || d1y !== d2y;
    }
    if (turn) out.push(center(px, py));
  }
  return out;
}
