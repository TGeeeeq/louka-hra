/* =========================================================================
   LOUKA — interaktivita prezentačního webu.
   Vanilla JS, bez závislostí. Vše šetří výkon a respektuje reduced-motion.
   ========================================================================= */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------------------------------------------------------------------
     1) Živá scéna louky (canvas) — cyklus dne + počasí + jemná paralaxa.
        Jádro herní smyčky převedené do atmosféry webu.
  --------------------------------------------------------------------- */
  const PHASES = {
    morning: {
      sky: ["#f7d29a", "#e9b98a", "#a9cf8a", "#8ec27a"],
      light: "#ffe6b0", sunX: 0.2, sunY: 0.34, sun: "#ffd98a", isNight: false,
      hills: ["#5c9a55", "#4a8548", "#37703f", "#26522f"], fog: "rgba(255,240,210,0.16)",
    },
    noon: {
      sky: ["#bfe6f2", "#d6eeda", "#dff0c8", "#c3e3a0"],
      light: "#fbfff0", sunX: 0.5, sunY: 0.18, sun: "#fff6d8", isNight: false,
      hills: ["#79c169", "#5faa55", "#489042", "#356f38"], fog: "rgba(255,255,255,0.14)",
    },
    evening: {
      sky: ["#f4a85c", "#e07a4c", "#b7574a", "#6d4a63"],
      light: "#ffd0a0", sunX: 0.82, sunY: 0.4, sun: "#ffb057", isNight: false,
      hills: ["#7a6a4a", "#5e5240", "#463d34", "#2c2824"], fog: "rgba(255,190,140,0.14)",
    },
    night: {
      sky: ["#1c3048", "#182838", "#121f2a", "#0d1712"],
      light: "#7fa6c0", moonX: 0.74, moonY: 0.26, moon: "#e9f0f6", isNight: true,
      hills: ["#233a2c", "#1c2f24", "#15241b", "#0e1712"], fog: "rgba(120,150,180,0.1)",
    },
  };
  const MOOD = {
    morning: ["#8cc270", "#6fae45"],
    noon: ["#a9d68f", "#6fae45"],
    evening: ["#e0a24c", "#b85c3c"],
    night: ["#7fa6c0", "#4a6f8f"],
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(h1, h2, t) {
    const a = hexToRgb(h1), b = hexToRgb(h2);
    return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
  }

  class Scene {
    constructor(canvas, phase) {
      this.c = canvas; this.ctx = canvas.getContext("2d");
      this.cur = PHASES[phase]; this.next = PHASES[phase]; this.t = 1; // přechod 0..1
      this.w = 0; this.h = 0; this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.particles = []; this.stars = []; this.trees = []; this.raf = null; this.time = 0;
      this.parallax = { x: 0, y: 0, tx: 0, ty: 0 };
      this.resize(); this.seed();
      window.addEventListener("resize", () => this.resize());
      this.loop = this.loop.bind(this);
      this.raf = requestAnimationFrame(this.loop);
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
      this.c.width = this.w * this.dpr; this.c.height = this.h * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    seed() {
      // stromy (silueta na horizontu)
      this.trees = [];
      const n = Math.max(6, Math.round(this.w / 150));
      for (let i = 0; i < n; i++) {
        this.trees.push({ x: Math.random(), s: 0.6 + Math.random() * 0.7, layer: Math.random() > 0.5 ? 1 : 0 });
      }
      // hvězdy
      this.stars = [];
      for (let i = 0; i < 70; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.5, r: Math.random() * 1.4 + 0.2, tw: Math.random() * 6.28 });
      // částice (poletující — pyl/světlušky/listí/sníh)
      this.particles = [];
      const pc = reduceMotion ? 0 : 46;
      for (let i = 0; i < pc; i++) this.spawn(true);
    }
    spawn(init) {
      this.particles.push({
        x: Math.random(), y: init ? Math.random() : -0.05 + Math.random() * 0.1,
        vx: (Math.random() - 0.5) * 0.02, vy: 0.01 + Math.random() * 0.04,
        r: Math.random() * 2.2 + 0.6, ph: Math.random() * 6.28, life: Math.random(),
      });
    }
    setPhase(phase) {
      if (PHASES[phase] === this.cur && this.t >= 1) return;
      this.cur = this.t < 1 ? this.blend() : this.cur; // zafixuj rozpracovaný přechod
      this.next = PHASES[phase]; this.t = reduceMotion ? 1 : 0; this.target = phase;
    }
    blend() {
      // vrátí syntetickou fázi = interpolace cur→next dle t (jen barvy potřebné pro fix)
      return this.cur; // zjednodušeno: fix na cur (přechody jsou krátké)
    }
    setParallax(nx, ny) { this.parallax.tx = nx; this.parallax.ty = ny; }
    loop(ts) {
      this.raf = requestAnimationFrame(this.loop);
      const dt = 0.016; this.time += dt;
      if (this.t < 1) this.t = Math.min(1, this.t + dt * 1.6);
      this.parallax.x = lerp(this.parallax.x, this.parallax.tx, 0.06);
      this.parallax.y = lerp(this.parallax.y, this.parallax.ty, 0.06);
      this.draw();
    }
    draw() {
      const ctx = this.ctx, W = this.w, H = this.h, t = this.t;
      const A = this.cur, B = this.next;
      const px = this.parallax.x * 14, py = this.parallax.y * 10;

      // obloha (4-stop gradient, interpolovaný mezi fázemi)
      const g = ctx.createLinearGradient(0, 0, 0, H);
      for (let i = 0; i < 4; i++) g.addColorStop(i / 3, mix(A.sky[i], B.sky[i], t));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      const night = t < 0.5 ? A.isNight : B.isNight;

      // hvězdy (v noci)
      const starA = (A.isNight ? 1 - t : 0) + (B.isNight ? t : 0);
      if (starA > 0.01) {
        for (const s of this.stars) {
          const tw = 0.5 + 0.5 * Math.sin(this.time * 2 + s.tw);
          ctx.globalAlpha = starA * tw * 0.9;
          ctx.fillStyle = "#eef5ff";
          ctx.beginPath(); ctx.arc(s.x * W + px * 0.3, s.y * H + py * 0.3, s.r, 0, 6.28); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // slunce / měsíc
      const bodyX = lerp((A.sunX ?? A.moonX) , (B.sunX ?? B.moonX), t) * W + px * 0.5;
      const bodyY = lerp((A.sunY ?? A.moonY), (B.sunY ?? B.moonY), t) * H + py * 0.4;
      const bodyCol = mix(A.sun || A.moon, B.sun || B.moon, t);
      const rad = Math.min(W, H) * (night ? 0.055 : 0.07);
      const glow = ctx.createRadialGradient(bodyX, bodyY, 0, bodyX, bodyY, rad * 6);
      glow.addColorStop(0, mix(A.light, B.light, t)); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.55; ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(bodyX, bodyY, rad * 6, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = bodyCol;
      ctx.beginPath(); ctx.arc(bodyX, bodyY, rad, 0, 6.28); ctx.fill();

      // vzdálené kopce + stromy (vrstvy)
      this.drawHills(mix(A.hills[0], B.hills[0], t), 0.52, 0.05, px, py, 0);
      this.drawTrees(mix(A.hills[1], B.hills[1], t), 0.58, px, 0);
      this.drawHills(mix(A.hills[1], B.hills[1], t), 0.62, 0.07, px, py, 1);
      this.drawTrees(mix(A.hills[2], B.hills[2], t), 0.68, px, 1);
      this.drawHills(mix(A.hills[2], B.hills[2], t), 0.74, 0.09, px, py, 2);
      // přední louka
      this.drawHills(mix(A.hills[3], B.hills[3], t), 0.86, 0.06, px, py, 3);

      // mlha nad loukou
      const fog = ctx.createLinearGradient(0, H * 0.55, 0, H * 0.9);
      fog.addColorStop(0, "rgba(0,0,0,0)"); fog.addColorStop(1, mix(A.fog, B.fog, t) || "rgba(255,255,255,0.1)");
      ctx.fillStyle = mix(A.fog, B.fog, t); ctx.globalAlpha = 0.5;
      ctx.fillRect(0, H * 0.6, W, H * 0.4); ctx.globalAlpha = 1;

      // částice
      if (this.particles.length) this.drawParticles(night, px, py);
    }
    drawHills(col, baseY, amp, px, py, layer) {
      const ctx = this.ctx, W = this.w, H = this.h;
      const y0 = H * baseY + py * (0.2 + layer * 0.3);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-20, H);
      ctx.lineTo(-20, y0);
      const seed = layer * 1.7;
      for (let x = -20; x <= W + 20; x += 24) {
        const y = y0 + Math.sin((x / W) * 6.28 * (1.2 + layer) + seed) * (H * amp) + Math.sin(x * 0.03 + seed) * (H * amp * 0.4);
        ctx.lineTo(x + px * (0.1 + layer * 0.2), y);
      }
      ctx.lineTo(W + 20, H); ctx.closePath(); ctx.fill();
    }
    drawTrees(col, baseY, px, layer) {
      const ctx = this.ctx, W = this.w, H = this.h;
      ctx.fillStyle = col;
      for (const tr of this.trees) {
        if (tr.layer !== (layer % 2)) continue;
        const x = tr.x * W + px * (0.15 + layer * 0.2);
        const y = H * baseY;
        const s = tr.s * Math.min(W, H) * 0.06;
        // jednoduchý jehličnan (trojúhelníky)
        ctx.beginPath();
        ctx.moveTo(x, y - s * 2.2);
        ctx.lineTo(x - s * 0.7, y);
        ctx.lineTo(x + s * 0.7, y);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - s * 1.4); ctx.lineTo(x - s * 0.55, y - s * 0.4);
        ctx.lineTo(x + s * 0.55, y - s * 0.4); ctx.closePath(); ctx.fill();
      }
    }
    drawParticles(night, px, py) {
      const ctx = this.ctx, W = this.w, H = this.h;
      for (const p of this.particles) {
        p.x += p.vx * 0.016 + Math.sin(this.time + p.ph) * 0.0008;
        p.y += p.vy * 0.016;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        if (p.x > 1.05) p.x = -0.05; if (p.x < -0.05) p.x = 1.05;
        const x = p.x * W + px, y = p.y * H + py;
        if (night) {
          // světlušky
          const gl = 0.4 + 0.6 * Math.sin(this.time * 3 + p.ph);
          ctx.globalAlpha = Math.max(0, gl) * 0.9;
          ctx.fillStyle = "#f4e9a0";
          ctx.shadowColor = "#ffe98a"; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(x, y * 0.9 + H * 0.05, p.r * 0.9, 0, 6.28); ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // pyl / prach ve světle
          ctx.globalAlpha = 0.35 + 0.3 * Math.sin(this.time * 2 + p.ph);
          ctx.fillStyle = "rgba(255,252,230,0.9)";
          ctx.beginPath(); ctx.arc(x, y, p.r * 0.7, 0, 6.28); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    destroy() { cancelAnimationFrame(this.raf); }
  }

  // Hero scéna
  const heroCanvas = $("#scene");
  let heroScene = null;
  if (heroCanvas) {
    heroScene = new Scene(heroCanvas, "morning");
    // jemná paralaxa dle myši
    if (!reduceMotion) {
      window.addEventListener("pointermove", (e) => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        heroScene.setParallax(nx, ny);
      }, { passive: true });
    }
  }

  // Nastaví „náladu" celé stránky dle fáze
  function applyMood(phase) {
    const [a, b] = MOOD[phase] || MOOD.morning;
    document.documentElement.style.setProperty("--mood", a);
    document.documentElement.style.setProperty("--mood-deep", b);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", PHASES[phase].sky[3]);
  }

  // Přepínač fáze v hero
  const phaseBtns = $$(".phasebar__btn");
  phaseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      phaseBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const p = btn.dataset.phase;
      heroScene?.setPhase(p);
      applyMood(p);
    });
  });

  // Automatické plynutí dne, dokud uživatel nezasáhne
  let autoCycle = true;
  const order = ["morning", "noon", "evening", "night"];
  let ci = 0;
  if (!reduceMotion) {
    const iv = setInterval(() => {
      if (!autoCycle) { clearInterval(iv); return; }
      ci = (ci + 1) % order.length;
      const p = order[ci];
      phaseBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.phase === p));
      heroScene?.setPhase(p); applyMood(p);
    }, 6500);
    // první interakce zastaví autopilota
    phaseBtns.forEach((b) => b.addEventListener("click", () => { autoCycle = false; }, { once: true }));
  }

  /* ---------------------------------------------------------------------
     2) Sekce DEN — vlastní scéna + záložky fází
  --------------------------------------------------------------------- */
  const dayCanvas = $("#dayScene");
  let dayScene = null;
  const dayLabelMap = { morning: "Ráno", noon: "Poledne", evening: "Večer" };
  if (dayCanvas) dayScene = new Scene(dayCanvas, "morning");

  const dayTabs = $$(".day__tab");
  const dayPanes = $$(".day__pane");
  const dayLabel = $("#dayLabel");
  dayTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const d = tab.dataset.day;
      dayTabs.forEach((t) => { const on = t === tab; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on); });
      dayPanes.forEach((p) => p.classList.toggle("is-active", p.dataset.day === d));
      dayScene?.setPhase(d);
      if (dayLabel) dayLabel.textContent = dayLabelMap[d];
    });
  });

  /* ---------------------------------------------------------------------
     3) Obyvatelé — generování karet, filtr, odhalení faktu
  --------------------------------------------------------------------- */
  const SPECIES = {
    slepice: ["Slepice", "🐔"], husa: ["Husa", "🪿"], kachna: ["Kachna", "🦆"], holub: ["Holub", "🕊️"],
    prase: ["Prase", "🐖"], osel: ["Osel", "🫏"], muflon: ["Muflon", "🐏"], krava: ["Kráva", "🐄"],
    ovce: ["Ovce", "🐑"], pes: ["Pes", "🐕"], kocka: ["Kočka", "🐈"], kralik: ["Králík", "🐇"],
  };
  const ANIMALS = [
    { id: "karel", name: "Karel", species: "osel", group: "stado", fact: "Osli mají skvělou paměť a dožívají se 30–50 let. Když se osel zastaví, obvykle zvažuje nebezpečí — není tvrdohlavý." },
    { id: "princezna", name: "Princezna", species: "prase", group: "prasata", fact: "Prasata patří mezi nejchytřejší zvířata — poznají se v zrcadle a v testech předčí i psy." },
    { id: "flicek", name: "Flíček", species: "prase", group: "prasata", fact: "Prasata se válí v bahně, protože nemají skoro žádné potní žlázy — bláto je chladí a chrání kůži před sluncem." },
    { id: "avala", name: "Avala", species: "krava", group: "stado", fact: "Krávy mají nejlepší kamarádky a stresují se, když je od nich někdo oddělí. Pamatují si přes 50 tváří." },
    { id: "kveta", name: "Květa", species: "krava", group: "stado", fact: "Kráva prožívá silné přátelské vazby — ráda leží vedle své oblíbené družky." },
    { id: "yakul", name: "Yakul", species: "muflon", group: "stado", fact: "Muflon je nejmenší evropská divoká ovce. Stočené rohy beranů rostou celý život a prozradí i jejich věk." },
    { id: "pogo", name: "Pogo", species: "ovce", group: "stado", fact: "Ovce rozeznají až 50 obličejů — ovčích i lidských — a pamatují si je roky. Mají skoro kruhové vidění." },
    { id: "lucinka", name: "Lucinka", species: "ovce", group: "stado", fact: "Ovce jsou velmi družné — osamělá ovce strádá. Ve stádu se cítí bezpečně a navzájem se hlídají." },
    { id: "anaya", name: "Anaya", species: "ovce", group: "stado", fact: "Ovčí vlna roste neustále — proto se ovce na jaře stříhá, aby jí v létě nebylo příliš horko." },
    { id: "eduard", name: "Eduard", species: "ovce", group: "stado", fact: "Beran dává rohy k dobru hlavně na jaře v době námluv — jinak je to klidný strážce stáda." },
    { id: "emil", name: "Emil", species: "ovce", group: "stado", fact: "Zvířata si tvoří nerozlučné páry. Emil se nehne od Amálky — odloučení by je oba stresovalo." },
    { id: "amalka", name: "Amálka", species: "ovce", group: "stado", fact: "Ovce poznají náladu z výrazu tváře a raději se dívají na klidné, usměvavé obličeje." },
    { id: "kulich", name: "Kulich", species: "ovce", group: "stado", fact: "Ovce se navzájem oslovují bečením a jehňata poznají hlas své matky v celém stádu." },
    { id: "konci", name: "Končí", species: "ovce", group: "stado", fact: "Ovce dokážou vyřešit jednoduché bludiště a pamatují si cestu k jídlu i po měsících." },
    { id: "pipinky", name: "Pipinky", species: "slepice", group: "drubez", fact: "Slepice se dorozumívají více než 30 zvuky a se svými kuřaty si „povídají“ už když jsou ve vejci." },
    { id: "husy", name: "Husy", species: "husa", group: "drubez", fact: "Husy bývají věrné na celý život a v letové formaci „V“ si navzájem šetří síly — vedoucí se střídají." },
    { id: "kachny", name: "Kachny", species: "kachna", group: "drubez", fact: "Kachní peří je voděodolné — kachna si ho maže tukem z kostrční žlázy, proto z něj voda steče." },
    { id: "holoubci", name: "Holoubci", species: "holub", group: "drubez", fact: "Holubi trefí domů i ze stovek kilometrů — vnímají magnetické pole Země a orientují se podle slunce." },
    { id: "riky", name: "Riky", species: "pes", group: "mazlici", fact: "Psi vnímají svět hlavně čichem — mají až 300 milionů čichových buněk, člověk jen kolem šesti." },
    { id: "kesy", name: "Kesy", species: "pes", group: "mazlici", fact: "Velká pastevecká plemena byla šlechtěna, aby u stáda rozhodovala sama — i bez člověka." },
    { id: "atila", name: "Atila", species: "pes", group: "mazlici", fact: "Psi rozumějí lidským gestům — sledují, kam ukazujeme, což kromě nich umí málokteré zvíře." },
    { id: "roman", name: "Roman", species: "kocka", group: "mazlici", fact: "Kočka má v každém uchu přes 20 svalů a otočí ušima skoro o 180°, aby zaměřila i tichý zvuk." },
    { id: "safir", name: "Safír", species: "kocka", group: "mazlici", fact: "Kočky prospí 12–16 hodin denně. Předení je uklidňuje a podle studií i pomáhá hojení." },
    { id: "patricie", name: "Patricie", species: "kocka", group: "mazlici", fact: "Dospělé kočky mňoukají skoro výhradně na lidi — mezi sebou se baví spíš pachem a řečí těla." },
    { id: "hanicka", name: "Hanička", species: "kocka", group: "mazlici", fact: "Zvířata se zvládnou přizpůsobit i ztrátě nohy — Hanička běhá a šplhá po svém a nic jí nechybí." },
    { id: "lotka", name: "Lotka", species: "kocka", group: "mazlici", fact: "Každý kočičí nos má jedinečný otisk — stejně jako otisk prstu u člověka." },
    { id: "masa", name: "Máša", species: "kocka", group: "mazlici", fact: "Modré oči mívají kočky se světlou srstí — barvu očím dává množství pigmentu, ne plemeno." },
    { id: "kralici", name: "Králíci", species: "kralik", group: "mazlici", fact: "Králíci dělají radostné výskoky zvané „binky“. Zuby jim rostou celý život, proto pořád okusují." },
  ];

  const grid = $("#residentsGrid");
  function renderResidents(group = "all") {
    if (!grid) return;
    const list = group === "all" ? ANIMALS : ANIMALS.filter((a) => a.group === group);
    grid.innerHTML = "";
    list.forEach((a, i) => {
      const [label] = SPECIES[a.species] || [a.species];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "rcard";
      card.style.animationDelay = (i * 0.03) + "s";
      card.setAttribute("aria-label", `${a.name} — ${label}. Ťukni pro zajímavost.`);
      card.innerHTML = `
        <div class="rcard__media">
          <span class="rcard__species">${label}</span>
          <img src="./assets/animals/${a.id}.webp" alt="${a.name}" loading="lazy" />
          <div class="rcard__grad"></div>
          <span class="rcard__name">${a.name}</span>
        </div>
        <div class="rcard__fact"><span><b>${a.name}</b>${a.fact}</span></div>`;
      card.addEventListener("click", () => {
        const open = card.classList.contains("is-open");
        card.classList.toggle("is-open", !open);
      });
      grid.appendChild(card);
    });
  }
  renderResidents();
  $$(".residents__filters .pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      $$(".residents__filters .pill").forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      renderResidents(pill.dataset.group);
    });
  });

  /* ---------------------------------------------------------------------
     4) Mapa světa — interaktivní značky
  --------------------------------------------------------------------- */
  const worldInfo = $("#worldInfo");
  $$(".worldmap__spot").forEach((spot) => {
    const show = () => {
      $$(".worldmap__spot").forEach((s) => s.classList.remove("is-active"));
      spot.classList.add("is-active");
      if (worldInfo) worldInfo.innerHTML = `<strong>${spot.dataset.title}</strong><span>${spot.dataset.desc}</span>`;
    };
    spot.addEventListener("mouseenter", show);
    spot.addEventListener("focus", show);
    spot.addEventListener("click", show);
  });

  /* ---------------------------------------------------------------------
     5) Počítadla statistik
  --------------------------------------------------------------------- */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const dur = 1400; const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------------
     6) Reveal-on-scroll + počítadla přes IntersectionObserver
  --------------------------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    $$(".reveal").forEach((el) => io.observe(el));

    const statIo = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { animateCount(en.target); statIo.unobserve(en.target); } });
    }, { threshold: 0.5 });
    $$(".stat__num[data-count]").forEach((el) => statIo.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
    $$(".stat__num[data-count]").forEach(animateCount);
  }

  /* ---------------------------------------------------------------------
     7) Nav — stav po scrollu
  --------------------------------------------------------------------- */
  const nav = $("#nav");
  const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------------------------------------------------------------
     8) Přepínač světlý / tmavý režim
  --------------------------------------------------------------------- */
  const themeBtn = $("#themeBtn");
  const stored = (() => { try { return localStorage.getItem("louka-theme"); } catch { return null; } })();
  if (stored) document.documentElement.setAttribute("data-theme", stored);
  themeBtn?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const now = (cur || sys) === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", now);
    try { localStorage.setItem("louka-theme", now); } catch {}
  });

  /* ---------------------------------------------------------------------
     9) Ambientní zvuk — jemný Web Audio pad (na přání, ve výchozím vypnuto)
        Odkaz na adaptivní hudbu hry: vrstvený pad + náhodné „ptačí" tóny.
  --------------------------------------------------------------------- */
  const ambientBtn = $("#ambientBtn");
  let audioCtx = null, master = null, ambientOn = false, birdTimer = null, nodes = [];
  function startAmbient() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain(); master.gain.value = 0.0001; master.connect(audioCtx.destination);
    // teplý pad — dvě mírně rozladěné píly přes low-pass
    const chord = [146.83, 220.0, 293.66]; // D3 A3 D4
    chord.forEach((f, i) => {
      const o = audioCtx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f;
      const o2 = audioCtx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = f * 1.006;
      const filt = audioCtx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 620; filt.Q.value = 0.6;
      const g = audioCtx.createGain(); g.gain.value = 0.16 / (i + 1);
      const lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.06 + i * 0.02;
      const lfg = audioCtx.createGain(); lfg.gain.value = 140;
      lfo.connect(lfg); lfg.connect(filt.frequency);
      o.connect(filt); o2.connect(filt); filt.connect(g); g.connect(master);
      o.start(); o2.start(); lfo.start();
      nodes.push(o, o2, lfo);
    });
    master.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 2.5);
    // občasné „ptačí" cinknutí
    const pentatonic = [587.33, 659.25, 783.99, 880.0, 1046.5];
    birdTimer = setInterval(() => {
      if (!ambientOn || audioCtx.state !== "running") return;
      if (Math.random() > 0.55) return;
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator(); o.type = "triangle";
      o.frequency.value = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const g = audioCtx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.9);
    }, 2200);
  }
  function stopAmbient() {
    if (master && audioCtx) master.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
    clearInterval(birdTimer);
    setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch {} }); nodes = []; if (audioCtx) audioCtx.suspend(); }, 800);
  }
  ambientBtn?.addEventListener("click", () => {
    ambientOn = !ambientOn;
    ambientBtn.classList.toggle("is-on", ambientOn);
    ambientBtn.setAttribute("aria-pressed", String(ambientOn));
    if (ambientOn) { if (!audioCtx) startAmbient(); else { audioCtx.resume(); master.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 1.5); } }
    else stopAmbient();
  });

  /* ---------------------------------------------------------------------
     10) Rok v patičce
  --------------------------------------------------------------------- */
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  // Pozastavit hero animaci, když je karta na pozadí (šetří baterii)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { heroScene?.destroy(); dayScene?.destroy(); }
    else {
      if (heroScene) heroScene.raf = requestAnimationFrame(heroScene.loop);
      if (dayScene) dayScene.raf = requestAnimationFrame(dayScene.loop);
    }
  });
})();
