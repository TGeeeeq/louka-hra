import { MAP, TILE, TS } from "./tiles";
import type { Phase, Season } from "../game/types";
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

// Posune hex barvu o `amt` na každém kanálu (kladně = zesvětlí, záporně = ztmaví).
function shiftHex(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + c(r + amt) + c(g + amt) + c(b + amt);
}

function tileHash(tx: number, ty: number) {
  const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
  return (n: number) => ((h >> (n * 3)) & 7) / 7;
}

// =========================================================================
//  TERÉN — kreslí se ve dvou vrstvách do offscreen cache (jednou na období):
//  1) podklad (drawBase), 2) ambientní okluze u lesa, 3) porost (drawProp).
//  Konzistentní směr světla = z levého-horního rohu → stíny dolů-vpravo.
// =========================================================================

function drawBase(c: CanvasRenderingContext2D, t: number, sx: number, sy: number, pal: Pal, tx: number, ty: number) {
  const r = tileHash(tx, ty);
  if (t === TILE.WATER) {
    // hloubka: tmavší střed, světlejší okraj
    const g = c.createRadialGradient(sx + TS / 2, sy + TS / 2, 2, sx + TS / 2, sy + TS / 2, TS * 0.8);
    g.addColorStop(0, shiftHex(pal.water, -34));
    g.addColorStop(1, shiftHex(pal.water, 6));
    c.fillStyle = g;
    c.fillRect(sx, sy, TS + 1, TS + 1);
    return;
  }
  if (t === TILE.PATH || t === TILE.FENCE) {
    c.fillStyle = pal.path;
    c.fillRect(sx, sy, TS + 1, TS + 1);
    c.fillStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < 3; i++) c.fillRect(sx + 3 + r(i) * 26, sy + 4 + r(i + 2) * 26, 2.5, 2.5);
    c.fillStyle = "rgba(255,255,255,0.05)";
    c.fillRect(sx + 4 + r(4) * 18, sy + 4 + r(5) * 18, 3, 1.5);
    return;
  }
  if (t === TILE.DIRT) {
    c.fillStyle = pal.dirt;
    c.fillRect(sx, sy, TS + 1, TS + 1);
    c.fillStyle = "rgba(0,0,0,0.06)";
    for (let i = 0; i < 4; i++) c.fillRect(sx + 2 + r(i) * 28, sy + 3 + r(i + 1) * 28, 2, 2);
    return;
  }
  if (t === TILE.FOREST) {
    // lesní půda (tmavá) — prosvítá mezi korunami
    c.fillStyle = shiftHex(pal.forestDark, -16);
    c.fillRect(sx, sy, TS + 1, TS + 1);
    return;
  }
  // tráva (GRASS / FLOWERS / TALL / BUSH) — dvoutón + jemný velkoplošný flek
  const patch = tileHash(Math.floor(tx / 2), Math.floor(ty / 2));
  c.fillStyle = patch(0) > 0.62 ? shiftHex(pal.grass, -8) : r(0) > 0.6 ? pal.grassAlt : pal.grass;
  c.fillRect(sx, sy, TS + 1, TS + 1);
  if (r(1) > 0.45) {
    c.fillStyle = shiftHex(pal.grass, 10);
    c.fillRect(sx + 5 + r(2) * 18, sy + 7 + r(3) * 16, 3 + r(4) * 2, 2);
  }
}

// Soft stín vržený lesem do mýtiny (les nahoře/vlevo → tmavší okraj trávy).
function forestAO(c: CanvasRenderingContext2D) {
  const isF = (x: number, y: number) => MAP.get(x, y) === TILE.FOREST;
  for (let ty = 1; ty < MAP.h - 1; ty++)
    for (let tx = 1; tx < MAP.w - 1; tx++) {
      const t = MAP.get(tx, ty);
      if (t === TILE.FOREST || t === TILE.WATER) continue;
      const sx = tx * TS;
      const sy = ty * TS;
      if (isF(tx, ty - 1)) {
        const g = c.createLinearGradient(0, sy, 0, sy + 15);
        g.addColorStop(0, "rgba(20,36,22,0.34)");
        g.addColorStop(1, "rgba(20,36,22,0)");
        c.fillStyle = g;
        c.fillRect(sx, sy, TS + 1, 15);
      }
      if (isF(tx - 1, ty)) {
        const g = c.createLinearGradient(sx, 0, sx + 15, 0);
        g.addColorStop(0, "rgba(20,36,22,0.3)");
        g.addColorStop(1, "rgba(20,36,22,0)");
        c.fillStyle = g;
        c.fillRect(sx, sy, 15, TS + 1);
      }
    }
}

