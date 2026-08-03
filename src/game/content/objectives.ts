import type { FeedGroup, GameState, Phase } from "../types";
import { invCount } from "../engine/util";
import { CHAPTER_COUNT, TUTORIAL_STEPS, tutorialActive } from "./tutorial";

// ---------------------------------------------------------------------------
// Denní plán — JEDINÝ zdroj pravdy o tom, „co mám teď dělat".
//
// Hráč se ze začátku topil v chaosu: krmení, vypouštění a stavění se dozvěděl
// jen z jednořádkové nápovědy v HUD. Tady se z herního stavu odvodí konkrétní
// odškrtávací seznam kroků aktuální fáze dne — a ten pak čte HUD (ukazatel),
// deník (celý plán) i mapa (pulzující body „tady je něco potřeba").
//
// Vše je odvozené, nic se neukládá: `tasksDone`, `built` a inventář jsou
// zdrojem pravdy, takže se plán nikdy nerozejde s reducerem.
// ---------------------------------------------------------------------------

export interface Objective {
  id: string;
  /** Krátký titulek do seznamu — „Vypustit drůbež". */
  label: string;
  /** Vtipná hláška průvodce — ukazuje se v ukazateli ve světě. */
  hint: string;
  /** Kdo hlášku říká (portrét v ukazateli). */
  speaker: string;
  /** Emoji do seznamu (deník, HUD). */
  emoji: string;
  done: boolean;
  /**
   * Povinný krok fáze dne — dokud není hotový, fáze „není dodělaná".
   * Nepovinné kroky (vejce, dřevo, byliny) plán jen nabízí.
   */
  required: boolean;
  /** Krok, který je ještě zamčený předchozím krokem (tutoriál, vypuštění). */
  locked?: boolean;
  /** Kam jít — id objektu v `INTERACTABLES` (world/entities.ts). */
  target?: string;
  /** Víc možných cílů (bylinky) — ukazatel vezme ten nejbližší. */
  targets?: string[];
  /** Akutní věc (utečené zvíře) — kreslí se červeně a pulzuje. */
  urgent?: boolean;
}

export interface DayPlan {
  phase: Phase;
  /** „Ráno — vypustit a nakrmit" */
  title: string;
  /** K čemu ta fáze je, jednou větou. */
  lead: string;
  steps: Objective[];
  /** První nesplněný krok (nejdřív povinné, pak nepovinné). */
  next: Objective | null;
  requiredTotal: number;
  requiredDone: number;
  /** Jsou všechny povinné kroky fáze hotové? */
  ready: boolean;
  /** Co přijde po téhle fázi („Poledne" / „Večer" / „Spánek"). */
  nextPhase: string;
  /** Běží ještě úvodní tutoriál (stavění zázemí)? */
  tutorial: boolean;
}

const GROUPS: FeedGroup[] = ["drubez", "prasata", "stado", "mazlici"];

const FEED_STEP: Record<FeedGroup, { label: string; emoji: string; target: string; hint: string; speaker: string }> = {
  drubez: {
    label: "Nakrmit drůbež",
    emoji: "🐔",
    target: "kurnik",
    hint: "Slepice, husy i kachny se tváří, že nejedly od loňska. Sype se to u kurníku.",
    speaker: "Maruška",
  },
  prasata: {
    label: "Nakrmit prasata",
    emoji: "🐖",
    target: "chlivek",
    hint: "Princezna už slintá na půl louky. Prasatům se ale nejdřív VAŘÍ — hrnec na ohniště, pak k chlívku.",
    speaker: "Tomáš",
  },
  stado: {
    label: "Postarat se o stádo",
    emoji: "🐄",
    target: "pastvina",
    hint: "Osel Karel má výraz „mně nikdo nikdy nic nedal“. Na jaře a v létě stačí vyhnat na pastvu, v zimě rozdělat seno.",
    speaker: "Tomáš",
  },
  mazlici: {
    label: "Nakrmit psy, kočky a králíky",
    emoji: "🐕",
    target: "buda",
    hint: "Psi tvrdí, že se od včera nekrmili. Lžou. Ale nakrm je, jsou přesvědčiví.",
    speaker: "Maruška",
  },
};

const CLEAN_STEP: Record<FeedGroup, { label: string; emoji: string; target: string; hint: string }> = {
  drubez: { label: "Vyhrabat kurník", emoji: "🧹", target: "kurnik", hint: "Podestýlka se sama nevyhrabe a slepice si nestěžují — jen kašlou." },
  prasata: { label: "Uklidit chlívek", emoji: "🧹", target: "chlivek", hint: "Prasata jsou čistotná zvířata. To bláto je jejich lázeň, ne záchod — a ten je potřeba uklidit." },
  stado: { label: "Uklidit u stáda", emoji: "🧹", target: "pastvina", hint: "Hrábě, kolečko, dvě písničky — a je čisto." },
  mazlici: { label: "Uklidit pelíšky", emoji: "🧹", target: "buda", hint: "V pelíškách je půl louky srsti. Vyklep to, ať se dobře spí." },
};

