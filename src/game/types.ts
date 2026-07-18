// ---------------------------------------------------------------------------
// Louka — datové typy hry
// Sanctuary management / survival. Pečuješ o zachráněná zvířata azylu
// "Nech mě růst" uprostřed lesů. Žádné zvíře se tu nevyužívá ani neporáží —
// produkty jsou vejce, vlna, byliny, masti. To je etické jádro celé hry.
// ---------------------------------------------------------------------------

import type { InteractKind } from "../world/entities";

export type Season = "jaro" | "leto" | "podzim" | "zima";

/**
 * Liščí příběh přátelství. Liška nikdy nikomu neublíží — je to plachá
 * sousedka z lesa, kterou si hráč získává trpělivostí (žádné násilí).
 */
export type FoxStage =
  | "les" // zatím jen tušení — někdo v noci obchází výběhy
  | "stopy" // ráno se objevily stopy; prozkoumej je
  | "pozorovani" // vyhlédni ji večer u kraje lesa (pomalu!)
  | "krmeni" // nech jí misku u lesa a získávej důvěru
  | "duvera" // jí, i když se díváš
  | "kamarad"; // chodí na návštěvy a dá se pohladit

export interface FoxState {
  stage: FoxStage;
  /** Důvěra 0–100. Roste krmením, nikdy neklesá — trpělivost, ne trest. */
  trust: number;
  /** Kolikrát v noci obešla výběhy (drobné stopy příběhu). */
  sightings: number;
  /** Kolikrát dostala večerní misku. */
  bowlCount: number;
}

/** Podoba pečovatele — vybírá se v tvůrci postavy. Strukturní podmnožina PersonDef. */
export type PlayerVariant = "beard" | "ponytail" | "hat";
export interface PlayerAppearance {
  skin: string;
  hair: string;
  shirt: string;
  variant?: PlayerVariant;
}
export interface PlayerProfile {
  /** Jméno pečovatele (výchozí „Ty"). */
  name: string;
  appearance: PlayerAppearance;
}

/**
 * Nálada zvířete. Nejhorší stupeň je „stýská se mu" — nikdy utrpení.
 * Trpělivost, ne trest (stejná filozofie jako u lišky).
 */
export type AnimalMood =
  | "radostny"
  | "spokojeny"
  | "pohoda"
  | "posmutnely"
  | "styska";

/** Runtime charakter vybraných zvířat — nálada, potřeby a přátelství. */
export interface AnimalState {
  /** Přátelství 0–100. Roste péčí; klesá jen jemně po dlouhém zanedbání, nikdy pod podlahu. */
  bond: number;
  /** Potřeba společnosti 0–100 — hraní/mazlení ji doplní. */
  social: number;
  /** Pohodlí 0–100 z rozmístění staveb (viz engine/comfort.ts). */
  comfort: number;
  /** Nálada — přepočítává se každou noc. */
  mood: AnimalMood;
  /** Den poslední interakce (hraní/mazlení). */
  lastPlayDay: number;
}

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
  | "kralik"
  // Divocí sousedé — nekrmí se pravidelně, žijí v lese kolem Louky.
  | "liska"
  | "kane"
  | "jezek"
  | "srnka";

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

/** Rozdělané sušení sena na seništi (kosení, sušení, svoz — běžná podzimní práce na Louce). */
export interface HayState {
  /** Kolik pokosené trávy se právě suší. */
  drying: number;
  /** Kolik „dobrých dní" už seno schne (obracení = celý den, jinak půl). */
  driedDays: number;
  /** Dnes už obráceno? */
  turnedToday: boolean;
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

export type BuildCategory = "zaklad" | "upgrade" | "ohrada" | "dekorace";

/** Katalogová definice — CO lze postavit. */
export interface Buildable {
  id: string;
  kind: InteractKind;
  category: BuildCategory;
  label: string;
  fw: number;
  fh: number;
  cost: { money?: number; wood?: number };
  unique: boolean;
  solid: boolean;
}

/** Instance — CO hráč postavil. */
export interface Placed {
  uid: string;
  defId: string;
  tx: number;
  ty: number;
}

export interface GameState {
  started: boolean;
  day: number; // číslo levelu (1+)
  season: Season;
  dayInSeason: number; // 1..DAYS_PER_SEASON
  year: number;
  phase: Phase;
  weather: Weather;
  /** Předpověď na zítřek — u sušení sena rozhoduje, ale hodí se všem. */
  weatherTomorrow: Weather;

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
  /** Kolikrát hráč potkal divoké sousedy (liska, kane, jezek, srnka). */
  wildSeen: Record<string, number>;
  /** Liščí příběh přátelství. */
  fox: FoxState;
  /** Charaktery Louky — nálada, potřeby a přátelství vybraných zvířat. */
  animals: Record<string, AnimalState>;
  /** Volné rozmístění staveb — override autorských souřadnic (dlaždice). Chybějící = autorská pozice. */
  placements: Record<string, { tx: number; ty: number }>;
  /** Volně postavené stavby — zdroj pravdy o tom, co stojí na louce. */
  structures: Placed[];
  /** Podoba a jméno pečovatele (tvůrce postavy). */
  profile: PlayerProfile;
  /** Probíhající sušení sena na seništi (null = nic se nesuší). */
  hay: HayState | null;

  totalEarned: number;
  daysSurvived: number;
  gameOver: string | null;

  // Questy a dialogy
  /** @deprecated Zrcadlo `questProgress.main` — drženo kvůli starým uložením. */
  questLine: number;
  /** Postup v každé questové lince (id linky → index dalšího questu). */
  questProgress: Record<string, number>;
  questCompleted: string[];
  /** Plná verze hry — zrcadlo entitlements (zdroj pravdy je mimo save). */
  fullVersion: boolean;
  /** Verze save formátu pro migrace. */
  saveVersion: number;
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
