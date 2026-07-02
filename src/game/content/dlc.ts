// Katalog placených rozšíření. Základní hra se prodává za 150 Kč (cena
// aplikace v obchodě — žádný kód); DLC se dokupují uvnitř aplikace.
// Každý nákup DLC je zároveň skutečná podpora azylu Nech mě růst.
import type { DlcId } from "../types";

export interface DlcDef {
  id: DlcId;
  name: string;
  emoji: string;
  priceCzk: number;
  tagline: string;
  desc: string;
  features: string[];
  /** SKU pro budoucí napojení na obchody (Capacitor billing). */
  storeIds?: { googlePlay?: string; appStore?: string };
}

export const DLC_CATALOG: DlcDef[] = [
  {
    id: "senne",
    name: "Senné DLC",
    emoji: "🌾",
    priceCzk: 50,
    tagline: "Zajisti Louce seno na zimu — jako doopravdy.",
    desc:
      "Louka každý rok sklízí vlastní seno: kosí se za rosy, suší na slunci, obrací, " +
      "a když zaprší, začíná se znovu. Přesně tenhle závod s nebem si teď zahraješ. " +
      "A skutečná Louka zrovna shání peníze na seno — koupí tohohle DLC jí pomůžeš doopravdy.",
    features: [
      "Kosení, sušení a svoz sena — závod s počasím",
      "Nová questová linka o 4 kapitolách",
      "Kosa, seniště a předpověď počasí na zítřek",
      "Vtipné hlášky a fakta o seně (otava, kopky, samovznícení!)",
    ],
    storeIds: { googlePlay: "cz.nechmerust.louka.dlc.senne", appStore: "cz.nechmerust.louka.dlc.senne" },
  },
];

export const DLC_BY_ID: Record<DlcId, DlcDef> = Object.fromEntries(
  DLC_CATALOG.map((d) => [d.id, d]),
) as Record<DlcId, DlcDef>;
