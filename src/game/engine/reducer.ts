import type { FeedGroup, GameState, PlayerProfile, Season, Weather } from "../types";
import {
  DAYS_PER_SEASON,
  DONATION_RANGE,
  DONATION_WELFARE_THRESHOLD,
  EGGS_PER_COLLECT,
  HERBS_PER_FORAGE,
  PHASE_HUNGER_DRAIN,
  PHASE_THIRST_DRAIN,
  SEASON_ENERGY,
  SEASON_FOOD_MULT,
  SEASON_ORDER,
  SLEEP_HUNGER_DRAIN,
  SLEEP_THIRST_DRAIN,
  VET_BILL,
  WELFARE_CLEAN_GAIN,
  WELFARE_FEED_GAIN,
  WELFARE_PLAY_GAIN,
  WELFARE_NIGHT_OPEN_PENALTY,
  WELFARE_SICK_THRESHOLD,
  WELFARE_SKIP_FEED_PENALTY,
  WINTER_WOOD_PER_NIGHT,
  WOOL_PER_SHEAR,
  SOCIAL_PLAY_GAIN,
  SOCIAL_PLAY_INSTANT,
  SOCIAL_DECAY,
  SOCIAL_FLOOR,
  COMFORT_LERP,
  BOND_PLAY_GAIN,
  BOND_NEGLECT_DAYS,
  BOND_GENTLE_DECAY,
  BOND_FLOOR,
  MOOD_THRESHOLDS,
} from "../balance";
import { ITEM_BY_ID } from "../content/items";
import { RECIPE_BY_ID } from "../content/recipes";
import { BUILDING_BY_ID } from "../content/buildings";
import { ANIMAL_BY_ID } from "../content/animals";
import { PLAY_KIND, playKindFor } from "../content/play";
import {
  CLEAN_FACTS,
  FACT_BY_ID,
  FORAGE_FACTS,
  NIGHT_FACTS,
  WINTER_FACTS,
} from "../content/facts";
import { initialState } from "./state";
import { newlyUnlocked } from "../achievements";
import { QUEST_LINES } from "../content/quests";
import { CHARACTER_SET, initialAnimalStates } from "../content/characters";
import { layoutComfortFor } from "./comfort";
import { INTERACTABLE_BY_ID, isMovable } from "../../world/entities";
import { TUTORIAL_STEPS, tutorialActive } from "../content/tutorial";
import {
  addLog,
  chance,
  clamp,
  cloneState,
  flash,
  give,
  hasItems,
  invCount,
  learnFact,
  pick,
  pushDialog,
  randInt,
  take,
} from "./util";

export type Action =
  | { type: "START" }
  | { type: "RESET"; profile?: PlayerProfile }
  | { type: "SET_PLAYER_PROFILE"; profile: PlayerProfile }
  | { type: "LOAD"; state: GameState }
  | { type: "RELEASE_BIRDS" }
  | { type: "FEED"; group: FeedGroup }
  | { type: "WATER" }
  | { type: "COLLECT_EGGS" }
  | { type: "SHEAR" }
  | { type: "CLEAN"; group: FeedGroup }
  | { type: "PLAY"; animalId: string }
  | { type: "CHOP_WOOD" }
  | { type: "LIGHT_FIRE" }
  | { type: "FORAGE" }
  | { type: "CRAFT"; recipeId: string }
  | { type: "EAT"; itemId: string }
  | { type: "DRINK"; itemId: string }
  | { type: "BUY"; itemId: string; qty: number }
  | { type: "SELL"; itemId: string; qty: number }
  | { type: "BUILD"; buildingId: string }
  | { type: "BUILD_STRUCTURE"; id: string }
  | { type: "MOVE_STRUCTURE"; id: string; tx: number; ty: number }
  | { type: "EVENING_FEED" }
  | { type: "CLOSE_ANIMALS" }
  | { type: "ADVANCE_PHASE" }
  | { type: "SLEEP" }
  | { type: "PUSH_DIALOG"; speaker?: string; lines: string[] }
  | { type: "DISMISS_DIALOG" }
  | { type: "SET_FLAG"; key: string }
  | { type: "REWARD"; money?: number; energy?: number; items?: { item: string; qty: number }[]; flag?: string }
  | { type: "DISMISS_FLASH" }
  // Liščí příběh přátelství + divocí sousedé (vše bez násilí)
  | { type: "FOX_TRACKS" }
  | { type: "FOX_BOWL" }
  | { type: "FOX_SEEN"; spooked: boolean }
  | { type: "FOX_PET" }
  | { type: "LEAF_PILE" }
  | { type: "WILD_SEEN"; which: "kane" | "jezek" | "srnka" }
  // Plná verze (entitlement)
  | { type: "SET_FULL_VERSION"; full: boolean }
  | { type: "HAY_WORK" } // Práce na seništi — kosení / rozhoz / obracení podle situace
  // Kvíz bylinek — započítání správných odpovědí (pro achievementy)
  | { type: "HERB_QUIZ_RESULT"; correct: number }
  // Developerský (testovací) mód
  | { type: "DEV_UNLOCK" }
  | { type: "DEV_TOGGLE"; key: "godMode" | "turbo" }
  | { type: "DEV_SKIP_PHASE" }
  | { type: "DEV_SKIP_DAY" }
  | { type: "DEV_SKIP_SEASON" }
  | { type: "DEV_RESTOCK" }
  | { type: "DEV_FOX" };

const has = (s: GameState, id: string) => s.buildings.includes(id);

const FEED_LABEL: Record<FeedGroup, string> = {
  drubez: "drůbež",
  prasata: "prasata",
  stado: "stádo",
  mazlici: "psy, kočky a králíky",
};

const CLEAN_PLACE: Record<FeedGroup, string> = {
  drubez: "drůbeže",
  prasata: "prasat",
  stado: "stáda",
  mazlici: "psů a koček",
};

/** Co a kolik daná skupina sežere ráno (škáluje se ročním obdobím). */
function feedPlan(group: FeedGroup, season: Season) {
  const m = SEASON_FOOD_MULT[season];
  switch (group) {
    case "drubez":
      return { item: "krmna_smes", qty: Math.ceil(3 * m) };
    case "prasata":
      return { item: "vareno", qty: Math.ceil(2 * m) };
    case "stado": {
      // jaro/léto = pastva (zdarma), podzim/zima = seno
      const pasture = season === "jaro" || season === "leto";
      return { item: "seno", qty: pasture ? 0 : season === "zima" ? 2 : 1 };
    }
    case "mazlici":
      return { item: "granule", qty: Math.ceil(2 * m) };
  }
}

function feedEnergy(group: FeedGroup, s: GameState) {
  const base: Record<FeedGroup, number> = {
    drubez: 8,
    prasata: 7,
    stado: 10,
    mazlici: 5,
  };
  let e = base[group];
  if (group === "drubez" && has(s, "krmitko")) e -= 5;
  if (group === "stado" && has(s, "vidle")) e -= 3;
  return Math.max(2, e);
}

function notEnoughEnergy(s: GameState, cost: number): boolean {
  if (s.energy < cost) {
    flash(
      s,
      "Jsi vyčerpaný. Najez se, napij — nebo už běž spát a pokračuj zítra.",
      "warn",
    );
    return true;
  }
  return false;
}

function randomWeather(season: Season): Weather {
  const table: Record<Season, Weather[]> = {
    jaro: ["slunecno", "polojasno", "destivo", "mlha"],
    leto: ["slunecno", "vedro", "polojasno", "destivo"],
    podzim: ["mlha", "destivo", "polojasno", "slunecno"],
    zima: ["snezeni", "mraz", "mlha", "polojasno"],
  };
  return pick(table[season]);
}

// ---------------------------------------------------------------------------

