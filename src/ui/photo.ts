import type { AnimalDef } from "../game/types";
import type { PersonDef } from "../game/content/people";

// URL skutečné fotky zvířete (public/animals/, stahuje `npm run photos`).
// Respektuje `base: "./"` ve vite.config.ts.
export function photoUrl(a: AnimalDef): string | null {
  return a.photo ? `${import.meta.env.BASE_URL}animals/${a.photo}` : null;
}

// URL stylizovaného portrétu člověka (public/people/, generováno ze skutečných fotek).
export function personPhotoUrl(p: PersonDef): string | null {
  return p.photo ? `${import.meta.env.BASE_URL}people/${p.photo}` : null;
}
