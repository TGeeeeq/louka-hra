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
  { id: "f_mata", category: "byliny", title: "Máta peprná", text: "Rozemni lísteček v prstech a voní celá ruka. Mátový čaj chladí, uklidňuje žaludek — a na Louce roste jak divá." },
  { id: "f_medunka", category: "byliny", title: "Meduňka lékařská", text: "Voní po citronu a včely ji zbožňují — „melissa“ je řecky včela. Čaj z meduňky pomáhá usnout." },
  { id: "f_jitrocel", category: "byliny", title: "Jitrocel kopinatý", text: "Roste na každé cestičce. List rozemnutý na štípanec nebo odřeninu uleví — polní náplast našich babiček." },
  { id: "f_sedmikraska", category: "byliny", title: "Sedmikráska chudobka", text: "Kvete skoro celý rok a květy se zavírají na noc a před deštěm. Mladé lístky se dají přidat do salátu." },
  { id: "f_pampeliska", category: "byliny", title: "Pampeliška", text: "Žádný plevel — mladé listy do salátu, z květů sirup „pampeliškový med“ a kořen si pochvalují játra." },
  { id: "f_sipek_c", category: "byliny", title: "Šípky — vitaminová bomba", text: "Šípky mají víc vitaminu C než citrony. Sbírají se po prvních mrazících, kdy zesládnou — čaj z nich hřeje celou zimu." },
  { id: "f_bez", category: "byliny", title: "Bez černý", text: "Květy voní po létě a dělá se z nich sirup i „kosmatice“. Pozor: syrové bobule dráždí — vařené jsou v pořádku." },
  { id: "f_lipa", category: "byliny", title: "Lipový květ", text: "Lípa kvete jen pár týdnů a voní přes celou louku. Lipový čaj je první pomoc při nachlazení — a strom se dožívá stovek let." },
  { id: "f_kontryhel", category: "byliny", title: "Kontryhel a kapky rosy", text: "V řasnatých listech kontryhelu se drží kapky rosy jak perly. Alchymisté je sbírali — odtud latinské jméno Alchemilla." },

  // --- Příroda / les -------------------------------------------------------
  { id: "f_liska", category: "priroda", title: "Liška a noční návštěvy", text: "Liška obejde v noci velké území a slyší myš pod sněhem na deset metrů. Proto se drůbež na noc zavírá — venku je les." },
  { id: "f_zizala", category: "priroda", title: "Žížaly — tichý pluh", text: "Žížala provzdušní a promísí půdu líp než rýč. Na louce jich pod jedním krokem může být i dvě stě." },
  { id: "f_vcely", category: "priroda", title: "Včely a louka", text: "Pestrá květnatá louka uživí desítky druhů opylovačů. Jediná včela za život nasbírá nektar sotva na lžičku medu." },
  { id: "f_netopyr", category: "priroda", title: "Netopýři nad statkem", text: "Jeden netopýr slupne za noc tisíce komárů. Orientuje se echem — vysílá zvuk a poslouchá ozvěnu." },
  { id: "f_mech", category: "priroda", title: "Mech drží vodu", text: "Mech v lese funguje jako houba — zadrží vodu a pouští ji pomalu. Proto les po dešti dlouho „dýchá“ vlhkost." },
  { id: "f_houby", category: "priroda", title: "Houby pod zemí", text: "To, co sbíráme, je jen plodnice. Vlastní houba je síť vláken v zemi, která propojuje stromy a pomáhá jim sdílet živiny." },
  { id: "f_srnec", category: "priroda", title: "Srnčí na kraji lesa", text: "Srnec za úsvitu a soumraku vychází na louku spásat. Když ztuhne a dívá se, neutíká hned — testuje, jestli jsi nebezpečí." },
  { id: "f_liska_duvera", category: "priroda", title: "Liška a důvěra", text: "Divoké zvíře si nezískáš silou ani spěchem. Liška si pamatuje, kdo jí nikdy neublížil — a za trpělivost se odvděčí důvěrou. Krmí se vždy na jejím území, ne z ruky." },
  { id: "f_kane", category: "priroda", title: "Káně — spojenec louky", text: "Káně lesní uloví stovky hrabošů ročně. Pro louku je to pomocník, ne nepřítel — a drůbeži stačí keř nebo síť, kam se před stínem shora schová." },
  { id: "f_jezek_mleko", category: "priroda", title: "Ježek a miska mléka", text: "Ježkům se mléko nedává — neumí ho strávit a škodí jim. Nejvíc pomůže miska vody, hromada listí na zimu a zahrada bez chemie. Slimáky vyluxuje jako profík." },
  { id: "f_srnka_krmeni", category: "priroda", title: "Srnky a pečivo", text: "Srnky se nekrmí pečivem — jejich bachor ho neumí strávit a onemocní z něj. Nejlepší dar pro srnku je klid a kus louky, kde se může v bezpečí pást." },
  { id: "f_vlastovky", category: "priroda", title: "Vlaštovky pod střechou", text: "Vlaštovčí hnízdo u chléva je požehnání — jedna rodina schlamstne denně tisíce much. Na podzim odlétají až do Afriky a na jaře trefí zpět do TÉHOŽ hnízda." },
  { id: "f_svetlusky", category: "priroda", title: "Světlušky", text: "Červnové noci na Louce blikají — světlušky si svítí na námluvy „studeným světlem“ bez tepla. Potřebují tmu: kde se svítí lampami, mizí." },
  { id: "f_mravenci", category: "priroda", title: "Mravenčí úklidová četa", text: "Mraveniště v lese je zdravotní policie: mravenci odklidí zbytky, roznesou semínka a provzdušní půdu. Jedno velké mraveniště obslouží kus lesa jak celá četa." },

  // --- Roční období --------------------------------------------------------
  { id: "f_zima_jidlo", category: "obdobi", title: "Proč se v zimě víc krmí", text: "V mraze tělo spaluje energii hlavně na zahřátí. Zvířata proto v zimě sežerou výrazně víc než v létě — a potřebují suché závětří." },
  { id: "f_pelichani", category: "obdobi", title: "Línání a srst", text: "Na podzim mnohá zvířata mění srst za hustší zimní kožich. Slepice na podzim línají a pár týdnů skoro nesnášejí — šetří síly na nové peří." },
  { id: "f_seno", category: "obdobi", title: "Seno = zakonzervované léto", text: "Posekaná a usušená letní tráva uchová živiny na celou zimu. Vlhké seno plesniví, proto se musí dobře usušit a uskladnit v suchu." },
  { id: "f_jaro_mlat", category: "obdobi", title: "Jaro a mláďata", text: "Na jaře se rodí mláďata — přibývá krků k nakrmení. Proto se na statku na jaře plánuje zásoba krmiva dopředu." },
  { id: "f_babi_leto", category: "obdobi", title: "Babí léto", text: "Ta stříbrná vlákna plachtící vzduchem na podzim jsou pavučinky mladých pavoučků — cestují na nich i kilometry daleko. Odtud jméno „babí léto“." },

  // --- Zvířata (péče, hra, chování) ----------------------------------------
  { id: "f_okusovani", category: "zvirata", title: "Osli a okusování", text: "Osli zkoumají svět pusou a rádi hravě okusují rukávy i prsty — není to zlost, ale zvědavost. Mají skvělou paměť a pamatují si tě klidně 30 let." },
  { id: "f_trkani", category: "zvirata", title: "Trkání je hra", text: "Berani a mufloni do sebe ťukají hlavami, aby si změřili síly a určili pořadí ve stádu. Není to boj — rohy jim navíc rostou celý život a podle nich se pozná věk." },
  { id: "f_mazleni", category: "zvirata", title: "Kočičí předení", text: "Kočka přede nejen ze spokojenosti. Jemné vibrace kolem 25 Hz ji uklidňují a podle studií pomáhají hojit i kosti a svaly — vlastní lékárnička v kožichu." },
  { id: "f_podestylka", category: "zvirata", title: "Suchá podestýlka = zdraví", text: "Vlhká podestýlka začne čpět čpavkem a dráždí dýchací cesty. Pravidelné vyhrabání a čerstvá sláma drží zvířata zdravá — a starý hnůj putuje na kompost." },
  { id: "f_klovaci", category: "zvirata", title: "Klovací pořádek", text: "Slepičí hejno má přesnou hierarchii — „klovací pořádek“. Každá slepice ví, před kým uhne a kdo uhne před ní. Nová slepice si své místo musí vyjednat." },
  { id: "f_prase_cistota", category: "zvirata", title: "Prasata jsou čistotná", text: "Navzdory pověsti si prase nikdy nezašpiní pelech — záchod má vždycky v opačném rohu. Bláto není špína, ale opalovací krém a klimatizace." },
  { id: "f_drbani", category: "zvirata", title: "Prase a drbání na bříšku", text: "Podrbané prase se blahem svalí na bok a natáhne nožky. Mají rády kontakt a přesně si pamatují, kdo je hodný — inteligencí předčí i psy." },
  { id: "f_pes_hra", category: "zvirata", title: "Psí řeč ocasu", text: "Vrtění ocasem není vždy radost — pes jím mluví. Volné, široké vrtění znamená pohodu, ztuhlý vysoký ocas napětí. A hra s člověkem je pro psa pouto na celý život." },
  { id: "f_husy_v", category: "zvirata", title: "Husí štafeta", text: "Husy letí ve „V“, protože každá šetří síly v úplavu té před sebou. Vedoucí pozici si spravedlivě střídají — a zadní na ty přední kejhají povzbuzení." },

  // --- Smysl azylu ---------------------------------------------------------
  { id: "f_azyl", category: "azyl", title: "Co je azyl pro zvířata", text: "Azyl není zoo ani farma. Zachráněná zvířata tu dožívají v klidu — nikdo je nevyužívá ani neporáží. Cílem je důstojný život až do konce." },
  { id: "f_adopce", category: "azyl", title: "Virtuální adopce", text: "Adoptovat zvíře „na dálku“ znamená přispívat na jeho krmení a péči. Zvíře zůstává na Louce, ty dostáváš zprávy, jak se mu daří." },
  { id: "f_permakultura", category: "azyl", title: "Permakultura", text: "Hospodaření, které napodobuje přírodu: nic nepřijde nazmar, odpad se kompostuje a záhony se navzájem podporují. Méně práce, víc úrody." },
  { id: "f_dary", category: "azyl", title: "Z čeho azyl žije", text: "Provoz drží dary, virtuální adopce a prodej vlastních výrobků — mastí, bylin a ruční tvorby. Krmivo pro stovku zvířat není levné." },
  { id: "f_dobrovolnici", category: "azyl", title: "Dobrovolníci na Louce", text: "Na Louku jezdí pomáhat dobrovolníci — kydat, stavět, kosit i se mazlit. Odjíždějí špinaví, unavení a divně šťastní. Přidat se může každý." },

  // --- Senné DLC -----------------------------------------------------------
  { id: "f_otava", category: "obdobi", title: "Otava — druhá seč", text: "Tráva posekaná podruhé za léto se jmenuje otava. Je jemnější a zvířata ji milují — luční dezert.", dlc: "senne" },
  { id: "f_mokre_seno", category: "obdobi", title: "Mokré seno umí hořet", text: "Vlhké seno ve stohu zapaří — bakterie ho zahřejí i přes 70 °C a stoh může sám vzplát. Proto se seno suší tak poctivě.", dlc: "senne" },
  { id: "f_kopky", category: "obdobi", title: "Kopky nejsou dekorace", text: "Seno se na noc hrabe do kopek: menší povrch = míň rosy. Ráno se zase rozhodí. Dřina? Dřina. Ale funguje to staletí.", dlc: "senne" },
  { id: "f_seno_sbirka", category: "azyl", title: "Sbírka na seno", text: "Skutečná Louka spotřebuje přes zimu desítky balíků sena. Azyl na ně pořádá sbírku — i malý příspěvek znamená plné jesle.", dlc: "senne" },
];

export const FACT_BY_ID: Record<string, Fact> = Object.fromEntries(
  FACTS.map((f) => [f.id, f]),
);

// Skupiny faktů navázané na konkrétní činnosti (vyskočí při práci).
export const FORAGE_FACTS = [
  "f_rebricek", "f_mesicek", "f_trezalka", "f_kopriva", "f_hermanek", "f_podbel",
  "f_mata", "f_medunka", "f_jitrocel", "f_sedmikraska", "f_pampeliska", "f_bez", "f_lipa", "f_kontryhel",
];
export const NIGHT_FACTS = ["f_liska", "f_netopyr", "f_svetlusky"];
export const WINTER_FACTS = ["f_zima_jidlo", "f_seno", "f_pelichani", "f_sipek_c"];
export const CLEAN_FACTS = ["f_podestylka", "f_zizala", "f_permakultura", "f_mech", "f_mravenci", "f_prase_cistota", "f_klovaci"];
