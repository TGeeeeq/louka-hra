import { MAP, TILE, TS } from "./tiles";
import type { Season } from "../game/types";
import { PADDOCKS, type InteractKind, type Interactable } from "./entities";

interface Pal {
  grass: string;
  grassAlt: string;
  forest: string;
  forestDark: string;
  trunk: string;
  water: string;
  path: string;
  dirt: string;
  flower: string[];
}

const PALS: Record<Season, Pal> = {
  jaro: { grass: "#8cc56e", grassAlt: "#7bb85f", forest: "#2f6b3a", forestDark: "#235230", trunk: "#7a5230", water: "#5fb0dd", path: "#cdb188", dirt: "#b89a6a", flower: ["#f2a0c0", "#f0e070", "#d68cf0", "#fff"] },
  leto: { grass: "#79bd54", grassAlt: "#69ad46", forest: "#2b6334", forestDark: "#1f4a2a", trunk: "#7a5230", water: "#4aa6d6", path: "#cdb188", dirt: "#b08f5e", flower: ["#f08aa8", "#ffd24a", "#c87ce0", "#fff"] },
  podzim: { grass: "#bfa45a", grassAlt: "#ad8f48", forest: "#8a5a2a", forestDark: "#6e441e", trunk: "#5e3f22", water: "#5a9ec0", path: "#c8a878", dirt: "#a8855a", flower: ["#e07a3c", "#f0b84a", "#c85a3c", "#e8d090"] },
  zima: { grass: "#e8eef0", grassAlt: "#d8e2e6", forest: "#5e7a64", forestDark: "#4a6450", trunk: "#5a4636", water: "#bfe0ee", path: "#d8cdb8", dirt: "#c2b6a0", flower: ["#dfeaf0", "#cfe0ea", "#fff", "#e8eef0"] },
};

export function seasonPalette(s: Season): Pal {
  return PALS[s];
}

