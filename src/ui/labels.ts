import type { FeedGroup, Phase, Season, Weather } from "../game/types";

export const SEASON_ICON: Record<Season, string> = {
  jaro: "🌸",
  leto: "☀️",
  podzim: "🍂",
  zima: "❄️",
};
export const SEASON_LABEL: Record<Season, string> = {
  jaro: "Jaro",
  leto: "Léto",
  podzim: "Podzim",
  zima: "Zima",
};
export const WEATHER_ICON: Record<Weather, string> = {
  slunecno: "☀️",
  polojasno: "⛅",
  destivo: "🌧️",
  mlha: "🌫️",
  snezeni: "🌨️",
  mraz: "🥶",
  vedro: "🔥",
};
export const PHASE_LABEL: Record<Phase, string> = {
  rano: "Ráno",
  poledne: "Poledne",
  vecer: "Večer",
};
export const PHASE_ICON: Record<Phase, string> = {
  rano: "🌅",
  poledne: "🌞",
  vecer: "🌇",
};
export const GROUP_LABEL: Record<FeedGroup, string> = {
  drubez: "Drůbež",
  prasata: "Prasata",
  stado: "Stádo",
  mazlici: "Psi · kočky · králíci",
};
export const GROUP_ICON: Record<FeedGroup, string> = {
  drubez: "🐔",
  prasata: "🐖",
  stado: "🐄",
  mazlici: "🐕",
};
