import type { Recipe } from "../types";

export const RECIPES: Recipe[] = [
  {
    id: "mix_smes",
    name: "Namíchat krmnou směs",
    emoji: "🥣",
    inputs: [
      { item: "obili", qty: 2 },
      { item: "kukurice", qty: 1 },
    ],
    outputs: [{ item: "krmna_smes", qty: 3 }],
    energy: 4,
    desc: "Z obilí a kukuřice namícháš krmení pro drůbež. Levnější než kupovat hotové.",
  },
  {
    id: "cook_pig",
    name: "Navařit prasatům",
    emoji: "🍲",
    inputs: [
      { item: "zelenina", qty: 2 },
      { item: "brambory", qty: 2 },
    ],
    outputs: [{ item: "vareno", qty: 2 }],
    energy: 6,
    requiresFire: true,
    desc: "Prasata milují teplou stravu. Potřebuješ rozdělaný oheň.",
    fact: "Prasata mají chuťové buňky i na hořké a sladké a dobře si pamatují, kdo jim nosí dobroty.",
  },
  {
    id: "cook_soup",
    name: "Uvařit polévku",
    emoji: "🥘",
    inputs: [
      { item: "zelenina", qty: 2 },
      { item: "voda", qty: 1 },
    ],
    outputs: [{ item: "polevka", qty: 2 }],
    energy: 5,
    requiresFire: true,
    desc: "Teplé jídlo pro tebe — pořádně zasytí.",
  },
  {
    id: "make_salve",
    name: "Vyrobit řebříčkovou mast",
    emoji: "🪻",
    inputs: [
      { item: "byliny", qty: 4 },
      { item: "tuk", qty: 1 },
      { item: "sklenice", qty: 1 },
    ],
    outputs: [{ item: "mast", qty: 2 }],
    energy: 8,
    requiresFire: true,
    desc: "Byliny se v tuku táhle povaří, scedí a naplní do skleniček. Skutečný výrobek Louky.",
    fact: "Řebříček lékařský se odedávna používá na drobné ranky a oděrky — lidově se mu říká „vojenská bylina“.",
  },
  {
    id: "make_tea",
    name: "Usušit bylinný čaj",
    emoji: "🍵",
    inputs: [
      { item: "byliny", qty: 2 },
      { item: "voda", qty: 1 },
    ],
    outputs: [{ item: "caj", qty: 2 }],
    energy: 3,
    requiresFire: true,
    desc: "Posbírané byliny usušíš a spaříš. Zahřeje tebe i prodává se.",
    fact: "Měsíček, máta a meduňka z luk a mezí patří k nejstarším léčivkám u nás.",
  },
  {
    id: "make_sirup",
    name: "Uvařit květový sirup",
    emoji: "🍯",
    inputs: [
      { item: "kvety", qty: 3 },
      { item: "voda", qty: 1 },
      { item: "sklenice", qty: 1 },
    ],
    outputs: [{ item: "sirup", qty: 1 }],
    energy: 6,
    requiresFire: true,
    desc: "Bezový a lipový květ se spaří s vodou a zavaří. Voní po celém létě.",
    fact: "Sirup z bezového květu je klasika venkovských kuchyní — pár květů, voda, citron a trpělivost.",
  },
  {
    id: "make_sipkovy_caj",
    name: "Usušit šípkový čaj",
    emoji: "🍒",
    inputs: [
      { item: "sipek", qty: 2 },
      { item: "voda", qty: 1 },
    ],
    outputs: [{ item: "caj", qty: 3 }],
    energy: 3,
    requiresFire: true,
    desc: "Podzimní šípky usušíš na zimní čaj — vitamínová zásoba na celé mrazy.",
    fact: "Šípky mají víc vitaminu C než citrony. Sbírají se po prvních mrazících, kdy zesládnou.",
  },
];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
);
