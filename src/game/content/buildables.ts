import type { Buildable } from "../types";

// Core functional buildings (unique — one per game). kind + footprint mirror
// the authored INTERACTABLES so rendering is unchanged.
//
// Zvířecí příbytky nesou svůj výběh (`pen`) — plot se kreslí kolem stavby, jde
// s ní při přesunu a zabírá místo při stavění. Posuny jsou zvolené tak, aby nová
// hra (AUTO_LAYOUT) vypadala přesně jako dřív, kdy byly výběhy natvrdo v mapě.
const ZAKLAD: Buildable[] = [
  { id: "chalupa",  kind: "chalupa",  category: "zaklad", label: "Chalupa",            fw: 3, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "stanek",   kind: "stanek",   category: "zaklad", label: "Stánek (obchod)",    fw: 2, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "dilna",    kind: "dilna",    category: "zaklad", label: "Dílna (výroba)",     fw: 2, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "ohniste",  kind: "ohniste",  category: "zaklad", label: "Ohniště & kuchyně",  fw: 2, fh: 2, cost: { money: 0 }, unique: true, solid: true },
  { id: "kurnik",   kind: "kurnik",   category: "zaklad", label: "Kurník",             fw: 3, fh: 2, cost: { money: 0 }, unique: true, solid: true,
    pen: { ox: -4, oy: -3, w: 9, h: 8, group: "drubez", label: "Drůbeží výběh" } },
  { id: "chlivek",  kind: "chlivek",  category: "zaklad", label: "Prasečí chlívek",    fw: 3, fh: 2, cost: { money: 0 }, unique: true, solid: true,
    pen: { ox: -5, oy: -3, w: 9, h: 8, group: "prasata", label: "Prasečí výběh" } },
  { id: "pastvina", kind: "pastvina", category: "zaklad", label: "Pastvina & seník",   fw: 3, fh: 2, cost: { money: 0 }, unique: true, solid: true,
    pen: { ox: -4, oy: -4, w: 15, h: 10, group: "stado", label: "Pastvina" } },
  { id: "buda",     kind: "buda",     category: "zaklad", label: "Psí bouda & pelíšky", fw: 2, fh: 2, cost: { money: 0 }, unique: true, solid: true,
    pen: { ox: -1, oy: -2, w: 6, h: 5, group: "mazlici", label: "Psí výběh" } },
];

// Upgrades — money cost from buildings.ts; placing grants the benefit
// (reducer pushes id into state.buildings).
const UPGRADE: Buildable[] = [
  { id: "studna",   kind: "studna",   category: "upgrade", label: "Studna",  fw: 1, fh: 1, cost: { money: 420 }, unique: true, solid: true },
  { id: "zahrada",  kind: "zahrada",  category: "upgrade", label: "Permakulturní zahrada", fw: 2, fh: 2, cost: { money: 600 }, unique: true, solid: false },
];

// Fences / paddocks — wood.
const OHRADA: Buildable[] = [
  { id: "plot", kind: "cedule", category: "ohrada", label: "Plot", fw: 1, fh: 1, cost: { wood: 2 }, unique: false, solid: false },
];

// Decorations — cheap wood or free.
const DEKORACE: Buildable[] = [
  { id: "cedule_deko", kind: "cedule", category: "dekorace", label: "Cedule", fw: 1, fh: 1, cost: { wood: 1 }, unique: false, solid: false },
];

export const BUILDABLES: Buildable[] = [...ZAKLAD, ...UPGRADE, ...OHRADA, ...DEKORACE];

export const BUILDABLE_BY_ID: Record<string, Buildable> = Object.fromEntries(
  BUILDABLES.map((b) => [b.id, b]),
);
