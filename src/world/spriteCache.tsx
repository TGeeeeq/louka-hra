// Zrasterizuje SVG sprity (zvířata, lidé) do bitmapy pro kreslení na Canvas.
// Znovu používá stejné komponenty jako React UI — jeden vizuální styl všude.
//
// DPR-aware rasterizace (WP A3): SVG se nejdřív načte jako <img> (jak dřív),
// ale po jeho onload se navíc jednou zrasterizuje do offscreen <canvas>
// (případně ImageBitmap, je-li k dispozici) v rozlišení RASTER_BASE × dpr —
// takže na DPR2 telefonu není 100px bitmapa roztahovaná na ~120+ device px.
// Dokud bitmapa není hotová, getter vrací původní SVG <img> (nic nezmizí/
// nebliká) — přepnutí je neviditelné, žádný await v render/hot-path.
import { renderToStaticMarkup } from "react-dom/server";
import { AnimalSprite } from "../ui/sprites/AnimalSprite";
import { PersonSprite, type Facing } from "../ui/sprites/PersonSprite";
import { ANIMAL_BY_ID } from "../game/content/animals";
import { WILD_BY_ID } from "../game/content/wild";
import { PERSON_BY_ID, type PersonDef } from "../game/content/people";
import type { PlayerAppearance } from "../game/types";
import { getQualityTier, QUALITY, onTierChange } from "./perf";

/** Základní velikost SVG rasterizace (beze změny — 100px logických). Skutečná
 * bitmapa je RASTER_BASE × rasterScale(), takže na vysoké kvalitě + DPR2
 * vznikne 200px bitmapa místo natahování 100px obrázku. */
const RASTER_BASE = 100;

interface Entry {
  /** Původní SVG <img> — vždy k dispozici hned po vytvoření (i než se načte). */
  svg: HTMLImageElement;
  /** Zrasterizovaná bitmapa — null, dokud se po onload nedokončí rasterizace. */
  bitmap: CanvasImageSource | null;
  /** Měřítko, ve kterém byla bitmapa vytvořena — pro eviction při změně tieru. */
  scale: number;
}

const cache = new Map<string, Entry>();

/** Aktuální rasterizační měřítko: DPR zařízení, ale omezené stropem aktuální
 * kvalitativní úrovně (perf.ts). Mění se jen při přepnutí tieru — v rámci
 * jedné session tedy nabývá jen několika málo hodnot. */
function rasterScale(): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Math.min(dpr, QUALITY[getQualityTier()].dprCap);
}

function scaleSuffix(scale: number): string {
  return "@" + (Number.isInteger(scale) ? String(scale) : scale.toFixed(2));
}

function toImg(svg: string): HTMLImageElement {
  const img = new Image();
  img.decoding = "async";
  img.src = "data:image/svg+xml," + encodeURIComponent(svg);
  return img;
}

/** Zrasterizuje načtený SVG <img> do bitmapy dané velikosti. Běží jen jednou,
 * po onload zdrojového obrázku — nikdy na hot draw-path. Preferuje
 * createImageBitmap (levnější kreslení, dekódování mimo hlavní vlákno), s
 * fallbackem na obyčejný <canvas> tam, kde není k dispozici. */
function rasterize(svgImg: HTMLImageElement, scale: number, entry: Entry): void {
  const px = Math.max(1, Math.round(RASTER_BASE * scale));
  const cv = document.createElement("canvas");
  cv.width = px;
  cv.height = px;
  const c = cv.getContext("2d");
  if (!c) return;
  c.drawImage(svgImg, 0, 0, px, px);
  if (typeof createImageBitmap === "function") {
    createImageBitmap(cv)
      .then((bmp) => {
        entry.bitmap = bmp;
      })
      .catch(() => {
        entry.bitmap = cv; // prohlížeč bez podpory / selhání dekódování — canvas stačí taky
      });
  } else {
    entry.bitmap = cv;
  }
}

function createEntry(key: string, scale: number, svg: string): Entry {
  const img = toImg(svg);
  const entry: Entry = { svg: img, bitmap: null, scale };
  img.onload = () => rasterize(img, scale, entry);
  cache.set(key, entry);
  return entry;
}

/** Vrátí bitmapu, je-li hotová, jinak SVG <img> (i nenačtený — `ready()` ho
 * pak vyloučí z kreslení stejně jako dřív). Nikdy nic neblokuje. */
function pick(entry: Entry): CanvasImageSource {
  return entry.bitmap ?? entry.svg;
}