export function reducer(state: GameState, action: Action): GameState {
  const next = core(state, action);
  if (next === state) return next;
  // Godmód: hráč je nesmrtelný — přežití má vždy plnou nádrž a nikdy neumře.
  // Aplikuje se centrálně, ať nemusíme hlídat každou akci zvlášť.
  if (next.dev.godMode) {
    next.energy = next.maxEnergy;
    next.hunger = 100;
    next.thirst = 100;
    next.gameOver = null;
  }
  if (
    action.type === "DISMISS_FLASH" ||
    action.type === "DISMISS_DIALOG" ||
    action.type === "PUSH_DIALOG" ||
    action.type === "START" ||
    action.type === "RESET" ||
    action.type === "SET_PLAYER_PROFILE" ||
    action.type === "LOAD" ||
    action.type === "BUILD_STRUCTURE" ||
    action.type === "MOVE_STRUCTURE" ||
    action.type === "DEV_UNLOCK" ||
    action.type === "DEV_TOGGLE" ||
    action.type === "DEV_RESTOCK"
  )
    return next;
  // Survival questy běží až po dokončení úvodního tutoriálu.
  if (!tutorialActive(next)) advanceQuests(next);
  // Achievementy se kontrolují po každé stavové akci (včetně odměn questů).
  checkAchievements(next);
  return next;
}

/** Zapíše nově splněné achievementy do stavu a ohlásí je hráči. */
function checkAchievements(s: GameState) {
  const fresh = newlyUnlocked(s);
  if (!fresh.length) return;
  for (const a of fresh) {
    s.achievements = [...s.achievements, a.id];
    addLog(s, `🏅 Úspěch odemčen: ${a.emoji} ${a.name}`, "good");
  }
  // Toast jen když zrovna neblázní jiná hláška — achievement je i v logu.
  if (!s.flash) {
    const a = fresh[0];
    flash(s, `🏅 Úspěch odemčen: ${a.emoji} ${a.name}`, "good");
  }
}

function advanceQuests(s: GameState) {
  for (const line of QUEST_LINES) {
    if (!line.unlocked(s)) continue;
    let idx = s.questProgress[line.id] ?? 0;
    while (idx < line.quests.length) {
      const q = line.quests[idx];
      if (!q.done(s)) break;
      s.questCompleted.push(q.id);
      idx += 1;
      s.questProgress[line.id] = idx;
      if (q.reward?.money) {
        s.money += q.reward.money;
        s.totalEarned += q.reward.money;
      }
      if (q.reward?.energy) s.energy = clamp(s.energy + q.reward.energy, 0, s.maxEnergy);
      pushDialog(s, q.speaker ?? "Louka", [q.onComplete]);
      addLog(s, `✓ Splněn úkol: ${q.title}`, "good");
    }
  }
  // Zrcadlo pro stará uložení a stávající UI.
  s.questLine = s.questProgress.main ?? 0;
}

