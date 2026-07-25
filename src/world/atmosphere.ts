// ---------------------------------------------------------------------------
// Louka — atmosféra: barevný grade podle denní doby a počasí, putující stíny
// mraků, vlnící se tráva, měkký bloom, vinětace + filmové zrno.
//
// Vše je velkoplošná kompozice (globalCompositeOperation), nikdy per-pixel.
// Gradienty i textury se cachují a přepočítají teprve při změně klíče (velikost
// viewportu / barvy gradu) — v rAF smyčce se tak nealokuje, ze stejného důvodu
// jako u `getShadowBlob` ve WorldCanvas.tsx (alokace gradientů na snímek dřív
// dělaly GC jank a cukání zvuku).
//
// Směr světla je jednotný: z levého-horního rohu (stejný standard jako
// drawStructure v draw.ts) — mění se jen barva a výška zdroje, ne strana.
// ---------------------------------------------------------------------------

import type { Phase, Season, Weather } from "../game/types";
import { MAP, TILE, TS } from "./tiles";
import { prefersReducedMotion, quality } from "./perf";
import { seasonHighlight } from "./draw";

// --- grade: pojmenované sloty ve Float32Array -------------------------------
// Interpolace mezi denními dobami je pak jediný cyklus bez alokace.
const SKY_R = 0, SKY_G = 1, SKY_B = 2; // horní tón multiply průchodu
const GND_R = 3, GND_G = 4, GND_B = 5; // dolní tón multiply průchodu
const TINT_A = 6; // síla multiply průchodu
const WARM_R = 7, WARM_G = 8, WARM_B = 9, WARM_A = 10; // teplý wash (soft-light)
const SUN_R = 11, SUN_G = 12, SUN_B = 13, SUN_A = 14, SUN_Y = 15; // sluneční bloom
const HAZE_R = 16, HAZE_G = 17, HAZE_B = 18, HAZE_A = 19; // mlžný závoj (screen)
const VIG_A = 20; // vinětace
const BLOOM_A = 21; // měkký painterly bloom
const GRADE_LEN = 22;

const cur = new Float32Array(GRADE_LEN);
const tgt = new Float32Array(GRADE_LEN);
let gradeReady = false;

function baseByPhase(o: Float32Array, phase: Phase) {
  if (phase === "rano") {
    // zlaté ráno: teplé světlo nízko vlevo, jemně chladnější obloha nahoře
    o[SKY_R] = 255; o[SKY_G] = 212; o[SKY_B] = 166;
    o[GND_R] = 255; o[GND_G] = 232; o[GND_B] = 196;
    o[TINT_A] = 0.62;
    o[WARM_R] = 255; o[WARM_G] = 194; o[WARM_B] = 116; o[WARM_A] = 0.22;
    o[SUN_R] = 255; o[SUN_G] = 228; o[SUN_B] = 154; o[SUN_A] = 0.12; o[SUN_Y] = 0.2;
    o[HAZE_R] = 255; o[HAZE_G] = 238; o[HAZE_B] = 210; o[HAZE_A] = 0;
    o[VIG_A] = 0.34;
    o[BLOOM_A] = 0.26;
    return;
  }
  if (phase === "vecer") {
    // podvečer: chladné modrofialové stíny + horký pás u horizontu
    o[SKY_R] = 158; o[SKY_G] = 158; o[SKY_B] = 208;
    o[GND_R] = 214; o[GND_G] = 182; o[GND_B] = 178;
    o[TINT_A] = 0.6;
    o[WARM_R] = 255; o[WARM_G] = 152; o[WARM_B] = 94; o[WARM_A] = 0.15;
    o[SUN_R] = 255; o[SUN_G] = 172; o[SUN_B] = 100; o[SUN_A] = 0.11; o[SUN_Y] = 0.34;
    o[HAZE_R] = 236; o[HAZE_G] = 206; o[HAZE_B] = 202; o[HAZE_A] = 0;
    o[VIG_A] = 0.46;
    o[BLOOM_A] = 0.3;
    return;
  }
  // poledne: neutrální, jen lehce vyhřáté
  o[SKY_R] = 250; o[SKY_G] = 252; o[SKY_B] = 251;
  o[GND_R] = 255; o[GND_G] = 253; o[GND_B] = 244;
  o[TINT_A] = 0.32;
  o[WARM_R] = 255; o[WARM_G] = 242; o[WARM_B] = 208; o[WARM_A] = 0.07;
  o[SUN_R] = 255; o[SUN_G] = 250; o[SUN_B] = 216; o[SUN_A] = 0.09; o[SUN_Y] = 0.09;
  o[HAZE_R] = 250; o[HAZE_G] = 250; o[HAZE_B] = 244; o[HAZE_A] = 0;
  o[VIG_A] = 0.3;
  o[BLOOM_A] = 0.22;
}

