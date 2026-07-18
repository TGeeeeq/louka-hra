// Centrální ladění obtížnosti. Měň tady — celá hra se přizpůsobí.
import type { FeedGroup, Season } from "./types";

export const DAYS_PER_SEASON = 4; // hráč projde všemi obdobími za ~16 dní
export const SEASON_ORDER: Season[] = ["jaro", "leto", "podzim", "zima"];

export const START_MONEY = 850;
export const BASE_MAX_ENERGY = 100;

// Demo brána (jen nativní shell — viz platform.ts): free verze = tutoriál
// + první 3 dny. Demo končí po 3. dnu — hranice laditelná zde.
export const DEMO_DAYS = 3;

// Kolik energie/sytosti/žízně ubude přechodem do další fáze dne.
export const PHASE_HUNGER_DRAIN = 14;
export const PHASE_THIRST_DRAIN = 16;

// Spánek (konec dne)
export const SLEEP_HUNGER_DRAIN = 22;
export const SLEEP_THIRST_DRAIN = 24;

// Spokojenost zvířat
export const WELFARE_FEED_GAIN = 26; // nakrmení zvedne spokojenost skupiny
export const WELFARE_CLEAN_GAIN = 14;
export const WELFARE_PLAY_GAIN = 8; // pohrání/mazlení (jednou denně na zvíře)
export const WELFARE_SKIP_FEED_PENALTY = 30; // když skupinu za den nenakrmíš
export const WELFARE_NIGHT_OPEN_PENALTY = 18; // nezavřená zvířata v noci
export const WELFARE_SICK_THRESHOLD = 25; // pod touto hranicí hrozí nemoc

// Kolik žroutů má každá skupina (challenge: přes sto zvířat celkem).
export const STARTING_POPULATION: Record<FeedGroup, number> = {
  drubez: 64, // slepice, husy, kachny, holubi
  prasata: 8,
  stado: 24, // krávy, ovce, berani, osel, muflon
  mazlici: 16, // psi, kočky, králíci
}; // = 112 zvířat

// Násobič spotřeby krmiva podle ročního období (zima = drsná).
export const SEASON_FOOD_MULT: Record<Season, number> = {
  jaro: 1,
  leto: 0.9,
  podzim: 1.1,
  zima: 1.45,
};

// Délka dne (kolik energie máš k dispozici) podle období.
export const SEASON_ENERGY: Record<Season, number> = {
  jaro: 100,
  leto: 115,
  podzim: 95,
  zima: 78,
};

// Zima: bez vytápění (dřeva) padá spokojenost a hrozí nemoc.
export const WINTER_WOOD_PER_NIGHT = 3;

// Ekonomika produktů (prodejní ceny řídí items.ts; tohle jsou výnosy sběru).
export const EGGS_PER_COLLECT = { min: 4, max: 9 };
export const WOOL_PER_SHEAR = { min: 2, max: 4 };
export const HERBS_PER_FORAGE: Record<Season, { min: number; max: number }> = {
  jaro: { min: 3, max: 6 },
  leto: { min: 4, max: 7 },
  podzim: { min: 2, max: 5 },
  zima: { min: 0, max: 1 }, // v zimě se sotva co najde
};

// Návštěvníci/dárci: při vysoké spokojenosti přitéká podpora (NMR žije z darů).
export const DONATION_WELFARE_THRESHOLD = 70;
export const DONATION_RANGE = { min: 40, max: 130 };

// Veterinář
export const VET_BILL = { min: 280, max: 620 };

// Charaktery Louky (per-animal nálada & přátelství) — laskavé hodnoty.
export const SOCIAL_PLAY_GAIN = 22; // hraní/mazlení doplní společnost (noční konsolidace)
export const SOCIAL_PLAY_INSTANT = 14; // okamžitý pocitový skok při hře (feedback na kartě)
export const SOCIAL_DECAY = 6; // jemný úbytek za den bez pozornosti
export const SOCIAL_FLOOR = 25; // společnost nikdy neklesne níž (žádné utrpení)
export const COMFORT_LERP = 0.4; // jak rychle se pohodlí blíží hodnotě z rozmístění
export const BOND_PLAY_GAIN = 6; // přátelství za den, kdy sis se zvířetem hrál
export const BOND_NEGLECT_DAYS = 4; // až po tolika dnech bez pozornosti přátelství jemně slábne
export const BOND_GENTLE_DECAY = 2; // a to jen o tohle (trpělivost, ne trest)
export const BOND_FLOOR = 10; // přátelství nikdy nespadne úplně na nulu
// Prahy nálady (vážený skór welfare/social/comfort/bond).
export const MOOD_THRESHOLDS = { radostny: 85, spokojeny: 68, pohoda: 50, posmutnely: 32 };

// Spec 2: hráč začíná jen se psem a kočkou; ostatní zvířata přijedou, až
// postaví jejich výběh. Companion se renderují nezávisle na výběhu.
export const COMPANION_ANIMAL_IDS = ["riky", "roman"]; // pes + kočka
export const COMPANION_POPULATION = 2;
