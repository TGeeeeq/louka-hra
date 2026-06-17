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

Spokojená zvířata = dary od příznivců. Zanedbaná = veterinář a ztráty. Bankrot = konec.

## Jak se hraje (prozkoumatelný svět)

Chodíš postavou po Louce (top-down mapa ve stylu Pokémon / Zoo Tycoon):

- **Pohyb:** šipky nebo **WASD**; na mobilu kříž (D-pad) vlevo dole.
- **Akce:** **mezerník / Enter** (na mobilu tlačítko **A**) — když stojíš u zvířete nebo
  stavení, uděláš, co je potřeba (vypustit, nakrmit, sebrat vejce, vařit, prodat, spát…).
- **Stavení:** 🐔 kurník · 🐖 chlívek · 🌾 pastvina · 🦴 pelíšky · ⛲ studna · 🔥 ohniště &
  kuchyně · 🛠️ dílna (výroba) · 🏪 stánek (obchod) · 🏡 chalupa (spánek) · 🪧 cedule (nápověda).
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

## Struktura

```
src/
  game/
    types.ts            datové typy
    balance.ts          ladění obtížnosti (ceny, energie, období…)
    content/            animals · items · recipes · buildings · facts · people
    engine/             state · reducer (veškerá logika) · save · util
  ui/
    store.tsx           React stav + autosave (localStorage)
    labels.ts           ikonky a popisky
    components/         TopBar, MeadowMap, TaskPanel, Shop, Craft, Journal, …
    sprites/            AnimalSprite, PersonSprite  (ručně kreslené SVG)
  App.tsx, main.tsx, styles/global.css
```

### Jak přidat zvíře / faktum / recept

- Zvíře: přidej záznam do `src/game/content/animals.ts` (jméno, druh, povaha, faktum, paleta).
  Pokud má nový druh i nový vzhled, dopiš renderer do `src/ui/sprites/AnimalSprite.tsx`.
- Faktum do Deníku: `src/game/content/facts.ts`.
- Recept výroby: `src/game/content/recipes.ts`. Předmět: `src/game/content/items.ts`.
- Obtížnost: vše laditelné v `src/game/balance.ts`.

---

Postaveno s ❤️ pro Louku. Data o zvířatech podle `nechmerust.org`.
