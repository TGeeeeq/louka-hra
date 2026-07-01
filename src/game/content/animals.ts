// Skuteční obyvatelé Louky. Jména a povahy přebrané z nechmerust.org
// (stránka "Zvířecí obyvatelé"). Naučná fakta jsou ověřená a česky.
import type { AnimalDef, Species } from "../types";

export const ANIMALS: AnimalDef[] = [
  // ---- DRŮBEŽ (ráno se vypouští, večer zavírá) ----------------------------
  {
    id: "pipinky",
    name: "Pipinky",
    species: "slepice",
    feedGroup: "drubez",
    personality: "Malí a roztomilí obyvatelé naší Louky.",
    fact: "Slepice se dorozumívají více než 30 různými zvuky a se svými kuřaty si „povídají“ už když jsou ještě ve vejci.",
    // Bílé slepičky s červenými hřebínky (pár zrzavých mezi nimi) — podle fotky.
    palette: { body: "#f2efe8", bodyDark: "#d5cfc2", belly: "#faf8f2", detail: "#d42a1e", accent: "#d8a028" },
  },
  {
    id: "husy",
    name: "Husy",
    species: "husa",
    feedGroup: "drubez",
    personality: "Strážkyně dvora — kdo přijde, ten to ví. Tvoří věrné páry.",
    fact: "Husy bývají věrné na celý život a v letové formaci „V“ si navzájem šetří síly — vedoucí se střídají.",
    palette: { body: "#f5f2ec", bodyDark: "#d8d2c4", belly: "#fbf9f4", detail: "#e89c3c", accent: "#d98c3c" },
  },
  {
    id: "kachny",
    name: "Kachny",
    species: "kachna",
    feedGroup: "drubez",
    personality: "Rozšťebetané a věčně u vody.",
    fact: "Kachní peří je voděodolné — kachna si ho maže tukem z kostrční žlázy, proto z něj voda steče.",
    // Bílé kachny s růžovooranžovým zobákem a tmavou čepičkou — podle fotky.
    palette: { body: "#f4f0e0", bodyDark: "#d8d0b8", belly: "#fbf8ee", detail: "#e09a7a", accent: "#2b2620" },
    variant: "cap",
  },
  {
    id: "holoubci",
    name: "Holoubci",
    species: "holub",
    feedGroup: "drubez",
    personality: "Krásní ptáci, kteří přinášejí klid a harmonii.",
    fact: "Holubi trefí domů i ze stovek kilometrů — vnímají magnetické pole Země a orientují se i podle slunce.",
    // Sněhobílí holoubci s růžovým zobáčkem a nohama — podle fotky.
    palette: { body: "#f7f6f2", bodyDark: "#d8d5cc", belly: "#fdfcf9", detail: "#d9b0a6", accent: "#c4636e" },
  },

  // ---- PRASATA (vařené krmivo) --------------------------------------------
  {
    id: "princezna",
    name: "Princezna",
    species: "prase",
    feedGroup: "prasata",
    personality:
      "Ušlechtilá černá kříženka divočáka, jejíž královská noblesa se při prvním zakručení v břiše promění v nezastavitelnou slintavou potopu.",
    fact: "Prasata patří mezi nejchytřejší zvířata — poznají se v zrcadle a v testech předčí i psy.",
    // Černohnědá divočačí kříženka s prošedivělým rypákem a hřebenem štětin.
    palette: { body: "#3a3129", bodyDark: "#211c16", belly: "#8a6a5e", detail: "#7a6a56", accent: "#2a2422" },
    variant: "boar",
  },
  {
    id: "flicek",
    name: "Flíček",
    species: "prase",
    feedGroup: "prasata",
    personality: "Prasík, co má rád drbání na bříšku.",
    fact: "Prasata se válí v bahně, protože nemají skoro žádné potní žlázy — bláto je chladí a chrání kůži před sluncem.",
    // Šedorůžový pupkáč s velkými tmavými flíčky — podle fotky.
    palette: { body: "#a89a94", bodyDark: "#6a5f5a", belly: "#d9958f", detail: "#d98b95", accent: "#4a4440" },
    variant: "patches",
  },

  // ---- STÁDO (seno: krávy, ovce, berani, osel, muflon) --------------------
  {
    id: "karel",
    name: "Karel",
    species: "osel",
    feedGroup: "stado",
    personality: "Hravý osel s velkým srdcem a lehce kousavou povahou.",
    fact: "Osli mají skvělou paměť a dožívají se 30–50 let. Nejsou tvrdohlaví — když se zastaví, obvykle zvažují nebezpečí.",
    // Tmavě čokoládový osel se světlou tlamou a plavým vnitřkem uší — podle fotky.
    palette: { body: "#453931", bodyDark: "#2e251e", belly: "#beb6ac", detail: "#8a7a6a", accent: "#a3663a" },
  },
  {
    id: "yakul",
    name: "Yakul",
    species: "muflon",
    feedGroup: "stado",
    personality: "Rozverný mladý muflon, který objevuje, k čemu slouží rohy.",
    fact: "Muflon je nejmenší evropská divoká ovce. Mohutné stočené rohy beranů rostou celý život a prozradí i jejich věk.",
    palette: { body: "#8a5a36", bodyDark: "#5e3b22", belly: "#d9b48c", detail: "#e8e2d0", accent: "#3a2616" },
    variant: "rohy",
  },
  {
    id: "avala",
    name: "Avala",
    species: "krava",
    feedGroup: "stado",
    personality: "Mazlivá kráva, která miluje běhání po louce.",
    fact: "Krávy mají nejlepší kamarádky a stresují se, když je od nich někdo oddělí. Pamatují si přes 50 tváří.",
    // Bílá kráva s kaštanově rezavými skvrnami a růžovou tlamou — podle fotky.
    palette: { body: "#ece8e0", bodyDark: "#8a4a26", belly: "#f7f4ef", detail: "#cfa093", accent: "#8a4a26" },
    variant: "strakata",
  },
  {
    id: "kveta",
    name: "Květa",
    species: "krava",
    feedGroup: "stado",
    personality: "Klidná kravka, co má ráda svůj klid a je věrnou společnicí Avaly.",
    fact: "Dojnice i kráva bez telete prožívají silné přátelské vazby — leží ráda vedle své oblíbené družky.",
    // Kaštanová kravka s bílou lysinou přes celý obličej — podle fotky.
    palette: { body: "#9a5a2e", bodyDark: "#6e3f1e", belly: "#efe9df", detail: "#cfa093", accent: "#5a3a22" },
    variant: "hneda lysina",
  },
  {
    id: "pogo",
    name: "Pogo",
    species: "ovce",
    feedGroup: "stado",
    personality: "Energická ovčí kamarádka.",
    fact: "Ovce rozeznají až 50 obličejů — ovčích i lidských — a pamatují si je roky. Mají skoro kruhové vidění.",
    // Krémové rouno a uhlově černá hlava i nohy (suffolčí typ) — podle fotky.
    palette: { body: "#ded0b4", bodyDark: "#c2b294", belly: "#f0e8d4", detail: "#211d1a", accent: "#211d1a" },
    variant: "ovce",
  },
  {
    id: "lucinka",
    name: "Lucinka",
    species: "ovce",
    feedGroup: "stado",
    personality: "Veselá a přátelská ovčí babička.",
    fact: "Ovce jsou velmi družné — osamělá ovce strádá. Ve stádu se cítí bezpečně a navzájem se hlídají.",
    // Čerstvě ostříhaná krémová babička s narůžovělou tváří — podle fotky.
    palette: { body: "#cfc0a8", bodyDark: "#b3a288", belly: "#e2d6c0", detail: "#c4ad94", accent: "#8a7a66" },
    variant: "stara",
  },
  {
    id: "anaya",
    name: "Anaya",
    species: "ovce",
    feedGroup: "stado",
    personality: "Veselá a přátelská ovčí obyvatelka.",
    fact: "Ovčí vlna roste neustále — proto se ovce na jaře stříhá, aby jí v létě nebylo příliš horko.",
    // Šedoplavá rozčepýřená vlna a ofina do čela — podle fotky.
    palette: { body: "#a3937c", bodyDark: "#857662", belly: "#c2b49c", detail: "#cdbfa9", accent: "#6a5c48" },
    variant: "ovce ofina",
  },
  {
    id: "eduard",
    name: "Eduard",
    species: "ovce",
    feedGroup: "stado",
    personality: "Důstojný a klidný člen naší zvířecí rodiny.",
    fact: "Beran dává rohy k dobru hlavně na jaře v době námluv — jinak je to klidný strážce stáda.",
    // Rezavý kamerunský beran s mohutnými stočenými rohy a prošedivělou tlamou.
    palette: { body: "#8f4f26", bodyDark: "#63351a", belly: "#b8ad9e", detail: "#4a3626", accent: "#b39a76" },
    variant: "beran",
  },
  {
    id: "emil",
    name: "Emil",
    species: "ovce",
    feedGroup: "stado",
    personality: "Bezrohý (už) obyvatel Louky. Nehne se od Amálky.",
    fact: "Zvířata si tvoří nerozlučné páry. Emil a Amálka se drží spolu — odloučení by je oba stresovalo.",
    // Kamerunská ovce: sytě červenohnědé tělo, černá hlava, hříva i nohy.
    palette: { body: "#7e4322", bodyDark: "#572d15", belly: "#9a6a42", detail: "#241f1c", accent: "#241f1c" },
    variant: "bezrohy mane",
  },
  {
    id: "amalka",
    name: "Amálka",
    species: "ovce",
    feedGroup: "stado",
    personality: "Jemná a láskyplná obyvatelka Louky. Nehne se od Emila.",
    fact: "Ovce poznají náladu z výrazu tváře a raději se dívají na klidné, usměvavé obličeje než na rozzlobené.",
    // Kamerunská ovečka: plavé rouno, čokoládová hlava, drobné růžky — podle fotky.
    palette: { body: "#b98d5c", bodyDark: "#96703f", belly: "#d8c09a", detail: "#33291f", accent: "#8a7458" },
    variant: "ovce ruzky",
  },
  {
    id: "kulich",
    name: "Kulich",
    species: "ovce",
    feedGroup: "stado",
    personality: "Milý a přátelský obyvatel naší Louky.",
    fact: "Ovce se navzájem oslovují bečením a jehňata poznají hlas své matky v celém stádu.",
    // Šedoplavý beran s velkými vroubkovanými rohy a růžovou tváří — podle fotky.
    palette: { body: "#c9c2b4", bodyDark: "#a89f8c", belly: "#e0dbd0", detail: "#cfc0b0", accent: "#9c8874" },
    variant: "beran",
  },
  {
    id: "konci",
    name: "Končí",
    species: "ovce",
    feedGroup: "stado",
    personality: "Zvědavý a aktivní člen naší komunity.",
    fact: "Ovce dokážou řešit jednoduché bludiště a pamatují si cestu k jídlu i po měsících.",
    // Obrovské nestříhané krémové rouno, tvářička skoro utopená ve vlně — podle fotky.
    palette: { body: "#d8c9a8", bodyDark: "#b8a887", belly: "#ecdfc2", detail: "#c9b295", accent: "#8a7a5e" },
    variant: "ovce ofina",
  },

  // ---- MAZLÍCI (psi, kočky, králíci) --------------------------------------
  {
    id: "riky",
    name: "Riky",
    species: "pes",
    feedGroup: "mazlici",
    personality: "Hravý pes, který hlídá celou Louku.",
    fact: "Psi vnímají svět hlavně čichem — mají až 300 milionů čichových buněk, člověk jen kolem šesti.",
    // Malý rozcuchaný černohnědý pejsek s prošedivělou bradkou — podle fotky.
    palette: { body: "#2e2824", bodyDark: "#1a1613", belly: "#9a938a", detail: "#9a938a", accent: "#6a635a" },
    variant: "scruffy",
  },
  {
    id: "kesy",
    name: "Kesy",
    species: "pes",
    feedGroup: "mazlici",
    personality:
      "Vypadá jako obří chlupatý medvěd a má rozvážnost zenového mistra. Povely bere jen jako doporučení.",
    fact: "Velká pastevecká plemena jsou samostatná — byla šlechtěna, aby u stáda rozhodovala sama, i bez člověka.",
    // Obří šedý pastevec s tmavou maskou a bílou náprsenkou — podle fotky.
    palette: { body: "#6e675e", bodyDark: "#4a423a", belly: "#e8e4dc", detail: "#3a2f28", accent: "#8a7a64" },
    variant: "shaggy bear",
  },
  {
    id: "atila",
    name: "Atila",
    species: "pes",
    feedGroup: "mazlici",
    personality: "Věrná kamarádka a velká milovnice jídla.",
    fact: "Psi rozumějí lidským gestům — sledují, kam ukazujeme, což kromě nich umí málokteré zvíře.",
    // Leskle černá labradorka s věčným úsměvem a vyplazeným jazykem — podle fotky.
    palette: { body: "#26221e", bodyDark: "#141210", belly: "#3a342e", detail: "#1c1a18", accent: "#d97f8a" },
    variant: "tongue",
  },
  {
    id: "denis",
    name: "Denis",
    species: "kocka", // na fotce z webu je Denis zrzavobílý kocour, ne pes
    feedGroup: "mazlici",
    personality: "Velký průzkumník a velký mazel.",
    fact: "Kočičí vousky jsou přesné antény — kocour jimi změří i šířku průlezu. Proto se Denis protáhne tam, kudy by to nikdo nečekal.",
    // Bílý kocour se zrzavými plotnami na hlavě, hřbetě a ocase — podle fotky.
    palette: { body: "#efe8e0", bodyDark: "#d0c4b4", belly: "#f8f3ea", detail: "#d98b3f", accent: "#d98b3f" },
    variant: "patches",
  },
  {
    id: "list",
    name: "List",
    species: "pes",
    feedGroup: "mazlici",
    personality: "Rozverné štěně, které moc rádo zkoumá a ochutnává.",
    fact: "Štěňata prozkoumávají svět tlamou — proto vše ochutnají. List se na Louce stále pohřešuje, vzpomínáme na něj.",
    palette: { body: "#e8dcc4", bodyDark: "#c8b48c", belly: "#f5eedd", detail: "#6a5a44", accent: "#b85c3c" },
    special: "missing",
  },
  {
    id: "roman",
    name: "Roman",
    species: "kocka",
    feedGroup: "mazlici",
    personality: "Nejsvalnatější kocour na celém světě.",
    fact: "Kočka má v každém uchu přes 20 svalů a otočí ušima skoro o 180°, aby zaměřila i tichý zvuk.",
    // Statný zrzavý mourek s tmavším pruhováním a bílými tlapkami — podle fotky.
    palette: { body: "#d08236", bodyDark: "#a35a22", belly: "#e8d9c2", detail: "#7a4a18", accent: "#3a2a14" },
    variant: "muscular tabby",
  },
  {
    id: "safir",
    name: "Safír",
    species: "kocka",
    feedGroup: "mazlici",
    personality: "Nejchundelatější kocour na celém světě.",
    fact: "Kočky prospí 12–16 hodin denně, aby šetřily síly na lov. Předení je uklidňuje a podle studií i hojí.",
    // Chundelatý bílý kocour s šedohnědými plotnami na hřbetě a uších — podle fotky.
    palette: { body: "#f2ede4", bodyDark: "#d5cec2", belly: "#faf6ee", detail: "#71604c", accent: "#71604c" },
    variant: "shaggy patches",
  },
  {
    id: "patricie",
    name: "Patricie",
    species: "kocka",
    feedGroup: "mazlici",
    personality: "Nejumňoukanější kočka na celém světě.",
    fact: "Dospělé kočky mňoukají skoro výhradně na lidi — mezi sebou se baví spíš pachem a řečí těla.",
    // Chlupatá hnědá mourovatá slečna s bílou bradou a chvostem nahoru — podle fotky.
    palette: { body: "#6f5a3e", bodyDark: "#4a3c28", belly: "#e6ded0", detail: "#2c2620", accent: "#e6ded0" },
    variant: "shaggy tabby",
  },
  {
    id: "hanicka",
    name: "Hanička",
    species: "kocka",
    feedGroup: "mazlici",
    personality: "Třínohá kočka samotářka.",
    fact: "Zvířata se zvládnou přizpůsobit i ztrátě nohy — Hanička běhá a šplhá po svém a nic jí nechybí.",
    // Želvovinová: černá s oranžovými plotnami a zrzavou půlkou tlamičky — podle fotky.
    palette: { body: "#26211d", bodyDark: "#16120f", belly: "#c17032", detail: "#c17032", accent: "#8a8276" },
    variant: "tripod tortie",
  },
  {
    id: "lotka",
    name: "Lotka",
    species: "kocka",
    feedGroup: "mazlici",
    personality: "Kočka samotářka.",
    fact: "Každý kočičí nos má jedinečný otisk — stejně jako otisk prstu u člověka.",
    // Želvovinová v barvách černé a meruňkové, světlé přední tlapky — podle fotky.
    palette: { body: "#2a241f", bodyDark: "#191512", belly: "#d9a05e", detail: "#d9a05e", accent: "#46413a" },
    variant: "tortie",
  },
  {
    id: "masa",
    name: "Máša",
    species: "kocka",
    feedGroup: "mazlici",
    personality: "Luční modrooká blondýna.",
    fact: "Modré oči mívají kočky se světlou srstí — barvu očím dává množství pigmentu, ne plemeno.",
    // Stříbřitě krémová s šedým mourováním na nohách a ocase — podle fotky.
    palette: { body: "#d6d2c8", bodyDark: "#b5b0a4", belly: "#f0ede4", detail: "#7d7a70", accent: "#7d7a70" },
    variant: "blueeyes tabby",
  },
  {
    id: "kralici",
    name: "Králíci",
    species: "kralik",
    feedGroup: "mazlici",
    personality: "Králíčci, co si užívají svobody.",
    fact: "Králíci dělají radostné výskoky zvané „binky“. Zuby jim rostou celý život, proto pořád něco okusují.",
    // Hnědý ušák s bílou náprsenkou (a černý kamarád v pozadí) — podle fotky.
    palette: { body: "#8a6a48", bodyDark: "#5e4630", belly: "#ece7db", detail: "#d98c8c", accent: "#24201d" },
  },
];

