export interface PersonDef {
  id: string;
  name: string;
  role: string;
  skin: string;
  hair: string;
  shirt: string;
  variant?: "beard" | "ponytail" | "hat";
  line: string; // uvítání
  help?: string; // čím hráči pomůže
}

// Lidé z týmu Nech mě růst + ty jako pečovatel/ka.
export const PEOPLE: PersonDef[] = [
  {
    id: "ty",
    name: "Ty",
    role: "Pečovatel/ka na Louce",
    skin: "#f0c49a",
    hair: "#6a4a2c",
    shirt: "#2d5a3d",
    variant: "hat",
    line: "Sto zvířat, jeden den, jedny ruce. Jdeme na to.",
  },
  {
    id: "tomas",
    name: "Tomáš",
    role: "Předseda spolku",
    skin: "#eebb92",
    hair: "#3a2a1c",
    shirt: "#b85c3c",
    variant: "beard",
    line: "Vítej na Louce! Já jsem Tomáš. Tady každé zvíře dožije v klidu — to je celý smysl.",
    help: "Posílí tě. Naučí tě sekat dřevo tak, ať z toho něco je.",
  },
  {
    id: "maruska",
    name: "Maruška",
    role: "Srdce organizace",
    skin: "#f3cba6",
    hair: "#8a5a2c",
    shirt: "#c89858",
    variant: "ponytail",
    line: "Ahoj, já jsem Maruška. Papíry, krmivo, rozpočet — ať to klape. A hlídej peníze!",
    help: "Naučí tě poznávat byliny — základ mastí i čajů.",
  },
  {
    id: "tony",
    name: "Tony",
    role: "Kutil a parťák",
    skin: "#edc098",
    hair: "#241f1c",
    shirt: "#2f7d8a",
    variant: "beard",
    line: "Čau, Tony. Postavím, opravím, vymyslím. Když na něčem uvázneš, stav se.",
    help: "Vytříbí ti paměť — pexeso s obyvateli Louky. A hodí pár korun.",
  },
];

export const PERSON_BY_ID: Record<string, PersonDef> = Object.fromEntries(
  PEOPLE.map((p) => [p.id, p]),
);

// NPC, se kterými si můžeš povídat a hrát minihry (mimo hráče "ty").
export const NPCS = ["tomas", "maruska", "tony"];
