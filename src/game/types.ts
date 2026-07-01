// ---------------------------------------------------------------------------
// Louka — datové typy hry
// Sanctuary management / survival. Pečuješ o zachráněná zvířata azylu
// "Nech mě růst" uprostřed lesů. Žádné zvíře se tu nevyužívá ani neporáží —
// produkty jsou vejce, vlna, byliny, masti. To je etické jádro celé hry.
// ---------------------------------------------------------------------------

export type Season = "jaro" | "leto" | "podzim" | "zima";

export type Phase = "rano" | "poledne" | "vecer";

export type Weather =
  | "slunecno"
  | "polojasno"
  | "destivo"
  | "mlha"
  | "snezeni"
  | "mraz"
  | "vedro";

/** Druh zvířete — určuje vzhled (sprite) i způsob krmení. */
export type Species =
  | "osel"
  | "muflon"
  | "krava"
  | "prase"
  | "ovce"
  | "pes"
  | "kocka"
  | "husa"
  | "kachna"
  | "slepice"
  | "holub"
  | "kralik";

/** Skupina krmení — jak a čím se zvíře krmí. */
export type FeedGroup =
  | "drubez" // slepice, husy, kachny, holubi — krmná směs
  | "prasata" // prasata — vařené krmivo
  | "stado" // krávy, ovce, osel, muflon — seno
  | "mazlici"; // psi, kočky, králíci — granule / zbytky

export interface SpritePalette {
  body: string;
  bodyDark?: string;
  belly?: string;
  detail?: string; // hříva, rohy, zobák, čenich…
  accent?: string;
}

export interface AnimalDef {
  id: string;
  name: string;
  species: Species;
  feedGroup: FeedGroup;
  /** Krátká povaha — přebráno z webu nechmerust.org. */
  personality: string;
  /** Naučné faktum o druhu (česky, ověřené). */
  fact: string;
  palette: SpritePalette;
  /** Vizuální i příběhové vodítko: "rohy", "tripod", "shaggy", "spot"… */
  variant?: string;
  /** Příběhový příznak: "missing" (List se pohřešuje) apod. */
  special?: string;
  /** Soubor v public/animals/ — skutečná fotka zvířete z nechmerust.org. */
  photo?: string;
  /** Relativní velikost ve světě (násobí výchozí velikost druhu). */
  scale?: number;
  /** Kde na louce postavička stojí (procenta scény). */
  spot?: { x: number; y: number };
}

export type ItemKind =
  | "krmivo"
  | "surovina"
  | "jidlo"
  | "produkt"
  | "naradi"
  | "palivo";

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  kind: ItemKind;
  buyPrice?: number; // Kč; chybí = nelze koupit
  sellPrice?: number; // Kč; chybí = nelze prodat
  desc: string;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  inputs: { item: string; qty: number }[];
  outputs: { item: string; qty: number }[];
  energy: number;
  requiresBuilding?: string;
  requiresFire?: boolean;
  desc: string;
  fact?: string;
}

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  desc: string;
  benefit: string;
}

export type FactCategory =
  | "zvirata"
  | "byliny"
  | "priroda"
  | "obdobi"
  | "azyl";

export interface Fact {
  id: string;
  category: FactCategory;
  title: string;
  text: string;
}

export interface TaskDef {
  id: string;
  name: string;
  emoji: string;
  phase: Phase | "kdykoliv";
  energy: number;
  desc: string;
}

export interface LogEntry {
  id: number;
  day: number;
  text: string;
  tone: "info" | "good" | "warn" | "bad";
}

export interface GameState {
  started: boolean;
  day: number; // číslo levelu (1+)
  season: Season;
  dayInSeason: number; // 1..DAYS_PER_SEASON
  year: number;
  phase: Phase;
  weather: Weather;

  money: number;
  energy: number;
  maxEnergy: number;
  hunger: number; // sytost 0..100 (vyšší = najedený)
  thirst: number; // 0..100 (vyšší = napitý)

  inventory: Record<string, number>;
  buildings: string[];
  /** Postavené stavby úvodního tutoriálu (chalupa, kuchyň, výběhy…). */
  built: string[];
  /** Index v TUTORIAL_STEPS; >= délka ⇒ tutoriál dokončen, běží survival. */
  tutorialStep: number;
  welfare: Record<FeedGroup, number>; // 0..100 spokojenost/zdraví skupiny
  population: Record<FeedGroup, number>; // počet kusů (challenge: 100+)

  birdsReleased: boolean;
  animalsClosed: boolean;
  fireLit: boolean;

  tasksDone: Record<string, boolean>;
  knownFacts: string[];
  seenAnimals: string[];

  totalEarned: number;
  daysSurvived: number;
  gameOver: string | null;

  // Questy a dialogy
  questLine: number; // index v MAIN_QUESTS
  questCompleted: string[];
  flags: Record<string, boolean>; // např. pet_flicek, made_mast, sold
  dialog: { speaker?: string; lines: string[] } | null;

  log: LogEntry[];
  logSeq: number;

  /** Krátkodobé hlášky pro UI (toasty), spotřebuje se v UI vrstvě. */
  flash: { id: number; text: string; tone: LogEntry["tone"]; fact?: Fact } | null;

  /** Skrytý developerský (testovací) mód — viz reducer akce DEV_*. */
  dev: DevState;
}

/** Developerský mód pro rychlé testování všech interakcí a období. */
export interface DevState {
  /** Panel je odemčený (aktivovaný skrytou sekvencí). */
  enabled: boolean;
  /** Nesmrtelnost — energie, sytost i žízeň zůstávají plné, žádný bankrot. */
  godMode: boolean;
  /** Turbo pohyb — postava chodí po mapě výrazně rychleji. */
  turbo: boolean;
}
