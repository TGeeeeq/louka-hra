import type { Fact } from "../types";

// Naučná fakta — objevují se při práci a sbírají se do Deníku.
// Vše česky a ověřené. Mají hru udělat poučnou o přírodě a zvířatech.
export const FACTS: Fact[] = [
  // --- Byliny --------------------------------------------------------------
  { id: "f_rebricek", category: "byliny", title: "Řebříček lékařský", text: "Roste skoro na každé mezi. Zastavuje drobné krvácení a hojí ranky — vojáci ho prý nosili do boje, odtud „vojenská bylina“." },
  { id: "f_mesicek", category: "byliny", title: "Měsíček lékařský", text: "Oranžové kvítky se sbírají za slunečného dne. Mast z měsíčku patří k nejznámějším na popraskanou a podrážděnou pokožku." },
  { id: "f_trezalka", category: "byliny", title: "Třezalka tečkovaná", text: "Když lístek podržíš proti světlu, uvidíš „dírky“ — jsou to žlázky s červeným olejem. Sbírá se o svatojánské noci." },
  { id: "f_kopriva", category: "byliny", title: "Kopřiva dvoudomá", text: "Pálí, ale je to poklad: plná železa a vitaminů. Sušená v zimě posiluje zvířata i lidi a z mladé se vaří jarní polévka." },
  { id: "f_hermanek", category: "byliny", title: "Heřmánek pravý", text: "Voní po jablku a zklidňuje. Poznáš ho podle dutého květního lůžka — to plané heřmánky nemají." },
  { id: "f_podbel", category: "byliny", title: "Podběl lékařský", text: "Jeden z prvních jarních květů — žluté hlavičky vykouknou dřív než listy. Odpradávna pomáhá na kašel." },

  // --- Příroda / les -------------------------------------------------------
  { id: "f_liska", category: "priroda", title: "Liška a noční návštěvy", text: "Liška obejde v noci velké území a slyší myš pod sněhem na deset metrů. Proto se drůbež na noc zavírá — venku je les." },
  { id: "f_zizala", category: "priroda", title: "Žížaly — tichý pluh", text: "Žížala provzdušní a promísí půdu líp než rýč. Na louce jich pod jedním krokem může být i dvě stě." },
  { id: "f_vcely", category: "priroda", title: "Včely a louka", text: "Pestrá květnatá louka uživí desítky druhů opylovačů. Jediná včela za život nasbírá nektar sotva na lžičku medu." },
  { id: "f_netopyr", category: "priroda", title: "Netopýři nad statkem", text: "Jeden netopýr slupne za noc tisíce komárů. Orientuje se echem — vysílá zvuk a poslouchá ozvěnu." },
  { id: "f_mech", category: "priroda", title: "Mech drží vodu", text: "Mech v lese funguje jako houba — zadrží vodu a pouští ji pomalu. Proto les po dešti dlouho „dýchá“ vlhkost." },
  { id: "f_houby", category: "priroda", title: "Houby pod zemí", text: "To, co sbíráme, je jen plodnice. Vlastní houba je síť vláken v zemi, která propojuje stromy a pomáhá jim sdílet živiny." },
  { id: "f_srnec", category: "priroda", title: "Srnčí na kraji lesa", text: "Srnec za úsvitu a soumraku vychází na louku spásat. Když ztuhne a dívá se, neutíká hned — testuje, jestli jsi nebezpečí." },

  // --- Roční období --------------------------------------------------------
  { id: "f_zima_jidlo", category: "obdobi", title: "Proč se v zimě víc krmí", text: "V mraze tělo spaluje energii hlavně na zahřátí. Zvířata proto v zimě sežerou výrazně víc než v létě — a potřebují suché závětří." },
  { id: "f_pelichani", category: "obdobi", title: "Línání a srst", text: "Na podzim mnohá zvířata mění srst za hustší zimní kožich. Slepice na podzim línají a pár týdnů skoro nesnášejí — šetří síly na nové peří." },
  { id: "f_seno", category: "obdobi", title: "Seno = zakonzervované léto", text: "Posekaná a usušená letní tráva uchová živiny na celou zimu. Vlhké seno plesniví, proto se musí dobře usušit a uskladnit v suchu." },
  { id: "f_jaro_mlat", category: "obdobi", title: "Jaro a mláďata", text: "Na jaře se rodí mláďata — přibývá krků k nakrmení. Proto se na statku na jaře plánuje zásoba krmiva dopředu." },

  // --- Smysl azylu ---------------------------------------------------------
  { id: "f_azyl", category: "azyl", title: "Co je azyl pro zvířata", text: "Azyl není zoo ani farma. Zachráněná zvířata tu dožívají v klidu — nikdo je nevyužívá ani neporáží. Cílem je důstojný život až do konce." },
  { id: "f_adopce", category: "azyl", title: "Virtuální adopce", text: "Adoptovat zvíře „na dálku“ znamená přispívat na jeho krmení a péči. Zvíře zůstává na Louce, ty dostáváš zprávy, jak se mu daří." },
  { id: "f_permakultura", category: "azyl", title: "Permakultura", text: "Hospodaření, které napodobuje přírodu: nic nepřijde nazmar, odpad se kompostuje a záhony se navzájem podporují. Méně práce, víc úrody." },
  { id: "f_dary", category: "azyl", title: "Z čeho azyl žije", text: "Provoz drží dary, virtuální adopce a prodej vlastních výrobků — mastí, bylin a ruční tvorby. Krmivo pro stovku zvířat není levné." },
];

export const FACT_BY_ID: Record<string, Fact> = Object.fromEntries(
  FACTS.map((f) => [f.id, f]),
);

// Skupiny faktů navázané na konkrétní činnosti (vyskočí při práci).
export const FORAGE_FACTS = ["f_rebricek", "f_mesicek", "f_trezalka", "f_kopriva", "f_hermanek", "f_podbel"];
export const NIGHT_FACTS = ["f_liska", "f_netopyr"];
export const WINTER_FACTS = ["f_zima_jidlo", "f_seno", "f_pelichani"];
export const CLEAN_FACTS = ["f_zizala", "f_permakultura", "f_mech"];