export function animalImg(id: string): CanvasImageSource | null {
  const a = ANIMAL_BY_ID[id] ?? WILD_BY_ID[id];
  if (!a) return null;
  const scale = rasterScale();
  const key = "a:" + id + scaleSuffix(scale);
  const entry = cache.get(key) ?? createEntry(key, scale, renderToStaticMarkup(<AnimalSprite animal={a} size={RASTER_BASE} />));
  return pick(entry);
}

export function personImg(id: string, dir: Facing = "down", frame: 0 | 1 = 0): CanvasImageSource | null {
  const p = PERSON_BY_ID[id];
  if (!p) return null;
  const scale = rasterScale();
  const key = `p:${id}:${dir}:${frame}${scaleSuffix(scale)}`;
  const entry =
    cache.get(key) ??
    createEntry(key, scale, renderToStaticMarkup(<PersonSprite person={p} size={RASTER_BASE} dir={dir} frame={frame} />));
  return pick(entry);
}

/**
 * Sprite hráče „ty" podle zvolené podoby (tvůrce postavy). Vzhled je součástí
 * cache klíče, takže jiná podoba se přerasterizuje sama — bez invalidace.
 */
export function personImgFor(
  app: PlayerAppearance,
  dir: Facing = "down",
  frame: 0 | 1 = 0,
): CanvasImageSource {
  const scale = rasterScale();
  const key = `p:ty:${app.skin}:${app.hair}:${app.shirt}:${app.variant ?? "-"}:${dir}:${frame}${scaleSuffix(scale)}`;
  const hit = cache.get(key);
  if (hit) return pick(hit);
  const person: PersonDef = { id: "ty", name: "Ty", role: "", line: "", ...app };
  const entry = createEntry(key, scale, renderToStaticMarkup(<PersonSprite person={person} size={RASTER_BASE} dir={dir} frame={frame} />));
  return pick(entry);
}

export function ready(img: CanvasImageSource | null): img is CanvasImageSource {
  if (!img) return false;
  // Rasterizovaná bitmapa (canvas/ImageBitmap) je vždy hotová v okamžiku, kdy
  // ji nastavíme do entry.bitmap — jen syrové SVG <img> potřebuje dočkat load.
  if (img instanceof HTMLImageElement) return img.complete && img.naturalWidth > 0;
  return true;
}

// --- eviction při změně kvalitativního tieru --------------------------------
// Klíč obsahuje měřítko (@scale), takže po přepnutí tieru se sprity přirozeně
// přerasterizují na nové klíče. Staré položky by ale zůstaly viset v paměti —
// při každé změně tieru je proto zahodíme (drží se jich jen pár desítek,
// takže lineární průchod mapy je zanedbatelný a mimo hot path).
onTierChange(() => {
  const scale = rasterScale();
  for (const [key, entry] of cache) {
    if (entry.scale !== scale) cache.delete(key);
  }
});

// --- přednačítání (chunkované, ať start hry nezamrzne) ----------------------
// requestIdleCallback zpracuje pár spritů na volný okamžik prohlížeče; na
// prohlížečích bez podpory (Safari) padá na krátký setTimeout.
const IDLE_CHUNK = 4;

function scheduleIdle(cb: () => void): void {
  if (typeof requestIdleCallback === "function") requestIdleCallback(cb, { timeout: 200 });
  else setTimeout(cb, 16);
}

function runQueue(tasks: Array<() => void>): void {
  if (tasks.length === 0) return;
  const step = () => {
    for (let i = 0; i < IDLE_CHUNK && tasks.length > 0; i++) tasks.shift()!();
    if (tasks.length > 0) scheduleIdle(step);
  };
  scheduleIdle(step);
}

/** Přednačte sprity, ať jsou při startu hned k dispozici. Práce se rozloží po
 * malých dávkách přes requestIdleCallback, aby start hry nezamrzl (desítky
 * SVG renderů + rasterizací najednou by na slabším Androidu trhaly). */
export function preloadSprites(animalIds: string[], personIds: string[]) {
  const tasks: Array<() => void> = [];
  for (const id of animalIds) tasks.push(() => animalImg(id));
  const dirs: Facing[] = ["down", "up", "side"];
  for (const pid of personIds)
    for (const d of dirs) {
      tasks.push(() => personImg(pid, d, 0));
      tasks.push(() => personImg(pid, d, 1));
    }
  runQueue(tasks);
}