// Posun kanálu k cílové hodnotě (0..1 = jak moc) — používají sezónní a
// povětrnostní modulace, aby se nemusely přepisovat celé sady čísel.
function toward(o: Float32Array, i: number, to: number, k: number) {
  o[i] += (to - o[i]) * k;
}

function applySeason(o: Float32Array, season: Season) {
  if (season === "zima") {
    toward(o, SKY_R, 214, 0.5); toward(o, SKY_G, 230, 0.5); toward(o, SKY_B, 255, 0.6);
    toward(o, GND_R, 232, 0.4); toward(o, GND_G, 242, 0.4); toward(o, GND_B, 255, 0.5);
    o[WARM_A] *= 0.45;
    o[HAZE_A] += 0.05;
    return;
  }
  if (season === "podzim") {
    toward(o, SKY_R, 255, 0.5); toward(o, SKY_G, 216, 0.5); toward(o, SKY_B, 168, 0.6);
    toward(o, GND_R, 255, 0.4); toward(o, GND_G, 226, 0.4); toward(o, GND_B, 184, 0.5);
    o[WARM_A] += 0.05;
    return;
  }
  if (season === "leto") {
    toward(o, GND_R, 255, 0.3); toward(o, GND_G, 246, 0.3); toward(o, GND_B, 206, 0.4);
    o[WARM_A] += 0.03;
    o[SUN_A] += 0.03;
    return;
  }
  // jaro — svěží, lehce zelenožlutý podtón
  toward(o, SKY_G, 250, 0.3);
  toward(o, GND_G, 252, 0.25);
}

function applyWeather(o: Float32Array, weather: Weather) {
  switch (weather) {
    case "destivo":
      // odbarvit k šedi, ztmavit, sluneční zdroj skoro pryč
      toward(o, SKY_R, 176, 0.55); toward(o, SKY_G, 184, 0.55); toward(o, SKY_B, 196, 0.55);
      toward(o, GND_R, 198, 0.5); toward(o, GND_G, 204, 0.5); toward(o, GND_B, 210, 0.5);
      o[TINT_A] = Math.min(0.72, o[TINT_A] + 0.12);
      o[WARM_A] *= 0.35;
      o[SUN_A] *= 0.25;
      o[VIG_A] += 0.06;
      break;
    case "mlha":
      toward(o, SKY_R, 226, 0.5); toward(o, SKY_G, 232, 0.5); toward(o, SKY_B, 234, 0.5);
      o[HAZE_R] = 232; o[HAZE_G] = 238; o[HAZE_B] = 238; o[HAZE_A] = 0.14;
      o[WARM_A] *= 0.6;
      o[SUN_A] *= 0.6;
      o[BLOOM_A] += 0.1;
      break;
    case "snezeni":
      toward(o, SKY_R, 226, 0.5); toward(o, SKY_G, 236, 0.5); toward(o, SKY_B, 248, 0.5);
      o[HAZE_R] = 240; o[HAZE_G] = 246; o[HAZE_B] = 252; o[HAZE_A] = 0.09;
      o[WARM_A] *= 0.4;
      o[SUN_A] *= 0.5;
      break;
    case "mraz":
      toward(o, SKY_B, 255, 0.4);
      o[WARM_A] *= 0.6;
      o[SUN_A] += 0.02;
      break;
    case "vedro":
      toward(o, GND_R, 255, 0.5); toward(o, GND_G, 238, 0.4); toward(o, GND_B, 190, 0.5);
      o[WARM_A] += 0.05;
      o[SUN_A] += 0.05;
      o[HAZE_A] += 0.05;
      o[BLOOM_A] += 0.05;
      break;
    case "polojasno":
      o[SUN_A] *= 0.85;
      break;
    default:
      break; // slunecno = základ
  }
}

