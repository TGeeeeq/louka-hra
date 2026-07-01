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
    title: "Noc patří lesu",
    hint: "Večer všechna zvířata zavři (u chalupy jdi spát).",
    done: (s) => !!s.tasksDone.closed,
    reward: { money: 40 },
    speaker: "Tomáš",
    onComplete: "Všichni v suchu a klidu. Liška si venku jen očichala prázdný dvůr a šla po svých. 🦊",
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

// ---------------------------------------------------------------------------
// Liščí příběh přátelství — jádro filozofie hry: žádné násilí, každé setkání
// končí dobře a s ponaučením. Divoké zvíře si získáš trpělivostí a respektem.
const FOX_QUESTS: Quest[] = [
  {
    id: "q_fox_stopy",
    title: "Stopy v trávě",
    hint: "Ráno se u kraje lesa objevily drobné stopy. Dojdi si je prohlédnout (západně od výběhů).",
    done: (s) => !!s.flags.fox_tracks_seen,
    speaker: "Tomáš",
    onComplete: "Liščí stopy! Chodí sem každou noc — ze zvědavosti, ne ze zloby. Zkus ji večer vyhlédnout u lesa.",
  },
  {
    id: "q_fox_pozor",
    title: "Tichý pozorovatel",
    hint: "Večer se POMALU přibliž ke kraji lesa a u lišky se zastav. Když se poženeš, uteče.",
    done: (s) => !!s.flags.fox_seen,
    reward: { energy: 6 },
    speaker: "Louka",
    onComplete: "Viděl jsi ji — a ona tebe. Když se neženeš, přijde blíž. To platí pro všechna divoká zvířata.",
  },
  {
    id: "q_fox_miska",
    title: "Miska na kraji lesa",
    hint: "Nech lišce večer misku s jídlem u krmného místa (vařené krmivo nebo směs). Aspoň třikrát.",
    done: (s) => s.fox.bowlCount >= 3,
    reward: { money: 40 },
    speaker: "Maruška",
    onComplete: "Tři večeře a ani jedno štěknutí! Divoké zvíře se krmí na hranici jeho území — nikdy z ruky. Trpělivost je klíč.",
  },
  {
    id: "q_fox_duvera",
    title: "Krok za krokem",
    hint: "Krm lišku dál a večer ji pozoruj. Důvěra roste každou miskou (a nikdy neklesá).",
    done: (s) => s.fox.trust >= 60,
    speaker: "Louka",
    onComplete: "Liška večeří, i když stojíš opodál. Dívá se ti do očí a neutíká. Tohle si síla nekoupí — jen klid.",
  },
  {
    id: "q_fox_kamarad",
    title: "Kamarádka z lesa",
    hint: "Důvěra je skoro plná. Krm dál — a až liška ráno přijde k pěšině, běž ji pohladit.",
    done: (s) => !!s.flags.fox_petted,
    reward: { money: 100 },
    speaker: "Louka",
    onComplete: "Liška se nechala pohladit a chodí na návštěvy! Trpělivost a respekt otevřou i liščí srdce. 🦊💚",
  },
];

const KANE_QUESTS: Quest[] = [
  {
    id: "q_kane_stin",
    title: "Stín místo boje",
    hint: "Káně plaší drůbež. Neřeš to bojem — postav ve stánku „Keře a síť nad výběhem“ (úkryt).",
    done: (s) => s.buildings.includes("kryty_vybeh"),
    reward: { money: 60 },
    speaker: "Tomáš",
    onComplete: "Keře a síť — a je po strachu. Káně teď loví hraboše a drůbež v klidu hrabe. Chránit je vždycky chytřejší než bojovat. 🪶",
  },
];

const JEZEK_QUESTS: Quest[] = [
  {
    id: "q_jezek_domek",
    title: "Palác z listí",
    hint: "U zahrádky bydlí ježek. Nahrabej mu hromadu listí na zimu (u zahrádky, na podzim).",
    done: (s) => !!s.flags.jezek_domek,
    reward: { energy: 5 },
    speaker: "Louka",
    onComplete: "Ježek se nastěhoval! Miska vody a hromada listí pomůžou víc než mléko (to ježkům škodí). Slimáky máš teď pohlídané. 🦔",
  },
];

const SRNKA_QUESTS: Quest[] = [
  {
    id: "q_srnka",
    title: "Tichý soused",
    hint: "Za úsvitu vychází na kraj louky srnka. Potkej ji třikrát — a nech ji vždycky v klidu.",
    done: (s) => (s.wildSeen.srnka ?? 0) >= 3,
    reward: { money: 50 },
    speaker: "Louka",
    onComplete: "Srnka už tě zná a nebojí se. Nejlepší dar pro divoké sousedy je klid — a louka bez plotů a pečiva. 🦌",
  },
];

// Všechny linky hry. MAIN_QUESTS zůstávají beze změny pořadí (kompatibilita
// starých uložení); nové questy patří vždy do nové linky, nikdy doprostřed.
export const QUEST_LINES: QuestLine[] = [
  { id: "main", icon: "📋", title: "Život na Louce", unlocked: () => true, quests: MAIN_QUESTS },
  { id: "liska_arc", icon: "🦊", title: "Kamarádka z lesa", unlocked: (s) => s.fox.stage !== "les", quests: FOX_QUESTS },
  { id: "kane", icon: "🪶", title: "Stín nad výběhem", unlocked: (s) => !!s.flags.kane_seen, quests: KANE_QUESTS },
  { id: "jezek", icon: "🦔", title: "Bodlinatý nájemník", unlocked: (s) => !!s.flags.jezek_intro, quests: JEZEK_QUESTS },
  { id: "srnka", icon: "🦌", title: "Tichý soused", unlocked: (s) => (s.wildSeen.srnka ?? 0) >= 1, quests: SRNKA_QUESTS },
];

export const QUEST_LINE_BY_ID: Record<string, QuestLine> = Object.fromEntries(
  QUEST_LINES.map((l) => [l.id, l]),
);
