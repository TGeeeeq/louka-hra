import type { FeedGroup, GameState } from "../types";

// ---------------------------------------------------------------------------
// Úvodní tutoriál — stavba na zelené louce.
// Hráč přijde na prázdnou louku, potká Tomáše a postupně postaví celé zázemí.
// Zvířata „už čekají na domeček" a stěhují se do výběhů, jakmile jsou hotové.
// Po poslední stavbě naváže survival (viz reducer.ts → přechod do hry).
// ---------------------------------------------------------------------------

export interface TutorialStep {
  /** Název kapitoly (5 jmenovaných + finále „Stánek"). */
  chapter: string;
  /** 1..CHAPTER_COUNT — pro popisek v HUD. */
  chapterIndex: number;
  /** id stavby v INTERACTABLES (world/entities.ts). */
  buildingId: string;
  /** Krátký název stavby (blueprint + HUD instrukce). */
  buildLabel: string;
  /** Skupina zvířat, která se po dostavění nastěhuje do výběhu. */
  settleGroup?: FeedGroup;
  /** Tomášovy repliky při zpřístupnění plánu (na začátku kroku). */
  intro: string[];
  /** Tomášovy repliky po dostavění. Poslední krok = závěrečná řeč. */
  done: string[];
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    chapter: "Přístřešek",
    chapterIndex: 1,
    buildingId: "chalupa",
    buildLabel: "Přístřešek pro tebe",
    intro: [
      "Vítej na Louce! Já jsem Tomáš. Zatím je to jen kus zelený louky uprostřed lesů — ale to my dva změníme.",
      "Nejdřív se nauč chodit — šipky nebo WASD (na mobilu kříž vlevo dole). Zkus dojít k tomu svítícímu plánu.",
      "U plánu zmáčkni MEZERNÍK (nebo tlačítko A) a pustíme se do stavby. Začneme přístřeškem pro tebe — pořádnej hospodář potřebuje střechu nad hlavou.",
      "A ať to víš hned: tady jsme všichni kámoši. Lidi i zvířata. Občas přijde nějaká ta šarvátka — ale stejně jsme pořád jedna parta. 🌿",
    ],
    done: ["Paráda! Máš kde složit hlavu. Jde ti to — hned to zkusíme znova."],
  },
  {
    chapter: "Kuchyň",
    chapterIndex: 2,
    buildingId: "ohniste",
    buildLabel: "Kuchyň s ohništěm",
    intro: [
      "Teď kuchyň s ohništěm. Bez teplýho jídla a hrnce polívky se dlouhá louka nezvládne.",
    ],
    done: ["Voní to tu kouřem a domovem. Skvělá práce. 🔥"],
  },
  {
    chapter: "Kuchyň",
    chapterIndex: 2,
    buildingId: "studna",
    buildLabel: "Studna (voda)",
    intro: [
      "Ke kuchyni patří voda. Vykopeme studnu — napije se z ní člověk i každý zvíře na Louce.",
    ],
    done: ["Studna běží. Vody teď máme dost. ⛲"],
  },
  {
    chapter: "Dílna",
    chapterIndex: 3,
    buildingId: "dilna",
    buildLabel: "Dílna (výroba)",
    intro: [
      "Dílna. Tady budeš vyrábět masti z bylin, opravovat nářadí, dělat, co je potřeba. Šikovný ruce Louku živí.",
    ],
    done: ["Dílna stojí. Až nasbíráš byliny, uvaříš tu i řebříčkovou mast. 🛠️"],
  },
  {
    chapter: "Chlívky a slepičárny",
    chapterIndex: 4,
    buildingId: "kurnik",
    buildLabel: "Slepičárna (kurník)",
    settleGroup: "drubez",
    intro: [
      "A teď to hlavní — zvířátka už čekají na svůj domeček! Začneme slepičárnou. Slyšíš to kdákání? Drůbež je nedočkavá.",
    ],
    done: ["Kurník stojí a slepice, husy i kachny se hrnou dovnitř. Podívej, jak jsou spokojený! 🐔"],
  },
  {
    chapter: "Chlívky a slepičárny",
    chapterIndex: 4,
    buildingId: "chlivek",
    buildLabel: "Prasečí chlívek",
    settleGroup: "prasata",
    intro: [
      "Prasata jsou na řadě — Princezna a Flíček. Postavíme jim pořádnej chlívek, ať mají kde válet se v blátě.",
    ],
    done: ["Princezna už si to šněruje do chlívku, Flíček za ní. Domov je domov. 🐷"],
  },
  {
    chapter: "Ohrady",
    chapterIndex: 5,
    buildingId: "pastvina",
    buildLabel: "Pastvina & ohrada",
    settleGroup: "stado",
    intro: [
      "Velký zvířata potřebujou prostor. Ohradíme pastvinu pro stádo — osel Karel, krávy, ovce.",
    ],
    done: ["Stádo se rozešlo po pastvině a spásá trávu. Krása. 🐐"],
  },
  {
    chapter: "Ohrady",
    chapterIndex: 5,
    buildingId: "buda",
    buildLabel: "Psí bouda & pelíšky",
    settleGroup: "mazlici",
    intro: [
      "Zbývají mazlíci — psi, kočky, králíci. Postavíme boudu a pelíšky, ať mají teplo a klid.",
    ],
    done: ["Pejsci se uvelebili do pelíšků. Teď už venku nikdo nezůstal. 🐕"],
  },
  {
    chapter: "Stánek",
    chapterIndex: 6,
    buildingId: "stanek",
    buildLabel: "Stánek (obchod)",
    intro: [
      "Poslední kousek — stánek. Tady budeš prodávat vejce, vlnu a masti, a nakupovat, co dojde.",
    ],
    done: [
      "A je to! Zelená louka se proměnila v azyl — chalupa, kuchyň, studna, dílna a výběhy plný spokojenejch zvířat.",
      "Odteď je to na tobě: krmit, uklízet, na noc zavřít před liškou a přežít i zimu. Lehký to nebude.",
      "Ale pamatuj — ať se děje co se děje, jsme tu všichni kámoši. Tak do toho, hospodáři. Zvířata na tebe čekají! 🌱",
    ],
  },
];