/** Přepočítá cíl gradu (bez alokace) a plynule k němu posune aktuální stav.
 *  Volá se jednou za snímek před kreslením atmosféry. */
function updateGrade(dt: number, phase: Phase, season: Season, weather: Weather) {
  baseByPhase(tgt, phase);
  applySeason(tgt, season);
  applyWeather(tgt, weather);
  if (!gradeReady) {
    cur.set(tgt);
    gradeReady = true;
    return;
  }
  // ~1.2 s dojezd → přechod fáze dne je plynulý, ne skok
  const k = 1 - Math.exp(-dt * 0.85);
  for (let i = 0; i < GRADE_LEN; i++) cur[i] += (tgt[i] - cur[i]) * k;
}

// --- cache gradientů --------------------------------------------------------
// Klíč = kvantované vstupy; dokud se nezmění, gradient se jen znovu použije.
function keyChanged(buf: Float32Array, a: number, b: number, c: number, d: number, e: number): boolean {
  if (buf[0] === a && buf[1] === b && buf[2] === c && buf[3] === d && buf[4] === e) return false;
  buf[0] = a; buf[1] = b; buf[2] = c; buf[3] = d; buf[4] = e;
  return true;
}
const q = Math.round;

const tintKey = new Float32Array(5);
let tintGrad: CanvasGradient | null = null;
const warmKey = new Float32Array(5);
let warmGrad: CanvasGradient | null = null;
const sunKey = new Float32Array(5);
let sunGrad: CanvasGradient | null = null;
const hazeKey = new Float32Array(5);
let hazeGrad: CanvasGradient | null = null;
const vigKey = new Float32Array(5);
let vigGrad: CanvasGradient | null = null;

/** Barevný grade celého snímku — 4 levné fullscreen průchody.
 *  Kreslí se po všech objektech, ještě před částicemi a vinětací. */
