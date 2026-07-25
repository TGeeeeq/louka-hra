// ---------------------------------------------------------------------------
// Louka — ambientní částice vázané na sezónu (jaro = okvětní lístky, léto =
// pyl + motýli, podzim = padající listí, zima = sníh).
//
// Pool je struct-of-arrays v typovaných polích alokovaných JEDNOU při načtení
// modulu. Update i kreslení jedním průchodem, v rAF smyčce žádné `new`/`[]`/`{}`
// (stejný důvod jako u perf.ts a getShadowBlob ve WorldCanvas.tsx).
// Souřadnice jsou v prostoru obrazovky — částice jsou „před kamerou", takže
// nepotřebují culling ani world pozice.
// ---------------------------------------------------------------------------

import type { Season } from "../game/types";
import { prefersReducedMotion, quality } from "./perf";

const MAX = 64;
const px = new Float32Array(MAX);
const py = new Float32Array(MAX);
const pvx = new Float32Array(MAX); // individuální odchylka rychlosti
const pvy = new Float32Array(MAX);
const prot = new Float32Array(MAX);
const prv = new Float32Array(MAX);
const psz = new Float32Array(MAX);
const pph = new Float32Array(MAX); // fáze pro sinusový drift / mrkání

let count = 0;
let seeded: Season | "" = "";
let seedW = 0;
let seedH = 0;

const BF_MAX = 2;
const bx = new Float32Array(BF_MAX);
const by = new Float32Array(BF_MAX);
const bph = new Float32Array(BF_MAX);
const bflip = new Uint8Array(BF_MAX);
let bfCount = 0;

function seed(season: Season, w: number, h: number, n: number) {
  count = Math.min(MAX, n);
  for (let i = 0; i < count; i++) {
    px[i] = Math.random() * w;
    py[i] = Math.random() * h;
    pvx[i] = 0.6 + Math.random() * 0.8;
    pvy[i] = 0.7 + Math.random() * 0.7;
    prot[i] = Math.random() * Math.PI * 2;
    prv[i] = (Math.random() - 0.5) * 2.6;
    psz[i] = 1.6 + Math.random() * 1.8;
    pph[i] = Math.random() * Math.PI * 2;
  }
  bfCount = season === "leto" || season === "jaro" ? quality().butterflies : 0;
  for (let i = 0; i < bfCount; i++) {
    bx[i] = Math.random() * w;
    by[i] = h * (0.25 + Math.random() * 0.5);
    bph[i] = Math.random() * Math.PI * 2;
    bflip[i] = 0;
  }
  seeded = season;
  seedW = w;
  seedH = h;
}

// Měkký světelný bod (pyl / sněhová vločka) — jednou do offscreen blobu,
// pak jen drawImage. Ostrá `arc` výplň působí digitálně, tenhle malovaně.
let dotBlob: HTMLCanvasElement | null = null;
function getDotBlob(): HTMLCanvasElement {
  if (dotBlob) return dotBlob;
  const S = 32;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.72)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  dotBlob = cv;
  return cv;
}

const PETAL_COLORS = ["#f7c3da", "#ffe6f0", "#f0d0e4"];
const LEAF_COLORS = ["#cf7a2e", "#b85c3c", "#d9963c"];
const BUTTERFLY_COLORS = ["#f7e07a", "#f2a0c0"];

/** Ambientní částice sezóny. Kreslí se po barevném gradu (aby si držely svůj
 *  odstín) a před vinětací. Na `low` tieru se nekreslí nic. */
