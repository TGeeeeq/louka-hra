import type { DlcId, FeedGroup, GameState } from "../types";
import { invCount } from "../engine/util";

export interface Quest {
  id: string;
  title: string;
  hint: string;
  done: (s: GameState) => boolean;
  reward?: { money?: number; energy?: number };
  speaker?: string;
  onComplete: string;
}

/**
 * Questová linka — hlavní příběh + vedlejší (liška, divocí sousedé, DLC mise).
 * Každá linka běží nezávisle; postup drží `state.questProgress[line.id]`.
 */
export interface QuestLine {
  id: string;
  icon: string;
  title: string;
  /** Linka patří k DLC — bez vlastnictví se neukazuje ani nepostupuje. */
  dlc?: DlcId;
  /** Kdy se linka hráči objeví (po tutoriálu, v létě…). */
  unlocked: (s: GameState) => boolean;
  quests: Quest[];
}

const allFed = (s: GameState) =>
  (["drubez", "prasata", "stado", "mazlici"] as FeedGroup[]).every((g) => s.tasksDone[`feed_${g}`]);

// Hlavní příběhová linka — vtipná, v češtině.
export const MAIN_QUESTS: Quest[] = [
  {
    id: "uvitani",
    title: "První ráno na Louce",
    hint: "Dojdi ke kurníku 🐔 a vypusť drůbež (mezerník / tlačítko).",
    done: (s) => s.birdsReleased || !!s.tasksDone.release,
    reward: { energy: 6 },
    speaker: "Tomáš",
    onComplete:
      "Výborně! Slepice venku, svět může začít. Akorát ať ti neuteče snídaně — sto krků čeká.",
  },
  {
    id: "snidane",
    title: "Snídaňový chaos",
    hint: "Nakrm drůbež, prasata, stádo i mazlíčky. Prasatům musíš nejdřív navařit!",
    done: allFed,
    reward: { money: 60 },
    speaker: "Maria",
    onComplete:
      "A je nakrmeno! Princezna tě nakonec neutopila ve slinách — profesionální výkon. (+60 Kč do kasy)",
  },
  {
    id: "brisko",
    title: "Drbání na bříšku",
    hint: "Najdi prasátko Flíčka a podrbej ho na bříšku.",
    done: (s) => !!s.flags.pet_flicek,
    reward: { energy: 8 },
    speaker: "Flíček",
    onComplete: "Chrochtoššš… Flíček zavrněl jako traktor a okamžitě usnul. Máš nového kámoše. 🐷",
  },
  {
    id: "mast",
    title: "Lék z Louky",
    hint: "Nasbírej byliny v lese 🌿 a u dílny 🛠️ uvař řebříčkovou mast (potřebuješ oheň).",
    done: (s) => !!s.flags.made_mast,
    speaker: "Maria",
    onComplete:
      "Voní to po létě! Tahle mast živí půlku azylu — a teď ji umíš uvařit i ty. Prodává se skvěle.",
  },
  {
    id: "kupec",
    title: "Kupecké počty",
    hint: "Dojdi ke stánku 🏪 a prodej nějaký výrobek.",
    done: (s) => !!s.flags.sold,
    speaker: "Maria",
    onComplete:
      "První tržba! Účetnictví zaplesalo. Jen to, prosím tě, neutrať hned za zbytečnosti. (Dívá se na tebe.)",
  },
  {
    id: "liska",
    title: "Liška číhá",
    hint: "Večer všechna zvířata zavři (u chalupy jdi spát).",
    done: (s) => !!s.tasksDone.closed,
    reward: { money: 40 },
    speaker: "Tomáš",
    onComplete: "Všichni v suchu a bezpečí. Liška dnes odešla s prázdnou tlamou. 🦊",
  },
  {
    id: "drevo",
    title: "Zima se blíží",
    hint: "Naštípej zásobu dřeva — aspoň 8 polen.",
    done: (s) => invCount(s.inventory, "drevo") >= 8,
    reward: { money: 50 },
    speaker: "Tomáš",
    onComplete: "Hranice dřeva roste. Až udeří mráz, budeš za každé poleno rád. 🪵",
  },
  {
    id: "tyden",
    title: "Přežij první týden",
    hint: "Dožij se 5. dne na Louce.",
    done: (s) => s.day >= 5,
    reward: { money: 150 },
    speaker: "Maria",
    onComplete:
      "Týden na Louce máš za sebou! Zvířata jsou živá, ty taky — a to není málo. Klobouk dolů. 🎉",
  },
];

// Všechny linky hry. MAIN_QUESTS zůstávají beze změny pořadí (kompatibilita
// starých uložení); nové questy patří vždy do nové linky, nikdy doprostřed.
export const QUEST_LINES: QuestLine[] = [
  { id: "main", icon: "📋", title: "Život na Louce", unlocked: () => true, quests: MAIN_QUESTS },
];

export const QUEST_LINE_BY_ID: Record<string, QuestLine> = Object.fromEntries(
  QUEST_LINES.map((l) => [l.id, l]),
);
