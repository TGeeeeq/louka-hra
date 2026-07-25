import type { FeedGroup, Phase, Season, Weather } from "../../game/types";
import type { IconName } from "./Icon";

/** Icon per season — mirrors SEASON_ICON in ui/labels.ts. */
export const SEASON_ICON_NAME: Record<Season, IconName> = {
  jaro: "flower",
  leto: "sun",
  podzim: "leaf",
  zima: "snowflake",
};

export const WEATHER_ICON_NAME: Record<Weather, IconName> = {
  slunecno: "sun",
  polojasno: "sunCloud",
  destivo: "rain",
  mlha: "fog",
  snezeni: "snow",
  mraz: "snowflake",
  vedro: "thermo",
};

export const PHASE_ICON_NAME: Record<Phase, IconName> = {
  rano: "sunrise",
  poledne: "sun",
  vecer: "sunset",
};

export const GROUP_ICON_NAME: Record<FeedGroup, IconName> = {
  drubez: "chicken",
  prasata: "pig",
  stado: "cow",
  mazlici: "paw",
};

/** Icon per placeable structure (see game/content/buildables.ts). */
export const BUILDABLE_ICON: Record<string, IconName> = {
  chalupa: "home",
  stanek: "stall",
  dilna: "tools",
  ohniste: "fire",
  kurnik: "chicken",
  chlivek: "pig",
  pastvina: "sheep",
  buda: "paw",
  studna: "well",
  zahrada: "carrot",
  plot: "fence",
  cedule_deko: "sign",
};