/** id všech staveb tutoriálu — pro migraci uložení a gating vykreslování/kolizí. */
export const TUTORIAL_BUILDING_IDS: string[] = TUTORIAL_STEPS.map((s) => s.buildingId);

/** Počet kapitol (pro popisek „Kapitola X/Y" v HUD). */
export const CHAPTER_COUNT: number = Math.max(...TUTORIAL_STEPS.map((s) => s.chapterIndex));

/** Které stavby jsou branami zvířecích skupin (výběhy). */
export const GROUP_BY_PEN: Record<string, FeedGroup> = {
  kurnik: "drubez",
  chlivek: "prasata",
  pastvina: "stado",
  buda: "mazlici",
};

export const PEN_BY_GROUP: Record<FeedGroup, string> = {
  drubez: "kurnik",
  prasata: "chlivek",
  stado: "pastvina",
  mazlici: "buda",
};

/** Běží ještě úvodní tutoriál? */
export function tutorialActive(s: GameState): boolean {
  return s.tutorialStep < TUTORIAL_STEPS.length;
}

/** Aktuální krok tutoriálu (nebo null, když už běží survival). */
export function currentStep(s: GameState): TutorialStep | null {
  return tutorialActive(s) ? TUTORIAL_STEPS[s.tutorialStep] : null;
}

/** Nepostavené stavby, které má hráč právě teď postavit (blueprinty). */
export function tutorialTargets(s: GameState): string[] {
  const step = currentStep(s);
  return step && !s.built.includes(step.buildingId) ? [step.buildingId] : [];
}

/** Skupiny zvířat, jejichž výběh už stojí (nastěhovaly se). */
export function settledGroups(built: string[]): FeedGroup[] {
  return (Object.keys(PEN_BY_GROUP) as FeedGroup[]).filter((g) =>
    built.includes(PEN_BY_GROUP[g]),
  );
}
