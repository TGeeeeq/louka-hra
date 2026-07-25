# 🌿 DeepSeek – návrh „AAA" verze hry Louka

Tato složka je **port doporučení z chatu DeepSeek** ([sdílený chat](https://chat.deepseek.com/share/b6zd4vjdeaf1ycbn4s)).
Jsou to nápady a vzorové kódy, jak povýšit hru *Louka* z jednoduché verze
na profesionální („AAA") edukativní titul.

> ⚠️ **Důležité:** Jde o **referenční / inspirační materiál**, ne o hotový build.
> Kódy sem byly zkopírovány přesně tak, jak je vygeneroval DeepSeek. Navrhují
> **jinou technologii** (Phaser 3 + webpack + Firebase) než má stávající projekt
> (Vite + TypeScript + Capacitor), proto jsou záměrně **oddělené ve vlastní složce
> `deepseek/`** a nijak nezasahují do funkčního kódu hry. Slouží jako podklad,
> ze kterého se dá vybírat a postupně implementovat.

---

## 🎯 Co DeepSeek navrhuje (celý postup)

Transformace na „AAA" titul verze **3.0.0** stojí na těchto pilířích:

1. **Herní engine Phaser 3 + WebGL** – přechod z jednoduchého canvasu na plnohodnotný
   herní framework s WebGL rendererem a vlastními shadery (bloom, vignette, color grading,
   film grain, „golden hour" nasvícení).
2. **Scény** – rozdělení hry do Phaser scén: Boot → Preload → Menu → tvorba postavy →
   Hra → Herbář → Minihry → Cutscény → UI overlay.
3. **Bohatý obsah** – herbář rozšířený na ~150 rostlin s edukativními informacemi
   (léčivé účinky, identifikace, zajímavosti, kvízy), věrné modely zvířat a NPC s příběhem.
4. **Vizuální kvalita** – parallax pozadí (obloha, mraky, kopce, louka, les), částicové
   efekty (světlušky, pyl, okvětní lístky, jiskry), dynamické počasí a denní doba.
5. **Cutscény a příběh** – filmové mezisekvence s kamerou, dialogy a orchestrální hudbou.
6. **Minihry** – sběr bylin, vaření lektvarů, stopování zvířat, pozorování hmyzu a další.
7. **Tvorba postavy** – customizace vzhledu, doplňků a jména průzkumníka louky.
8. **Zvuk** – orchestrální hudba a prostorové ambientní zvuky.
9. **Achievementy a progrese** – systém úspěchů a úrovní hráče.
10. **PWA + offline** – Service Worker, caching, instalace na plochu, push notifikace.
11. **Google Play Games** – přihlášení, achievementy, leaderboardy, cloud save.
12. **Cloud save + Firebase** – synchronizace uloženého postupu mezi zařízeními.

---

## 📁 Struktura souborů

```
deepseek/
├── README.md                     ← tento přehled
├── package.json                  ← navrhované závislosti (Phaser 3, Firebase, webpack, Workbox…)
├── webpack.config.js             ← build konfigurace (webpack + Workbox PWA)
├── assets/
│   └── shaders/
│       └── bloom.glsl            ← bloom post-processing shader (GLSL)
├── data/
│   └── animals.json              ← ukázka datového souboru se zvířaty (srnec obecný)
└── src/
    ├── index.html                ← HTML shell hry (PWA meta, styly pro UI overlaye)
    ├── main.js                   ← vstupní bod: konfigurace Phaser hry + inicializace služeb
    ├── manifest.json             ← PWA manifest (ikony, název, orientace…)
    ├── service-worker.js         ← Service Worker (offline caching, sync, push)
    ├── styles.css                ← „AAA" styly (menu, herbář, dialogy, částice, responsive)
    ├── aaa-game-engine.js        ← KONCEPČNÍ engine „design jako kód" (vanilla JS, viz níže)
    ├── scenes/
    │   ├── BootScene.js          ← inicializace WebGL pipeline, načtení shaderů
    │   ├── PreloadScene.js       ← loading screen, načítání assetů, tipy
    │   └── GameScene.js          ← hlavní herní scéna (hráč, NPC, zvířata, rostliny, počasí)
    ├── shaders/
    │   ├── WebGLPipeline.js      ← vlastní Phaser PostFX pipeline (bloom/vignette/grading)
    │   ├── ParallaxShader.js     ← shader pro parallax s hloubkovou mlhou
    │   └── ParticleShader.js     ← shader pro organické částice
    └── services/
        ├── PWAManager.js         ← instalace PWA, offline detekce, kvalita dle připojení
        └── GooglePlayGames.js    ← achievementy, leaderboardy, cloud save, questy
```

### Dva různé přístupy v jednom návrhu

DeepSeek dodal materiál ve **dvou stylech** – oba jsou tu zachovány:

- **`src/aaa-game-engine.js`** – koncepční „design jako kód": čisté JS třídy
  (`AAAGameEngine`, `AAAMenuSystem`, `AdvancedHerbar`, `CinematicCutsceneEngine`,
  `AdvancedMinigames`, `AdvancedWildlifeSystem`, `OrchestralAudioEngine`,
  `AchievementSystem`, `LoukaAAA` …). Popisuje **co má hra umět**. Řada volaných
  tříd (`ParticleSystem`, `PhysicsEngine`, `CutsceneManager` …) není definována –
  je to spíš návrhový nákres než spustitelný kód.
- **`src/` scény, shadery, služby (Phaser 3)** – konkrétnější implementační kostra
  postavená na Phaseru. I zde některé importy odkazují na soubory, které DeepSeek
  ještě nedodal (`MenuScene`, `CharacterCreationScene`, `HerbarScene`,
  `MinigameScene`, `CutsceneScene`, `UIScene`), takže projekt v tomto stavu
  **není spustitelný** bez doplnění.

---

## 🚧 Co ještě chybí (pokud by se to mělo rozběhnout)

- Scény: `MenuScene`, `CharacterCreationScene`, `HerbarScene`, `MinigameScene`,
  `CutsceneScene`, `UIScene` (importované v `main.js`).
- Grafické, zvukové a datové assety (sprity, atlasy, hudba, `plants.json`,
  `quests.json`, `achievements.json`, `dialogues.json`, ikony, fonty…).
- Reálné Google / Firebase klíče (v kódu jsou placeholdery jako
  `YOUR_CLIENT_ID`, `G-XXXXXXXXXX`, `FIREBASE_API_KEY`).

---

## 💡 Jak s tím dál (pro Fable)

Tohle je vstup k prostudování a **postupné implementaci** do stávající hry.
Doporučený přístup: nepřepisovat celý projekt na Phaser, ale vybírat konkrétní
nápady a přenášet je do současné Vite/TypeScript/Capacitor architektury –
např. rozšíření herbáře, systém achievementů, částicové efekty, dynamické
počasí, cloud save. Až bude Fable k dispozici, projde se to a rozhodne se,
které části se implementují a jak.
