# 🌳 Louka — survival hra azylu *Nech mě růst*

Roztomilá, ale poctivě náročná hra o péči o **přes sto zachráněných zvířat** na louce
uprostřed lesů. Postavičky i příběhy vycházejí ze skutečných obyvatel Louky azylu
[Nech mě růst z.s.](https://nechmerust.org) — osel Karel, prasata Princezna a Flíček,
krávy Avala a Květa, ovce, psi, kočky, drůbež… Není to farma na porážku — zvířata tu
**dožívají v klidu** a hra je o tom se o ně postarat.

Jeden **level = jeden den**. Den má tři fáze a střídají se roční období.

## Hra v kostce

- **Ráno** — vypustit drůbež, nakrmit a napojit drůbež / prasata / stádo / mazlíčky, sesbírat vejce.
- **Poledne** — úklid, štípání dřeva, rozdělání ohně, sběr bylin, **výroba** (řebříčková mast 🪻, čaj, vařené krmivo), stříhání vlny.
- **Večer** — dokrmit a hlavně **zavřít zvířata** před liškou. Pak spát → další den.
- **Ekonomika** — kupuj krmivo/materiál/nářadí, prodávej výrobky, stav **vychytávky** (studna, seník, automatické krmítko, sušárna bylin, permakulturní zahrada…), které ulehčí práci nebo zlevní provoz.
- **Survival** — hlídej vlastní energii, sytost a žízeň; přežij **zimu** (víc krmení, topení dřevem, kratší dny).
- **Poučení** — sběrem bylin, úklidem a péčí objevuješ ověřená **fakta o přírodě a zvířatech** (sbírají se do Deníku).
- **Divocí sousedé, žádné násilí** — liška nikdy nikomu neublíží: trpělivostí a večerní miskou si ji můžeš
  **skamarádit** (questová linka až po mazlení). Káně se řeší úkrytem, ne bojem; ježek hlídá slimáky,
  srnka učí klidu. Každé setkání končí dobře a s ponaučením.
- **Skutečné fotky** — v kartě zvířete a encyklopedii jsou opravdové fotky obyvatel z nechmerust.org
  (stahuje `npm run photos`); sprity vycházejí z reálných předloh.
- **Adaptivní hudba** — vrstvená syntéza (melodie/bas/pad/perkuse): útěk zvířete spustí „heartbeat",
  poplach hnací rytmus, blížící se zima hudbu postupně ztmavuje. Vše Web Audio, žádné soubory.
  Intro/menu navíc hraje jeden nahraný orchestrální track (viz Kredity níže).
- **Seno na zimu** — 🌾 kosení, sušení a svoz sena je běžná questová linka: závod s počasím podle
  skutečné sklizně (a skutečné sbírky) Louky.
- **Demo + plná verze** — na Google Play vychází bezplatné demo (tutoriál a první dny). Jediný
  nákup **Louka — plná hra** (299 Kč) odemkne zbytek natrvalo — celý rok i všechny questové linky
  — a je zároveň skutečnou podporou azylu. Vlastnictví přežije i novou hru.

Spokojená zvířata = dary od příznivců. Zanedbaná = veterinář a ztráty. Bankrot = konec.

## Jak se hraje (prozkoumatelný svět)

Chodíš postavou po Louce (top-down mapa ve stylu Pokémon / Zoo Tycoon):

- **Pohyb:** šipky nebo **WASD**; na mobilu kříž (D-pad) vlevo dole.
- **Akce:** **mezerník / Enter** (na mobilu tlačítko **A**) — když stojíš u zvířete nebo
  stavení, uděláš, co je potřeba (vypustit, nakrmit, sebrat vejce, vařit, prodat, spát…).
- **Stavení:** 🐔 kurník · 🐖 chlívek · 🌾 pastvina · 🦴 pelíšky · ⛲ studna · 🔥 ohniště &
  kuchyně · 🛠️ dílna (výroba) · 🏪 stánek (obchod) · 🏡 chalupa (spánek) · 🪧 cedule (nápověda).
- **Stavění (🔨 v HUD):** vyber stavbu ve spodní liště (po výběru se sbalí, ať je vidět
  louka), klepni na místo a **než potvrdíš, dolaď pozici šipkami / WASD** (na mobilu
  křížkem v potvrzovací liště). **Enter** postaví, **Esc** zruší. Stejně se přesouvají
  i hotové stavby — klepni na ni, dej *Přesunout*, vyber místo a dolaď.
- **Questy** vedou nahoře (vtipná příběhová linka), **zvuky** jsou chiptune + ambient
  (🔊 / 🎵 v HUD je vypneš), 🎒 batoh = najíst se a napít.
- **Mini-mapa** v rohu ukazuje oblasti i tebe. Svět je velký a **cestovatelný** —
  statek, bylinková louka, rybník a hájek propojené cestami lesem.

### Lidé, minihry a hlavolamy

- U startu potkáš **Tomáše, Marušku a Tonyho**. Každý tě naučí dovednost přes
  **naučnou minihru** a dá odměnu: 🌿 poznávání bylin (Maruška), 🪓 sekání dřeva
  na čas (Tomáš), 🐾 pexeso s obyvateli Louky (Tony).
- Cestu k **hájku** hlídá **Lesní brána** — vyřeš ptačí Simon a otevřeš novou cestu
  i **truhlu se zásobami**.
- Zvířata mají **reálné rozdílné velikosti** a hráč i postavičky chodí ve čtyřech směrech.

## Spuštění (lokálně v prohlížeči)

```bash
npm install
npm run dev      # → http://localhost:5173
```

Produkční build:

```bash
npm run build    # typecheck + bundle do dist/
npm run preview  # náhled buildu
```

## Nasazení na Vercel

Repozitář je připravený (`vercel.json`, framework **Vite**):

```bash
npm i -g vercel   # jednou
vercel            # náhledové nasazení
vercel --prod     # produkce
```

Nebo přes web Vercelu: *Add New → Project → import repo* — preset **Vite** se nastaví sám
(build `npm run build`, output `dist`).

## Android (Capacitor)

Nativní shell pro Google Play je připravený přes [Capacitor](https://capacitorjs.com/):
konfigurace je v `capacitor.config.ts` (`appId: cz.nechmerust.louka`), vygenerovaný
projekt je ve složce `android/` (commitovaný do repa, kromě sestavovacích artefaktů —
viz `android/.gitignore`). Orientace je natvrdo uzamčená na **landscape**
(`android:screenOrientation="sensorLandscape"` v `android/app/src/main/AndroidManifest.xml`).

Hra je **landscape-only** i na webu/PWA (manifest `orientation: "landscape"`).
Kde zámek neplatí (prohlížeč, iOS), leží na výšku přes celou hru obrazovka
`RotateGate` (`src/ui/components/RotateGate.tsx`) — animovaná výzva k otočení,
která zároveň pozastaví intro; detekce a best-effort zámek jsou
v `src/ui/orientation.ts`, UX spec v `design/ux/rotate-gate.md`.

**Předpoklady:** [Android Studio](https://developer.android.com/studio) (obsahuje Android SDK)
a Java 17+ (JDK).

**Build:**

```bash
npm run build          # web build → dist/
npx cap sync android    # zkopíruje dist/ do android/app a sesynchronizuje pluginy
```

Pak buď otevři `android/` v Android Studiu (Open → vyber složku `android/`) a spusť/sestav
odtud, nebo z příkazové řádky:

```bash
cd android
./gradlew assembleDebug   # vyžaduje nastavené Android SDK (ANDROID_HOME) a JDK 17+
```

Výsledné APK najdeš v `android/app/build/outputs/apk/debug/`.

Detekce nativní platformy je v `src/platform.ts` (`Capacitor.isNativePlatform()`) — na tom
stojí demo brána (bezplatné demo vs. plná verze po nákupu).

## Struktura

```
src/
  game/
    types.ts            datové typy
    balance.ts          ladění obtížnosti (ceny, energie, období…)
    content/            animals · wild · items · recipes · buildings · facts · people · quests · fullVersion
    engine/             state · reducer (veškerá logika) · save · util
    entitlement/        entitlements (louka-entitlements-v1) · purchase (PurchaseProvider)
  audio/sound.ts        vrstvená adaptivní hudba + SFX (Web Audio, bez souborů)
  ui/
    store.tsx           React stav + autosave (localStorage)
    labels.ts           ikonky a popisky
    components/         Shop, Craft, Journal, AnimalCard, FullVersion, Intro, …
    sprites/            AnimalSprite, PersonSprite  (ručně kreslené SVG)
  App.tsx, main.tsx, styles/global.css
scripts/fetch-photos.mjs  stažení a zmenšení fotek zvířat (npm run photos)
public/animals/           skutečné fotky obyvatel (bundlují se do aplikace)
```

### Jak přidat zvíře / faktum / recept

- Zvíře: přidej záznam do `src/game/content/animals.ts` (jméno, druh, povaha, faktum, paleta).
  Pokud má nový druh i nový vzhled, dopiš renderer do `src/ui/sprites/AnimalSprite.tsx`.
- Faktum do Deníku: `src/game/content/facts.ts`.
- Recept výroby: `src/game/content/recipes.ts`. Předmět: `src/game/content/items.ts`.
- Obtížnost: vše laditelné v `src/game/balance.ts`.

## Kredity

- **Hudba (intro/menu):** „Eternal Hope" – Kevin MacLeod ([incompetech.com](https://incompetech.com)) —
  Licensed under Creative Commons: By Attribution 3.0 (`public/audio/menu-theme.mp3`).
- **Hudba (ve hře):** vrstvená syntetizovaná adaptivní hudba, viz `src/audio/sound.ts` — žádné soubory.
- Postavičky, fotky a příběhy podle skutečných obyvatel Louky · `nechmerust.org`.

---

Postaveno s ❤️ pro Louku. Data o zvířatech podle `nechmerust.org`.
