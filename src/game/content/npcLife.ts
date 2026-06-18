import type { Phase } from "../types";

// Denní rozvrh NPC — kam jdou a co tam dělají v dané fázi dne.
// Souřadnice jsou dlaždice (snap na nejbližší průchozí proběhne za běhu).
// "work" = emoji nástroje/činnosti, které jim plave nad hlavou při práci.
export interface ScheduleStop {
  tx: number;
  ty: number;
  work: string;
  /** Krátký popis činnosti — pro budoucí bublinky / kontextovou nápovědu. */
  doing: string;
}

export interface NpcLife {
  speed: number; // px/s (pomaleji než hráč 165, ať je dohoníš)
  schedule: Record<Phase, ScheduleStop>;
}

export const NPC_LIFE: Record<string, NpcLife> = {
  // Tomáš — práce: ráno seno na pastvinu, poledne štípe dřevo, večer odpočívá.
  tomas: {
    speed: 95,
    schedule: {
      rano: { tx: 21, ty: 26, work: "🌾", doing: "nosí seno na pastvinu" },
      poledne: { tx: 25, ty: 13, work: "🪓", doing: "štípe dřevo u ohniště" },
      vecer: { tx: 30, ty: 9, work: "☕", doing: "odpočívá u chalupy" },
    },
  },
  // Maruška — vše okolo: ráno vejce u kurníku, poledne byliny, večer vaří mast.
  maruska: {
    speed: 100,
    schedule: {
      rano: { tx: 16, ty: 11, work: "🥚", doing: "sbírá vejce u kurníku" },
      poledne: { tx: 34, ty: 14, work: "🌿", doing: "suší byliny u zahrádky" },
      vecer: { tx: 26, ty: 13, work: "🪻", doing: "vaří řebříčkovou mast v dílně" },
    },
  },
  // Tony — technika: ráno pumpa/studna, poledne ohradník u výběhů, večer chalupa.
  tony: {
    speed: 100,
    schedule: {
      rano: { tx: 17, ty: 20, work: "🔧", doing: "spravuje pumpu u studny" },
      poledne: { tx: 12, ty: 17, work: "⚡", doing: "ladí ohradník u výběhů" },
      vecer: { tx: 32, ty: 9, work: "🔌", doing: "dobíjí solár u chalupy" },
    },
  },
};
