import type { GameState } from "../types";
import {
  BASE_MAX_ENERGY,
  SEASON_ENERGY,
  START_MONEY,
  STARTING_POPULATION,
} from "../balance";
import { initialAnimalStates } from "../content/characters";

export function initialState(): GameState {
  return {
    started: false,
    day: 1,
    season: "jaro",
    dayInSeason: 1,
    year: 1,
    phase: "rano",
    weather: "polojasno",
    weatherTomorrow: "slunecno",

    money: START_MONEY,
    energy: SEASON_ENERGY.jaro,
    maxEnergy: BASE_MAX_ENERGY,
    hunger: 80,
    thirst: 80,

    // Startovní zásoby — den 1 musí jít odehrát.
    inventory: {
      krmna_smes: 4,
      seno: 2,
      granule: 4,
      zelenina: 5,
      brambory: 5,
      vareno: 2,
      obili: 4,
      kukurice: 2,
      drevo: 7,
      voda: 5,
      chleba: 3,
      tuk: 1,
      sklenice: 2,
      byliny: 0,
      vejce: 0,
      vlna: 0,
      mast: 0,
      caj: 0,
      polevka: 0,
    },
    buildings: [],
    built: [],
    tutorialStep: 0,
    welfare: { drubez: 72, prasata: 72, stado: 72, mazlici: 72 },
    population: { ...STARTING_POPULATION },

    birdsReleased: false,
    animalsClosed: true,
    fireLit: false,

    tasksDone: {},
    knownFacts: [],
    seenAnimals: [],
    wildSeen: {},
    fox: { stage: "les", trust: 0, sightings: 0, bowlCount: 0 },
    animals: initialAnimalStates(),
    placements: {},
    profile: {
      name: "Ty",
      appearance: { skin: "#f0c49a", hair: "#6a4a2c", shirt: "#2d5a3d", variant: "hat" },
    },
    hay: null,

    totalEarned: 0,
    daysSurvived: 0,
    gameOver: null,

    questLine: 0,
    questProgress: { main: 0 },
    questCompleted: [],
    achievements: [],
    herbQuizCorrect: 0,
    fullVersion: false,
    saveVersion: 6,
    flags: {},
    dialog: null,

    log: [],
    logSeq: 0,
    flash: null,

    dev: { enabled: false, godMode: false, turbo: false },
  };
}