function tileHash(tx: number, ty: number) {
  const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
  return (n: number) => ((h >> (n * 3)) & 7) / 7;
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  t: number,
  sx: number,
  sy: number,
  pal: Pal,
  tx: number,
  ty: number,
  time: number,
) {
  const r = tileHash(tx, ty);
  // travnatý podklad
  ctx.fillStyle = (r(0) > 0.6 ? pal.grassAlt : pal.grass);
  ctx.fillRect(sx, sy, TS + 1, TS + 1);

  switch (t) {
    case TILE.GRASS:
      if (r(1) > 0.5) {
        ctx.fillStyle = pal.grassAlt;
        ctx.fillRect(sx + 6 + r(2) * 16, sy + 8 + r(3) * 14, 4, 2);
      }
      break;
    case TILE.TALL:
      ctx.strokeStyle = pal.forest;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const gx = sx + 6 + i * 7;
        ctx.beginPath();
        ctx.moveTo(gx, sy + TS - 4);
        ctx.lineTo(gx + (r(i) - 0.5) * 4, sy + TS - 16);
        ctx.stroke();
      }
      break;
    case TILE.FLOWERS:
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = pal.flower[Math.floor(r(i) * pal.flower.length)];
        ctx.beginPath();
        ctx.arc(sx + 9 + i * 9, sy + 12 + r(i + 3) * 12, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case TILE.PATH:
    case TILE.DIRT: {
      ctx.fillStyle = t === TILE.PATH ? pal.path : pal.dirt;
      ctx.fillRect(sx, sy, TS + 1, TS + 1);
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(sx + 4 + r(1) * 20, sy + 6 + r(2) * 18, 3, 3);
      break;
    }
    case TILE.WATER: {
      ctx.fillStyle = pal.water;
      ctx.fillRect(sx, sy, TS + 1, TS + 1);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1.5;
      const off = Math.sin(time * 0.002 + tx * 0.6 + ty) * 3;
      ctx.beginPath();
      ctx.arc(sx + TS / 2 + off, sy + TS / 2, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case TILE.FENCE: {
      ctx.fillStyle = pal.trunk;
      ctx.fillRect(sx + 6, sy + 5, 5, TS - 9);
      ctx.fillRect(sx + TS - 11, sy + 5, 5, TS - 9);
      ctx.fillRect(sx + 4, sy + 11, TS - 8, 5);
      ctx.fillRect(sx + 4, sy + TS - 14, TS - 8, 5);
      break;
    }
    case TILE.BUSH:
      ctx.fillStyle = pal.forest;
      ctx.beginPath();
      ctx.arc(sx + TS / 2, sy + TS / 2 + 2, TS * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(sx + TS / 2 - 4, sy + TS / 2 - 3, TS * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    case TILE.FOREST: {
      // strom: kmen + koruna přesahující nahoru
      const cx = sx + TS / 2 + (r(4) - 0.5) * 4;
      const baseY = sy + TS - 4;
      ctx.fillStyle = pal.trunk;
      ctx.fillRect(cx - 3, baseY - 12, 6, 14);
      const cr = TS * (0.5 + r(5) * 0.12);
      ctx.fillStyle = pal.forestDark;
      ctx.beginPath();
      ctx.arc(cx, baseY - 18, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.forest;
      ctx.beginPath();
      ctx.arc(cx - cr * 0.3, baseY - 20, cr * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(cx - cr * 0.4, baseY - 24, cr * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      break;
  }
}

// Celá mapa se jednou vyrenderuje do offscreen canvasu (na období) a každý
// snímek se jen vystřihne viditelná část — místo stovek kreslení dlaždic je
// to jediný drawImage (game-engine skill: „reduce draw calls").
let groundCache: { season: Season; cv: HTMLCanvasElement } | null = null;

function getGroundCache(season: Season): HTMLCanvasElement {
  if (groundCache && groundCache.season === season) return groundCache.cv;
  const cv = document.createElement("canvas");
  cv.width = MAP.w * TS;
  cv.height = MAP.h * TS;
  const c = cv.getContext("2d")!;
  const pal = seasonPalette(season);
  for (let ty = 0; ty < MAP.h; ty++)
    for (let tx = 0; tx < MAP.w; tx++)
      drawTile(c, MAP.get(tx, ty), tx * TS, ty * TS, pal, tx, ty, 0);
  groundCache = { season, cv };
  return cv;
}

// Podklad mini-mapy: 1 px na dlaždici, pevné barvy. Vykreslí se jednou.
let miniBase: HTMLCanvasElement | null = null;
export function getMinimapBase(): HTMLCanvasElement {
  if (miniBase) return miniBase;
  const cv = document.createElement("canvas");
  cv.width = MAP.w;
  cv.height = MAP.h;
  const c = cv.getContext("2d")!;
  for (let ty = 0; ty < MAP.h; ty++)
    for (let tx = 0; tx < MAP.w; tx++) {
      const t = MAP.get(tx, ty);
      c.fillStyle =
        t === TILE.FOREST ? "#2f5a3a" : t === TILE.WATER ? "#4aa6d6" : t === TILE.PATH || t === TILE.DIRT ? "#cdb188" : t === TILE.BUSH ? "#3f6b46" : "#8cc56e";
      c.fillRect(tx, ty, 1, 1);
    }
  miniBase = cv;
  return cv;
}

/** Zneplatní cache terénu i mini-mapy (po změně mapy za běhu). */
export function invalidateGround() {
  groundCache = null;
  miniBase = null;
}

export function drawGround(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  season: Season,
) {
  const cv = getGroundCache(season);
  ctx.fillStyle = seasonPalette(season).grass;
  ctx.fillRect(0, 0, vw, vh);
  const dw = Math.min(vw, cv.width);
  const dh = Math.min(vh, cv.height);
  const sx = Math.max(0, Math.min(cv.width - dw, camX));
  const sy = Math.max(0, Math.min(cv.height - dh, camY));
  ctx.drawImage(cv, sx, sy, dw, dh, 0, 0, dw, dh);
}

// Ploty výběhů (vizuální). Kreslí se po terénu, zvířata jsou pak nad nimi.
export function drawPaddocks(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
  for (const p of PADDOCKS) {
    const x = p.tx * TS - camX;
    const y = p.ty * TS - camY;
    const w = p.w * TS;
    const h = p.h * TS;
    ctx.strokeStyle = "rgba(154,111,58,0.85)";
    ctx.lineWidth = 3.5;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.fillStyle = "#7a5230";
    for (let px = x; px <= x + w + 1; px += TS) {
      ctx.fillRect(px - 2.5, y - 5, 5, 12);
      ctx.fillRect(px - 2.5, y + h - 5, 5, 12);
    }
    for (let py = y; py <= y + h + 1; py += TS) {
      ctx.fillRect(x - 2.5, py - 5, 5, 12);
      ctx.fillRect(x + w - 2.5, py - 5, 5, 12);
    }
  }
}

// Třpyt na vodě (animovaný přes statickou cache terénu).
export function drawWaterShimmer(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, time: number) {
  const x0 = Math.max(0, Math.floor(camX / TS));
  const y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(MAP.w - 1, Math.ceil((camX + vw) / TS));
  const y1 = Math.min(MAP.h - 1, Math.ceil((camY + vh) / TS));
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.5;
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      if (MAP.get(tx, ty) !== TILE.WATER) continue;
      const sx = tx * TS - camX;
      const sy = ty * TS - camY;
      const off = Math.sin(time * 0.002 + tx * 0.7 + ty) * 4;
      ctx.beginPath();
      ctx.arc(sx + TS / 2 + off, sy + TS / 2, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
}

// Jemná vinětace pro hloubku.
export function drawVignette(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
  const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.36, vw / 2, vh / 2, Math.max(vw, vh) * 0.74);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(18,28,16,0.3)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

// paleta staveb
const BC = {
  wood: "#c29452", woodD: "#9a6f3a", roof: "#b85c3c", roofD: "#974828",
  straw: "#e3c45e", strawD: "#c8a544", stone: "#a7adac", stoneD: "#7d8483",
  door: "#5e4126", win: "#bcd6e6", winF: "#6a4a2c", leaf: "#4e8a4e", trunk: "#7a5230",
  lock: "#d8b24a", cream: "#f3ead2", fire: "#f0913c", fireY: "#ffd54a", smoke: "#d3cebf",
};

function gable(ctx: CanvasRenderingContext2D, x: number, yB: number, w: number, hgt: number, col: string, dark: string) {
  const ax = x + w / 2;
  const ay = yB - hgt;
  // levá (osvětlená) plocha střechy
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - 4, yB); ctx.lineTo(ax, ay); ctx.lineTo(ax, yB); ctx.closePath(); ctx.fill();
  // pravá (zastíněná) plocha — dává sklonu 3D dojem
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(x + w + 4, yB); ctx.lineTo(ax, yB); ctx.closePath(); ctx.fill();
  // hřeben
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, yB - 2); ctx.stroke();
}
function arch(ctx: CanvasRenderingContext2D, cx: number, baseY: number, ww: number, hh: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - ww, baseY);
  ctx.lineTo(cx - ww, baseY - hh + ww);
  ctx.arc(cx, baseY - hh + ww, ww, Math.PI, 0);
  ctx.lineTo(cx + ww, baseY);
  ctx.closePath();
  ctx.fill();
}

function drawStructure(ctx: CanvasRenderingContext2D, kind: InteractKind, x: number, y: number, w: number, h: number, time: number) {
  const cx = x + w / 2;
  const baseY = y + h;
  const wall = (top: number, col = BC.wood) => {
    const hgt = baseY - top;
    ctx.fillStyle = col;
    roundRect(ctx, x + 3, top, w - 6, hgt, 4); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.17)"; // pravá stěna ve stínu = objem
    roundRect(ctx, x + w - 13, top + 2, 10, hgt - 2, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)"; // levá světlá hrana
    ctx.fillRect(x + 5, top + 2, 4, hgt - 4);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; // usazení dole
    ctx.fillRect(x + 4, baseY - 3, w - 8, 3);
  };

  switch (kind) {
    case "chalupa": {
      const wt = y + h * 0.46;
      ctx.fillStyle = BC.stoneD; ctx.fillRect(x + w - 22, y - 6, 8, h * 0.5); // komín
      ctx.fillStyle = "rgba(211,206,191,0.7)"; for (let i = 0; i < 3; i++) ctx.beginPath(), ctx.arc(x + w - 18, y - 10 - i * 7 + Math.sin(time * 0.003 + i) * 2, 3 + i, 0, 7), ctx.fill();
      wall(wt);
      gable(ctx, x, wt + 4, w, h * 0.5, BC.roof, BC.roofD);
      arch(ctx, cx, baseY, 9, 22, BC.door);
      ctx.fillStyle = BC.lock; ctx.beginPath(); ctx.arc(cx + 5, baseY - 12, 1.5, 0, 7); ctx.fill();
      ctx.fillStyle = BC.win; roundRect(ctx, x + 10, wt + 8, 14, 14, 3); ctx.fill();
      ctx.strokeStyle = BC.winF; ctx.lineWidth = 1.5; ctx.strokeRect(x + 10, wt + 8, 14, 14); ctx.beginPath(); ctx.moveTo(x + 17, wt + 8); ctx.lineTo(x + 17, wt + 22); ctx.stroke();
      break;
    }
    case "kurnik": {
      const wt = y + h * 0.5;
      wall(wt);
      for (let k = 1; k < 3; k++) { ctx.strokeStyle = BC.woodD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, wt + k * (baseY - wt) / 3); ctx.lineTo(x + w - 4, wt + k * (baseY - wt) / 3); ctx.stroke(); }
      gable(ctx, x, wt + 3, w, h * 0.52, BC.roof, BC.roofD);
      arch(ctx, cx - 2, baseY, 8, 18, BC.door); // vlez
      ctx.fillStyle = BC.woodD; ctx.fillRect(cx - 12, baseY - 2, 20, 4); // rampa
      ctx.fillStyle = "#e88"; ctx.beginPath(); ctx.arc(x + w / 2, wt - h * 0.5 + 4, 3, 0, 7); ctx.fill(); // hřebínek korouhvičky
      ctx.fillStyle = BC.win; roundRect(ctx, x + w - 22, wt + 6, 12, 10, 2); ctx.fill();
      break;
    }
    case "chlivek": {
      const wt = y + h * 0.56;
      wall(wt, "#b6855a");
      gable(ctx, x, wt + 3, w, h * 0.46, BC.straw, BC.strawD); // došková
      arch(ctx, cx, baseY, 13, 18, BC.door);
      ctx.fillStyle = "#e8b0b0"; ctx.beginPath(); ctx.arc(cx - 4, baseY - 8, 2, 0, 7); ctx.arc(cx + 4, baseY - 8, 2, 0, 7); ctx.fill(); // rypák ve tmě
      ctx.fillStyle = BC.strawD; ctx.fillRect(x + 4, baseY - 4, w - 8, 4); // sláma
      break;
    }
    case "pastvina": {
      // přístřešek se senem
      ctx.strokeStyle = BC.trunk; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + 8, baseY); ctx.lineTo(x + 8, y + h * 0.4); ctx.moveTo(x + w - 8, baseY); ctx.lineTo(x + w - 8, y + h * 0.4); ctx.stroke();
      gable(ctx, x, y + h * 0.42, w, h * 0.34, BC.straw, BC.strawD);
      for (let i = 0; i < 2; i++) { // balíky sena
        const bx = x + 14 + i * (w - 40);
        ctx.fillStyle = BC.straw; ctx.beginPath(); ctx.ellipse(bx + 8, baseY - 9, 11, 10, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = BC.strawD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bx + 8, baseY - 9, 5, 10, 0, 0, 7); ctx.stroke();
      }
      break;
    }
    case "buda": {
      const wt = y + h * 0.5;
      wall(wt, "#b07a44");
      gable(ctx, x + w * 0.16, wt + 2, w * 0.68, h * 0.5, BC.roof, BC.roofD);
      arch(ctx, cx, baseY, 9, 18, "#3a2a1a");
      ctx.fillStyle = BC.cream; ctx.font = "10px " + EMOJI_FONT; ctx.textAlign = "center"; ctx.fillText("🦴", cx, wt - 2);
      break;
    }
    case "studna": {
      ctx.fillStyle = BC.stone; roundRect(ctx, cx - 13, baseY - 16, 26, 16, 4); ctx.fill();
      ctx.fillStyle = BC.stoneD; for (let i = 0; i < 3; i++) ctx.fillRect(cx - 13 + i * 9, baseY - 16, 1.5, 16);
      ctx.fillStyle = "#3a6a8a"; ctx.beginPath(); ctx.ellipse(cx, baseY - 16, 12, 4, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = BC.trunk; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 11, baseY - 16); ctx.lineTo(cx - 9, y); ctx.moveTo(cx + 11, baseY - 16); ctx.lineTo(cx + 9, y); ctx.stroke();
      gable(ctx, cx - 15, y + 4, 30, 12, BC.roof, BC.roofD);
      break;
    }
    case "ohniste": {
      ctx.fillStyle = BC.stone; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 15, baseY - 6 + Math.sin(a) * 6, 4, 0, 7); ctx.fill(); }
      ctx.strokeStyle = BC.trunk; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 14, y + 2); ctx.lineTo(cx + 14, baseY - 8); ctx.moveTo(cx + 14, y + 2); ctx.lineTo(cx - 14, baseY - 8); ctx.stroke(); // trojnožka
      const fl = 6 + Math.sin(time * 0.012) * 3;
      ctx.fillStyle = BC.fire; ctx.beginPath(); ctx.moveTo(cx - 7, baseY - 6); ctx.quadraticCurveTo(cx, baseY - 18 - fl, cx + 7, baseY - 6); ctx.fill();
      ctx.fillStyle = BC.fireY; ctx.beginPath(); ctx.moveTo(cx - 4, baseY - 6); ctx.quadraticCurveTo(cx, baseY - 12 - fl, cx + 4, baseY - 6); ctx.fill();
      break;
    }
    case "dilna": {
      const wt = y + h * 0.5;
      wall(wt, "#b88a52");
      gable(ctx, x, wt + 2, w, h * 0.46, BC.woodD, "#6f5128");
      ctx.fillStyle = "#4a3420"; roundRect(ctx, x + 8, wt + 8, w - 16, baseY - wt - 10, 3); ctx.fill(); // tmavý vnitřek
      ctx.fillStyle = BC.wood; ctx.fillRect(x + 10, baseY - 12, w - 20, 5); // ponk
      ctx.strokeStyle = "#cfcabb"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 6, wt + 12); ctx.lineTo(cx + 6, wt + 18); ctx.stroke(); // pila
      break;
    }
    case "stanek": {
      ctx.fillStyle = BC.wood; ctx.fillRect(x + 6, y + h * 0.5, w - 12, baseY - (y + h * 0.5)); // pult
      ctx.strokeStyle = BC.trunk; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 8, y + h * 0.5); ctx.lineTo(x + 8, y + 4); ctx.moveTo(x + w - 8, y + h * 0.5); ctx.lineTo(x + w - 8, y + 4); ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? BC.roof : BC.cream; ctx.beginPath(); ctx.moveTo(x + 2 + i * (w - 4) / 5, y + 6); ctx.lineTo(x + 2 + (i + 1) * (w - 4) / 5, y + 6); ctx.lineTo(x + 2 + (i + 0.5) * (w - 4) / 5, y + 16); ctx.fill(); } // markýza
      ctx.fillStyle = "#d98c4a"; ctx.beginPath(); ctx.arc(x + 16, y + h * 0.5 - 3, 3, 0, 7); ctx.arc(x + 26, y + h * 0.5 - 3, 3, 0, 7); ctx.fill(); // zboží
      break;
    }
    case "cedule": {
      ctx.fillStyle = BC.trunk; ctx.fillRect(cx - 2, y + 6, 4, baseY - y - 6);
      ctx.fillStyle = BC.wood; roundRect(ctx, cx - 14, y + 4, 28, 16, 3); ctx.fill();
      ctx.strokeStyle = BC.woodD; ctx.lineWidth = 1; ctx.strokeRect(cx - 13, y + 6, 26, 12);
      break;
    }
    case "brana": {
      ctx.fillStyle = BC.trunk; ctx.fillRect(x + 4, y + 4, 5, h - 4); ctx.fillRect(x + w - 9, y + 4, 5, h - 4);
      ctx.fillStyle = BC.woodD; ctx.fillRect(x + 4, y + 6, w - 8, 5);
      break;
    }
    case "truhla": {
      ctx.fillStyle = BC.woodD; roundRect(ctx, cx - 13, baseY - 14, 26, 14, 3); ctx.fill();
      ctx.fillStyle = BC.wood; ctx.beginPath(); ctx.moveTo(cx - 13, baseY - 14); ctx.quadraticCurveTo(cx, baseY - 24, cx + 13, baseY - 14); ctx.fill();
      ctx.strokeStyle = BC.lock; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 13, baseY - 9); ctx.lineTo(cx + 13, baseY - 9); ctx.stroke();
      ctx.fillStyle = BC.lock; ctx.fillRect(cx - 2, baseY - 11, 4, 5);
      break;
    }
    case "byliny": {
      for (let i = 0; i < 5; i++) {
        const bx = cx + (i - 2) * 6;
        ctx.strokeStyle = BC.leaf; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, baseY); ctx.lineTo(bx, baseY - 12 - (i % 2) * 4); ctx.stroke();
        ctx.fillStyle = ["#f2a0c0", "#f0e070", "#fff", "#d68cf0", "#f2a0c0"][i]; ctx.beginPath(); ctx.arc(bx, baseY - 13 - (i % 2) * 4, 3, 0, 7); ctx.fill();
      }
      break;
    }
    case "zahrada": {
      ctx.fillStyle = "#7d5230"; roundRect(ctx, x + 5, y + h * 0.28, w - 10, h * 0.66, 4); ctx.fill();
      for (let r = 0; r < 3; r++) {
        const ry = y + h * 0.4 + r * (h * 0.5 / 3);
        for (let c = 0; c < 3; c++) {
          const px = x + 12 + c * ((w - 24) / 2);
          ctx.fillStyle = BC.leaf; ctx.beginPath(); ctx.arc(px, ry, 3.4, 0, 7); ctx.fill();
          ctx.fillStyle = ["#e0703c", "#f0b84a", "#c83c3c"][(r + c) % 3]; ctx.beginPath(); ctx.arc(px, ry - 1, 1.7, 0, 7); ctx.fill();
        }
      }
      ctx.strokeStyle = "#9a6f3a"; ctx.lineWidth = 2; roundRect(ctx, x + 3, y + h * 0.26, w - 6, h * 0.7, 4); ctx.stroke();
      break;
    }
  }
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  it: Interactable,
  camX: number,
  camY: number,
  near: boolean,
  time: number,
) {
  const x = it.tx * TS - camX;
  const y = it.ty * TS - camY;
  const w = it.fw * TS;
  const h = it.fh * TS;
  const cx = x + w / 2;
  const baseY = y + h;

  ctx.fillStyle = "rgba(0,0,0,0.13)";
  ctx.beginPath();
  ctx.ellipse(cx + 6, baseY + 1, w * 0.5, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (near) {
    ctx.fillStyle = "rgba(240,232,146,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, baseY - h * 0.4, w * 0.62, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStructure(ctx, it.kind, x, y, w, h, time);

  // jmenovka
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  const label = it.label;
  const tw = ctx.measureText(label).width;
  const ty = baseY + 13;
  ctx.fillStyle = near ? "rgba(45,90,61,0.95)" : "rgba(31,61,42,0.66)";
  roundRect(ctx, cx - tw / 2 - 6, ty - 11, tw + 12, 16, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, ty - 2);

  if (near) {
    const bob = Math.sin(time * 0.006) * 3;
    ctx.font = `22px ${EMOJI_FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("⬇️", cx, y - 8 + bob);
  }
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
