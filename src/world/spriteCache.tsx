// Zrasterizuje SVG sprity (zvířata, lidé) do <img> pro kreslení na Canvas.
// Znovu používá stejné komponenty jako React UI — jeden vizuální styl všude.
import { renderToStaticMarkup } from "react-dom/server";
import { AnimalSprite } from "../ui/sprites/AnimalSprite";
import { PersonSprite } from "../ui/sprites/PersonSprite";
import { ANIMAL_BY_ID } from "../game/content/animals";
import { PERSON_BY_ID } from "../game/content/people";

const cache = new Map<string, HTMLImageElement>();

function toImg(svg: string): HTMLImageElement {
  const img = new Image();
  img.decoding = "async";
  img.src = "data:image/svg+xml," + encodeURIComponent(svg);
  return img;
}

export function animalImg(id: string): HTMLImageElement | null {
  const key = "a:" + id;
  const hit = cache.get(key);
  if (hit) return hit;
  const a = ANIMAL_BY_ID[id];
  if (!a) return null;
  const img = toImg(renderToStaticMarkup(<AnimalSprite animal={a} size={100} />));
  cache.set(key, img);
  return img;
}

export function personImg(id: string): HTMLImageElement | null {
  const key = "p:" + id;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = PERSON_BY_ID[id];
  if (!p) return null;
  const img = toImg(renderToStaticMarkup(<PersonSprite person={p} size={100} />));
  cache.set(key, img);
  return img;
}

export function ready(img: HTMLImageElement | null): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0;
}

/** Přednačte všechny sprity, ať jsou při startu hned k dispozici. */
export function preloadSprites(animalIds: string[], personIds: string[]) {
  animalIds.forEach(animalImg);
  personIds.forEach(personImg);
}
