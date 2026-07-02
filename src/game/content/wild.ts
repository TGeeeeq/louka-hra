// Divocí sousedé Louky — liška, káně, ježek a srnka.
// Nejsou to obyvatelé azylu (nekrmí se v denním plánu), ale žijí v lese kolem
// a hráč se s nimi potkává. Filozofie: žádné násilí — každé setkání končí
// dobře a s ponaučením. feedGroup je jen formální (mazlici se nikde nepočítá,
// dokud zvíře není v ANIMALS).
import type { AnimalDef } from "../types";

export type WildId = "liska" | "kane" | "jezek" | "srnka";

export const WILD_ANIMALS: AnimalDef[] = [
  {
    id: "liska",
    name: "Liška",
    species: "liska",
    feedGroup: "mazlici",
    personality:
      "Zrzavá dáma z lesa. Nejdřív jen stín mezi stromy — ale trpělivost a plná miska dokážou divy.",
    fact: "Liška slyší myš pod sněhem na deset metrů a v noci obejde celé své území. Divoké zvíře si nezískáš silou, ale klidem a respektem.",
    palette: { body: "#d97f35", bodyDark: "#a85a20", belly: "#f5ead8", detail: "#3a2a1c", accent: "#f8f4ea" },
  },
  {
    id: "kane",
    name: "Káně",
    species: "kane",
    feedGroup: "mazlici",
    personality:
      "Kroužící stín nad loukou. Vypadá hrozivě, ale ve skutečnosti je to nejpilnější hlídač hrabošů široko daleko.",
    fact: "Káně lesní uloví stovky hrabošů ročně — pro louku je to spojenec, ne nepřítel. Drůbeži stačí keř a síť, kam se schová.",
    palette: { body: "#8a6a48", bodyDark: "#5e4630", belly: "#e8dcc4", detail: "#4a3620", accent: "#e8b84c" },
  },
  {
    id: "jezek",
    name: "Ježek",
    species: "jezek",
    feedGroup: "mazlici",
    personality:
      "Bodlinatý noční hlídač zahrádky. Šustí v listí, funí jako lokomotiva a slimáky bere jako osobní urážku.",
    fact: "Ježkům se nikdy nedává mléko — škodí jim. Nejvíc pomůže miska vody, hromada listí na zimu a zahrada bez chemie.",
    palette: { body: "#6a5a48", bodyDark: "#3f3428", belly: "#e0d4c0", detail: "#2e2418", accent: "#8a7a64" },
  },
  {
    id: "srnka",
    name: "Srnka",
    species: "srnka",
    feedGroup: "mazlici",
    personality:
      "Tichá sousedka z kraje lesa. Za úsvitu ztuhne, dívá se na tebe — a když se nehneš, zase v klidu spásá dál.",
    fact: "Srnky se nekrmí pečivem — jejich bachor ho neumí strávit. Nejlepší dar pro srnku je klid a kus louky bez plotu.",
    palette: { body: "#b0804e", bodyDark: "#7d5834", belly: "#e8d8bc", detail: "#3a2c1c", accent: "#f5efe0" },
  },
];

export const WILD_BY_ID: Record<string, AnimalDef> = Object.fromEntries(
  WILD_ANIMALS.map((a) => [a.id, a]),
);