function drawProp(c: CanvasRenderingContext2D, t: number, sx: number, sy: number, pal: Pal, tx: number, ty: number, season: Season) {
  const r = tileHash(tx, ty);
  switch (t) {
    case TILE.TALL: {
      for (let i = 0; i < 5; i++) {
        const gx = sx + 5 + i * 6;
        const hh = 12 + r(i) * 8;
        c.strokeStyle = i % 2 ? shiftHex(pal.forest, 14) : pal.forest;
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(gx, sy + TS - 3);
        c.lineTo(gx + (r(i) - 0.5) * 5, sy + TS - 3 - hh);
        c.stroke();
      }
      break;
    }
    case TILE.FLOWERS: {
      for (let i = 0; i < 3; i++) {
        const fx = sx + 9 + i * 9;
        const fy = sy + 12 + r(i + 3) * 12;
        c.strokeStyle = shiftHex(pal.forest, 8);
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(fx, fy + 7);
        c.lineTo(fx, fy);
        c.stroke();
        c.fillStyle = pal.flower[Math.floor(r(i) * pal.flower.length)];
        c.beginPath();
        c.arc(fx, fy, 2.8, 0, 7);
        c.fill();
        c.fillStyle = "rgba(255,255,255,0.7)";
        c.beginPath();
        c.arc(fx - 0.8, fy - 0.8, 0.9, 0, 7);
        c.fill();
      }
      break;
    }
    case TILE.BUSH: {
      const bx = sx + TS / 2;
      const by = sy + TS * 0.62;
      const rad = TS * 0.34;
      c.fillStyle = "rgba(0,0,0,0.16)";
      c.beginPath();
      c.ellipse(bx + 4, by + rad * 0.5, rad * 1.05, rad * 0.4, 0, 0, 7);
      c.fill();
      const lobes = [[-rad * 0.5, 0], [rad * 0.5, 0.4], [0, -rad * 0.4]];
      c.fillStyle = pal.forestDark;
      for (const [dx, dy] of lobes) { c.beginPath(); c.arc(bx + dx, by + dy * rad, rad * 0.72, 0, 7); c.fill(); }
      c.fillStyle = pal.forest;
      for (const [dx, dy] of lobes) { c.beginPath(); c.arc(bx + dx - 2, by + dy * rad - 2, rad * 0.55, 0, 7); c.fill(); }
      c.fillStyle = "rgba(255,255,255,0.16)";
      c.beginPath();
      c.arc(bx - rad * 0.4, by - rad * 0.4, rad * 0.3, 0, 7);
      c.fill();
      if (season === "zima") {
        c.fillStyle = "rgba(255,255,255,0.8)";
        for (const [dx, dy] of lobes) { c.beginPath(); c.arc(bx + dx - 1, by + dy * rad - rad * 0.5, rad * 0.34, Math.PI, 0); c.fill(); }
      }
      break;
    }
    case TILE.FOREST: {
      const cx = sx + TS / 2 + (r(4) - 0.5) * 6;
      const baseY = sy + TS - 2;
      // vržený stín dolů-vpravo
      c.fillStyle = "rgba(18,32,20,0.22)";
      c.beginPath();
      c.ellipse(cx + 9, baseY, TS * 0.46, TS * 0.16, 0, 0, 7);
      c.fill();
      const conifer = r(6) > 0.6;
      const trunkH = conifer ? 10 : 14;
      c.fillStyle = pal.trunk;
      c.fillRect(cx - 2.5, baseY - trunkH, 5, trunkH);
      c.fillStyle = shiftHex(pal.trunk, 14);
      c.fillRect(cx - 2.5, baseY - trunkH, 2, trunkH);
      if (conifer) {
        // jehličnan: tři patra trojúhelníků (tmavé dole → světlé nahoře)
        const w0 = TS * (0.5 + r(5) * 0.12);
        const topY = baseY - trunkH - TS * 0.92;
        const tiers = [0, 1, 2];
        for (const k of tiers) {
          const t01 = k / 2;
          const cw = w0 * (1 - t01 * 0.36);
          const yy = baseY - trunkH - (TS * 0.62) * k;
          const yt = yy - TS * 0.5;
          c.fillStyle = shiftHex(pal.forestDark, k * 8);
          c.beginPath();
          c.moveTo(cx, yt);
          c.lineTo(cx + cw, yy);
          c.lineTo(cx - cw, yy);
          c.closePath();
          c.fill();
          c.fillStyle = shiftHex(pal.forest, k * 8 + 6);
          c.beginPath();
          c.moveTo(cx, yt);
          c.lineTo(cx - cw * 0.62, yy);
          c.lineTo(cx - cw * 0.06, yy);
          c.closePath();
          c.fill();
        }
        if (season === "zima") {
          c.fillStyle = "rgba(255,255,255,0.78)";
          c.beginPath();
          c.moveTo(cx, topY - 1);
          c.lineTo(cx + 5, topY + 9);
          c.lineTo(cx - 5, topY + 9);
          c.closePath();
          c.fill();
        }
      } else {
        // listnáč: vrstvená koruna (tmavá → střední → světlý vrchol vlevo-nahoře)
        const cr = TS * (0.52 + r(5) * 0.14);
        const topY = baseY - trunkH - cr * 0.9;
        c.fillStyle = pal.forestDark;
        c.beginPath();
        c.arc(cx, topY, cr, 0, 7);
        c.fill();
        c.fillStyle = pal.forest;
        c.beginPath();
        c.arc(cx - cr * 0.28, topY - cr * 0.18, cr * 0.82, 0, 7);
        c.fill();
        c.fillStyle = shiftHex(pal.forest, 16);
        c.beginPath();
        c.arc(cx - cr * 0.42, topY - cr * 0.34, cr * 0.5, 0, 7);
        c.fill();
        c.fillStyle = "rgba(255,255,255,0.16)";
        c.beginPath();
        c.arc(cx - cr * 0.5, topY - cr * 0.45, cr * 0.26, 0, 7);
        c.fill();
        if (season === "zima") {
          c.fillStyle = "rgba(255,255,255,0.62)";
          c.beginPath();
          c.arc(cx - cr * 0.2, topY - cr * 0.5, cr * 0.55, Math.PI * 1.05, Math.PI * 1.95);
          c.fill();
        }
      }
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
  // 1) podklad
  for (let ty = 0; ty < MAP.h; ty++)
    for (let tx = 0; tx < MAP.w; tx++)
      drawBase(c, MAP.get(tx, ty), tx * TS, ty * TS, pal, tx, ty);
  // 2) ambientní okluze u lesa (hloubka mýtin)
  forestAO(c);
  // 3) porost shora dolů (koruny správně překrývají dlaždice nad sebou)
  for (let ty = 0; ty < MAP.h; ty++)
    for (let tx = 0; tx < MAP.w; tx++)
      drawProp(c, MAP.get(tx, ty), tx * TS, ty * TS, pal, tx, ty, season);
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

// Ploty výběhů (3D kůly + ráhna). Kreslí se po terénu, zvířata jsou pak nad nimi.
export function drawPaddocks(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
  const rail = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.strokeStyle = "rgba(0,0,0,0.14)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x1, y1 + 2.5); ctx.lineTo(x2, y2 + 2.5); ctx.stroke();
    ctx.strokeStyle = "#9a6f3a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x1, y1 - 1.4); ctx.lineTo(x2, y2 - 1.4); ctx.stroke();
  };
  const post = (px: number, py: number) => {
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(px + 3, py + 4, 6, 2.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#7a5230"; ctx.fillRect(px - 3, py - 13, 6, 17);
    ctx.fillStyle = "#a07b48"; ctx.fillRect(px - 3, py - 13, 2.4, 17);
    ctx.fillStyle = "#5e4126"; ctx.fillRect(px - 3, py + 1, 6, 3);
    ctx.fillStyle = "#b58a52"; ctx.beginPath(); ctx.ellipse(px, py - 13, 3.6, 1.8, 0, 0, 7); ctx.fill();
  };
  for (const p of PADDOCKS) {
    const x = p.tx * TS - camX;
    const y = p.ty * TS - camY;
    const w = p.w * TS;
    const h = p.h * TS;
    rail(x, y, x + w, y);
    rail(x, y + h, x + w, y + h);
    rail(x, y, x, y + h);
    rail(x + w, y, x + w, y + h);
    for (let px = x; px <= x + w + 1; px += TS) { post(px, y); post(px, y + h); }
    for (let py = y; py <= y + h + 1; py += TS) { post(x, py); post(x + w, py); }
  }
}

// Třpyt na vodě (animovaný přes statickou cache terénu).
export function drawWaterShimmer(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, time: number) {
  const x0 = Math.max(0, Math.floor(camX / TS));
  const y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(MAP.w - 1, Math.ceil((camX + vw) / TS));
  const y1 = Math.min(MAP.h - 1, Math.ceil((camY + vh) / TS));
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      if (MAP.get(tx, ty) !== TILE.WATER) continue;
      const sx = tx * TS - camX;
      const sy = ty * TS - camY;
      const off = Math.sin(time * 0.002 + tx * 0.7 + ty) * 4;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx + TS / 2 + off, sy + TS / 2, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.arc(sx + TS / 2 - off * 0.6, sy + TS * 0.7, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
}

// Teplé sluneční světlo z levého-horního rohu — sjednocuje směr osvětlení.
export function drawSunlight(ctx: CanvasRenderingContext2D, vw: number, vh: number, phase: Phase, season: Season) {
  if (phase === "vecer") return; // večer řeší chladný tint ve WorldCanvas
  const g = ctx.createRadialGradient(vw * 0.22, vh * 0.12, 0, vw * 0.22, vh * 0.12, Math.max(vw, vh) * 0.95);
  g.addColorStop(0, season === "zima" ? "rgba(255,255,255,0.12)" : "rgba(255,244,200,0.15)");
  g.addColorStop(0.5, "rgba(255,244,200,0.04)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
  ctx.restore();
}

// Jemná vinětace pro hloubku.
export function drawVignette(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
  const g = ctx.createRadialGradient(vw / 2, vh * 0.46, Math.min(vw, vh) * 0.34, vw / 2, vh / 2, Math.max(vw, vh) * 0.76);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(16,26,15,0.34)");
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
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - 4, yB); ctx.lineTo(ax, ay); ctx.lineTo(ax, yB); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(x + w + 4, yB); ctx.lineTo(ax, yB); ctx.closePath(); ctx.fill();
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
  const D = Math.max(12, w * 0.26); // hloubka 3D boku (dozadu-vpravo)
  const dy = D * 0.55;

  // 3D kvádr: pravý bok (tmavý parallelogram) + čelo s gradientem + světlé hrany
  const box = (top: number, face: string, side: string) => {
    const hgt = baseY - top;
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(x + w - 3, top); ctx.lineTo(x + w - 3 + D, top - dy);
    ctx.lineTo(x + w - 3 + D, baseY - dy); ctx.lineTo(x + w - 3, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.16)"; // bok ke spodu tmavší
    ctx.fillRect(x + w - 3, baseY - hgt * 0.32, D, hgt * 0.32);
    const g = ctx.createLinearGradient(0, top, 0, baseY);
    g.addColorStop(0, shiftHex(face, 22)); g.addColorStop(0.55, face); g.addColorStop(1, shiftHex(face, -14));
    ctx.fillStyle = g;
    roundRect(ctx, x + 3, top, w - 6, hgt, 3); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.24)"; ctx.fillRect(x + 4, top, w - 7, 2.5); // horní hrana
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x + 4, top, 2.5, hgt); // levá hrana
    ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(x + w - 5, top, 2, hgt); // hrana k boku (AO)
  };
  // 3D sedlová střecha: pravá plocha (tmavá) + čelní štít (světlý) — obě s gradientem
  const roof = (topY: number, col: string, dark: string, rh: number) => {
    const ax = cx;
    const ay = topY - rh;
    const rg = ctx.createLinearGradient(ax, ay, x + w + D, topY);
    rg.addColorStop(0, shiftHex(dark, 12)); rg.addColorStop(1, shiftHex(dark, -8));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(x + w + 3, topY); ctx.lineTo(x + w + 3 + D, topY - dy); ctx.lineTo(ax + D, ay - dy);
    ctx.closePath(); ctx.fill();
    const fg = ctx.createLinearGradient(x, topY, ax, ay);
    fg.addColorStop(0, shiftHex(col, 18)); fg.addColorStop(1, col);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(x - 3, topY); ctx.lineTo(ax, ay); ctx.lineTo(x + w + 3, topY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + D, ay - dy); ctx.stroke(); // hřeben
    ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(x - 3, topY, w + 6, 2.5); // okap
  };

  switch (kind) {
    case "chalupa": {
      const top = y + h * 0.2;
      ctx.fillStyle = BC.stoneD; ctx.fillRect(x + w - 20, y - h * 0.5, 9, h * 0.6); // vysoký komín
      ctx.fillStyle = shiftHex(BC.stoneD, 18); ctx.fillRect(x + w - 20, y - h * 0.5, 3, h * 0.6);
      ctx.fillStyle = "rgba(211,206,191,0.7)"; for (let i = 0; i < 3; i++) ctx.beginPath(), ctx.arc(x + w - 15, y - h * 0.5 - i * 7 + Math.sin(time * 0.003 + i) * 2, 3 + i, 0, 7), ctx.fill();
      box(top, BC.wood, BC.woodD);
      roof(top, BC.roof, BC.roofD, h * 0.62);
      arch(ctx, cx, baseY, 9, h * 0.42, BC.door);
      ctx.fillStyle = BC.lock; ctx.beginPath(); ctx.arc(cx + 5, baseY - h * 0.2, 1.4, 0, 7); ctx.fill(); // klika
      ctx.fillStyle = BC.win; roundRect(ctx, x + 9, top + 8, 14, 14, 3); ctx.fill();
      ctx.strokeStyle = BC.winF; ctx.lineWidth = 1.5; ctx.strokeRect(x + 9, top + 8, 14, 14); ctx.beginPath(); ctx.moveTo(x + 16, top + 8); ctx.lineTo(x + 16, top + 22); ctx.moveTo(x + 9, top + 15); ctx.lineTo(x + 23, top + 15); ctx.stroke();
      break;
    }
    case "kurnik": {
      const top = y + h * 0.24;
      box(top, BC.wood, BC.woodD);
      roof(top, BC.roof, BC.roofD, h * 0.6);
      arch(ctx, cx - 2, baseY, 8, h * 0.36, BC.door); // vlez
      ctx.fillStyle = BC.woodD; ctx.fillRect(cx - 12, baseY - 2, 20, 4); // rampa
      ctx.strokeStyle = shiftHex(BC.woodD, -16); ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 12 + i * 5, baseY - 2); ctx.lineTo(cx - 12 + i * 5, baseY + 2); ctx.stroke(); }
      ctx.fillStyle = BC.win; roundRect(ctx, x + w - 22, top + 8, 12, 10, 2); ctx.fill();
      ctx.strokeStyle = BC.winF; ctx.lineWidth = 1.2; ctx.strokeRect(x + w - 22, top + 8, 12, 10);
      ctx.fillStyle = "#e0703c"; ctx.beginPath(); ctx.moveTo(cx + 9, top - 1); ctx.lineTo(cx + 13, top + 3); ctx.lineTo(cx + 9, top + 5); ctx.closePath(); ctx.fill(); // korouhvička
      break;
    }
    case "chlivek": {
      const top = y + h * 0.3;
      box(top, "#b6855a", "#8c6038");
      roof(top, BC.straw, BC.strawD, h * 0.5); // došková
      arch(ctx, cx, baseY, 13, h * 0.34, BC.door);
      ctx.fillStyle = "#e8b0b0"; ctx.beginPath(); ctx.arc(cx - 4, baseY - 8, 2, 0, 7); ctx.arc(cx + 4, baseY - 8, 2, 0, 7); ctx.fill(); // rypák ve tmě
      break;
    }
    case "pastvina": {
      ctx.strokeStyle = BC.trunk; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + 8, baseY); ctx.lineTo(x + 8, y + h * 0.4); ctx.moveTo(x + w - 8, baseY); ctx.lineTo(x + w - 8, y + h * 0.4); ctx.stroke();
      gable(ctx, x, y + h * 0.42, w, h * 0.34, BC.straw, BC.strawD);
      for (let i = 0; i < 2; i++) {
        const bx = x + 14 + i * (w - 40);
        ctx.fillStyle = BC.straw; ctx.beginPath(); ctx.ellipse(bx + 8, baseY - 9, 11, 10, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = BC.strawD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bx + 8, baseY - 9, 5, 10, 0, 0, 7); ctx.stroke();
      }
      break;
    }
    case "buda": {
      const top = y + h * 0.34;
      box(top, "#b07a44", "#8a5c30");
      roof(top, BC.roof, BC.roofD, h * 0.48);
      arch(ctx, cx, baseY, 9, h * 0.34, "#3a2a1a");
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
      ctx.beginPath(); ctx.moveTo(cx - 14, y + 2); ctx.lineTo(cx + 14, baseY - 8); ctx.moveTo(cx + 14, y + 2); ctx.lineTo(cx - 14, baseY - 8); ctx.stroke();
      const fl = 6 + Math.sin(time * 0.012) * 3;
      ctx.fillStyle = "rgba(240,145,60,0.3)"; ctx.beginPath(); ctx.arc(cx, baseY - 8, 16 + fl, 0, 7); ctx.fill(); // záře
      ctx.fillStyle = BC.fire; ctx.beginPath(); ctx.moveTo(cx - 7, baseY - 6); ctx.quadraticCurveTo(cx, baseY - 18 - fl, cx + 7, baseY - 6); ctx.fill();
      ctx.fillStyle = BC.fireY; ctx.beginPath(); ctx.moveTo(cx - 4, baseY - 6); ctx.quadraticCurveTo(cx, baseY - 12 - fl, cx + 4, baseY - 6); ctx.fill();
      break;
    }
    case "dilna": {
      const top = y + h * 0.26;
      box(top, "#b88a52", "#8a6536");
      roof(top, BC.woodD, "#6f5128", h * 0.5);
      ctx.fillStyle = "#4a3420"; roundRect(ctx, x + 8, top + 10, w - 16, baseY - top - 12, 3); ctx.fill(); // tmavý vnitřek
      ctx.fillStyle = BC.wood; ctx.fillRect(x + 10, baseY - 12, w - 20, 5); // ponk
      ctx.fillStyle = BC.stoneD; ctx.fillRect(x + 13, baseY - 18, 3, 6); ctx.fillRect(x + 20, baseY - 16, 3, 4); // nářadí
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
      ctx.fillStyle = BC.woodD; for (let i = 0; i < 3; i++) ctx.fillRect(cx - 9, y + 9 + i * 3, 18, 1.2);
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

  // měkký vržený stín dolů-vpravo (konzistentní směr světla)
  const sg = ctx.createRadialGradient(cx + 5, baseY + 2, 2, cx + 5, baseY + 2, w * 0.62);
  sg.addColorStop(0, "rgba(0,0,0,0.24)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(cx + 5, baseY + 2, w * 0.62, h * 0.26, 0, 0, Math.PI * 2);
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
