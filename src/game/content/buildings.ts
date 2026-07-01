import type { BuildingDef } from "../types";

// Stavby a nářadí = trvalé vylepšení. Co vlastníš, to ti ulehčuje práci
// nebo zlevňuje provoz. Efekty se počítají v engine/economy a engine/day.
export const BUILDINGS: BuildingDef[] = [
  {
    id: "studna",
    name: "Studna",
    emoji: "⛲",
    cost: 420,
    desc: "Vlastní zdroj vody. Napájení zvířat i pití zdarma a hned.",
    benefit: "Voda zdarma · napájení bez energie",
  },
  {
    id: "vidle",
    name: "Vidle",
    emoji: "🍴",
    cost: 120,
    desc: "Pořádné vidle. Balík sena rozházíš mnohem snáz.",
    benefit: "Krmení stáda −3 energie",
  },
  {
    id: "sekera",
    name: "Sekera",
    emoji: "🪓",
    cost: 150,
    desc: "Ostrá sekera na štípání. Víc dřeva s menší dřinou.",
    benefit: "Štípání +1 dřevo a −2 energie",
  },
  {
    id: "drevnik",
    name: "Dřevník",
    emoji: "🛖",
    cost: 360,
    desc: "Suché dřevo po ruce. V zimě topíš úsporněji.",
    benefit: "Štípání +1 dřevo · zima levnější na topení",
  },
  {
    id: "susarna",
    name: "Sušárna bylin",
    emoji: "🌾",
    cost: 540,
    desc: "Byliny krásně uschnou — vytěžíš z nich víc masti i čaje.",
    benefit: "Výroba z bylin +1 kus navíc",
  },
  {
    id: "senik",
    name: "Seník",
    emoji: "🏚️",
    cost: 650,
    desc: "Skladuješ seno a kupuješ ho ve velkém. Žádné plýtvání.",
    benefit: "Seno o 30 % levnější",
  },
  {
    id: "zahrada",
    name: "Permakulturní zahrada",
    emoji: "🌱",
    cost: 600,
    desc: "Záhony v souladu s přírodou. Každé ráno trochu zeleniny a brambor zdarma.",
    benefit: "Ráno +zelenina a brambory zdarma",
  },
  {
    id: "krmitko",
    name: "Automatické krmítko",
    emoji: "🔁",
    cost: 820,
    desc: "Drůbež si část krmení nabere sama. Ráno ušetříš síly.",
    benefit: "Ranní krmení ptáků −5 energie",
  },
  {
    id: "kurnik",
    name: "Větší kurník",
    emoji: "🏡",
    cost: 700,
    desc: "Víc bidýlek a hnízd. Spokojená drůbež snese víc vajec.",
    benefit: "+50 % vajec",
  },
  {
    id: "kryty_vybeh",
    name: "Keře a síť nad výběhem",
    emoji: "🌳",
    cost: 380,
    desc: "Stín a úkryt pro drůbež. Káně pak může kroužit, jak chce — slepice se jen schovají a hrabou dál.",
    benefit: "Drůbež už káně nevyplaší",
  },
];

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);