export function drawSeasonParticles(
  ctx: CanvasRenderingContext2D,
  season: Season,
  vw: number,
  vh: number,
  dt: number,
  time: number,
) {
  const budget = quality().particleBudget;
  if (budget === 0 || prefersReducedMotion()) return;
  // léto má méně, ale výraznějších motů; ostatní sezóny plný rozpočet
  const want = Math.min(MAX, season === "leto" ? Math.round(budget * 0.6) : budget);
  if (seeded !== season || count !== want || seedW !== vw || seedH !== vh) seed(season, vw, vh, want);

  const t = time * 0.001;
  ctx.save();
  if (season === "zima") {
    const blob = getDotBlob();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      px[i] += Math.sin(t + pph[i]) * 0.5 + 7 * pvx[i] * dt;
      py[i] += 26 * pvy[i] * dt;
      wrap(i, vw, vh);
      const s = psz[i] * 3.2;
      ctx.globalAlpha = 0.62;
      ctx.drawImage(blob, px[i] - s / 2, py[i] - s / 2, s, s);
    }
  } else if (season === "leto") {
    const blob = getDotBlob();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      px[i] += Math.sin(t * 0.8 + pph[i]) * 0.55 + 5 * pvx[i] * dt;
      py[i] -= 8 * pvy[i] * dt; // pyl stoupá v teplém vzduchu
      wrap(i, vw, vh);
      const s = psz[i] * 4;
      ctx.globalAlpha = 0.2 + 0.28 * (0.5 + 0.5 * Math.sin(t * 2.2 + pph[i])); // mrknutí
      ctx.drawImage(blob, px[i] - s / 2, py[i] - s / 2, s, s);
    }
  } else if (season === "podzim") {
    for (let i = 0; i < count; i++) {
      px[i] += Math.sin(t * 1.3 + pph[i]) * 1.1 + 11 * pvx[i] * dt;
      py[i] += 32 * pvy[i] * dt;
      prot[i] += prv[i] * dt;
      wrap(i, vw, vh);
      const s = psz[i];
      ctx.save();
      ctx.translate(px[i], py[i]);
      ctx.rotate(prot[i]);
      ctx.globalAlpha = 0.9;
      // list = dvoutónový kapkovitý tvar (světlá polovina přivrácená k světlu)
      ctx.fillStyle = LEAF_COLORS[i % LEAF_COLORS.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 2, s * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,244,210,0.4)";
      ctx.beginPath();
      ctx.ellipse(-s * 0.4, -s * 0.25, s * 1.1, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else {
    // jaro — okvětní lístky, pomalé plachtění se stranovým kolébáním
    for (let i = 0; i < count; i++) {
      px[i] += Math.sin(t * 1.1 + pph[i]) * 1.3 + 13 * pvx[i] * dt;
      py[i] += 19 * pvy[i] * dt;
      prot[i] += prv[i] * dt * 0.6;
      wrap(i, vw, vh);
      const s = psz[i];
      ctx.save();
      ctx.translate(px[i], py[i]);
      ctx.rotate(prot[i]);
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = PETAL_COLORS[i % PETAL_COLORS.length];
      ctx.beginPath();
      // lístek se sinusově „otáčí plochou" → mění šířku, jak plachtí
      ctx.ellipse(0, 0, s * 1.7, s * (0.35 + 0.6 * Math.abs(Math.sin(t * 1.6 + pph[i]))), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  if (bfCount > 0) drawButterflies(ctx, vw, vh, dt, t);
}

function wrap(i: number, w: number, h: number) {
  if (py[i] > h + 12) { py[i] = -12; px[i] = Math.random() * w; }
  else if (py[i] < -12) { py[i] = h + 12; px[i] = Math.random() * w; }
  if (px[i] > w + 12) px[i] = -12;
  else if (px[i] < -12) px[i] = w + 12;
}

// Motýl: bloudivá dráha (dvě nesouměrné sinusovky) + tlukot křídel měněný
// škálováním v ose X — bez spritu, jen dvě elipsy a tílko.
function drawButterflies(ctx: CanvasRenderingContext2D, vw: number, vh: number, dt: number, t: number) {
  for (let i = 0; i < bfCount; i++) {
    const ph = bph[i];
    const vx = Math.sin(t * 0.45 + ph) * 34 + Math.sin(t * 1.7 + ph * 2) * 12;
    const vy = Math.cos(t * 0.63 + ph * 1.4) * 20;
    bx[i] += vx * dt;
    by[i] += vy * dt;
    if (bx[i] > vw + 24) bx[i] = -24;
    else if (bx[i] < -24) bx[i] = vw + 24;
    by[i] = Math.max(vh * 0.12, Math.min(vh * 0.9, by[i]));
    bflip[i] = vx < 0 ? 1 : 0;
    const flap = Math.abs(Math.sin(t * 9 + ph)); // 0..1 zavřená → rozevřená
    ctx.save();
    ctx.translate(bx[i], by[i]);
    if (bflip[i]) ctx.scale(-1, 1);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length];
    const wsp = 3 + flap * 4;
    ctx.beginPath();
    ctx.ellipse(-wsp * 0.7, -1.5, wsp, 3.4, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(wsp * 0.7, -1.5, wsp * 0.9, 3, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(60,44,30,0.85)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.1, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
