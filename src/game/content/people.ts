export interface PersonDef {
  id: string;
  name: string;
  role: string;
  skin: string;
  hair: string;
  shirt: string;
  variant?: "beard" | "ponytail" | "hat";
  line: string; // co řekne při uvítání / v dialogu
}

// Lidé z týmu Nech mě růst (dle webu) + ty jako pečovatel/ka.
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
    name: "Tomáš Bahník",
    role: "Předseda spolku",
    skin: "#eebb92",
    hair: "#3a2a1c",
    shirt: "#b85c3c",
    variant: "beard",
    line: "Tady každé zvíře dožije v klidu. To je celý smysl Louky.",
  },
  {
    id: "maria",
    name: "Maria Krausová",
    role: "Srdce organizace",
    skin: "#f3cba6",
    hair: "#8a5a2c",
    shirt: "#c89858",
    variant: "ponytail",
    line: "Papíry, krmivo, rozpočet — ať to klape. Hlídej peníze!",
  },
];

export const PERSON_BY_ID: Record<string, PersonDef> = Object.fromEntries(
  PEOPLE.map((p) => [p.id, p]),
);