// Skutečné fotky z nechmerust.org — public/animals/<id>.webp (stahuje `npm run photos`).
// List fotku nemá: pohřešuje se a ve hře zůstává jako vzpomínka.
const WITHOUT_PHOTO = new Set(["list"]);
for (const a of ANIMALS) {
  if (!WITHOUT_PHOTO.has(a.id)) a.photo = `${a.id}.webp`;
}

export const ANIMAL_BY_ID: Record<string, AnimalDef> = Object.fromEntries(
  ANIMALS.map((a) => [a.id, a]),
);

export const ANIMALS_BY_GROUP = {
  drubez: ANIMALS.filter((a) => a.feedGroup === "drubez"),
  prasata: ANIMALS.filter((a) => a.feedGroup === "prasata"),
  stado: ANIMALS.filter((a) => a.feedGroup === "stado"),
  mazlici: ANIMALS.filter((a) => a.feedGroup === "mazlici"),
} as const;

// Reálné relativní velikosti druhů (násobič základní velikosti spritu ve světě).
export const SPECIES_SCALE: Record<Species, number> = {
  krava: 1.75,
  osel: 1.5,
  muflon: 1.4,
  prase: 1.4,
  ovce: 1.18,
  pes: 1.12,
  kocka: 0.82,
  kralik: 0.62,
  husa: 0.92,
  kachna: 0.74,
  slepice: 0.64,
  holub: 0.52,
  // Divocí sousedé
  liska: 1.0,
  kane: 0.8,
  jezek: 0.45,
  srnka: 1.35,
};

// Výjimky pro konkrétní zvířata (mimo druhový průměr).
const SCALE_OVERRIDE: Record<string, number> = {
  kesy: 1.55, // „obří chlupatý medvěd"
  list: 0.74, // štěně
  princezna: 1.5, // statná divočačí kříženka
  flicek: 1.2,
  lucinka: 1.08, // babička
  yakul: 1.2, // „mladý" muflon
  riky: 0.9, // malý rozcuchaný pejsek (podle fotky)
  konci: 1.28, // balvan z nestříhané vlny (podle fotky)
};

export function animalScale(a: AnimalDef): number {
  return a.scale ?? SCALE_OVERRIDE[a.id] ?? SPECIES_SCALE[a.species];
}
