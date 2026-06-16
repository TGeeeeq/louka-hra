import type { FeedGroup, GameState, Season, Weather } from "../types";
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
  WELFARE_NIGHT_OPEN_PENALTY,
  WELFARE_SICK_THRESHOLD,
  WELFARE_SKIP_FEED_PENALTY,
  WINTER_WOOD_PER_NIGHT,
  WOOL_PER_SHEAR,
} from "../balance";
import { ITEM_BY_ID } from "../content/items";
import { RECIPE_BY_ID } from "../content/recipes";
import { BUILDING_BY_ID } from "../content/buildings";
import {
  CLEAN_FACTS,
  FACT_BY_ID,
  FORAGE_FACTS,
  NIGHT_FACTS,
  WINTER_FACTS,
} from "../content/facts";
import { initialState } from "./state";
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
  randInt,
  take,
} from "./util";

export type Action =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "LOAD"; state: GameState }
  | { type: "RELEASE_BIRDS" }
  | { type: "FEED"; group: FeedGroup }
  | { type: "WATER" }
  | { type: "COLLECT_EGGS" }
  | { type: "SHEAR" }
  | { type: "CLEAN"; area: "kurnik" | "kuchyne" }
  | { type: "CHOP_WOOD" }
  | { type: "LIGHT_FIRE" }
  | { type: "FORAGE" }
  | { type: "CRAFT"; recipeId: string }
  | { type: "EAT"; itemId: string }
  | { type: "DRINK"; itemId: string }
  | { type: "BUY"; itemId: string; qty: number }
  | { type: "SELL"; itemId: string; qty: number }
  | { type: "BUILD"; buildingId: string }
  | { type: "EVENING_FEED" }
  | { type: "CLOSE_ANIMALS" }
  | { type: "ADVANCE_PHASE" }
  | { type: "SLEEP" }
  | { type: "DISMISS_FLASH" };

const has = (s: GameState, id: string) => s.buildings.includes(id);

const FEED_LABEL: Record<FeedGroup, string> = {
  drubez: "drůbež",
  prasata: "prasata",
  stado: "stádo",
  mazlici: "psy, kočky a králíky",
};