/** Vtipné hlášky ke stavbám v tutoriálu (fallback: obecná). */
const BUILD_HINT: Record<string, string> = {
  chalupa: "Nejdřív střecha nad hlavou — hospodář, co spí v kopřivách, dlouho nevydrží.",
  ohniste: "Kuchyň s ohništěm. Bez teplého jídla a hrnce polívky se dlouhá louka nezvládne.",
  studna: "Studna. Bez vody nedáš ani ty, ani sto zvířat — a nosit ji v kýblu je otrava.",
  dilna: "Dílna. Tady se z bylin vaří masti a z nářadí zase nářadí.",
  kurnik: "Slyšíš to kdákání? Drůbež má sbaleno a čeká na domeček.",
  chlivek: "Princezna a Flíček chtějí chlívek. A pořádnou kaluž. Hlavně tu kaluž.",
  pastvina: "Velká zvířata potřebují prostor. Ohradíme pastvinu pro stádo.",
  buda: "Zbývají mazlíci — bouda a pelíšky, ať mají teplo a klid.",
  stanek: "Poslední kousek: stánek. Bez tržby je azyl jen hodně drahé hobby.",
};

function buildSteps(s: GameState): Objective[] {
  return TUTORIAL_STEPS.map((step, i) => ({
    id: `build_${step.buildingId}`,
    label: `Postav: ${step.buildLabel}`,
    hint:
      BUILD_HINT[step.buildingId] ??
      "Vyber stavbu v panelu dole, klepni na louku a potvrď — než potvrdíš, můžeš s ní ještě hýbat.",
    speaker: "Tomáš",
    emoji: "🔨",
    done: s.built.includes(step.buildingId),
    required: true,
    locked: i > s.tutorialStep,
    target: step.buildingId,
  }));
}

/** Stojí ta stavba? Před dostavěním se na ni nedá posílat. */
const stands = (s: GameState, id: string) => s.built.includes(id);

function morningSteps(s: GameState): Objective[] {
  const out: Objective[] = [];
  out.push({
    id: "release",
    label: "Vypustit drůbež z kurníku",
    hint: "Slepice kdákají od pěti ráno a mají to za tebe nachystané. Otevři jim kurník, než si napíšou petici.",
    speaker: "Tomáš",
    emoji: "🚪",
    done: s.birdsReleased || !!s.tasksDone.release,
    required: true,
    target: "kurnik",
  });
  for (const g of GROUPS) {
    const f = FEED_STEP[g];
    if (!stands(s, f.target)) continue;
    out.push({
      id: `feed_${g}`,
      label: f.label,
      hint: f.hint,
      speaker: f.speaker,
      emoji: f.emoji,
      done: !!s.tasksDone[`feed_${g}`],
      required: true,
      // Drůbež se krmí až po vypuštění (viz reducer FEED).
      locked: g === "drubez" && !s.birdsReleased && !s.tasksDone.release,
      target: f.target,
    });
  }
  if (stands(s, "studna"))
    out.push({
      id: "water",
      label: "Napojit zvířata",
      hint: "Voda není luxus, to je základ. Studna je hned tady — pumpuj.",
      speaker: "Tomáš",
      emoji: "💧",
      done: !!s.tasksDone.water,
      required: false,
      target: "studna",
    });
  if (stands(s, "kurnik"))
    out.push({
      id: "eggs",
      label: "Sesbírat vejce",
      hint: "Vejce se ve trávě sama neposbírají. A slepice si na nich rády sedí — jako na trůnu.",
      speaker: "Maruška",
      emoji: "🥚",
      done: !!s.tasksDone.eggs,
      required: false,
      locked: !s.birdsReleased && !s.tasksDone.release,
      target: "kurnik",
    });
  return out;
}

