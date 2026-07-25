// ---------------------------------------------------------------------------
// Louka — výkonnostní telemetrie a kvalitativní úrovně.
//
// Veškerý stav je modulová proměnná / ring buffer (typované pole s pevnou
// velikostí) — v hot rAF smyčce (`perfFrame` / `perfSetDrawn`, volané z
// WorldCanvas.tsx) se nic nealokuje (žádné `new`/`[]`/`{}` na snímek). Stejný
// důvod jako u `getShadowBlob`/`softShadow` ve WorldCanvas.tsx: dřívější
// alokace za běhu způsobovaly GC jank a slyšitelné cuknutí zvuku.
// ---------------------------------------------------------------------------

export type QualityTier = "high" | "medium" | "low";

export interface QualitySettings {
  dprCap: number;
  walkFrames: 2 | 3;
  particles: boolean;
  /** Kolik ambientních částic (okvětní lístky / pyl / listí / sníh) najednou. */
  particleBudget: number;
  /** Kolik motýlů poletuje nad loukou (jaro/léto). */
  butterflies: number;
  /** Putující stíny mraků přes terén (offscreen blob × multiply). */
  cloudShadows: boolean;
  /** Vlnící se trsy trávy nad statickou cache terénu. */
  windGrass: number; // max. počet trsů na snímek (0 = vypnuto)
  /** Třpytky na vodních dlaždicích. */
  waterShimmer: boolean;
  /** Filmové zrno navrch snímku (cachovaná textura). */
  grain: boolean;
  /** Měkký „painterly" bloom (rozostřená kopie snímku přes `lighter`). */
  bloom: boolean;
  /** Plný barevný grade (multiply + teplý wash + sluneční záře + závoj).
   *  `false` = jen multiply průchod — polovina fill rate, stejná barva hodiny. */
  richGrade: boolean;
}

/** Konfigurace jednotlivých úrovní kvality. Na `low` zůstává jen barevný grade
 * a vinětace — vše ostatní je vypnuté (viz atmosphere.ts / particles.ts). */
export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: { dprCap: 2, walkFrames: 3, particles: true, particleBudget: 46, butterflies: 2, cloudShadows: true, windGrass: 90, waterShimmer: true, grain: true, bloom: true, richGrade: true },
  medium: { dprCap: 1.5, walkFrames: 3, particles: true, particleBudget: 26, butterflies: 1, cloudShadows: true, windGrass: 0, waterShimmer: true, grain: true, bloom: false, richGrade: true },
  low: { dprCap: 1, walkFrames: 2, particles: false, particleBudget: 0, butterflies: 0, cloudShadows: false, windGrass: 0, waterShimmer: false, grain: false, bloom: false, richGrade: false },
};

/** Aktuální nastavení kvality (bez alokace — vrací sdílený objekt z QUALITY). */
export function quality(): QualitySettings {
  return QUALITY[tier];
}

// --- prefers-reduced-motion ------------------------------------------------
// Čte se z hot smyčky, takže výsledek držíme v proměnné a jen posloucháme
// změnu média (žádné matchMedia volání na snímek).
let reducedMotion = false;
try {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = mq.matches;
  mq.addEventListener("change", (e) => { reducedMotion = e.matches; });
} catch {
  /* matchMedia nemusí existovat (test/SSR) — ber to jako „pohyb povolen" */
}

/** True, když si hráč v systému přeje omezený pohyb — ambientní efekty se
 * pak ztlumí nebo zmrazí (grade a vinětace zůstávají, ty se nehýbou). */
export function prefersReducedMotion(): boolean {
  return reducedMotion;
}

export interface PerfStats {
  fps: number;
  avgMs: number;
  p95Ms: number;
  drawn: number;
}

const STORAGE_KEY = "louka-quality-v1";

// --- ring buffer délek snímků (frame delta v ms) --------------------------
const RING_SIZE = 120;
const frameDeltas = new Float64Array(RING_SIZE);
const scratch = new Float64Array(RING_SIZE); // znovupoužitý buffer pro řazení při refreshi
let ringIndex = 0;
let ringCount = 0;
let lastNow = 0;

let drawnCount = 0;

const statsCache: PerfStats = { fps: 0, avgMs: 0, p95Ms: 0, drawn: 0 };
let lastStatsRefresh = 0;
const STATS_REFRESH_MS = 500; // statistiky se přepočítají nejvýš 2×/s

// --- auto-detekce úrovně kvality -------------------------------------------
const AUTO_WINDOW_MS = 5000; // jen prvních ~5 s měřených snímků
const AUTO_CHECK_INTERVAL_MS = 1000; // re-evaluace jednou za sekundu
const AUTO_P95_THRESHOLD_MS = 20;

let tier: QualityTier = "high"; // výchozí úroveň
let manualOverride = false;
let measureStart = 0;
let lastAutoCheck = 0;

