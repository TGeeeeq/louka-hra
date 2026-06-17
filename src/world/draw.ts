import { MAP, TILE, TS } from "./tiles";
import type { Season } from "../game/types";
import type { InteractKind, Interactable } from "./entities";

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

const KIND_EMOJI: Record<InteractKind, string> = {
  chalupa: "🏡",
  stanek: "🏪",
  dilna: "🛠️",
  ohniste: "🔥",
  kurnik: "🐔",
  chlivek: "🐖",
  pastvina: "🌾",
  buda: "🦴",
  studna: "⛲",
  cedule: "🪧",
  byliny: "🌿",
  brana: "🚧",
  truhla: "📦",
};

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  it: Interactable,
  camX: number,
  camY: number,
  near: boolean,
  time: number,
) {
  const cx = (it.tx + it.fw / 2) * TS - camX;
  const baseY = (it.ty + it.fh) * TS - camY;
  const size = it.fw * TS * (it.kind === "byliny" || it.kind === "cedule" || it.kind === "studna" ? 0.7 : 0.92);

  // stín
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 2, size * 0.42, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  if (near) {
    ctx.save();
    ctx.shadowColor = "rgba(240,232,146,0.9)";
    ctx.shadowBlur = 18;
  }
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(KIND_EMOJI[it.kind], cx, baseY - 3);
  if (near) ctx.restore();

  // jmenovka
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  const label = it.label;
  const tw = ctx.measureText(label).width;
  const ty = baseY + 13;
  ctx.fillStyle = near ? "rgba(45,90,61,0.95)" : "rgba(31,61,42,0.7)";
  roundRect(ctx, cx - tw / 2 - 6, ty - 11, tw + 12, 16, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, ty - 2);

  // výzva k interakci
  if (near) {
    const bob = Math.sin(time * 0.006) * 3;
    ctx.font = `22px ${EMOJI_FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("⬇️", cx, baseY - size - 6 + bob);
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
