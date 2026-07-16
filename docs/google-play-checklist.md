# Google Play — kompletní checklist pro vydání hry Louka

Postup pro nastavení a vydání aplikace **Louka** (`cz.nechmerust.louka`) v
Google Play Console. Doplňuje `docs/android-release.md` (technická stránka —
keystore, podepisování, AAB).

---

## 1. Vývojářský účet

- [ ] Založit / mít přístup k [Google Play Console](https://play.google.com/console)
      účtu vydavatele — jednorázový poplatek 25 USD.
- [ ] Doporučeno založit účet na organizaci **Nech mě růst z.s.**, ne na
      soukromý Google účet jednotlivce (ať vlastnictví aplikace nezávisí na
      jedné osobě). Vyžaduje ověření organizace (IČO, doklady).
- [ ] Nastavit platební profil pro výplaty (pro příjem plateb z IAP) —
      Play Console → Setup → Payments profile.

## 2. Založení aplikace

- [ ] Play Console → **Create app**
  - Název aplikace: **Louka**
  - Výchozí jazyk: **čeština**
  - Typ: **Aplikace** (App, ne Game — ačkoliv jde o hru, kategorie „Hra"
    se nastavuje ve Store listing; „App vs. Game" přepínač zde je jen
    technický typ položky, zvol podle skutečného zaměření — Louka jde
    zařadit i jako Game, pak bude mít herní kategorii navíc)
  - Zdarma nebo placené: **Zdarma** (bezplatné demo + IAP, ne placená app)
  - Potvrdit prohlášení o Developer Program Policies a US export laws.

### In-app produkt (jednorázový nákup plné verze)

Play Console → **Monetize → Products → In-app products → Create product**

- [ ] **Product ID:** `cz.nechmerust.louka.full` (musí přesně odpovídat
      ID použitému v `src/game/entitlement/billing.ts` /
      `FULL_VERSION.storeIds.googlePlay` — cordova-plugin-purchase v13)
- [ ] **Typ:** Managed product (**non-consumable** — nákup napořád, ne
      spotřebovatelný/opakovatelný). V Play Console se in-app produkty typu
      „Managed product" chovají jako non-consumable automaticky (na rozdíl
      od „Subscriptions").
- [ ] **Název:** „Louka — plná hra"
- [ ] **Popis:** „Odemkne celý rok, všechny questové linky a naplno podpoří
      azyl Nech mě růst."
- [ ] **Cena:** **299 Kč** (nastavit v CZK, Play si dopočítá ekvivalenty v
      dalších měnách/zemích — zkontrolovat, že se produkt neprodává v
      regionech, kde aplikaci nechceš distribuovat)
- [ ] Aktivovat produkt (**Activate**) — bez aktivace nejde koupit ani v
      testovacím prostředí.

## 3. Obsah Store listing (obchodní záznam)

Play Console → **Grow → Store presence → Main store listing**

- [ ] **Krátký popis** (max 80 znaků), např.:
  > Postarej se o zachráněná zvířata na louce. Roztomilé, poctivé, na doma.

- [ ] **Dlouhý popis** (max 4000 znaků) — návrh na základě `README.md`:

  > **Louka** je hra o péči o víc než sto skutečně zachráněných zvířat na
  > louce uprostřed lesů. Postavičky i příběhy vycházejí ze skutečných
  > obyvatel azylu Nech mě růst z.s. — osel Karel, prasata Princezna a
  > Flíček, krávy Avala a Květa, ovce, psi, kočky, drůbež a další. Není to
  > farma na porážku — zvířata tu dožívají v klidu a tvým úkolem je se o ně
  > postarat.
  >
  > Jeden herní den = tři fáze (ráno, poledne, večer) a čtyři roční období.
  > Ráno vypustíš drůbež, nakrmíš a napojíš zvířata a sesbíráš vejce.
  > Přes den uklízíš, štípeš dřevo, sbíráš byliny a vyrábíš (mast, čaj,
  > vařené krmivo). Večer zavřeš zvířata před liškou a jdeš spát.
  >
  > Hlídej vlastní energii, sytost a žízeň, přežij náročnější zimu a
  > obchoduj — kupuj krmivo a nářadí, prodávej výrobky, stavěj vychytávky
  > jako studna, seník nebo automatické krmítko.
  >
  > Ve hře nikdy nedochází k násilí: divocí sousedé (liška, káně, srnka,
  > ježek) se řeší trpělivostí a péčí, ne bojem. Cestou objevuješ i skutečná
  > fakta o zvířatech a přírodě, která se sbírají do herního Deníku, a
  > v kartě zvířete i encyklopedii najdeš opravdové fotky obyvatel Louky.
  >
  > Hra je zdarma ke stažení a obsahuje demo (tutoriál a první dny).
  > Jediný nákup „Louka — plná hra" (299 Kč) odemkne zbytek natrvalo — celý
  > rok i všechny questové linky — a je zároveň přímou podporou azylu
  > Nech mě růst.
  >
  > Bez reklam. Bez sběru dat. Funguje offline. V češtině.

- [ ] **Kategorie aplikace:** Hry → Simulace (nebo „Kasual" — zvolit podle
      nejbližšího odpovídajícího žánru v Play Console)
- [ ] **Kontaktní e-mail:** e-mail azylu/vydavatele (veřejně viditelný na
      Play Store)
- [ ] **Web:** https://nechmerust.org
- [ ] **Zásady ochrany osobních údajů (Privacy Policy URL)** — **povinné**,
      i pro aplikaci, která nesbírá data. Stačí jednoduchá stránka
      (na nechmerust.org nebo jako GitHub Pages) s textem typu „Louka
      nesbírá, neukládá ani neodesílá žádná osobní data. Veškerá herní data
      (postup, nastavení) se ukládají pouze lokálně v zařízení hráče."
      Bez URL Play Console **odmítne** aplikaci publikovat.

### Grafika

- [ ] **Ikona aplikace** (512×512 PNG, 32bit s alfa) — vygenerována v
      `assets/icon.png` (zdroj), rozpočítaná do
      `android/app/src/main/res/mipmap-*` skriptem
      `npm run assets:app` (viz `scripts/make-app-assets.mjs`). Pro
      obchodní záznam nahraj samostatně `assets/icon.png` zmenšenou/
      exportovanou na 512×512.
- [ ] **Feature graphic** (1024×500 PNG/JPG) — banner nahoře na stránce
      obchodu. Zatím není vygenerovaný, doporučeno vyrobit z `assets/icon.png`
      + textu „Louka" na zelené (`#2d5a3d`) ploše, na šířku.
- [ ] **Screenshoty — landscape (na šířku), povinné min. 2, doporučeno 4–8**
      - Hra je natvrdo v `sensorLandscape`, takže **všechny screenshoty
        musí být na šířku** (landscape) — Play Console pro telefon vyžaduje
        min. rozměr 320px a max. 3840px na delší straně, poměr stran mezi
        16:9 a 2:1 se doporučuje.
      - Doporučené scény: úvodní obrazovka / Louka s postavou, krmení
        zvířat, výroba v dílně, Deník s fakty o zvířatech, obchod/stánek,
        zimní scéna se sněhem, obrazovka „Louka — plná hra" (FullVersion),
        mini-mapa v akci.
      - Screenshoty se dají pořídit z `npm run dev` prohlížečem v landscape
        okně, nebo přímo z Android emulátoru/zařízení po `npx cap sync
        android` + `./gradlew installDebug`.
  - [ ] Volitelně: **7" a 10" tablet screenshoty**, pokud cílíš i na tablety
        (aplikace landscape funguje dobře i na tabletu).
- [ ] Volitelně: propagační video (YouTube link) — není povinné.

## 4. Data safety (bezpečnost dat)

Play Console → **Policy → App content → Data safety**

Louka **nesbírá žádná data** (offline hra, žádná telemetrie, žádná
analytika, žádné účty). Ve formuláři vyplnit:

- [ ] „Does your app collect or share any of the required user data
      types?" → **No** (aplikace nesbírá ani nesdílí žádná uživatelská
      data)
