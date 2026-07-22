# 🌿 Louka — prezentační web

Marketingová „landing page" pro hru **Louka** (survival azylu *Nech mě růst z.s.*).
Statická stránka bez build kroku — čisté HTML, CSS a JavaScript, žádné závislosti.

## Co obsahuje

- **Kinematický hero** s živou generativní scénou louky (`<canvas>`) — cyklus dne
  (ráno → poledne → večer → noc) a jemná paralaxa. Přepínač fáze mění atmosféru celé stránky.
- **Průběh dne** — interaktivní záložky tří fází s vlastní scénou.
- **Roční období**, **pilíře hry**, **herní systémy** (adaptivní hudba, ekonomika, výroba, Deník).
- **Obyvatelé** — interaktivní galerie skutečných zvířat se skutečnými fotkami a ověřenými fakty,
  filtrovatelná podle druhu.
- **Mapa světa** s interaktivními místy, **postavy** (Tomáš, Maruška, Tony).
- **Skutečný azyl** — propojení na nechmerust.org, **roadmapa vývoje**, **verze & ceny**, **FAQ**.
- Světlý i tmavý režim (přepínač + `prefers-color-scheme`), plná responzivita, přístupnost
  (skip-link, `:focus-visible`, `aria`), respekt k `prefers-reduced-motion`.
- Volitelný **ambientní zvuk** — jemný Web Audio pad (ve výchozím stavu vypnutý), odkaz na
  adaptivní hudbu hry.

## Vizuální identita

Navazuje na značku hry: písma **Fraunces** (nadpisy) + **Plus Jakarta Sans** (text),
paleta hluboké lesní zeleně, mechové zelené, klíčící zeleně, ručně-inkoustového zlata a krémové.
Fonty i loga jsou self-hostované (offline) v `assets/`.

## Spuštění lokálně

```bash
cd web
python3 -m http.server 8099
# → http://localhost:8099
```

Nebo jakýkoli statický server (`npx serve`, Live Server ve VS Code…).

## Nasazení

Stránka je čistě statická — nasadíš ji kamkoli:

- **Vercel / Netlify:** nový projekt s *root directory* `web/`, bez build příkazu (output = `web/`).
- **GitHub Pages:** publikuj obsah složky `web/`.
- **Vlastní hosting:** nahraj obsah `web/` na server.

Soubory:

```
web/
├── index.html      # struktura stránky
├── styles.css      # vizuální identita, oba režimy, responzivita
├── app.js          # canvas scéna + veškerá interaktivita
└── assets/         # loga, fonty, fotky obyvatel (self-hostované)
```
