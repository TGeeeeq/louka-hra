import type { FeedGroup, Phase, Season, Weather } from "../types";

// Snapshot stavu světa, na který NPC reagují (bubliny + komentář při rozhovoru).
export interface WorldSnapshot {
  welfare: Record<FeedGroup, number>;
  weather: Weather;
  season: Season;
  phase: Phase;
  money: number;
}

export interface Reaction {
  ambient: string; // krátká bublina nad hlavou
  comment: string; // delší věta při rozhovoru
}

const FEED_LABEL: Record<FeedGroup, string> = {
  drubez: "drůbež",
  prasata: "prasata",
  stado: "stádo",
  mazlici: "mazlíčci",
};

/** Nejhůř na tom skupina pod prahem spokojenosti, jinak null. */
function worstGroup(w: WorldSnapshot, th = 55): FeedGroup | null {
  let worst: FeedGroup | null = null;
  let lo = th;
  for (const g of Object.keys(w.welfare) as FeedGroup[]) {
    if (w.welfare[g] < lo) { lo = w.welfare[g]; worst = g; }
  }
  return worst;
}

const COLD: Weather[] = ["snezeni", "mraz"];

/** Vrátí nejrelevantnější reakci NPC podle stavu světa, nebo null (vše v klidu). */
export function reactionFor(id: string, w: WorldSnapshot): Reaction | null {
  const worst = worstGroup(w);
  const label = worst ? FEED_LABEL[worst] : "";

  if (id === "tomas") {
    if (worst && (worst === "stado" || w.welfare[worst] < 40))
      return { ambient: `${label} posmutněli`, comment: `${label} jsou nesví — zajdi za nimi a dej jim, co potřebují. Práce počká.` };
    if (w.season === "zima" || COLD.includes(w.weather))
      return { ambient: "Bez dřeva zima nebere 🪓", comment: "Zima nebere ohledy — nasekej dřevo do zásoby, dokud máš čas." };
    return null;
  }

  if (id === "maruska") {
    if (w.money < 120)
      return { ambient: "Pozor na rozpočet 💰", comment: "Hlídej peníze — krmivo kup ve velkém a prodávej, až bude sklad plný." };
    if (worst)
      return { ambient: "Někdo tu strádá…", comment: `${label} potřebují péči. Spokojená zvířata = dary od příznivců.` };
    if (w.season === "jaro" || w.season === "leto")
      return { ambient: "Bylinek je teď dost 🌿", comment: "Teď je bylinek nejvíc — nasbírej na masti a čaje, nesou víc než suroviny." };
    return null;
  }

  if (id === "tony") {
    if (w.season === "zima" || COLD.includes(w.weather))
      return { ambient: "Napáječky mrznou 🧊", comment: "V zimě zvířatům mrzne voda — vyhřívaná napáječka by se vyplatila. A hlídej spotřebu." };
    if (w.money < 150)
      return { ambient: "Provoz něco stojí…", comment: "Energie a údržba něco stojí, ale pár vychytávek se zaplatí samo." };
    if (w.weather === "destivo")
      return { ambient: "U pumpy je bláto", comment: "V dešti je u pumpy bláto — zato mám kam chytat vodu." };
    return null;
  }
  return null;
}

const IDLE: Record<string, string[]> = {
  tomas: ["Práce je tu nad hlavu 🪓", "Co kus dřeva, to teplo.", "Dobrý den na louce."],
  maruska: ["Držím vše pohromadě 📋", "Papíry počkají, zvířata ne.", "Voní to tu bylinkami 🌿"],
  tony: ["Skoro se to opraví samo 🔧", "Dráty a chvíli klidu…", "Šlongo, a jede to ⚡"],
};

/** Náhodná „small-talk" hláška do bubliny, když je vše v klidu. */
export function idleLine(id: string, r: number): string {
  const pool = IDLE[id] ?? ["…"];
  return pool[Math.floor(r * pool.length) % pool.length];
}