type TierListener = (t: QualityTier) => void;
const listeners = new Set<TierListener>();
function notifyTierChange() {
  for (const cb of listeners) cb(tier);
}

/** Přihlásí posluchače na změnu úrovně kvality (ruční i automatickou).
 * Vrací odhlašovací funkci. Používá WorldCanvas.tsx, aby po přepnutí úrovně
 * v dev panelu hned přepočítal DPR (viz `resize()`). */
export function onTierChange(cb: TierListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// --- perzistence ruční volby (stejný vzor jako src/game/engine/save.ts) ---
function loadManualTier(): QualityTier | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "high" || raw === "medium" || raw === "low" ? raw : null;
  } catch {
    return null;
  }
}

function persistManualTier(t: QualityTier | null) {
  try {
    if (t) localStorage.setItem(STORAGE_KEY, t);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage nemusí být dostupný (privátní režim) — volba jen pro tuto session */
  }
}

const saved = loadManualTier();
if (saved) {
  tier = saved;
  manualOverride = true;
}

export function getQualityTier(): QualityTier {
  return tier;
}

/** True, pokud běží auto-detekce (hráč si úroveň nevybral ručně). */
export function isAutoTier(): boolean {
  return !manualOverride;
}

/** Nastaví úroveň kvality. `manual` (výchozí true) uloží volbu do localStorage
 * a natrvalo vypne auto-detekci, dokud ji hráč sám nezruší (`enableAutoTier`). */
export function setQualityTier(t: QualityTier, manual = true): void {
  if (manual) {
    manualOverride = true;
    persistManualTier(t);
  }
  if (t === tier) return;
  tier = t;
  notifyTierChange();
}

/** Zruší ruční volbu (tlačítko „Auto" v dev panelu) — vrátí výchozí úroveň
 * a znovu odstartuje ~5s měřicí okno auto-detekce. */
export function enableAutoTier(): void {
  manualOverride = false;
  persistManualTier(null);
  measureStart = 0;
  lastAutoCheck = 0;
  setQualityTier("high", false);
}

// --- měření snímků (voláno jednou za rAF tick) -----------------------------

/** Zavolat na začátku smyčky `loop(now)` ve WorldCanvas.tsx. Nic nealokuje. */
export function perfFrame(nowMs: number): void {
  if (lastNow !== 0) {
    frameDeltas[ringIndex] = nowMs - lastNow;
    ringIndex = (ringIndex + 1) % RING_SIZE;
    if (ringCount < RING_SIZE) ringCount++;
  }
  lastNow = nowMs;
  if (measureStart === 0) measureStart = nowMs;
  if (nowMs - lastStatsRefresh >= STATS_REFRESH_MS) {
    refreshStats();
    lastStatsRefresh = nowMs;
  }
  maybeAutoAdjust(nowMs);
}

/** Počet vykreslených objektů v posledním snímku (jen uložení čísla). */
export function perfSetDrawn(count: number): void {
  drawnCount = count;
}

function refreshStats(): void {
  const n = ringCount;
  statsCache.drawn = drawnCount;
  if (n === 0) {
    statsCache.fps = 0;
    statsCache.avgMs = 0;
    statsCache.p95Ms = 0;
    return;
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = frameDeltas[i];
    scratch[i] = v;
    sum += v;
  }
  // Řadí se jen kopie (scratch), ring buffer zůstává nedotčen. Float64Array#sort
  // bez komparátoru řadí číselně vzestupně — bez alokace uzávěru komparátoru.
  const view = scratch.subarray(0, n);
  view.sort();
  const avg = sum / n;
  statsCache.avgMs = avg;
  statsCache.p95Ms = view[Math.min(n - 1, Math.floor(n * 0.95))];
  statsCache.fps = avg > 0 ? 1000 / avg : 0;
}

function maybeAutoAdjust(nowMs: number): void {
  if (manualOverride) return; // hráč si vybral ručně — auto-detekce mlčí
  if (nowMs - measureStart > AUTO_WINDOW_MS) return; // jen prvních ~5 s
  if (nowMs - lastAutoCheck < AUTO_CHECK_INTERVAL_MS) return; // max 1×/s
  lastAutoCheck = nowMs;
  if (ringCount < 10) return; // málo dat na spolehlivý odhad
  if (statsCache.p95Ms > AUTO_P95_THRESHOLD_MS) {
    if (tier === "high") setQualityTier("medium", false);
    else if (tier === "medium") setQualityTier("low", false);
    // "low" už dál klesat nemůže
  }
}

/** Aktuální statistiky pro dev panel. Volá se z UI (polling), ne z rAF smyčky,
 * takže drobná alokace vráceného objektu není na hot path. */
export function getPerfStats(): PerfStats {
  return { fps: statsCache.fps, avgMs: statsCache.avgMs, p95Ms: statsCache.p95Ms, drawn: statsCache.drawn };
}
