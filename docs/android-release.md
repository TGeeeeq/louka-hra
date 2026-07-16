# Android — příprava vydání (release) pro Google Play

Návod pro podepsání a sestavení produkčního balíčku (AAB) hry **Louka**
(`cz.nechmerust.louka`) přes Capacitor / Gradle. Navazuje na sekci
„Android (Capacitor)" v `README.md`.

---

## 0. Ikona aplikace a splash screen

Zdrojové obrázky (loukově zelené pozadí + logo azylu Nech mě růst) se
generují skriptem:

```bash
npm run assets:app
```

Skript spustí `scripts/make-app-assets.mjs` (vyrobí `assets/icon.png`,
`assets/splash.png`, `assets/icon-foreground.png`, `assets/icon-background.png`
a favicony do `public/`) a následně `npx @capacitor/assets generate
--android`, který tyhle zdrojové obrázky rozpočítá do všech hustot v
`android/app/src/main/res/mipmap-*` a `drawable-*`.

**Poznámka k prostředí bez přístupu k internetu / za striktní proxy:**
`@capacitor/assets` si při prvním spuštění stahuje (přes npx) balíček se
starší verzí `sharp`, jehož nativní binárka (`libvips`) se stahuje z GitHub
Releases — v prostředí se zakázaným/omezeným přístupem ke GitHubu tenhle
krok selže (`403 Forbidden`). V takovém případě je v repozitáři k dispozici
náhradní skript, který generuje stejné výstupy přímo (bez staré verze
`sharp`, jen s tou, kterou už projekt používá):

```bash
node scripts/gen-android-res.mjs
```

Na běžném vývojářském stroji s normálním přístupem k internetu je
doporučeným (a jediným udržovaným napříč verzemi) postupem `npm run
assets:app` — náhradní skript slouží jen jako záloha pro omezená prostředí.

---

## 1. Keystore (podpisový klíč)

Google Play vyžaduje, aby byla každá aplikace podepsaná stejným klíčem po
celou dobu její existence (aktualizace s jiným klíčem Play odmítne).

### Vygenerování klíče

Jednou, na svém stroji (ne v CI, ne v žádném sdíleném prostředí):

```bash
keytool -genkey -v \
  -keystore louka-release.keystore \
  -alias louka \
  -keyalg RSA -keysize 2048 -validity 10000
```

Nástroj se zeptá na heslo ke keystore, heslo k aliasu (klidně stejné) a pár
identifikačních údajů (jméno, organizace…) — u neziskovky/vydavatele stačí
vyplnit „Nech mě růst z.s.“, zbytek libovolně rozumně.

**Ulož si `louka-release.keystore` a obě hesla na bezpečné místo (heslo
manager, trezor). Pokud je ztratíš, o aplikaci na Google Play prakticky
přijdeš — nový keystore nikdy nebude „stejný klíč“ a Play nedovolí nahrát
aktualizaci pod původním záznamem aplikace.**

### ⚠️ Keystore se NIKDY necommituje do gitu

- `*.keystore`, `*.jks` a `key.properties`/`gradle.properties` s hesly patří
  do `.gitignore` (zkontroluj `android/.gitignore` — řádky `#*.jks` a
  `#*.keystore` jsou tam zakomentované, u produkčního klíče je žádoucí mít
  jistotu, že se nic takového necommitne; pokud přidáváš keystore do
  repozitáře pro CI, dej ho mimo git a doplň přes tajné proměnné CI systému).
- Nikdy neposílej keystore ani hesla e-mailem/chatem bez šifrování.
- Doporučeno: nahraj keystore navíc na **Google Play App Signing** (viz níže)
  — i kdyby se ti lokální kopie ztratila, Google má záložní klíč pro
  podepisování aktualizací.

### Google Play App Signing (doporučeno)

Při prvním nahrání aplikace do Play Console (Setup → App integrity) Google
nabídne **Play App Signing**: nahraješ svůj „upload key“ (klidně stejný
keystore jako výše) a Google si vygeneruje a bezpečně uloží samostatný
**app signing key**, kterým skutečně podepisuje to, co se dostane k
uživatelům. Ty do Play nahráváš balíček podepsaný upload key.

Výhoda: pokud ztratíš svůj upload key, dá se přes podporu Google obnovit
(rotace upload key) — na rozdíl od ztráty jediného klíče bez App Signing,
což znamená konec aktualizací aplikace. **U nové aplikace nastav Play App
Signing vždy.**

---

## 2. Zapojení keystore do build.gradle

Hesla a cesta ke keystore **nesmí** být natvrdo v `build.gradle` (ten je v
gitu). Použij `gradle.properties`, který **do gitu nepatří**:

`android/gradle.properties` (lokální soubor, mimo git — přidej ho do
`android/.gitignore`, pokud tam ještě není):

```properties
LOUKA_KEYSTORE_FILE=/absolutni/cesta/k/louka-release.keystore
LOUKA_KEYSTORE_PASSWORD=heslo-ke-keystore
LOUKA_KEY_ALIAS=louka
LOUKA_KEY_PASSWORD=heslo-k-aliasu
```

**⚠️ Tento soubor obsahuje hesla — nikdy ho necommituj. Zkontroluj
`git status` před každým commitem v `android/`, ať omylem nepřidáš
`gradle.properties` s hesly do repozitáře.**

V `android/app/build.gradle` doplň signing config (do bloku `android { … }`,
vedle stávajícího `buildTypes`):

```groovy
android {
    // ...

    signingConfigs {
        release {
            if (project.hasProperty('LOUKA_KEYSTORE_FILE')) {
                storeFile file(LOUKA_KEYSTORE_FILE)
                storePassword LOUKA_KEYSTORE_PASSWORD
                keyAlias LOUKA_KEY_ALIAS
                keyPassword LOUKA_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        release {
            signingConfig project.hasProperty('LOUKA_KEYSTORE_FILE') ? signingConfigs.release : null
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

Podmínka `project.hasProperty(...)` zajistí, že build nespadne, pokud
`gradle.properties` (a tedy hesla) na daném stroji chybí — jen se prostě
nepodepíše (vhodné pro CI bez přístupu k produkčnímu klíči, nebo pro
kohokoliv, kdo si jen chce sestavit debug build).

Pokud řešíš CI (např. GitHub Actions): hesla ulož jako **secrets**, ne do
repozitáře, a `gradle.properties` vygeneruj za běhu workflow z těchto
secrets (echo do souboru v kroku před buildem).

---

## 3. Sestavení produkčního AAB

Google Play od roku 2021 vyžaduje formát **Android App Bundle (.aab)**
místo APK.

```bash
npm run build            # web build → dist/
npx cap sync android      # zkopíruje dist/ do android/app, sesynchronizuje pluginy
cd android
./gradlew bundleRelease   # vyžaduje Android SDK (ANDROID_HOME) a JDK 17+
```

Výsledný balíček:

```
android/app/build/outputs/bundle/release/app-release.aab
```

Tenhle soubor se nahrává do Google Play Console (Produkce / Testování →
„Vytvořit vydání" → nahrát .aab).

Pokud signing config není nastavený (chybí `gradle.properties`), Gradle
vytvoří nepodepsaný balíček — Play Console ho nepřijme. Zkontroluj, že
`./gradlew bundleRelease` hlásí použití `signingConfigs.release` (v logu
najdeš `Signing config: release` nebo obdobně) a ne `debug`/`none`.

---

## 4. Zvyšování `versionCode` / `versionName`

V `android/app/build.gradle`:

```groovy
versionCode 1
versionName "1.0.0"
```

- **`versionCode`** — celé číslo, čistě interní pro Play. **Musí se zvýšit
  při každém nahrání do Play Console** (i mezi interním testováním a
  produkcí, pokud jde o jinou revizi) — Play odmítne nahrát balíček se
  stejným nebo nižším `versionCode`, než už má nahraný. Jednoduše: `1 → 2 →
  3 → …`, žádné mezery ani vzorce nejsou potřeba.
- **`versionName`** — čitelný řetězec pro uživatele (Semantic Versioning
  doporučeno: `MAJOR.MINOR.PATCH`, např. `1.0.0`, `1.0.1`, `1.1.0`). Zobrazuje
  se v Nastavení telefonu → Aplikace → Louka → verze.
- Doporučený postup: při každém novém nahrání do Play zvyš `versionCode`
  vždy, `versionName` podle povahy změny (patch = drobná oprava, minor =
  nový obsah/funkce, major = zásadní změna).
- `package.json` verze (pole `"version"`) drž synchronizovanou s
  `versionName` pro přehlednost, i když Play Console se řídí jen tím
  androidím `versionCode`/`versionName`.

---

## 5. Rychlá kontrola před nahráním

- [ ] `npm run build` proběhl bez chyb (typecheck + Vite build)
- [ ] `npx cap sync android` proběhlo po posledním web buildu
- [ ] `versionCode` zvýšen oproti poslední nahrané verzi
- [ ] `./gradlew bundleRelease` vytvořil `app-release.aab` podepsaný
      produkčním (nebo upload) klíčem
- [ ] Keystore a `gradle.properties` s hesly nejsou v `git status` jako
      staged/tracked soubory
- [ ] Orientace zůstává uzamčená na landscape (`sensorLandscape` v
      `AndroidManifest.xml`) — hra na výšku nedává smysl
