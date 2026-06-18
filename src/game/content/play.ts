// Přátelský souboj & mazlení — kdo si jak hraje a co se u toho řekne.
// Mechanika (timing/reflex) je v ui/minigames/PlayBar.tsx, tahle data ji řídí.
import type { AnimalDef } from "../types";

export type PlayKind = "okus" | "trk" | "mazleni";

// Zvířata, co hravě trkají (sklopí hlavu a do tebe ťuknou rohy/čelem).
const HEADBUTTERS = new Set(["yakul", "kulich"]);

/** Vrátí způsob hry pro dané zvíře, nebo null (s tímhle si zahrát nejde). */
export function playKindFor(a: AnimalDef): PlayKind | null {
  if (a.id === "karel") return "okus";
  if (HEADBUTTERS.has(a.id)) return "trk";
  if (a.species === "kocka") return "mazleni";
  return null;
}

export interface PlayKindDef {
  title: string; // nadpis lišty
  cta: string; // text tlačítka na kartě zvířete
  verb: string; // do logu: „Pohrál sis s … (verb)"
  factId: string; // naučné faktum, které se objeví
  prompt: string; // co se děje (nad lištou)
  hint: string; // jak na to
  zone: [number, number]; // cílová zóna na liště (0..1) — užší = těžší
  speed: number; // rychlost ukazatele (jednotky za sekundu)
  win: (a: AnimalDef) => string; // hláška po dohrání
}

const HINT = "Zmáčkni MEZERNÍK nebo ťukni na tlačítko, když je ukazatel v zelené.";

export const PLAY_KIND: Record<PlayKind, PlayKindDef> = {
  okus: {
    title: "🫏 Hra s Karlem",
    cta: "🤚 Pohrát si",
    verb: "okusování",
    factId: "f_okusovani",
    prompt: "Karel po tobě dotírá a chce okusovat rukáv! Pohlaď ho po čumáku v pravou chvíli — jemně, ze hry.",
    hint: HINT,
    zone: [0.37, 0.63],
    speed: 0.85,
    win: (a) => `${a.name} si tě láskyplně okusoval a září blahem. Osli to dělají z hravosti a zvědavosti, ne ze zlosti!`,
  },
  trk: {
    title: "🐏 Přátelský souboj",
    cta: "🤼 Pohrát si",
    verb: "trkání",
    factId: "f_trkani",
    prompt: "Sklání hlavu a chystá se hravě trknout! Zachyť trknutí přesně načas a zatlač zpátky.",
    hint: HINT,
    zone: [0.42, 0.58],
    speed: 1.2,
    win: (a) => `${a.name} si s tebou změřil síly a spokojeně zafrkal. Trkání je hra a měření sil, ne boj!`,
  },
  mazleni: {
    title: "🐱 Mazlení",
    cta: "🐱 Pomazlit",
    verb: "mazlení",
    factId: "f_mazleni",
    prompt: "Kočka se přišla pomazlit a začíná příst. Hlaď ji do rytmu předení.",
    hint: HINT,
    zone: [0.32, 0.68],
    speed: 0.68,
    win: (a) => `${a.name} blaženě přede a tře se ti o ruku. Předení kočku uklidňuje — a prý i hojí!`,
  },
};
