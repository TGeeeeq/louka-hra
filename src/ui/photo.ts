import type { AnimalDef } from "../game/types";

// URL skutečné fotky zvířete (public/animals/, stahuje `npm run photos`).
// Respektuje `base: "./"` ve vite.config.ts.
export function photoUrl(a: AnimalDef): string | null {
  return a.photo ? `${import.meta.env.BASE_URL}animals/${a.photo}` : null;
}
