export interface PersonDef {
  id: string;
  name: string;
  role: string;
  skin: string;
  hair: string;
  shirt: string;
  variant?: "beard" | "ponytail" | "hat";
  photo?: string; // stylizovaný portrét v public/people/ (generovaný ze skutečné fotky)
  line: string; // uvítání
  help?: string; // čím hráči pomůže
  domain?: string; // krátký štítek odbornosti
  tips?: string[]; // rotující rady v jeho oboru
}

// Lidé z týmu Nech mě růst + ty jako pečovatel/ka. Každý má svůj obor:
// Tomáš = práce a rady, Maruška = vše okolo, Tony = technika.
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
    role: "Předseda — práce & rady",
    skin: "#eebb92",
    hair: "#a4653a",
    shirt: "#6b7048",
    variant: "beard",
    photo: "tomas.webp",
    line: "Vítej na Louce! Já jsem Tomáš. Každé zvíře tu dožije v klidu — a práce kolem je až nad hlavu.",
    help: "Práce a rady. Posílí tě a naučí sekat dřevo tak, ať z toho něco je — co kus, to teplo na zimu.",
    domain: "Práce & rady",
    tips: [
      "Ráno nejdřív vypusť a nakrm — zvířata na tebe čekají. Úklid počká.",
      "Dřevo nasekej do zásoby. V zimě ho spotřebuješ víc, než čekáš.",
      "Dochází ti energie? Najez se dřív, než padneš. Práce nikam neuteče.",
      "Na noc vždy zavři výběhy. Zvířata pak spí klidně — a liška obejde dvůr jen ze zvědavosti.",
      "V zimě je všechno těžší — nachystej krmení i dřevo už na podzim.",
    ],
  },
  {
    id: "maruska",
    name: "Maruška",
    role: "Srdce spolku — vše okolo",
    skin: "#f3cba6",
    hair: "#d9a856",
    shirt: "#d97a3a",
    variant: "ponytail",
    photo: "maruska.webp",
    line: "Ahoj, já jsem Maruška. Papíry, krmivo, byliny, rozpočet — držím pohromadě vše okolo. A hlídej peníze!",
    help: "Vše okolo: byliny, zásoby i rozpočet. Naučí tě poznávat byliny — základ mastí a čajů.",
    domain: "Vše okolo",
    tips: [
      "Řebříček a měsíček suš — z nich je nejlepší řebříčková mast na prodej.",
      "Krmivo kupuj ve velkém, prodávej až je sklad plný. Ušetříš.",
      "Vejce a vlnu sbírej každý den — stálý malý příjem se sečte.",
      "Bylinek je nejvíc na východní louce. Vyplatí se tam zajít.",
      "Mast a čaje nesou víc než suroviny. Vyrábět se vyplatí.",
      "V létě sbírej luční květy na sirup — a na podzim šípky. Sezóna nepočká.",
      "Divoká zvířata si získáš klidem. Co uteče před během, přijde k trpělivosti.",
    ],
  },
  {
    id: "tony",
    name: "Tony",
    role: "Technik a kutil",
    skin: "#edc098",
    hair: "#241f1c",
    shirt: "#4f4a44",
    variant: "beard",
    photo: "tony.webp",
    line: "Čau, Tony. Dej mi dráty a chvíli a Louka si skoro pomáhá sama. Co je rozbité, spravím.",
    help: "Technika a vychytávky: samokrmítka, pumpa, vyhřívané napáječky, ohradník. Naučí tě je zapojit.",
    domain: "Technika",
    tips: [
      "Solární panel se přes den dobije — večer pak svítí u kurníku i bez proudu.",
      "Vodní pumpa dotáhne vodu do napáječek. Ušetří ti cesty ke studni.",
      "V zimě se hodí vyhřívaná napáječka — zvířatům nezamrzne voda.",
      "Elektrický ohradník udrží stádo doma líp než plot. Hlídej ale spotřebu!",
      "Samokrmítko nakrmí drůbež i ráno, kdy zrovna stíháš jinde.",
    ],
  },
];

export const PERSON_BY_ID: Record<string, PersonDef> = Object.fromEntries(
  PEOPLE.map((p) => [p.id, p]),
);

// NPC, se kterými si můžeš povídat a hrát minihry (mimo hráče "ty").
export const NPCS = ["tomas", "maruska", "tony"];

// Když hráč postaví stavbu přímo na někoho, ten slušně uhne a něco prohodí.
const STEP_ASIDE: Record<string, string[]> = {
  tomas: [
    "Hele, tady zrovna stojím! …no nic, uhnu.",
    "Kdyby ses ptal, tak tenhle metr byl můj. 😄",
  ],
  maruska: [
    "Jejda! Skoro jsi mě zazdil. Popojdu kousek.",
    "Ty stavíš rychleji, než stačím uhýbat. 🙂",
  ],
  tony: [
    "Pozor na kabely, člověče! Ustupuju.",
    "Chvilku a měl jsem střechu nad hlavou. Tak jo, jdu vedle.",
  ],
};

/** Hláška NPC, které muselo uhnout nové stavbě. */
export function stepAsideLine(npcId: string): string {
  const lines = STEP_ASIDE[npcId] ?? ["Uhýbám, uhýbám!"];
  return lines[Math.floor(Math.random() * lines.length)];
}