export function drawColorGrade(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  dt: number,
  phase: Phase,
  season: Season,
  weather: Weather,
) {
  updateGrade(dt, phase, season, weather);
  const rich = quality().richGrade;
  ctx.save();

  // 1) multiply: obloha (nahoře) → zem (dole). Nese hlavní „barvu hodiny".
  if (cur[TINT_A] > 0.01) {
    if (keyChanged(tintKey, q(cur[SKY_R]) * 65536 + q(cur[SKY_G]) * 256 + q(cur[SKY_B]), q(cur[GND_R]) * 65536 + q(cur[GND_G]) * 256 + q(cur[GND_B]), vw, vh, 0) || !tintGrad) {
      const g = ctx.createLinearGradient(0, 0, 0, vh);
      g.addColorStop(0, `rgb(${q(cur[SKY_R])},${q(cur[SKY_G])},${q(cur[SKY_B])})`);
      g.addColorStop(1, `rgb(${q(cur[GND_R])},${q(cur[GND_G])},${q(cur[GND_B])})`);
      tintGrad = g;
    }
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = cur[TINT_A];
    ctx.fillStyle = tintGrad;
    ctx.fillRect(0, 0, vw, vh);
  }

  // 2) soft-light: teplý wash od zdroje světla (L-H) → malovaný, ne fólie
  if (rich && cur[WARM_A] > 0.005) {
    if (keyChanged(warmKey, q(cur[WARM_R]) * 65536 + q(cur[WARM_G]) * 256 + q(cur[WARM_B]), vw, vh, 0, 0) || !warmGrad) {
      const g = ctx.createLinearGradient(0, 0, vw * 0.9, vh);
      g.addColorStop(0, `rgb(${q(cur[WARM_R])},${q(cur[WARM_G])},${q(cur[WARM_B])})`);
      g.addColorStop(1, `rgba(${q(cur[WARM_R])},${q(cur[WARM_G])},${q(cur[WARM_B])},0.15)`);
      warmGrad = g;
    }
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = cur[WARM_A];
    ctx.fillStyle = warmGrad;
    ctx.fillRect(0, 0, vw, vh);
  }

  // 3) lighter: sluneční záře z levého-horního rohu (výška podle denní doby)
  if (rich && cur[SUN_A] > 0.005) {
    const sy = vh * cur[SUN_Y];
    if (keyChanged(sunKey, q(cur[SUN_R]) * 65536 + q(cur[SUN_G]) * 256 + q(cur[SUN_B]), q(sy), vw, vh, 0) || !sunGrad) {
      const g = ctx.createRadialGradient(vw * 0.22, sy, 0, vw * 0.22, sy, Math.max(vw, vh) * 0.95);
      g.addColorStop(0, `rgba(${q(cur[SUN_R])},${q(cur[SUN_G])},${q(cur[SUN_B])},1)`);
      g.addColorStop(0.45, `rgba(${q(cur[SUN_R])},${q(cur[SUN_G])},${q(cur[SUN_B])},0.22)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      sunGrad = g;
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = cur[SUN_A];
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, vw, vh);
  }

  // 4) screen: vzdušný závoj u horizontu (mlha, mrazivý vzduch, letní chvění)
  if (rich && cur[HAZE_A] > 0.005) {
    if (keyChanged(hazeKey, q(cur[HAZE_R]) * 65536 + q(cur[HAZE_G]) * 256 + q(cur[HAZE_B]), vw, vh, 0, 0) || !hazeGrad) {
      const g = ctx.createLinearGradient(0, 0, 0, vh);
      const c = `${q(cur[HAZE_R])},${q(cur[HAZE_G])},${q(cur[HAZE_B])}`;
      g.addColorStop(0, `rgba(${c},1)`);
      g.addColorStop(0.55, `rgba(${c},0.35)`);
      g.addColorStop(1, `rgba(${c},0.1)`);
      hazeGrad = g;
    }
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = cur[HAZE_A];
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, vw, vh);
  }

  ctx.restore();
}

// --- putující stíny mraků ---------------------------------------------------
// Jeden měkký blob se vyrenderuje jednou do offscreen canvasu a pak se levně
// dlaždicuje ve world souřadnicích (stín drží na terénu, neplave s kamerou).
// Dva mraky se dvěma různými periodami dají na obrazovce 2–3 skvrny, ale za
// snímek to je jen ~4 drawImage — každý je fullscreen-velký a blenduje se přes
// multiply, takže na jejich počtu záleží (viz rozpočet v perf.ts).
const CLOUD_N = 2;
const CLOUD_OX = new Float32Array([0, 760]);
const CLOUD_OY = new Float32Array([0, 520]);
const CLOUD_W = new Float32Array([1000, 820]);
const CLOUD_H = new Float32Array([620, 700]);
const CLOUD_A = new Float32Array([1, 0.82]);
const CLOUD_PERIOD_X = 1560;
const CLOUD_PERIOD_Y = 1180;
const CLOUD_VX = 11; // px/s — jeden směr větru pro celou scénu
const CLOUD_VY = 4;

let cloudBlob: HTMLCanvasElement | null = null;
function getCloudBlob(): HTMLCanvasElement {
  if (cloudBlob) return cloudBlob;
  const S = 128;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  // několik překrývajících se měkkých lalůčků → nepravidelný, „malovaný" tvar
  const lobes = [
    [0.5, 0.5, 0.46], [0.32, 0.44, 0.3], [0.68, 0.56, 0.32],
    [0.46, 0.66, 0.26], [0.6, 0.36, 0.24],
  ];
  for (const [lx, ly, lr] of lobes) {
    const g = c.createRadialGradient(lx * S, ly * S, 0, lx * S, ly * S, lr * S);
    g.addColorStop(0, "rgba(38,52,44,0.42)");
    g.addColorStop(0.55, "rgba(38,52,44,0.2)");
    g.addColorStop(1, "rgba(38,52,44,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  }
  cloudBlob = cv;
  return cv;
}

/** Pomalu driftující stíny mraků přes terén. Kreslí se hned po terénu,
 *  aby zůstaly „pod" zvířaty a stavbami. */
export function drawCloudShadows(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  time: number,
  weather: Weather,
) {
  if (!quality().cloudShadows) return;
  // za dešti/mlhy je stín plochý (nemá co vrhat), v slunci nejvýraznější
  const wa = weather === "destivo" || weather === "mlha" ? 0.07 : weather === "polojasno" ? 0.3 : weather === "snezeni" ? 0.12 : 0.22;
  const t = prefersReducedMotion() ? 0 : time * 0.001;
  const blob = getCloudBlob();
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < CLOUD_N; i++) {
    const w = CLOUD_W[i];
    const h = CLOUD_H[i];
    const bx = CLOUD_OX[i] + t * CLOUD_VX;
    const by = CLOUD_OY[i] + t * CLOUD_VY;
    ctx.globalAlpha = wa * CLOUD_A[i];
    const k0 = Math.floor((camX - w - bx) / CLOUD_PERIOD_X) + 1;
    const k1 = Math.floor((camX + vw - bx) / CLOUD_PERIOD_X);
    const m0 = Math.floor((camY - h - by) / CLOUD_PERIOD_Y) + 1;
    const m1 = Math.floor((camY + vh - by) / CLOUD_PERIOD_Y);
    for (let k = k0; k <= k1; k++)
      for (let m = m0; m <= m1; m++)
        ctx.drawImage(blob, bx + k * CLOUD_PERIOD_X - camX, by + m * CLOUD_PERIOD_Y - camY, w, h);
  }
  ctx.restore();
}

// --- vlnící se trsy trávy ---------------------------------------------------
// Nad statickou cache terénu se dokreslí několik světlejších stébel, která se
// ohýbají ve větru. Jen viditelné dlaždice a jen do rozpočtu z perf.ts.
export function drawWindGrass(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  time: number,
  season: Season,
) {
  const budget = quality().windGrass;
  if (budget === 0 || prefersReducedMotion()) return;
  const x0 = Math.max(0, Math.floor(camX / TS));
  const y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(MAP.w - 1, Math.ceil((camX + vw) / TS));
  const y1 = Math.min(MAP.h - 1, Math.ceil((camY + vh) / TS));
  const t = time * 0.001;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = seasonHighlight(season);
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.8;
  // všechna stébla jdou do JEDNÉ cesty a jednoho stroke() — barva i šířka jsou
  // konstantní, takže stovky beginPath/stroke by byly zbytečné draw cally
  ctx.beginPath();
  let drawn = 0;
  for (let ty = y0; ty <= y1 && drawn < budget; ty++)
    for (let tx = x0; tx <= x1 && drawn < budget; tx++) {
      const tile = MAP.get(tx, ty);
      if (tile !== TILE.TALL && tile !== TILE.FLOWERS) continue;
      // Řídký deterministický výběr (~1/3 dlaždic): trsy jsou rozeseté po celé
      // viditelné ploše. Bez něj by rozpočet spolykaly první řádky nahoře a
      // spodek obrazovky by zůstal bez pohybu.
      if ((tx * 5 + ty * 11) % 3 !== 0) continue;
      drawn++;
      const sx = tx * TS - camX;
      const sy = ty * TS - camY;
      // dvě frekvence = poryv i drobné chvění; fáze podle dlaždice
      const ph = tx * 0.55 + ty * 0.31;
      const sway = Math.sin(t * 1.5 + ph) * 3.4 + Math.sin(t * 4.3 + ph * 1.7) * 1.1;
      const baseY = sy + TS - 3;
      for (let j = 0; j < 3; j++) {
        const bx = sx + 8 + j * 7;
        const hh = 13 + ((tx * 7 + ty * 13 + j * 5) % 7);
        const bend = sway * (0.6 + j * 0.22);
        ctx.moveTo(bx, baseY);
        ctx.quadraticCurveTo(bx + bend * 0.4, baseY - hh * 0.6, bx + bend, baseY - hh);
      }
    }
  ctx.stroke();
  ctx.restore();
}

// --- měkký bloom -----------------------------------------------------------
// Rozostřená kopie snímku přes `lighter` — dělá „malovaný" rozptyl světla.
// Půlené rozlišení + Canvas2D filter; jen na nejvyšší úrovni kvality.
let bloomCv: HTMLCanvasElement | null = null;
let bloomCtx: CanvasRenderingContext2D | null = null;
let bloomOk: boolean | null = null;

/** Voláno po gradu, před vinětací. Bez podpory `ctx.filter` se přeskočí. */
export function drawSoftBloom(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
  if (!quality().bloom || cur[BLOOM_A] <= 0.005) return;
  if (bloomOk === null) bloomOk = "filter" in ctx;
  if (!bloomOk) return;
  const bw = Math.max(1, Math.floor(vw * 0.5));
  const bh = Math.max(1, Math.floor(vh * 0.5));
  if (!bloomCv || bloomCv.width !== bw || bloomCv.height !== bh) {
    bloomCv = bloomCv ?? document.createElement("canvas");
    bloomCv.width = bw;
    bloomCv.height = bh;
    bloomCtx = bloomCv.getContext("2d");
  }
  const bc = bloomCtx;
  if (!bc) return;
  bc.globalCompositeOperation = "copy";
  bc.filter = "blur(4px)";
  bc.drawImage(ctx.canvas, 0, 0, bw, bh);
  bc.filter = "none";
  // Kopie se vynásobí sama sebou (≈ druhá mocnina jasu) — svítí pak jen skutečná
  // světla, ne celý snímek. Bez toho `lighter` průchod jen plošně vybělí obraz.
  bc.globalCompositeOperation = "multiply";
  bc.drawImage(bloomCv, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = cur[BLOOM_A];
  ctx.drawImage(bloomCv, 0, 0, vw, vh);
  ctx.restore();
}

// --- vinětace + filmové zrno ------------------------------------------------
const GRAIN_TILE = 128;
let grainPattern: CanvasPattern | null = null;
function getGrainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (grainPattern) return grainPattern;
  const cv = document.createElement("canvas");
  cv.width = GRAIN_TILE;
  cv.height = GRAIN_TILE;
  const c = cv.getContext("2d")!;
  const img = c.createImageData(GRAIN_TILE, GRAIN_TILE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // šum kolem střední šedé → v režimu `overlay` jen mírně zvedá/sráží tón
    const v = 108 + ((Math.random() * 40) | 0);
    d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(cv, "repeat");
  return grainPattern;
}

const GRAIN_STEP_MS = 90; // zrno se posouvá pomalu, jinak „bzučí"
let grainPhase = 0;
let grainNext = 0;

/** Vinětace (vždy) + velmi jemné zrno (od medium tieru). Poslední průchod
 *  snímku — kreslí se až po HUD-nezávislých efektech, před mini-mapou. */
export function drawVignetteGrain(ctx: CanvasRenderingContext2D, vw: number, vh: number, time: number) {
  if (keyChanged(vigKey, vw, vh, 0, 0, 0) || !vigGrad) {
    const g = ctx.createRadialGradient(vw / 2, vh * 0.46, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.62);
    g.addColorStop(0, "rgba(16,26,15,0)");
    g.addColorStop(0.55, "rgba(16,26,15,0.24)");
    g.addColorStop(1, "rgba(16,26,15,0.92)");
    vigGrad = g;
  }
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, cur[VIG_A]);
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, vw, vh);
  ctx.restore();

  if (!quality().grain) return;
  const pat = getGrainPattern(ctx);
  if (!pat) return;
  if (!prefersReducedMotion() && time > grainNext) {
    grainNext = time + GRAIN_STEP_MS;
    grainPhase = (grainPhase + 37) % GRAIN_TILE;
  }
  const off = -grainPhase;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.055;
  ctx.translate(off, off * 0.7);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, vw + GRAIN_TILE, vh + GRAIN_TILE);
  ctx.restore();
}
