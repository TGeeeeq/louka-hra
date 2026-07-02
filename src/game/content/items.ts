import type { ItemDef } from "../types";

// Všechny předměty hry. buyPrice/sellPrice v Kč; chybí = nelze koupit/prodat.
export const ITEMS: ItemDef[] = [
  // --- Krmivo --------------------------------------------------------------
  { id: "obili", name: "Obilí", emoji: "🌾", kind: "krmivo", buyPrice: 7, desc: "Základ krmné směsi pro drůbež." },
  { id: "kukurice", name: "Kukuřice", emoji: "🌽", kind: "krmivo", buyPrice: 6, desc: "Energie pro slepice, husy i kachny." },
  { id: "krmna_smes", name: "Krmná směs", emoji: "🥣", kind: "krmivo", buyPrice: 17, desc: "Namíchané krmení pro drůbež. Levnější, když si ji namícháš sám." },
  { id: "granule", name: "Granule", emoji: "🦴", kind: "krmivo", buyPrice: 14, desc: "Pro psy, kočky a králíky." },
  { id: "seno", name: "Balík sena", emoji: "🟨", kind: "krmivo", buyPrice: 125, desc: "Jeden balík nakrmí celé stádo na den. Musí se přivalit a rozdělat." },
  { id: "zelenina", name: "Zelenina", emoji: "🥕", kind: "surovina", buyPrice: 9, sellPrice: 3, desc: "Na vaření pro prasata i pro tebe. Vypěstuješ ji i v zahradě." },
  { id: "brambory", name: "Brambory", emoji: "🥔", kind: "surovina", buyPrice: 7, sellPrice: 2, desc: "Sytá základní surovina." },
  { id: "vareno", name: "Vařené krmivo", emoji: "🍲", kind: "krmivo", desc: "Teplá strava pro prasata. Musí se uvařit na ohni." },

  // --- Suroviny a palivo ---------------------------------------------------
  { id: "byliny", name: "Byliny", emoji: "🌿", kind: "surovina", sellPrice: 11, desc: "Řebříček, měsíček, třezalka… Posbíráš je v lese. Základ mastí a čajů." },
  { id: "kvety", name: "Luční květy", emoji: "🌼", kind: "surovina", sellPrice: 14, desc: "Bezový a lipový květ z letní louky. Základ voňavého sirupu." },
  { id: "sipek", name: "Šípky", emoji: "🍒", kind: "surovina", sellPrice: 12, desc: "Podzimní vitaminová bomba — víc céčka než citron. Na čaj jak dělané." },
  { id: "tuk", name: "Sádlo / olej", emoji: "🧈", kind: "surovina", buyPrice: 22, desc: "Tukový základ pro výrobu masti." },
  { id: "sklenice", name: "Sklenička", emoji: "🫙", kind: "surovina", buyPrice: 5, desc: "Do ní se plní hotová mast." },
  { id: "drevo", name: "Dřevo", emoji: "🪵", kind: "palivo", buyPrice: 16, desc: "Na oheň, vaření a v zimě na topení. Naštípeš ho i sám." },

  // --- Tvoje strava (survival) --------------------------------------------
  { id: "chleba", name: "Chleba", emoji: "🍞", kind: "jidlo", buyPrice: 17, desc: "Rychle zažene hlad." },
  { id: "polevka", name: "Polévka", emoji: "🥘", kind: "jidlo", desc: "Pořádně nasytí a zahřeje. Uvaříš ji na ohni." },
  { id: "voda", name: "Voda", emoji: "💧", kind: "jidlo", buyPrice: 3, desc: "Uhasí žízeň. Zdarma, když máš studnu." },

  // --- Produkty na prodej --------------------------------------------------
  { id: "vejce", name: "Vejce", emoji: "🥚", kind: "produkt", sellPrice: 6, desc: "Od slepic a kachen. Sesbíráš je každé ráno." },
  { id: "vlna", name: "Vlna", emoji: "🧶", kind: "produkt", sellPrice: 70, desc: "Z ostříhaných ovcí. Na jaře jich je nejvíc." },
  { id: "mast", name: "Řebříčková mast", emoji: "🪻", kind: "produkt", sellPrice: 165, desc: "Bylinná mast z Louky — skutečný výrobek azylu. Nejlepší výdělek." },
  { id: "caj", name: "Bylinný čaj", emoji: "🍵", kind: "produkt", sellPrice: 55, desc: "Sušené byliny z Louky. Můžeš ho prodat, nebo si jím zahřát duši." },
  { id: "sirup", name: "Květový sirup", emoji: "🍯", kind: "produkt", sellPrice: 95, desc: "Bezový a lipový sirup z letní louky. Na stánku mizí, sotva ho vyložíš." },

  // --- Senné DLC -----------------------------------------------------------
  { id: "pokosena_trava", name: "Pokosená tráva", emoji: "🌱", kind: "surovina", desc: "Čerstvě pokosená tráva ze seniště. Rozhoď ji na sušení — a hlídej nebe.", dlc: "senne" },
  { id: "mokre_seno", name: "Zavlhlé seno", emoji: "💧", kind: "surovina", desc: "Zmoklo. Musí se znovu rozhodit a usušit, jinak zplesniví.", dlc: "senne" },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);

export const BUYABLE = ITEMS.filter((i) => i.buyPrice != null);
export const SELLABLE = ITEMS.filter((i) => i.sellPrice != null);