- [ ] Pokud formulář vyžaduje zvlášť zaškrtnout kategorie dat (Location,
      Personal info, Financial info, Messages, Photos/videos, App
      activity…) — u všech nech **nezaškrtnuto / not collected**.
- [ ] **Nákupy (in-app billing)** — samotné zpracování platby a jejího
      stavu (vlastnictví produktu) řeší Google Play Billing na straně
      Googlu; aplikace sama žádné platební údaje nevidí ani neukládá,
      takže „Financial info" se stále označuje jako nesbírané aplikací.
      (Uveď v Data safety poznámku, že platby zpracovává výhradně Google
      Play Billing.)
- [ ] Zabezpečení dat (encryption in transit / data deletion request) —
      protože se nic neodesílá ani neukládá na server, tyto sekce jsou
      buď „Not applicable", nebo se automaticky přeskočí po zvolení „No
      data collected".
- [ ] Zkontrolovat, že prohlášení odpovídá skutečnosti — nepravdivé
      vyplnění Data Safety formuláře je porušení zásad Play a hrozí
      shodou (suspension) aplikace.

## 5. Dotazník hodnocení obsahu (Content rating)

Play Console → **Policy → App content → Content ratings**

- [ ] Vyplnit dotazník IARC (mezinárodní). Kategorie aplikace: **Hra —
      Simulace/Casual**.
