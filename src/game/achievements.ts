// ---------------------------------------------------------------------------
// Louka — achievementy (úspěchy)
//
// Čistě odvozené z existujícího stavu hry: každý achievement má podmínku
// `done(state)`. Odemčené id se ukládají do save (GameState.achievements),
// aby zůstaly odemčené i kdyby podmínka přestala platit (např. welfare klesne).
// Kontrola běží centrálně v reduceru po každé akci (viz checkAchievements).
// ---------------------------------------------------------------------------
import type { GameState } from "./types";
import { FACTS } from "./content/facts";
import { ANIMALS } from "./content/animals";
import { MAIN_QUESTS } from "./content/quests";
import { TUTORIAL_STEPS } from "./content/tutorial";

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  /** Krátký popis — zobrazuje se i u zamčených (jako nápověda, co dělat). */
  desc: string;
  done: (s: GameState) => boolean;
}

const HERB_FACT_IDS = FACTS.filter((f) => f.category === "byliny").map((f) => f.id);

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "a_prvni_noc",
    name: "První noc na Louce",
    emoji: "🌙",
    desc: "Přežij svůj první den a vyspi se.",
    done: (s) => s.daysSurvived >= 1,
  },
  {
    id: "a_tyden",
    name: "Týden pečovatelem",
    emoji: "📅",
    desc: "Přežij na Louce celý týden.",
    done: (s) => s.daysSurvived >= 7,
  },
  {
    id: "a_louka_stoji",
    name: "Louka stojí!",
    emoji: "🔨",
    desc: "Dokonči stavbu Louky (úvodní tutoriál).",
    done: (s) => s.tutorialStep >= TUTORIAL_STEPS.length,
  },
  {
    id: "a_stavitel",
    name: "Stavitel",
    emoji: "🏗️",
    desc: "Pořiď 5 vylepšení statku.",
    done: (s) => s.buildings.length >= 5,
  },
  {
    id: "a_hlavni_linka",
    name: "Život na Louce",
    emoji: "📋",
    desc: "Dokonči hlavní questovou linku.",
    done: (s) => (s.questProgress.main ?? 0) >= MAIN_QUESTS.length,
  },
  {
    id: "a_liska",
    name: "Kamarádka z lesa",
    emoji: "🦊",
    desc: "Získej si plnou důvěru lišky.",
    done: (s) => s.fox.stage === "kamarad",
  },
  {
    id: "a_znas_vsechny",
    name: "Znáš je všechny",
    emoji: "🐾",
    desc: "Seznam se se všemi zvířaty Louky.",
    done: (s) => ANIMALS.every((a) => s.seenAnimals.includes(a.id)),
  },
  {
    id: "a_nejlepsi_pritel",
    name: "Nejlepší přítel",
    emoji: "💚",
    desc: "Vybuduj si s některým zvířetem přátelství 80+.",
    done: (s) => Object.values(s.animals).some((a) => a.bond >= 80),
  },
  {
    id: "a_herbar",
    name: "Kompletní herbář",
    emoji: "🌿",
    desc: "Objev všechny bylinky ve Vědomostech.",
    done: (s) => HERB_FACT_IDS.every((id) => s.knownFacts.includes(id)),
  },
  {
    id: "a_bylinkar",
    name: "Bylinkářův učeň",
    emoji: "🎓",
    desc: "Vyhraj poprvé Maruščin kvíz o bylinkách.",
    done: (s) => !!s.flags.taught_maruska,
  },
  {
    id: "a_kvizovy_mistr",
    name: "Kvízový mistr",
    emoji: "🧠",
    desc: "Odpověz správně na 15 otázek v kvízu bylinek.",
    done: (s) => (s.herbQuizCorrect ?? 0) >= 15,
  },
  {
    id: "a_vsevedka",
    name: "Vševědka Louky",
    emoji: "📖",
    desc: "Objev úplně všechny zajímavosti v Deníku.",
    done: (s) => FACTS.every((f) => s.knownFacts.includes(f.id)),
  },
  {
    id: "a_mastickar",
    name: "Mastičkář",
    emoji: "🫙",
    desc: "Vyrob svou první bylinnou mast.",
    done: (s) => !!s.flags.made_mast,
  },
  {
    id: "a_senosec",
    name: "Seno pod střechou",
    emoji: "🌾",
    desc: "Usuš a svez vlastní seno na zimu.",
    done: (s) => !!s.flags.seno_ususeno,
  },
  {
    id: "a_hospodar",
    name: "Hospodář",
    emoji: "💰",
    desc: "Vydělej pro azyl celkem 5 000 Kč.",
    done: (s) => s.totalEarned >= 5000,
  },
  {
    id: "a_prezil_zimu",
    name: "Přežil jsi zimu",
    emoji: "❄️",
    desc: "Doveď Louku přes první zimu do nového roku.",
    done: (s) => s.year >= 2,
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/**
 * Zjistí nově splněné achievementy (podmínka platí a ještě nejsou v save).
 * Nemutuje stav — reducer si výsledek zapíše a ohlásí sám.
 */
export function newlyUnlocked(s: GameState): AchievementDef[] {
  const owned = new Set(s.achievements ?? []);
  return ACHIEVEMENTS.filter((a) => !owned.has(a.id) && a.done(s));
}