function noonSteps(s: GameState): Objective[] {
  const out: Objective[] = [];
  for (const g of GROUPS) {
    const c = CLEAN_STEP[g];
    if (!stands(s, c.target)) continue;
    out.push({
      id: `clean_${g}`,
      label: c.label,
      hint: c.hint,
      speaker: "Maruška",
      emoji: c.emoji,
      done: !!s.tasksDone[`clean_${g}`],
      required: false,
      target: c.target,
    });
  }
  out.push({
    id: "forage",
    label: "Nasbírat byliny",
    hint: "Řebříček u cesty ti nikam neuteče, ale sám se do dílny taky nedostane. Natrhej ho.",
    speaker: "Maruška",
    emoji: "🌿",
    done: invCount(s.inventory, "byliny") >= 3,
    required: false,
    targets: ["byliny1", "byliny2", "byliny3", "byliny7"],
  });
  out.push({
    id: "drevo",
    label: "Naštípat dřevo (aspoň 8 polen)",
    hint: "Zima přijde dřív, než si vzpomeneš, kam jsi dal sekyru. Dřevo se štípe s Tomášem.",
    speaker: "Tomáš",
    emoji: "🪵",
    done: invCount(s.inventory, "drevo") >= 8,
    required: false,
  });
  if (stands(s, "dilna"))
    out.push({
      id: "craft",
      label: "Uvařit řebříčkovou mast",
      hint: "Mast se sama neuvaří a čaj se sám nezabalí. V dílně (a u ohně) se z louky dělají peníze.",
      speaker: "Maruška",
      emoji: "🛠️",
      done: !!s.flags.made_mast,
      required: false,
      target: "dilna",
    });
  if (stands(s, "stanek"))
    out.push({
      id: "sell",
      label: "Prodat ve stánku",
      hint: "Vejce, vlna, masti. Účetnictví je nudné, ale krmivo se za dobrou náladu nekoupí.",
      speaker: "Tomáš",
      emoji: "🏪",
      done: !!s.flags.sold,
      required: false,
      target: "stanek",
    });
  return out;
}

function eveningSteps(s: GameState): Objective[] {
  const out: Objective[] = [];
  out.push({
    id: "evening_feed",
    label: "Večerní dokrmení",
    hint: "Menší porce, stejné nadšení. Obejdi výběhy a dej všem na noc.",
    speaker: "Tomáš",
    emoji: "🌇",
    done: !!s.tasksDone.evening_feed,
    required: true,
    target: stands(s, "kurnik") ? "kurnik" : undefined,
  });
  out.push({
    id: "closed",
    label: "Zavřít zvířata na noc",
    hint: "Zavři je. Liška má taky svůj rozvrh a nerada čeká před prázdným dvorem.",
    speaker: "Tomáš",
    emoji: "🌙",
    done: !!s.tasksDone.closed,
    required: true,
    target: "chalupa",
  });
  out.push({
    id: "sleep",
    label: "Jít spát do chalupy",
    hint: "Hotovo. Do chalupy a spát — zítra je zase ráno, a to přijde nechutně brzo.",
    speaker: "Tomáš",
    emoji: "🛏️",
    done: false,
    required: true,
    locked: !s.tasksDone.closed,
    target: "chalupa",
  });
  return out;
}

const PHASE_TITLE: Record<Phase, string> = {
  rano: "Ráno — vypustit a nakrmit",
  poledne: "Poledne — práce, les a výroba",
  vecer: "Večer — dokrmit, zavřít, spát",
};

const PHASE_LEAD: Record<Phase, string> = {
  rano: "Sto krků čeká na snídani. Až budou všichni nakrmení, můžeš přejít do poledne.",
  poledne: "Čas na práci: úklid, dřevo, byliny a výroba. Do večera nic z toho není povinné.",
  vecer: "Poslední obchůzka: dokrmit, zavřít před nocí a jít spát — tím začne nový den.",
};

const NEXT_PHASE: Record<Phase, string> = {
  rano: "Poledne",
  poledne: "Večer",
  vecer: "Nový den",
};

/**
 * Plán aktuální fáze dne (nebo tutoriálu). Čte HUD, deník i mapa — a protože
 * se počítá z herního stavu, nikdy se nerozejde s tím, co dovolí reducer.
 */
export function dayPlan(s: GameState): DayPlan {
  const tutorial = tutorialActive(s);
  const steps = tutorial
    ? buildSteps(s)
    : s.phase === "rano"
      ? morningSteps(s)
      : s.phase === "poledne"
        ? noonSteps(s)
        : eveningSteps(s);

  const req = steps.filter((o) => o.required);
  const reqDone = req.filter((o) => o.done).length;
  const next = steps.find((o) => !o.done && o.required && !o.locked)
    ?? steps.find((o) => !o.done && !o.locked)
    ?? null;

  const chapter = tutorial ? TUTORIAL_STEPS[Math.min(s.tutorialStep, TUTORIAL_STEPS.length - 1)] : null;

  return {
    phase: s.phase,
    title: tutorial && chapter ? `Kapitola ${chapter.chapterIndex}/${CHAPTER_COUNT} — ${chapter.chapter}` : PHASE_TITLE[s.phase],
    lead: tutorial
      ? "Postav s Tomášem celé zázemí. Vyber stavbu v panelu dole, klepni na louku a potvrď."
      : PHASE_LEAD[s.phase],
    steps,
    next,
    requiredTotal: req.length,
    requiredDone: reqDone,
    ready: reqDone >= req.length,
    nextPhase: tutorial ? "Život na Louce" : NEXT_PHASE[s.phase],
    tutorial,
  };
}