- [ ] Odpovědi na násilí, sex, drogy, hazard, urážlivý jazyk atd.: **žádné
      z toho hra neobsahuje** (žádné násilí — liška ani žádné zvíře nikomu
      neublíží, žádné zbraně, žádný hazard, žádný alkohol/drogy, žádný
      generovaný obsah od uživatelů, žádný chat s cizími hráči).
- [ ] Očekávaný výsledek: **PEGI 3** (a odpovídající ESRB „Everyone" /
      USK 0 apod. pro ostatní systémy, IARC je vygeneruje automaticky ze
      stejných odpovědí).
- [ ] Znovu vyplnit dotazník při jakékoliv budoucí změně obsahu, která by
      mohla ovlivnit hodnocení (Play to i připomene).

## 6. Cílová skupina a zásady pro rodiny (Target audience & Families policy)

Play Console → **Policy → App content → Target audience and content**

Tohle je citlivá část — hra o zvířatech a přírodě **může přirozeně
zaujmout i děti**, i když není cíleně marketovaná jako dětská. Google to
bere vážně (Families Policy), proto:

- [ ] Vyplnit věkové skupiny, kterým je aplikace určena. Máš dvě zásadní
      možnosti:
  1. **Neoznačit aplikaci jako cílenou na děti** (target age 13+ / mixed
     audience bez zapojení do Designed for Families) — pokud primární
     cílovka jsou rodiny/dospělí hráči a děti hrají spíš „s rodičem"
     nebo jako vedlejší publikum. Tohle je pravděpodobně
     **doporučená volba pro Louku**, protože hra má textový/naučný
     obsah v češtině (Deník, questy) mířený spíš na širší rodinné hraní
     než čistě na malé děti, a tahle volba se vyhne přísnějším
     omezením níže.
  2. **Označit aplikaci jako (i) určenou dětem / Designed for Families**
     — pokud se rozhodnete cílit i na děti do 13 let jako primární
     publikum. Tahle volba s sebou nese přísná omezení:
     - **Reklamy:** pokud by se v budoucnu přidávaly reklamy, musí jít o
       certifikované „kids" reklamní sítě (běžné reklamní SDK typu
       Google AdMob standardní nejsou bez dalšího povolena) — v případě
       Louky momentálně řešeno tím, že **aplikace nemá žádné reklamy**,
       takže toto omezení fakticky neplatí, ale je potřeba o tom vědět
       do budoucna.
     - **Platby (IAP):** In-app nákupy směřované na děti podléhají
       přísnějším pravidlům (nutnost rodičovské autorizace před
       nákupem — tzv. parental gate). Google Play u aplikací "Designed
       for Families" vyžaduje mechanismy, které zabrání dětem provést
       nákup bez vědomí rodiče.
     - **SDK a knihovny třetích stran** musí být na Google's seznamu
       schválených pro Families (omezuje se, co všechno smíš v appce
       používat — analytika, reklamní SDK apod.). Louka žádné externí
       SDK nepoužívá (offline, žádná analytika), takže by tímto
       omezením neměla být zasažena, ale je nutné to zaškrtnout/ověřit
       při vyplňování.
     - Aplikace se pak zobrazuje v sekci **Family** na Play Store a musí
       projít přísnější review.
  - **Doporučení pro Louku:** zvolit možnost (1) — širší rodinné
    publikum, ne primárně děti — pokud se explicitně nerozhodnete jít do
    Designed for Families s vědomím výše uvedených omezení pro IAP (299
    Kč nákup by pak vyžadoval parental gate flow).
- [ ] I bez „Designed for Families" stále platí obecná **Families Policy
      requirements**, pokud aplikaci nastavíš tak, že „may be attractive
      to children" — Play Console se na to při vyplňování ptá zvlášť; u
      Louky (zvířátka, jasné barvy, žádné násilí) je čestné odpovědět, že
      **může děti zaujmout**, i když není primárně pro ně — zvol tuhle
      možnost, pokud ji Play Console nabízí jako samostatnou kategorii mezi
      "čistě pro dospělé" a "Designed for Families".

## 7. License testers — testování plateb (IAP) před publikací

Než aplikaci pustíš do produkce, chceš si ověřit, že nákup „Louka — plná
hra" (`cz.nechmerust.louka.full`) skutečně funguje — bez skutečného
placení.