function core(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START": {
      const s = cloneState(state);
      s.started = true;
      addLog(s, `Vítej na Louce. Den ${s.day} — ${seasonName(s.season)}.`, "good");
      if (tutorialActive(s)) pushDialog(s, "Tomáš", TUTORIAL_STEPS[s.tutorialStep].intro);
      return s;
    }

    case "RESET": {
      const s = { ...initialState(), started: true };
      if (action.profile) s.profile = action.profile;
      pushDialog(s, "Tomáš", TUTORIAL_STEPS[0].intro);
      return s;
    }

    case "SET_PLAYER_PROFILE": {
      const s = cloneState(state);
      s.profile = action.profile;
      return s;
    }

    case "LOAD":
      return action.state;

    case "DISMISS_FLASH": {
      if (!state.flash) return state;
      const s = cloneState(state);
      s.flash = null;
      return s;
    }

    case "PUSH_DIALOG": {
      const s = cloneState(state);
      pushDialog(s, action.speaker, action.lines);
      return s;
    }

    case "DISMISS_DIALOG": {
      if (!state.dialog) return state;
      const s = cloneState(state);
      const rest = state.dialog.lines.slice(1);
      s.dialog = rest.length ? { speaker: state.dialog.speaker, lines: rest } : null;
      return s;
    }

    case "SET_FLAG": {
      if (state.flags[action.key]) return state;
      const s = cloneState(state);
      s.flags[action.key] = true;
      return s;
    }

    case "REWARD": {
      const s = cloneState(state);
      if (action.money) {
        s.money += action.money;
        if (action.money > 0) s.totalEarned += action.money;
      }
      if (action.energy) s.energy = clamp(s.energy + action.energy, 0, s.maxEnergy);
      if (action.items) for (const it of action.items) give(s, it.item, it.qty);
      if (action.flag) s.flags[action.flag] = true;
      return s;
    }

    case "HERB_QUIZ_RESULT": {
      // Bezpečnost: záporné/nesmyslné hodnoty se ignorují.
      const correct = Math.max(0, Math.floor(action.correct));
      if (correct === 0) return state;
      const s = cloneState(state);
      s.herbQuizCorrect += correct;
      return s;
    }

    case "RELEASE_BIRDS": {
      if (state.phase !== "rano")
        return warnReturn(state, "Drůbež se vypouští ráno.");
      if (state.birdsReleased)
        return warnReturn(state, "Slepice, husy i kachny už pobíhají venku.");
      const s = cloneState(state);
      const cost = 4;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      s.birdsReleased = true;
      s.animalsClosed = false;
      s.tasksDone.release = true;
      addLog(
        s,
        s.flags.night_scare
          ? "Otevřel jsi kurník — a drůbež vystřelila ven jak z praku. Noc byla dlouhá."
          : "Otevřel jsi kurník i výběhy — drůbež se hrne ven na louku.",
        "good",
      );
      flash(s, "Drůbež je venku! Teď ji nakrm. 🐔🦆🪿", "good");
      return s;
    }

    case "FEED": {
      const group = action.group;
      if (state.phase !== "rano")
        return warnReturn(state, "Hlavní krmení je ráno. Večer čeká dokrmení.");
      if (group === "drubez" && !state.birdsReleased)
        return warnReturn(state, "Nejdřív drůbež vypusť z kurníku.");
      if (state.tasksDone[`feed_${group}`])
        return warnReturn(state, `${cap(FEED_LABEL[group])} už máš nakrmené.`);

      const plan = feedPlan(group, state.season);
      const pasture = plan.qty === 0; // stádo na jaře/v létě
      if (!pasture && invCount(state.inventory, plan.item) < plan.qty) {
        const hint =
          group === "prasata"
            ? "Nemáš dost vařeného krmiva — nejdřív navař na ohni."
            : `Došlo ti krmivo: ${ITEM_BY_ID[plan.item].name}. Dokup ho v obchodě.`;
        return warnReturn(state, hint);
      }
      const s = cloneState(state);
      const cost = feedEnergy(group, s);
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      if (!pasture) take(s, [plan]);
      s.tasksDone[`feed_${group}`] = true;
      if (pasture) {
        addLog(s, "Vyhnal jsi stádo na pastvu — spásá čerstvou trávu.", "good");
        flash(s, "Stádo se pase na louce. 🌿 Na jaře a v létě je krmení zdarma!", "good");
      } else {
        addLog(s, `Nakrmil jsi ${FEED_LABEL[group]} (${plan.qty}× ${ITEM_BY_ID[plan.item].name}).`, "good");
        flash(
          s,
          group === "stado"
            ? "Rozdělal jsi balík sena pro stádo. 🟨 (v zimě se pase nedá)"
            : `${cap(FEED_LABEL[group])} spokojeně žere. 😊`,
          "good",
        );
      }
      return s;
    }

    case "WATER": {
      if (state.phase === "vecer")
        return warnReturn(state, "Napájení zvládneš ráno a přes den.");
      if (state.tasksDone.water)
        return warnReturn(state, "Zvířata už mají čerstvou vodu.");
      const s = cloneState(state);
      const free = has(s, "studna");
      const cost = free ? 0 : 5;
      if (!free && invCount(s.inventory, "voda") < 2)
        return warnReturn(state, "Nemáš dost vody. Pořiď studnu, nebo vodu dokup.");
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      if (!free) take(s, [{ item: "voda", qty: 2 }]);
      s.tasksDone.water = true;
      addLog(s, free ? "Načerpal jsi vodu ze studny a napojil zvířata." : "Nanosil jsi vodu a napojil zvířata.", "good");
      return s;
    }

    case "COLLECT_EGGS": {
      if (!state.birdsReleased)
        return warnReturn(state, "Vejce posbíráš až po vypuštění drůbeže.");
      if (state.tasksDone.eggs)
        return warnReturn(state, "Dnešní snůšku už máš v košíku.");
      const s = cloneState(state);
      const cost = 4;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      let eggs = randInt(EGGS_PER_COLLECT.min, EGGS_PER_COLLECT.max);
      if (has(s, "kurnik")) eggs = Math.round(eggs * 1.5);
      if (s.welfare.drubez < 40) eggs = Math.max(1, Math.round(eggs * 0.5));
      // Vyplašená noc (nezavřené výběhy) = poloviční snůška.
      const scared = !!s.flags.night_scare;
      if (scared) eggs = Math.max(1, Math.round(eggs * 0.5));
      give(s, "vejce", eggs);
      s.tasksDone.eggs = true;
      addLog(s, `Sesbíral jsi ${eggs}× vejce. 🥚`, "good");
      flash(s, scared ? `Vyplašené slepice dnes moc nesnesly — jen ${eggs} vajec. Večer zavírej!` : `Dnešní snůška: ${eggs} vajec.`, scared ? "warn" : "good");
      return s;
    }

    case "SHEAR": {
      if (state.phase === "rano")
        return warnReturn(state, "Stříhat půjdeš až přes den, ne hned po ránu.");
      if (state.season === "zima")
        return warnReturn(state, "V zimě se nestříhá — vlna ovce chrání před mrazem!");
      if (state.tasksDone.shear)
        return warnReturn(state, "Dnes už jsi stříhal.");
      const s = cloneState(state);
      const cost = 8;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      let wool = randInt(WOOL_PER_SHEAR.min, WOOL_PER_SHEAR.max);
      if (s.season === "jaro") wool += 1;
      give(s, "vlna", wool);
      s.tasksDone.shear = true;
      addLog(s, `Ostříhal jsi ovce — ${wool}× vlna. 🧶`, "good");
      flash(
        s,
        `Máš ${wool} balíky vlny.`,
        "good",
        learnFact(s, FACT_BY_ID["f_pelichani"]),
      );
      return s;
    }

    case "CLEAN": {
      const group = action.group;
      if (state.tasksDone[`clean_${group}`])
        return warnReturn(state, "Tady už je čisto a sucho.");
      const s = cloneState(state);
      const cost = group === "drubez" ? 7 : 5;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      s.tasksDone[`clean_${group}`] = true;
      s.welfare[group] = clamp(s.welfare[group] + WELFARE_CLEAN_GAIN, 0, 100);
      addLog(s, `Vyhrabal jsi podestýlku — u ${CLEAN_PLACE[group]} je čisto a sucho.`, "good");
      flash(
        s,
        "Čisto a sucho. Zdravější zvířata, míň nemocí. 🧹",
        "good",
        learnFact(s, FACT_BY_ID[pick(CLEAN_FACTS)]),
      );
      return s;
    }

    case "PLAY": {
      const a = ANIMAL_BY_ID[action.animalId];
      if (!a) return state;
      const kind = playKindFor(a);
      if (!kind) return state;
      const s = cloneState(state);
      const cost = 4;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      const def = PLAY_KIND[kind];
      const firstToday = !s.tasksDone[`play_${a.id}`];
      s.tasksDone[`play_${a.id}`] = true;
      if (firstToday) s.welfare[a.feedGroup] = clamp(s.welfare[a.feedGroup] + WELFARE_PLAY_GAIN, 0, 100);
      // Charaktery: okamžitý pocitový skok (bond + finální social se doladí v noci).
      if (s.animals[a.id]) s.animals[a.id].social = clamp(s.animals[a.id].social + SOCIAL_PLAY_INSTANT, 0, 100);
      addLog(s, `Pohrál sis s ${a.name} (${def.verb}).`, "good");
      flash(
        s,
        firstToday ? def.win(a) : `${a.name} si s tebou zase rád(a) pohrál(a). 😊`,
        "good",
        firstToday ? learnFact(s, FACT_BY_ID[def.factId]) : undefined,
      );
      return s;
    }

    case "CHOP_WOOD": {
      const s = cloneState(state);
      const cost = has(s, "sekera") ? 7 : 9;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      let wood = 2 + (has(s, "sekera") ? 1 : 0) + (has(s, "drevnik") ? 1 : 0);
      give(s, "drevo", wood);
      addLog(s, `Naštípal jsi ${wood}× dřevo. 🪵`, "good");
      flash(s, `+${wood} dřevo. Na zimu se hodí každé poleno.`, "good");
      return s;
    }

    case "LIGHT_FIRE": {
      if (state.fireLit)
        return warnReturn(state, "Oheň už hoří.");
      if (invCount(state.inventory, "drevo") < 1)
        return warnReturn(state, "Nemáš dřevo. Naštípej ho, nebo dokup.");
      const s = cloneState(state);
      const cost = 2;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      take(s, [{ item: "drevo", qty: 1 }]);
      s.fireLit = true;
      addLog(s, "Rozdělal jsi oheň. Teď můžeš vařit. 🔥", "good");
      return s;
    }

    case "FORAGE": {
      if (state.phase === "rano")
        return warnReturn(state, "Na byliny vyrazíš až po ranní obsluze.");
      const range = HERBS_PER_FORAGE[state.season];
      const s = cloneState(state);
      const cost = 8;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      const herbs = randInt(range.min, range.max);
      if (herbs <= 0) {
        addLog(s, "Les je pod sněhem — nic kloudného k sebrání.", "warn");
        flash(
          s,
          "V zimě se v lese sotva co najde. Spoléhej na zásoby.",
          "warn",
          learnFact(s, FACT_BY_ID["f_zima_jidlo"]),
        );
        return s;
      }
      give(s, "byliny", herbs);
      // Sezónní bonus: v létě luční květy (na sirup), na podzim šípky (na čaj).
      let bonus = "";
      if (s.season === "leto" && chance(0.35)) {
        const k = randInt(1, 2);
        give(s, "kvety", k);
        bonus = ` A k tomu ${k}× luční květy! 🌼`;
      } else if (s.season === "podzim" && chance(0.35)) {
        const k = randInt(1, 3);
        give(s, "sipek", k);
        bonus = ` A k tomu ${k}× šípky! 🍒`;
      }
      addLog(s, `Nasbíral jsi ${herbs}× byliny v lese. 🌿${bonus}`, "good");
      flash(
        s,
        `Košík plný bylin (+${herbs}).${bonus}`,
        "good",
        learnFact(s, FACT_BY_ID[pick(FORAGE_FACTS)]),
      );
      return s;
    }

    case "CRAFT": {
      const recipe = RECIPE_BY_ID[action.recipeId];
      if (!recipe) return state;
      if (recipe.requiresFire && !state.fireLit)
        return warnReturn(state, `Na "${recipe.name}" potřebuješ rozdělaný oheň.`);
      if (!hasItems(state.inventory, recipe.inputs))
        return warnReturn(state, "Chybí ti suroviny na tenhle recept.");
      const s = cloneState(state);
      if (notEnoughEnergy(s, recipe.energy)) return s;
      s.energy -= recipe.energy;
      take(s, recipe.inputs);
      const usesHerbs = recipe.inputs.some((i) => i.item === "byliny" || i.item === "kvety" || i.item === "sipek");
      const bonus = usesHerbs && has(s, "susarna") ? 1 : 0;
      for (const out of recipe.outputs) give(s, out.item, out.qty + bonus);
      if (recipe.id === "make_salve") s.flags.made_mast = true;
      addLog(s, `Vyrobil jsi: ${recipe.name}.`, "good");
      flash(
        s,
        bonus
          ? `${recipe.name} — sušárna přidala kus navíc! 🌾`
          : `Hotovo: ${recipe.name}.`,
        "good",
        learnFact(s, recipe.fact ? syntheticFact(recipe.id, recipe.name, recipe.fact) : undefined),
      );
      return s;
    }

    case "EAT": {
      const item = ITEM_BY_ID[action.itemId];
      if (!item || item.kind !== "jidlo" || action.itemId === "voda")
        return state;
      if (invCount(state.inventory, action.itemId) < 1)
        return warnReturn(state, `Nemáš ${item.name}.`);
      const s = cloneState(state);
      take(s, [{ item: action.itemId, qty: 1 }]);
      const restore = action.itemId === "polevka" ? 42 : 24;
      const enGain = action.itemId === "polevka" ? 20 : 10; // jídlo dodá i sílu
      s.hunger = clamp(s.hunger + restore, 0, 100);
      s.energy = clamp(s.energy + enGain, 0, s.maxEnergy);
      addLog(s, `Najedl ses (${item.name}). Sytost +${restore}, energie +${enGain}.`, "good");
      return s;
    }

    case "DRINK": {
      const id = action.itemId;
      if (id !== "voda" && id !== "caj") return state;
      if (invCount(state.inventory, id) < 1)
        return warnReturn(state, "Nemáš co pít.");
      const s = cloneState(state);
      take(s, [{ item: id, qty: 1 }]);
      const restore = id === "caj" ? 30 : 22;
      const enGain = id === "caj" ? 8 : 3; // teplý čaj povzbudí víc než studená voda
      s.thirst = clamp(s.thirst + restore, 0, 100);
      s.energy = clamp(s.energy + enGain, 0, s.maxEnergy);
      if (id === "caj") s.hunger = clamp(s.hunger + 4, 0, 100);
      addLog(s, `Napil ses (${ITEM_BY_ID[id].name}). Žízeň +${restore}, energie +${enGain}.`, "good");
      return s;
    }

    case "BUY": {
      const item = ITEM_BY_ID[action.itemId];
      if (!item || item.buyPrice == null) return state;
      const qty = Math.max(1, action.qty);
      let unit = item.buyPrice;
      if (action.itemId === "seno" && has(state, "senik"))
        unit = Math.round(unit * 0.7);
      const total = unit * qty;
      if (state.money < total)
        return warnReturn(state, "Na to teď nemáš peníze.");
      const s = cloneState(state);
      s.money -= total;
      give(s, action.itemId, qty);
      addLog(s, `Koupil jsi ${qty}× ${item.name} za ${total} Kč.`, "info");
      return s;
    }

    case "SELL": {
      const item = ITEM_BY_ID[action.itemId];
      if (!item || item.sellPrice == null) return state;
      const qty = Math.min(Math.max(1, action.qty), invCount(state.inventory, action.itemId));
      if (qty < 1) return warnReturn(state, `Nemáš ${item.name} k prodeji.`);
      const s = cloneState(state);
      const total = item.sellPrice * qty;
      take(s, [{ item: action.itemId, qty }]);
      s.money += total;
      s.totalEarned += total;
      s.flags.sold = true;
      addLog(s, `Prodal jsi ${qty}× ${item.name} za ${total} Kč.`, "good");
      flash(s, `+${total} Kč za ${item.name}. 💰`, "good");
      return s;
    }

    case "BUILD": {
      const b = BUILDING_BY_ID[action.buildingId];
      if (!b) return state;
      if (has(state, action.buildingId))
        return warnReturn(state, "Tohle už máš.");
      if (state.money < b.cost)
        return warnReturn(state, `Na ${b.name} ti chybí peníze.`);
      const s = cloneState(state);
      s.money -= b.cost;
      s.buildings.push(action.buildingId);
      addLog(s, `Pořídil jsi: ${b.name} ${b.emoji} (−${b.cost} Kč).`, "good");
      flash(s, `${b.name} hotovo! ${b.benefit}`, "good");
      return s;
    }

    case "BUILD_STRUCTURE": {
      if (!tutorialActive(state)) return state;
      const step = TUTORIAL_STEPS[state.tutorialStep];
      if (action.id !== step.buildingId) return state;
      if (state.built.includes(action.id)) return state;
      const s = cloneState(state);
      s.built.push(action.id);
      s.tutorialStep += 1;
      addLog(s, `Postavil jsi: ${step.buildLabel}. 🔨`, "good");
      if (s.tutorialStep < TUTORIAL_STEPS.length) {
        // Pochvala + uvedení další stavby.
        const nextStep = TUTORIAL_STEPS[s.tutorialStep];
        pushDialog(s, "Tomáš", [...step.done, ...nextStep.intro]);
      } else {
        // Poslední stavba — Louka je hotová, začíná survival.
        pushDialog(s, "Tomáš", step.done);
        s.day = 1;
        s.dayInSeason = 1;
        s.phase = "rano";
        s.maxEnergy = SEASON_ENERGY[s.season];
        s.energy = SEASON_ENERGY[s.season];
        s.questLine = 0;
        s.questProgress.main = 0;
        s.flags.tutorial_done = true;
        flash(s, "Louka je postavená! Teď začíná to hlavní — přežít. 🌱", "good");
      }
      return s;
    }

    case "MOVE_STRUCTURE": {
      // Přemístit smíš jen po tutoriálu, jen povolené a už postavené stavby.
      if (tutorialActive(state)) return state;
      if (!isMovable(action.id) || !state.built.includes(action.id)) return state;
      const s = cloneState(state);
      s.placements = { ...s.placements, [action.id]: { tx: action.tx, ty: action.ty } };
      addLog(s, `Přemístil jsi: ${INTERACTABLE_BY_ID[action.id]?.label ?? action.id}. 🪧`, "good");
      return s;
    }

    case "EVENING_FEED": {
      if (state.phase !== "vecer")
        return warnReturn(state, "Večerní krmení patří až k večeru.");
      if (state.tasksDone.evening_feed)
        return warnReturn(state, "Večeři už mají všichni za sebou.");
      // lehké dokrmení: drůbež, prasata, mazlíci (stádo dojídá denní balík)
      const needs = [
        { item: "krmna_smes", qty: 1 },
        { item: "vareno", qty: 1 },
        { item: "granule", qty: 1 },
      ];
      const missing = needs.filter((n) => invCount(state.inventory, n.item) < n.qty);
      if (missing.length)
        return warnReturn(
          state,
          `Na večeři chybí: ${missing.map((m) => ITEM_BY_ID[m.item].name).join(", ")}.`,
        );
      const s = cloneState(state);
      const cost = 9;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      take(s, needs);
      s.tasksDone.evening_feed = true;
      (["drubez", "prasata", "mazlici"] as FeedGroup[]).forEach((g) => {
        s.welfare[g] = clamp(s.welfare[g] + 8, 0, 100);
      });
      addLog(s, "Večerní obhlídka a dokrmení hotové.", "good");
      flash(s, "Zvířata jsou nakrmená na noc. Zbývá je zavřít.", "good");
      return s;
    }

    case "CLOSE_ANIMALS": {
      if (state.phase !== "vecer")
        return warnReturn(state, "Zavírá se až večer, než půjdeš spát.");
      if (state.animalsClosed && !state.birdsReleased)
        return warnReturn(state, "Všechno už je zavřené.");
      const s = cloneState(state);
      const cost = 4;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      s.animalsClosed = true;
      s.birdsReleased = false;
      s.tasksDone.closed = true;
      addLog(s, "Zavřel jsi drůbež i ostatní do bezpečí před nocí. 🚪", "good");
      flash(
        s,
        "Všichni v suchu a klidu — les může šustit, jak chce. 🌙",
        "good",
        learnFact(s, FACT_BY_ID[pick(NIGHT_FACTS)]),
      );
      return s;
    }

    case "ADVANCE_PHASE": {
      if (state.phase === "vecer")
        return warnReturn(state, "Večer končí spánkem — zmáčkni Jít spát.");
      const s = cloneState(state);
      if (state.phase === "rano") {
        const unfed = (["drubez", "prasata", "stado", "mazlici"] as FeedGroup[]).filter(
          (g) => !s.tasksDone[`feed_${g}`],
        );
        if (unfed.length)
          flash(
            s,
            `Ráno končí, a ještě jsi nenakrmil: ${unfed.map((g) => FEED_LABEL[g]).join(", ")}. Spokojenost klesne.`,
            "warn",
          );
        s.phase = "poledne";
        addLog(s, "Nastalo poledne — čas na práci, vaření a les.", "info");
        // Letní návštěva káněte: bez úkrytu drůbež zpanikaří (jen stres,
        // nikdo nepřijde k úhoně) — s keři a sítí je z káněte klidný soused.
        if (s.season === "leto" && !tutorialActive(s) && chance(0.3)) {
          if (has(s, "kryty_vybeh")) {
            s.tasksDone.kane_perch = true;
            addLog(s, "Nad loukou krouží káně — drůbež jen zalezla pod keře a hrabe dál. Káně si sedlo na kůl u výběhu.", "info");
          } else {
            s.tasksDone.kane_circle = true;
            s.flags.kane_seen = true;
            s.welfare.drubez = clamp(s.welfare.drubez - 6, 0, 100);
            flash(s, "Nad výběhem krouží káně — drůbež zpanikařila a schovává se! Chtělo by to úkryt: keře a síť.", "warn");
          }
        }
      } else {
        s.phase = "vecer";
        addLog(s, "Slunce zapadá. Čas na večerní krmení a zavření.", "info");
        // Tomáš večer hlásí předpověď, když je venku seno.
        if (s.hay && s.hay.drying > 0 && s.weatherTomorrow === "destivo") {
          pushDialog(s, "Tomáš", ["Cítím to v kolenou — zítra bude pršet! Seno na seništi zmokne. Jsi s tím smířený?"]);
        }
        // První podzimní večer: v listí u zahrádky někdo funí…
        if (s.season === "podzim" && !s.flags.jezek_intro && !tutorialActive(s)) {
          s.flags.jezek_intro = true;
          pushDialog(s, "Louka", [
            "V listí u zahrádky něco šustí a důležitě funí… Ježek!",
            "Prohlédni si hromadu listí u zahrádky — třeba by se mu tam líbilo bydlet. 🦔",
          ]);
        }
      }
      s.hunger = clamp(s.hunger - PHASE_HUNGER_DRAIN, 0, 100);
      s.thirst = clamp(s.thirst - PHASE_THIRST_DRAIN, 0, 100);
      maybeSurvivalWarn(s);
      return s;
    }

    case "SLEEP":
      return resolveSleep(state);

    // -----------------------------------------------------------------------
    // Plná verze (entitlement)

    case "SET_FULL_VERSION": {
      if (state.fullVersion === action.full) return state;
      const s = cloneState(state);
      s.fullVersion = action.full;
      return s;
    }

    // Jedna akce na seništi — reducer sám pozná, co je na řadě
    // (obracení → rozhoz → kosení), ať je ovládání jedním tlačítkem.
    case "HAY_WORK": {
      const s = cloneState(state);
      const kosa = has(s, "kosa");

      // 1) obracení rozloženého sena (poledne)
      if (s.hay && !s.hay.turnedToday && s.phase === "poledne") {
        if (notEnoughEnergy(s, 5)) return s;
        s.energy -= 5;
        s.hay.turnedToday = true;
        addLog(s, "Obrátil jsi seno — schne z obou stran. 🌾", "good");
        flash(s, "Seno obráceno. Obrácené seno schne za den, neobrácené za dva.", "good", learnFact(s, FACT_BY_ID["f_kopky"]));
        return s;
      }

      // 2) rozhoz trávy (nebo zavlhlého sena) na sušení
      const trava = invCount(s.inventory, "pokosena_trava");
      const mokre = invCount(s.inventory, "mokre_seno");
      if (trava + mokre >= 4) {
        if (notEnoughEnergy(s, 6)) return s;
        s.energy -= 6;
        if (trava) take(s, [{ item: "pokosena_trava", qty: trava }]);
        if (mokre) take(s, [{ item: "mokre_seno", qty: mokre }]);
        const total = trava + mokre;
        s.hay = { drying: (s.hay?.drying ?? 0) + total, driedDays: s.hay?.driedDays ?? 0, turnedToday: s.hay?.turnedToday ?? false };
        addLog(s, `Rozhodil jsi ${total}× trávy na sušení. Teď je to závod s nebem.`, "good");
        const rainTomorrow = s.weatherTomorrow === "destivo";
        flash(
          s,
          rainTomorrow
            ? "Rozhozeno! Ale Tomáš větří déšť… zítra to může zmoknout. 🌧️"
            : "Rozhozeno! Sluníčko, dělej svou práci. ☀️",
          rainTomorrow ? "warn" : "good",
        );
        return s;
      }

      // 3) kosení (ráno/poledne, ne v dešti)
      if (s.phase === "vecer")
        return warnReturn(state, "Za rosy nebo přes den — večer se nekosí, večer se vypráví.");
      if (s.weather === "destivo")
        return warnReturn(state, "V dešti kosit nemá smysl — mokrá tráva by rovnou plesnivěla.");
      if (s.season !== "leto")
        return warnReturn(state, "Tráva na seno se kosí v létě. Teď by toho moc nenarostlo.");
      const cost = kosa ? 9 : 14;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      const cut = randInt(3, 5) + (kosa ? 2 : 0);
      give(s, "pokosena_trava", cut);
      addLog(s, `Pokosil jsi kus seniště — ${cut}× tráva. 🌱`, "good");
      if (!s.flags.seno_prvni_kosa) {
        s.flags.seno_prvni_kosa = true;
        pushDialog(s, "Tomáš", [
          "Kosa se drží takhle. Ne, takhle. … Dobře, hlavně si nekosej tkaničky.",
          "Aspoň 4 hrsti trávy rozhoď na sušení. A modli se, ať neprší — mokré seno je zlo.",
        ]);
      } else {
        flash(s, `+${cut}× pokosená tráva. Nasbírej aspoň 4 a rozhoď je na sušení.`, "good");
      }
      return s;
    }

    // -----------------------------------------------------------------------
    // Liščí příběh přátelství — trpělivost a respekt, žádné násilí.

    case "FOX_TRACKS": {
      if (state.fox.stage !== "stopy")
        return state.flags.fox_tracks_seen
          ? warnReturn(state, "Stopy už znáš. Liška tudy chodí každou noc.")
          : state;
      const s = cloneState(state);
      s.flags.fox_tracks_seen = true;
      s.fox.stage = "pozorovani";
      addLog(s, "Prohlédl sis liščí stopy u kraje lesa. 🦊", "info");
      pushDialog(s, "Tomáš", [
        "Jo, to je liška. Chodí sem každou noc na obhlídku — zvědavost, ne nebezpečí.",
        "Jestli ji chceš vidět, zkus to večer u kraje lesa. Ale pomalu a potichu — když se poženeš, zmizí.",
      ]);
      return s;
    }

    case "FOX_SEEN": {
      const s = cloneState(state);
      if (action.spooked) {
        if (s.flags.fox_spooked_today) return state;
        s.flags.fox_spooked_today = true;
        addLog(s, "Přiběhl jsi moc rychle — liška zmizela mezi stromy.", "warn");
        pushDialog(s, "Louka", [
          "Šmik — a je pryč. Divoké zvíře se nehoní.",
          "Ponaučení na zítřek: přibliž se pomalu, zastav se a nech ji přijít blíž. 🦊",
        ]);
        return s;
      }
      if (s.fox.stage === "pozorovani") {
        s.fox.stage = "krmeni";
        s.flags.fox_seen = true;
        addLog(s, "Vydržel jsi stát bez hnutí — a liška tě sledovala zpovzdálí. 🦊", "good");
        pushDialog(s, "Louka", [
          "Sedí na kraji lesa a pozoruje tě. Nezaútočí — jen zkoumá, kdo jsi.",
          "Když se neženeš, přijde blíž. Zkus jí večer nechat misku s jídlem u krmného místa.",
        ]);
      } else {
        s.flags.fox_seen = true;
        pushDialog(s, "Louka", ["Liška tě pozoruje zpovzdálí. Každý večer o kousek blíž. 🦊"]);
      }
      return s;
    }

    case "FOX_BOWL": {
      if (state.phase !== "vecer")
        return warnReturn(state, "Liška chodí až za soumraku — misku jí nech večer.");
      if (state.fox.stage === "les" || state.fox.stage === "stopy" || state.fox.stage === "pozorovani")
        return warnReturn(state, "Nejdřív lišku vyhlédni — zatím by k misce nepřišla.");
      if (state.tasksDone.fox_bowl)
        return warnReturn(state, "Miska u lesa už je plná. Teď je to na lišce.");
      const s = cloneState(state);
      const food = invCount(s.inventory, "vareno") > 0 ? "vareno" : invCount(s.inventory, "krmna_smes") > 0 ? "krmna_smes" : null;
      if (!food)
        return warnReturn(state, "Nemáš, co bys do misky dal — hodí se vařené krmivo nebo krmná směs.");
      if (notEnoughEnergy(s, 3)) return s;
      s.energy -= 3;
      take(s, [{ item: food, qty: 1 }]);
      s.tasksDone.fox_bowl = true;
      addLog(s, "Nechal jsi lišce misku na kraji lesa. Teď je to na ní.", "good");
      flash(s, "Miska čeká u lesa. Divoké zvíře se krmí na jeho hranici — ne z ruky. 🦊", "good");
      return s;
    }

    case "FOX_PET": {
      if (state.fox.stage !== "kamarad")
        return warnReturn(state, "Liška se zatím pohladit nenechá. Důvěra chce čas.");
      if (state.tasksDone.fox_pet)
        return warnReturn(state, "Dnes už se s tebou liška pomazlila — teď zase obchází svůj revír.");
      const s = cloneState(state);
      s.tasksDone.fox_pet = true;
      s.flags.fox_petted = true;
      s.energy = clamp(s.energy + 6, 0, s.maxEnergy);
      if (chance(0.3)) {
        give(s, "drevo", 1);
        pushDialog(s, "Liška", [
          "Liška se ti otřela o nohu, zavrněla — a položila ti k botě napůl ohlodanou šišku.",
          "Dar je dar. (Do ohniště se počítá. +1 dřevo 🪵)",
        ]);
      } else {
        pushDialog(s, "Liška", ["Liška se ti stočila u nohou a nechala se podrbat za ušima. Hřeje to víc než oheň. 🦊💚"]);
      }
      addLog(s, "Pomazlil ses s liškou. Trpělivost a respekt otevřou i liščí srdce.", "good");
      learnFact(s, FACT_BY_ID["f_liska_duvera"]);
      return s;
    }

    case "LEAF_PILE": {
      if (state.flags.jezek_domek)
        return warnReturn(state, "Ježčí palác z listí už stojí. Nájemník spokojeně funí.");
      if (state.season !== "podzim")
        return warnReturn(state, "Na ježčí domek je potřeba spadané listí — počkej na podzim.");
      const s = cloneState(state);
      if (notEnoughEnergy(s, 5)) return s;
      s.energy -= 5;
      s.flags.jezek_domek = true;
      addLog(s, "Nahrabal jsi ježkovi palác z listí u zahrádky. 🍂", "good");
      pushDialog(s, "Louka", [
        "Hromada listí u zahrádky = ježčí vila se vším komfortem.",
        "Ježek se nastěhoval hned — a slimáky ti teď hlídá jako profík. 🦔",
      ]);
      learnFact(s, FACT_BY_ID["f_jezek_mleko"]);
      return s;
    }

    case "WILD_SEEN": {
      if (state.tasksDone[`wild_${action.which}`]) return state;
      const s = cloneState(state);
      s.tasksDone[`wild_${action.which}`] = true;
      s.wildSeen[action.which] = (s.wildSeen[action.which] ?? 0) + 1;
      if (action.which === "kane") {
        pushDialog(s, "Káně", [
          "Káně sedí na kůlu a měří si tě žlutým okem. Drůbež v klidu hrabe pod keři.",
          "Není to nepřítel — je to nejpilnější lovec hrabošů na louce. 🪶",
        ]);
        learnFact(s, FACT_BY_ID["f_kane"]);
      } else if (action.which === "jezek") {
        pushDialog(s, "Ježek", [
          "Funí, šustí a tváří se strašně důležitě. Nesahej — bodá to.",
          "Ale slimáky ze zahrádky luxuje spolehlivěji než cokoli jiného. 🦔",
        ]);
        learnFact(s, FACT_BY_ID["f_jezek_mleko"]);
      } else {
        const n = s.wildSeen.srnka ?? 1;
        if (n === 1) {
          pushDialog(s, "Srnka", ["Na kraji louky ztuhla srnka a dívá se přímo na tebe…", "Nehýbej se moc — testuje, jestli jsi nebezpečí. Pak zase v klidu spásá."]);
          learnFact(s, FACT_BY_ID["f_srnec"]);
        } else if (n >= 3) {
          learnFact(s, FACT_BY_ID["f_srnka_krmeni"]);
          addLog(s, "Srnka už tě zná — dnes se ani nelekla. 🦌", "good");
        } else {
          addLog(s, "Srnka tě chvíli pozorovala a pak klidně odběhla. 🦌", "info");
        }
      }
      return s;
    }

    // -----------------------------------------------------------------------
    // Developerský (testovací) mód — skrytý, aktivuje se z UI.

    case "DEV_UNLOCK": {
      if (state.dev.enabled) return state;
      const s = cloneState(state);
      s.dev = { ...s.dev, enabled: true };
      addLog(s, "🛠️ Developerský mód odemčen.", "info");
      flash(s, "🛠️ Developerský mód odemčen. Panel máš vpravo dole.", "good");
      return s;
    }

    case "DEV_TOGGLE": {
      if (!state.dev.enabled) return state;
      const s = cloneState(state);
      const on = !s.dev[action.key];
      s.dev = { ...s.dev, [action.key]: on };
      if (action.key === "godMode" && on) {
        s.energy = s.maxEnergy;
        s.hunger = 100;
        s.thirst = 100;
        s.gameOver = null;
      }
      const label = action.key === "godMode" ? "Godmód (nesmrtelnost)" : "Turbo pohyb";
      flash(s, `🛠️ ${label}: ${on ? "ZAP" : "VYP"}.`, "info");
      return s;
    }

    case "DEV_SKIP_PHASE": {
      if (!state.dev.enabled) return state;
      if (state.phase === "vecer") return devAdvanceDays(state, 1);
      const s = cloneState(state);
      s.phase = state.phase === "rano" ? "poledne" : "vecer";
      addLog(s, `⏩ [dev] Přeskok na fázi: ${phaseName(s.phase)}.`, "info");
      flash(s, `⏩ Fáze: ${phaseName(s.phase)}.`, "info");
      return s;
    }

    case "DEV_SKIP_DAY": {
      if (!state.dev.enabled) return state;
      return devAdvanceDays(state, 1);
    }

    case "DEV_SKIP_SEASON": {
      if (!state.dev.enabled) return state;
      // Kolik dní zbývá do prvního dne dalšího období.
      const toNext = DAYS_PER_SEASON - state.dayInSeason + 1;
      return devAdvanceDays(state, toNext);
    }

    case "DEV_FOX": {
      if (!state.dev.enabled) return state;
      const s = cloneState(state);
      const f = s.fox;
      if (f.stage === "les") { f.stage = "stopy"; }
      else if (f.stage === "stopy") { f.stage = "pozorovani"; s.flags.fox_tracks_seen = true; }
      else if (f.stage === "pozorovani") { f.stage = "krmeni"; s.flags.fox_seen = true; }
      else {
        f.trust = clamp(f.trust + 30, 0, 100);
        f.bowlCount += 1;
        if (f.stage === "krmeni" && f.trust >= 60) f.stage = "duvera";
        else if (f.stage === "duvera" && f.trust >= 90) f.stage = "kamarad";
      }
      flash(s, `🛠️ [dev] Liška: ${f.stage}, důvěra ${f.trust}, misek ${f.bowlCount}.`, "info");
      return s;
    }

    case "DEV_RESTOCK": {
      if (!state.dev.enabled) return state;
      const s = cloneState(state);
      s.money += 5000;
      s.totalEarned += 5000;
      s.energy = s.maxEnergy;
      s.hunger = 100;
      s.thirst = 100;
      for (const [id, qty] of Object.entries(DEV_RESTOCK_KIT)) {
        s.inventory[id] = Math.max(s.inventory[id] ?? 0, qty);
      }
      // Charaktery na maximum — pro rychlou vizuální kontrolu nálady/přátelství.
      for (const id of CHARACTER_SET) {
        const st = s.animals[id];
        if (st) { st.bond = 100; st.social = 100; st.comfort = 100; st.mood = "radostny"; }
      }
      addLog(s, "🛠️ [dev] Doplněny zásoby, peníze a energie.", "info");
      flash(s, "🛠️ Zásoby, +5000 Kč a plná energie doplněny.", "good");
      return s;
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Developerský mód — pomocné

/** Testovací sada zásob pro rychlé vyzkoušení všech interakcí. */
const DEV_RESTOCK_KIT: Record<string, number> = {
  krmna_smes: 20,
  seno: 20,
  granule: 20,
  vareno: 20,
  zelenina: 20,
  brambory: 20,
  obili: 20,
  kukurice: 20,
  drevo: 30,
  voda: 30,
  chleba: 10,
  tuk: 10,
  sklenice: 10,
  byliny: 20,
};

function phaseName(p: GameState["phase"]): string {
  return { rano: "ráno", poledne: "poledne", vecer: "večer" }[p];
}

/**
 * Rychlý posun o `days` dní bez survival dopadů (bez lišky, veterináře, mrazu).
 * Slouží k proletění hry a všech ročních období při testování.
 */
function devAdvanceDays(state: GameState, days: number): GameState {
  const s = cloneState(state);
  const n = Math.max(1, days);
  for (let i = 0; i < n; i++) {
    s.day += 1;
    s.daysSurvived += 1;
    s.dayInSeason += 1;
    if (s.dayInSeason > DAYS_PER_SEASON) {
      s.dayInSeason = 1;
      const idx = SEASON_ORDER.indexOf(s.season);
      const next = SEASON_ORDER[(idx + 1) % SEASON_ORDER.length];
      s.season = next;
      if (next === "jaro") s.year += 1;
    }
  }
  // Reset dne jako po spánku, ale bez postihů.
  s.phase = "rano";
  s.maxEnergy = SEASON_ENERGY[s.season];
  s.energy = SEASON_ENERGY[s.season];
  s.birdsReleased = false;
  s.animalsClosed = true;
  s.fireLit = false;
  s.tasksDone = {};
  advanceAnimalMoods(s); // ať i rychlý přeskok postárne nálady (pozorování jemného úbytku)
  s.weather = s.weatherTomorrow ?? randomWeather(s.season);
  s.weatherTomorrow = randomWeather(s.season);
  addLog(s, `⏩ [dev] Přeskok na den ${s.day} — ${seasonName(s.season)}.`, "info");
  flash(s, `⏩ Den ${s.day} — ${seasonName(s.season)}, ${weatherName(s.weather)}.`, "good");
  return s;
}

// ---------------------------------------------------------------------------
// Pomocné

function warnReturn(state: GameState, msg: string): GameState {
  const s = cloneState(state);
  flash(s, msg, "warn");
  return s;
}

function cap(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function seasonName(season: Season): string {
  return { jaro: "jaro", leto: "léto", podzim: "podzim", zima: "zima" }[season];
}

function syntheticFact(id: string, title: string, text: string) {
  return { id: `recept_${id}`, category: "byliny" as const, title, text };
}

function maybeSurvivalWarn(s: GameState) {
  if (s.hunger <= 20 && s.thirst <= 20)
    flash(s, "Máš hlad i žízeň. Najez se a napij, ať máš zítra sílu!", "warn");
  else if (s.hunger <= 15)
    flash(s, "Kručí ti v břiše — najez se.", "warn");
  else if (s.thirst <= 15)
    flash(s, "Vyschlo ti v krku — napij se.", "warn");
}

function resolveSleep(state: GameState): GameState {
  if (state.phase !== "vecer")
    return warnReturn(state, "Spát se chodí až večer.");
  const s = cloneState(state);
  const groups: FeedGroup[] = ["drubez", "prasata", "stado", "mazlici"];

  // 1) Spokojenost podle ranního krmení + večerního dokrmení.
  for (const g of groups) {
    const fed = !!s.tasksDone[`feed_${g}`];
    s.welfare[g] += fed ? WELFARE_FEED_GAIN : -WELFARE_SKIP_FEED_PENALTY;
    s.welfare[g] += s.tasksDone.evening_feed ? 4 : -6;
    s.welfare[g] = clamp(s.welfare[g], 0, 100);
  }

  // 2) Noc bez zavření = vyplašená zvířata. Nikdo nikdy nezmizí — liška tu
  //    nikomu neubližuje. Ale drůbež z nočního šustění nespí, stresuje se
  //    a ráno je z toho chaos (méně vajec). Postih je stres, ne ztráta.
  if (!s.tasksDone.closed) {
    for (const g of groups) s.welfare[g] = clamp(s.welfare[g] - WELFARE_NIGHT_OPEN_PENALTY, 0, 100);
    s.flags.night_scare = true;
    if (chance(0.6)) {
      s.fox.sightings += 1;
      addLog(s, "V noci se kolem otevřených výběhů mihla liška. Nikomu neublížila — ale drůbež má peří naježené ještě teď.", "warn");
      learnFact(s, FACT_BY_ID["f_liska"]);
    } else {
      addLog(s, "Nechal jsi otevřeno. Zvířata špatně spala — venku celou noc šustil les.", "warn");
    }
  } else {
    delete s.flags.night_scare;
  }

  // 2b) Liščí příběh — miska, důvěra a posun přátelství.
  advanceFoxStory(s);

  // 2d) Charaktery Louky — nálada, potřeby a přátelství vybraných zvířat.
  advanceAnimalMoods(s);

  // 2c) Co udělá noc (a dnešní počasí) se sušícím se senem na seništi.
  if (s.hay && s.hay.drying > 0) {
    if (s.weather === "destivo") {
      give(s, "mokre_seno", s.hay.drying);
      addLog(s, `Déšť! Sušící se seno zmoklo (${s.hay.drying}×). Rozhoď ho znovu, jinak zplesniví.`, "bad");
      learnFact(s, FACT_BY_ID["f_mokre_seno"]);
      s.hay = null;
    } else {
      s.hay.driedDays += s.hay.turnedToday ? 1 : 0.5;
      s.hay.turnedToday = false;
      if (s.hay.driedDays >= 2) {
        const bales = Math.max(1, Math.floor(s.hay.drying / 4));
        give(s, "seno", bales);
        s.flags.seno_ususeno = true;
        addLog(s, `Seno je suché a voní létem — ${bales}× balík! 🌾`, "good");
        learnFact(s, FACT_BY_ID["f_otava"]);
        s.hay = null;
      } else {
        addLog(s, "Seno na seništi schne… ještě to chce den. Nezapomeň ho v poledne obracet.", "info");
      }
    }
  }

  // 3) Zima: topení dřevem.
  if (s.season === "zima") {
    const need = has(s, "drevnik") ? WINTER_WOOD_PER_NIGHT - 1 : WINTER_WOOD_PER_NIGHT;
    if (invCount(s.inventory, "drevo") >= need) {
      give(s, "drevo", -need);
      addLog(s, `Přitopil jsi (−${need} dřevo). V chlívcích bylo teplo.`, "info");
    } else {
      for (const g of groups) s.welfare[g] = clamp(s.welfare[g] - 12, 0, 100);
      s.hunger = clamp(s.hunger - 10, 0, 100);
      addLog(s, "Došlo dřevo a v noci mrzlo. Zvířata i ty jste se klepali zimou.", "bad");
      learnFact(s, FACT_BY_ID[pick(WINTER_FACTS)]);
    }
  }

  // 4) Nemoc a veterinář u zanedbaných skupin.
  let vetTotal = 0;
  for (const g of groups) {
    if (s.welfare[g] < WELFARE_SICK_THRESHOLD && chance(0.6)) {
      const bill = randInt(VET_BILL.min, VET_BILL.max);
      vetTotal += bill;
      s.welfare[g] = clamp(s.welfare[g] + 18, 0, 100);
    }
  }
  if (vetTotal > 0) {
    s.money -= vetTotal;
    addLog(s, `Veterinář musel ošetřit nemocná zvířata: −${vetTotal} Kč.`, "bad");
  }

  // 5) Dary při vysoké spokojenosti (azyl žije z podpory).
  const avg = (s.welfare.drubez + s.welfare.prasata + s.welfare.stado + s.welfare.mazlici) / 4;
  if (avg >= DONATION_WELFARE_THRESHOLD) {
    const gift = randInt(DONATION_RANGE.min, DONATION_RANGE.max);
    s.money += gift;
    s.totalEarned += gift;
    addLog(s, `Spokojená zvířata = spokojení příznivci. Dorazil dar: +${gift} Kč. ❤️`, "good");
  }

  // 6) Úbytek sytosti/žízně přes noc.
  s.hunger = clamp(s.hunger - SLEEP_HUNGER_DRAIN, 0, 100);
  s.thirst = clamp(s.thirst - SLEEP_THIRST_DRAIN, 0, 100);

  // 7) Posun dne a období.
  s.day += 1;
  s.daysSurvived += 1;
  s.dayInSeason += 1;
  if (s.dayInSeason > DAYS_PER_SEASON) {
    s.dayInSeason = 1;
    const idx = SEASON_ORDER.indexOf(s.season);
    const next = SEASON_ORDER[(idx + 1) % SEASON_ORDER.length];
    s.season = next;
    if (next === "jaro") s.year += 1;
    addLog(s, `Nastalo nové období: ${seasonName(next)}.`, "info");
  }

  // 8) Reset dne.
  s.phase = "rano";
  let nextEnergy = SEASON_ENERGY[s.season];
  if (s.hunger <= 0 || s.thirst <= 0) {
    nextEnergy -= 25;
    addLog(s, "Hlad a žízeň tě vyčerpaly — ráno máš míň sil.", "warn");
  }
  s.maxEnergy = SEASON_ENERGY[s.season];
  s.energy = Math.max(30, nextEnergy);
  s.birdsReleased = false;
  s.animalsClosed = true;
  s.fireLit = false;
  s.tasksDone = {};
  // Počasí: dnešek přebírá včerejší předpověď, nová předpověď na zítřek.
  s.weather = s.weatherTomorrow ?? randomWeather(s.season);
  s.weatherTomorrow = randomWeather(s.season);

  // 9) Permakulturní zahrada — ranní úroda zdarma.
  if (has(s, "zahrada")) {
    give(s, "zelenina", 2);
    give(s, "brambory", 2);
    // Ježčí nájemník hlídá slimáky — občas bonus navíc.
    if (s.flags.jezek_domek && chance(0.5)) {
      give(s, "zelenina", 1);
      addLog(s, "Ježek v noci vyluxoval slimáky — zahrádka je jak ze škatulky. +1 zelenina 🦔", "good");
    }
  }

  // 10) Jaro — mláďata (víc krků k nakrmení = větší výzva).
  if (s.season === "jaro" && s.dayInSeason >= 2 && chance(0.5)) {
    const chicks = randInt(2, 5);
    s.population.drubez += chicks;
    addLog(s, `Na jaře se vylíhlo ${chicks} kuřátek! Přibyly krky k nakrmení.`, "good");
  }

  // 11) Bankrot = konec.
  if (s.money < -400) {
    s.gameOver = "Azyl se zadlužil a musel skončit. Hlídej rozpočet i spokojenost zvířat — a zkus to znovu.";
    addLog(s, "Azyl zkrachoval.", "bad");
    return s;
  }

  flash(
    s,
    `Nový den! Den ${s.day} — ${seasonName(s.season)}, ${weatherName(s.weather)}.`,
    "good",
  );
  addLog(s, `Ráno dne ${s.day}. ${seasonName(s.season)}, ${weatherName(s.weather)}.`, "info");
  return s;
}

/**
 * Liščí příběh — vyhodnocuje se přes noc (před resetem tasksDone).
 * Důvěra roste jen krmením a NIKDY neklesá: trpělivost, ne trest.
 */
function advanceFoxStory(s: GameState) {
  const fox = s.fox;
  if (s.tasksDone.fox_bowl) {
    fox.bowlCount += 1;
    const gain = s.flags.fox_spooked_today ? 4 : randInt(8, 12);
    fox.trust = clamp(fox.trust + gain, 0, 100);
    addLog(s, "Miska u lesa je ráno vylízaná dočista. Kolem — drobné liščí tlapky. 🦊", "good");
    if (s.flags.fox_spooked_today)
      addLog(s, "Po večerním úleku přišla liška až po půlnoci. Důvěra roste pomaleji — ale roste.", "info");
  }
  delete s.flags.fox_spooked_today;

  if (fox.stage === "les" && s.day >= 3) {
    fox.stage = "stopy";
    addLog(s, "V rose u kraje lesa se objevil řádek drobných stop…", "info");
    pushDialog(s, "Tomáš", [
      "Vidíš ty stopy u lesa? Liška. Chodí sem každou noc na obhlídku.",
      "Neboj — když večer zavíráš, nikomu nic neudělá. Jdi si ty stopy prohlédnout, ať víš, s kým máš tu čest.",
    ]);
  } else if (fox.stage === "krmeni" && fox.trust >= 60) {
    fox.stage = "duvera";
    pushDialog(s, "Louka", [
      "Liška dnes večeřela, i když jsi stál kousek od misky. Dívala se ti do očí — a neutekla.",
      "To je důvěra. U divokého zvířete vzácnější než zlato. 🦊",
    ]);
  } else if (fox.stage === "duvera" && fox.trust >= 90) {
    fox.stage = "kamarad";
    pushDialog(s, "Louka", [
      "Ráno na tebe u pěšiny čeká zrzavá kamarádka. Ocas jako kartáč, oči jako knoflíky.",
      "Louka má novou návštěvnici — a ty přítelkyni z lesa. Zajdi ji pohladit. 🦊💚",
    ]);
  }
}

// Laskavé pobídky, když se hráč s oblíbencem dlouho nemazlil (max 1 za noc).
// Fakta souhlasí s webem: Denis je kocour, Flíček prase, Kesy pes.
const NEGLECT_NUDGE: Record<string, string> = {
  denis: "Denis se dnes otřel o dveře a mňoukl na tebe. Kočky mňoukají hlavně na lidi — chce tvou pozornost. Zajdi se pomazlit. 🐱",
  flicek: "Flíček se ti připletl pod nohy a nastavil bříško. Ví moc dobře, že drbání na bříšku je to nejlepší na světě. 🐷",
  kesy: "Kesy tě sledoval od plotu jako zenový mistr. Nic neřekl — ale kdybys zašel blíž, zavrtěl by ocasem. 🐶💚",
};
const NEGLECT_NUDGE_FALLBACK = (name: string) =>
  `${name} se po tobě dnes ohlížel(a). Zajdi se pozdravit — malá chvilka pozornosti udělá velkou radost. 💚`;

/**
 * Charaktery Louky — vyhodnocuje se přes noc (před resetem tasksDone).
 * Laskavé: přátelství roste péčí a klesá jen jemně po dlouhém zanedbání,
 * nálada nikdy nespadne pod „stýská se mu". Trpělivost, ne trest.
 */
function advanceAnimalMoods(s: GameState) {
  let nudged = false;
  for (const id of CHARACTER_SET) {
    const a = ANIMAL_BY_ID[id];
    if (!a) continue;
    const st = s.animals[id] ?? (s.animals[id] = initialAnimalStates()[id]); // líná inicializace
    const played = !!s.tasksDone[`play_${id}`];

    // Společnost: doplní hraní, jinak jemně klesá (nikdy pod SOCIAL_FLOOR).
    st.social = clamp(st.social + (played ? SOCIAL_PLAY_GAIN : -SOCIAL_DECAY), SOCIAL_FLOOR, 100);

    // Pohodlí: plynule se blíží hodnotě z rozmístění staveb (bezpečný default 70).
    const target = layoutComfortFor(id, s);
    st.comfort = clamp(st.comfort + (target - st.comfort) * COMFORT_LERP, 0, 100);

    // Přátelství: roste hrou; slábne jen po delším zanedbání, s podlahou.
    if (played) {
      st.bond = clamp(st.bond + BOND_PLAY_GAIN, 0, 100);
      st.lastPlayDay = s.day;
    } else if (s.day - st.lastPlayDay > BOND_NEGLECT_DAYS) {
      st.bond = clamp(st.bond - BOND_GENTLE_DECAY, BOND_FLOOR, 100);
    }

    // Nálada z welfare skupiny + společnosti + pohodlí + přátelství.
    const score = s.welfare[a.feedGroup] * 0.4 + st.social * 0.3 + st.comfort * 0.2 + st.bond * 0.1;
    st.mood =
      score >= MOOD_THRESHOLDS.radostny ? "radostny" :
      score >= MOOD_THRESHOLDS.spokojeny ? "spokojeny" :
      score >= MOOD_THRESHOLDS.pohoda ? "pohoda" :
      score >= MOOD_THRESHOLDS.posmutnely ? "posmutnely" : "styska";

    // Jemná pobídka — jen u oblíbence a jen jednou za noc.
    if (!nudged && !played && st.bond >= 45 && s.day - st.lastPlayDay === BOND_NEGLECT_DAYS + 1) {
      pushDialog(s, a.name, [NEGLECT_NUDGE[id] ?? NEGLECT_NUDGE_FALLBACK(a.name)]);
      nudged = true;
    }
  }
}

export function weatherName(w: Weather): string {
  return {
    slunecno: "slunečno",
    polojasno: "polojasno",
    destivo: "deštivo",
    mlha: "mlha",
    snezeni: "sněžení",
    mraz: "mráz",
    vedro: "vedro",
  }[w];
}
