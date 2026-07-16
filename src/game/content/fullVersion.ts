// Definice jediného placeného produktu hry — plná verze. Louka vychází na
// Google Play jako bezplatné demo (tutoriál a první dny); tímhle nákupem se
// natrvalo odemkne zbytek — celý herní rok i všechny questové linky.
// Nákup je zároveň skutečná podpora azylu Nech mě růst.
export interface FullVersionDef {
  id: "full";
  name: string;
  emoji: string;
  priceCzk: number;
  tagline: string;
  desc: string;
  features: string[];
  /** SKU pro budoucí napojení na obchody (Capacitor billing). */
  storeIds?: { googlePlay?: string; appStore?: string };
}

export const FULL_VERSION: FullVersionDef = {
  id: "full",
  name: "Louka — plná hra",
  emoji: "🌾",
  priceCzk: 299,
  tagline: "Celý rok na Louce — všechna období, celý příběh.",
  desc:
    "Demo tě provede tutoriálem a prvními dny na Louce. Plná verze odemkne zbytek natrvalo — " +
    "všechna roční období, celý hlavní příběh i vedlejší linky (liščí přátelství, sušení sena na zimu " +
    "a další). Nákup je zároveň skutečná podpora azylu Nech mě růst.",
  features: [
    "Celý herní rok — jaro, léto, podzim i zima",
    "Celý hlavní příběh a všechny vedlejší questové linky",
    "Sušení a svoz sena na zimu — závod s počasím",
    "Bez reklam, nákup platí jen jednou",
    "Podporuješ skutečný azyl Nech mě růst",
  ],
  storeIds: { googlePlay: "cz.nechmerust.louka.full" },
};