- [ ] Play Console → **Setup → License testing** → přidat e-mailové
      adresy (Google účty) lidí, kteří budou testovat (vývojáři, QA).
- [ ] Test transakce s license testery se **automaticky nezúčtují** —
      místo skutečné platby se zobrazí „Test card, always approves" apod.
- [ ] Podmínka: aplikace musí být nahraná aspoň do interního testovacího
      tracku (viz níže) a in-app produkt musí být **Active**.
- [ ] Otestovat celý flow v appce: `getPurchaseProvider` →
      `CapacitorBillingProvider` (viz `src/game/entitlement/billing.ts`,
      `purchase.ts`) — nákup, restore (opětovná instalace / nové
      zařízení), i chování při zrušení nákupu uprostřed platby.
- [ ] Zkontrolovat, že testovací zakoupení produktu jde v Play Console
      i **zrušit/vrátit** (Order management), aby šlo testovat opakovaně.

## 8. Postupné vydávání — Internal → Closed → Production

Play Console → **Release → Testing / Production**

1. **Internal testing** (interní test)
   - [ ] Nahrát první `.aab` (`android/app/build/outputs/bundle/release/
         app-release.aab`, viz `docs/android-release.md`).
   - [ ] Přidat e-maily testerů (může být stejný seznam jako license
         testers).
   - [ ] Ověřit instalaci, základní běh hry, nákup IAP, orientaci
         (landscape), že demo brána funguje (bezplatné demo vs. odemčená
         plná verze po nákupu — `src/platform.ts`).
2. **Closed testing** (uzavřený test, volitelně přes „Alpha"/pojmenovaný
   track)
   - [ ] Širší okruh testerů (např. rodiny/děti dobrovolníků azylu,
         příznivci na sociálních sítích) — sesbírat zpětnou vazbu na
         obtížnost, srozumitelnost češtiny, herní tempo.
   - [ ] Zkontrolovat **pre-launch report** (viz níže), který Play Console
         automaticky vygeneruje po nahrání buildu do libovolného testovacího
         tracku.
3. **Production** (produkce / ostrá verze)
   - [ ] Teprve po úspěšném interním i uzavřeném testu propustit release do
         produkčního tracku (**Release → Production → Create release**),
         případně s **staged rollout** (postupné % uživatelů, např. 20 % →
         50 % → 100 %) pro jistotu, kdyby se objevil neočekávaný pád/chyba
         na širším vzorku zařízení.
   - [ ] Po zveřejnění sledovat **Android vitals** (ANR, crash rate) v Play
         Console prvních pár dní.

## 9. Pre-launch report

Play Console automaticky spustí **pre-launch report** po nahrání buildu do
kteréhokoliv testovacího tracku (Internal stačí) — automatizované testování
na reálné/virtuální farmě zařízení Google.

- [ ] Zkontrolovat sekci **Release → Pre-launch report** po nahrání buildu:
      - **Crashes / ANRs** — pády či nereagující aplikace na různých
        zařízeních a verzích Androidu (minSdk 24 = Android 7.0 výš).
      - **Screenshots** z automatického procházení appky na různých
        zařízeních — dobrá kontrola, že landscape layout a čeština s
        diakritikou vypadají všude v pořádku.
      - **Security warnings** — např. příliš permisivní `AndroidManifest`
        oprávnění (Louka žádá jen `INTERNET`, což by nemělo problém
        způsobit) nebo zastaralé knihovny.
      - **Accessibility** — kontrast, velikost dotykových prvků (D-pad,
        tlačítko A na mobilu) — zkontrolovat doporučení, i když nejde o
        blokující požadavek.
- [ ] Vyřešit případné nálezy před přechodem do produkčního tracku.

---

## Shrnutí — co vyžaduje ruční zásah vlastníka (nejde automatizovat)

- Založení/ověření vývojářského účtu Google Play (platba 25 USD, doklady
  organizace).
- Vygenerování a bezpečné uložení keystore (`docs/android-release.md`) +
  rozhodnutí o Play App Signing.
- Vyplnění a rozhodnutí u **Target audience & Families policy** (bod 6) —
  je to obchodní/zásadové rozhodnutí, ne technická věc.
- Napsání/schválení finálních textů Store listing (návrh v bodě 3 je jen
  podklad).
- Pořízení screenshotů ze skutečného běhu hry.
- Zveřejnění Privacy Policy stránky (URL na nechmerust.org nebo obdobně).
- Přidání e-mailů license testerů a testerů pro internal/closed testing.
- Finální rozhodnutí o staged rollout % a sledování Android vitals po
  zveřejnění.
