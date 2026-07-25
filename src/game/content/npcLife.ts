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

// Souřadnice patří na velkou domovskou louku (mapa 96x72, elipsa se středem
// 48,34) a drží se u odpovídajících staveb z AUTO_LAYOUT — ale MIMO jejich
// půdorysy, ať NPC nestojí ve zdi. Hlídá `src/game/build/npcLife.test.ts`.
export const NPC_LIFE: Record<string, NpcLife> = {
  // Tomáš — práce: ráno seno na pastvinu, poledne štípe dřevo, večer odpočívá.
  tomas: {
    speed: 95,
    schedule: {
      rano: { tx: 51, ty: 37, work: "🌾", doing: "nosí seno na pastvinu" },
      poledne: { tx: 48, ty: 37, work: "🪓", doing: "štípe dřevo u ohniště" },
      vecer: { tx: 47, ty: 31, work: "☕", doing: "odpočívá u chalupy" },
    },
  },
  // Maruška — vše okolo: ráno vejce u kurníku, poledne byliny, večer vaří mast.
  maruska: {
    speed: 100,
    schedule: {
      rano: { tx: 37, ty: 31, work: "🥚", doing: "sbírá vejce u kurníku" },
      poledne: { tx: 41, ty: 27, work: "🌿", doing: "suší byliny u zahrádky" },
      vecer: { tx: 42, ty: 35, work: "🪻", doing: "vaří řebříčkovou mast v dílně" },
    },
  },
  // Tony — technika: ráno pumpa/studna, poledne ohradník u výběhů, večer chalupa.
  tony: {
    speed: 100,
    schedule: {
      rano: { tx: 43, ty: 29, work: "🔧", doing: "spravuje pumpu u studny" },
      poledne: { tx: 53, ty: 40, work: "⚡", doing: "ladí ohradník u výběhů" },
      vecer: { tx: 43, ty: 31, work: "🔌", doing: "dobíjí solár u chalupy" },
    },
  },
};