/** Co a kolik daná skupina sežere ráno (škáluje se ročním obdobím). */
function feedPlan(group: FeedGroup, season: Season) {
  const m = SEASON_FOOD_MULT[season];
  switch (group) {
    case "drubez":
      return { item: "krmna_smes", qty: Math.ceil(3 * m) };
    case "prasata":
      return { item: "vareno", qty: Math.ceil(2 * m) };
    case "stado":
      return { item: "seno", qty: season === "zima" ? 2 : 1 };
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
  switch (action.type) {
    case "START": {
      const s = cloneState(state);
      s.started = true;
      addLog(s, `Vítej na Louce. Den ${s.day} — ${seasonName(s.season)}.`, "good");
      return s;
    }

    case "RESET":
      return { ...initialState(), started: true };

    case "LOAD":
      return action.state;

    case "DISMISS_FLASH": {
      if (!state.flash) return state;
      const s = cloneState(state);
      s.flash = null;
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
        "Otevřel jsi kurník i výběhy — drůbež se hrne ven na louku.",
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
      const item = ITEM_BY_ID[plan.item];
      if (invCount(state.inventory, plan.item) < plan.qty) {
        const hint =
          group === "prasata"
            ? "Nemáš dost vařeného krmiva — nejdřív navař na ohni."
            : `Došlo ti krmivo: ${item.name}. Dokup ho v obchodě.`;
        return warnReturn(state, hint);
      }
      const s = cloneState(state);
      const cost = feedEnergy(group, s);
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      take(s, [plan]);
      s.tasksDone[`feed_${group}`] = true;
      addLog(
        s,
        `Nakrmil jsi ${FEED_LABEL[group]} (${plan.qty}× ${item.name}).`,
        "good",
      );
      flash(s, `${cap(FEED_LABEL[group])} spokojeně přežvykuje. 😊`, "good");
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
      give(s, "vejce", eggs);
      s.tasksDone.eggs = true;
      addLog(s, `Sesbíral jsi ${eggs}× vejce. 🥚`, "good");
      flash(s, `Dnešní snůška: ${eggs} vajec.`, "good");
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
      const area = action.area;
      if (state.tasksDone[`clean_${area}`])
        return warnReturn(state, "Tady už je uklizeno.");
      const s = cloneState(state);
      const cost = area === "kurnik" ? 7 : 5;
      if (notEnoughEnergy(s, cost)) return s;
      s.energy -= cost;
      s.tasksDone[`clean_${area}`] = true;
      if (area === "kurnik") {
        s.welfare.drubez = clamp(s.welfare.drubez + WELFARE_CLEAN_GAIN, 0, 100);
        s.welfare.prasata = clamp(s.welfare.prasata + 6, 0, 100);
        addLog(s, "Vyhrabal jsi podestýlku — v kurníku a chlívku je čisto.", "good");
        flash(
          s,
          "Čisto a sucho. Zdravější zvířata, méně nemocí.",
          "good",
          learnFact(s, FACT_BY_ID["f_zizala"]),
        );
      } else {
        s.welfare.mazlici = clamp(s.welfare.mazlici + 5, 0, 100);
        addLog(s, "Uklidil jsi kuchyni a boudu — pořádek dělá přátele.", "good");
        flash(
          s,
          "V kuchyni je uklizeno, vaří se líp.",
          "good",
          learnFact(s, FACT_BY_ID[pick(CLEAN_FACTS)]),
        );
      }
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
      addLog(s, `Nasbíral jsi ${herbs}× byliny v lese. 🌿`, "good");
      flash(
        s,
        `Košík plný bylin (+${herbs}).`,
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
      const usesHerbs = recipe.inputs.some((i) => i.item === "byliny");
      const bonus = usesHerbs && has(s, "susarna") ? 1 : 0;
      for (const out of recipe.outputs) give(s, out.item, out.qty + bonus);
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
      s.hunger = clamp(s.hunger + restore, 0, 100);
      addLog(s, `Najedl ses (${item.name}). Sytost +${restore}.`, "good");
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
      s.thirst = clamp(s.thirst + restore, 0, 100);
      if (id === "caj") s.hunger = clamp(s.hunger + 4, 0, 100);
      addLog(s, `Napil ses (${ITEM_BY_ID[id].name}). Žízeň −${restore}.`, "good");
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
        "Všichni v suchu a bezpečí. Liška má smůlu.",
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
      } else {
        s.phase = "vecer";
        addLog(s, "Slunce zapadá. Čas na večerní krmení a zavření.", "info");
      }
      s.hunger = clamp(s.hunger - PHASE_HUNGER_DRAIN, 0, 100);
      s.thirst = clamp(s.thirst - PHASE_THIRST_DRAIN, 0, 100);
      maybeSurvivalWarn(s);
      return s;
    }

    case "SLEEP":
      return resolveSleep(state);

    default:
      return state;
  }
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

  // 2) Noc bez zavření = liška a stres.
  if (!s.tasksDone.closed) {
    for (const g of groups) s.welfare[g] = clamp(s.welfare[g] - WELFARE_NIGHT_OPEN_PENALTY, 0, 100);
    if (chance(0.5) && s.population.drubez > 5) {
      const lost = randInt(1, 3);
      s.population.drubez -= lost;
      addLog(s, `V noci dorazila liška — chybí ${lost} kusy drůbeže.`, "bad");
      learnFact(s, FACT_BY_ID["f_liska"]);
    } else {
      addLog(s, "Nechal jsi otevřeno. Naštěstí se nic nestalo — risk se ale nevyplácí.", "warn");
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
  s.weather = randomWeather(s.season);

  // 9) Permakulturní zahrada — ranní úroda zdarma.
  if (has(s, "zahrada")) {
    give(s, "zelenina", 2);
    give(s, "brambory", 2);
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
