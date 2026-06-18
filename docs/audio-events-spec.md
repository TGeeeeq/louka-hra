# Louka — Audio Event Specification
## Sound Designer: kompletní parametry pro TypeScript / Web Audio API
### Verze 1.0 — připraveno k implementaci

---

## 0. Architektura enginu (rozšíření stávající třídy)

### Nové privátní members

```typescript
// Tension system
private tensionLevel: 0 | 1 | 2 | 3 = 0;
// 0=calm, 1=alert, 2=danger, 3=relief
private tensionTimer: number | null = null;
private dangerGain: GainNode | null = null;   // ostinato layer
private dangerOsc: OscillatorNode | null = null;

// Music layers
private musicLayerGains: GainNode[] = [];  // [melody, bass, pad, ostinato]
private currentPhase: Phase = "rano";

// NPC voice state (throttle)
private lastNpcSpeak: Record<string, number> = {};
private NPC_SPEAK_COOLDOWN = 1800; // ms

// Priority queue — danger přeruší ostatní SFX
private activeSfx: Set<AudioNode> = new Set();
```

### Nová helper metoda: FM syntéza

```typescript
private fm(
  carrier: number,    // Hz
  modRatio: number,   // násobek carrieru
  modDepth: number,   // frekvenční deviace jako násobek carrieru
  dur: number,        // sekundy
  gain: number,
  wave: OscillatorType = "sine",
  delay = 0,
  portamentoTo?: number  // cílová freq pro portamento
): void {
  if (!this.ctx || !this.master || this.muted) return;
  const t0 = this.ctx.currentTime + delay;

  const mod = this.ctx.createOscillator();
  const modGain = this.ctx.createGain();
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();

  mod.frequency.value = carrier * modRatio;
  modGain.gain.value = carrier * modDepth;
  mod.connect(modGain);
  modGain.connect(osc.frequency);

  osc.type = wave;
  osc.frequency.setValueAtTime(carrier, t0);
  if (portamentoTo !== undefined) {
    osc.frequency.linearRampToValueAtTime(portamentoTo, t0 + dur * 0.7);
  }

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.04, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g);
  g.connect(this.master);
  if (this.verb) g.connect(this.verb);

  mod.start(t0); mod.stop(t0 + dur + 0.05);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
```

### Noise burst helper

```typescript
private noise(dur: number, gain: number, lpFreq: number, delay = 0): void {
  if (!this.ctx || !this.master || this.muted) return;
  const t0 = this.ctx.currentTime + delay;
  const bufLen = Math.floor(this.ctx.sampleRate * dur);
  const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;

  const src = this.ctx.createBufferSource();
  src.buffer = buf;
  const lp = this.ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = lpFreq;
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(lp); lp.connect(g); g.connect(this.master);
  src.start(t0); src.stop(t0 + dur + 0.05);
}
```

---

## 1. NPC Hlasy — npcSpeak(npcId, sentiment)

### Voice charakter (FM + formant filtr)

| NPC | Carrier | ModRatio | ModDepth | Vlnový tvar | LP cutoff | BPM (tempo řeči) |
|-----|---------|----------|----------|------------|-----------|-----------------|
| tomas | 155 Hz | 1.8 | 0.25 | sine+triangle | 900 Hz | pomalý, 4–6 slabik/s |
| maruska | 275 Hz | 2.1 | 0.18 | triangle | 1800 Hz | rychlý, 7–9 slabik/s |
| tony | 120 Hz | 0.9 | 0.45 | sawtooth | 400 Hz | bručivý, 3–5 slabik/s |

### Sentiment → modulace

| sentiment | freq offset | duration mult | pitch contour |
|-----------|------------|---------------|---------------|
| positive | +8% | 0.9× | rise 0→+10% |
| neutral | 0 | 1.0× | flat ±3% jitter |
| negative | -12% | 1.15× | fall 0→-15% |
| urgent | +5%, jitter | 0.7× | staccato bursts |
| question | +18% na konci | 1.05× | rise na posledním tónu |

### Implementace

```typescript
npcSpeak(npcId: "tomas" | "maruska" | "tony", sentiment: "positive" | "neutral" | "negative" | "urgent" | "question" = "neutral") {
  this.ensure();
  const now = Date.now();
  if ((this.lastNpcSpeak[npcId] ?? 0) + this.NPC_SPEAK_COOLDOWN > now) return;
  this.lastNpcSpeak[npcId] = now;

  const profiles = {
    tomas:   { carrier: 155, modRatio: 1.8, modDepth: 0.25, wave: "triangle" as OscillatorType, lp: 900,  syllDur: 0.16, syllGap: 0.06 },
    maruska: { carrier: 275, modRatio: 2.1, modDepth: 0.18, wave: "triangle" as OscillatorType, lp: 1800, syllDur: 0.09, syllGap: 0.025 },
    tony:    { carrier: 120, modRatio: 0.9, modDepth: 0.45, wave: "sawtooth" as OscillatorType, lp: 400,  syllDur: 0.20, syllGap: 0.09 },
  };
  const p = profiles[npcId];

  // sentiment → freq multiplikátor
  const sentMult = { positive: 1.08, neutral: 1.0, negative: 0.88, urgent: 1.05, question: 1.0 };
  const baseFreq = p.carrier * sentMult[sentiment];

  // počet slabik dle sentimentu
  const syllCount = sentiment === "urgent" ? 6 + Math.floor(Math.random() * 4)
                  : sentiment === "neutral" ? 4 + Math.floor(Math.random() * 3)
                  : 3 + Math.floor(Math.random() * 4);

  let t = 0;
  for (let i = 0; i < syllCount; i++) {
    // každá slabika — lehká variace výšky
    const jitter = 0.92 + Math.random() * 0.16;
    let freq = baseFreq * jitter;

    // question: poslední dvě slabiky stoupají
    if (sentiment === "question" && i >= syllCount - 2) freq *= 1.0 + (i - syllCount + 2) * 0.09;
    // negative: slabiky klesají
    if (sentiment === "negative") freq *= 1.0 - (i / syllCount) * 0.14;
    // positive: mírný oblouk nahoru pak dolů
    if (sentiment === "positive") freq *= 1.0 + Math.sin((i / syllCount) * Math.PI) * 0.1;

    this.fm(freq, p.modRatio, p.modDepth, p.syllDur, 0.12, p.wave, t);
    t += p.syllDur + p.syllGap + (Math.random() * 0.03);
  }
}
```

**Trigger:** volá se z `npcReactions.ts` kdykoli NPC dostane dialog. Cooldown 1800 ms = nepřekrývá se.
**Priority:** nízká — nepřerušuje nic, sám je přerušen `foxAttack` / `eagleAttack`.

---

## 2. Zvuky zvířat — rozšíření animal() + nové

### 2.1 animal(kind) — vylepšené verze

```typescript
animal(kind: FeedGroup | "osel" | "ovce" | "krava") {
  this.ensure();
  switch (kind) {

    // DRŮBEŽ: FM klovkání 320–380 Hz, modRatio 6.0 = ostré harmoniky
    case "drubez":
      this.fm(340 + Math.random() * 40, 6.0, 0.8, 0.07, 0.08, "sine", 0);
      this.fm(320 + Math.random() * 40, 6.0, 0.7, 0.06, 0.07, "sine", 0.09);
      // portamento kvoknutí: 380→340 Hz
      if (Math.random() < 0.4)
        this.fm(380, 5.0, 0.6, 0.18, 0.06, "sine", 0.18, 340);
      break;

    // PRASATA: hluboké FM 85–110 Hz, modRatio 0.5 = hrubé přefouklé, + noise frknutí
    case "prasata":
      this.fm(90 + Math.random() * 20, 0.5, 1.2, 0.28, 0.10, "sawtooth", 0);
      if (Math.random() < 0.5) this.noise(0.12, 0.07, 320, 0.24); // frknutí
      break;

    // STÁDO (krávy): 98 Hz FM + vibrato LFO přes FM modDepth
    case "stado":
      // vibrato: modRatio 0.06 (6% carrieru) = pomalé mečení
      this.fm(98, 0.06, 0.15, 1.4, 0.09, "sine", 0); // kráva — mú s vibratem
      this.fm(98 * 1.5, 1.0, 0.3, 0.9, 0.05, "sine", 0.3); // kvinta, dozvuk
      break;

    // OVCE: glissando 320→420 Hz FM (mé-é-é)
    case "stado_ovce": // volá se pokud population > ovce threshold
      this.fm(320, 3.0, 0.5, 0.55, 0.09, "triangle", 0, 420);
      break;

    // MAZLÍČCI (psi, kočky, králíci)
    case "mazlici":
      this.seq([{ f: 580, d: 0.1, g: 0.07 }, { f: 460, d: 0.13, g: 0.06 }]);
      break;

    // OSEL: hluboké FM s long portamentem
    case "osel":
      this.fm(110, 1.5, 0.8, 0.8, 0.11, "sawtooth", 0, 55);
      this.fm(55, 0.5, 0.4, 1.2, 0.08, "sine", 0.6);
      break;
  }
}
```

### 2.2 animalPanic(kind)

**Trigger:** zvíře prchá, detekce predátora, ohranda se otevřela.

```typescript
animalPanic(kind: FeedGroup) {
  this.ensure();
  switch (kind) {
    case "drubez":
      // rychlé opakované klovkání × 4 + křik FM 480 Hz rapidní
      for (let i = 0; i < 4; i++) {
        this.fm(440 + Math.random() * 80, 7.0, 1.2, 0.06, 0.10, "sine", i * 0.08);
      }
      this.fm(520, 8.0, 1.5, 0.22, 0.13, "sine", 0.35); // panický výkřik
      break;

    case "prasata":
      // kvičení: 220 Hz FM, modRatio 4.0, rychlý portamento nahoru 220→380
      this.fm(220, 4.0, 1.8, 0.35, 0.13, "sawtooth", 0, 380);
      this.noise(0.18, 0.08, 600, 0.32); // chvějící se hluk
      break;

    case "stado":
      // stádo: rychlý mú + dupání (noise)
      this.fm(130, 2.0, 0.9, 0.3, 0.12, "sine", 0);
      this.fm(145, 2.0, 0.9, 0.25, 0.10, "sine", 0.12);
      this.noise(0.2, 0.06, 200, 0.05); // dupání kopyt
      this.noise(0.2, 0.06, 200, 0.28);
      break;

    case "mazlici":
      this.seq([{ f: 720, d: 0.08, g: 0.09 }, { f: 680, d: 0.08, g: 0.09 },
                { f: 640, d: 0.1, g: 0.08 }], 0.01);
      break;
  }
}
```

**Priority:** HIGH — spouští se i přes aktivní ambient. Nepřerušuje foxAttack/eagleAttack.

### 2.3 animalHappy(kind)

**Trigger:** welfare skupiny > 80, právě nakrmeno, hráč interaguje s well-fed zvířetem.

```typescript
animalHappy(kind: FeedGroup) {
  this.ensure();
  switch (kind) {
    case "drubez":
      // dvě měkká klopknutí + portamento kvokání klesající (spokojené)
      this.fm(350, 5.0, 0.5, 0.1, 0.07, "sine", 0);
      this.fm(370, 4.5, 0.4, 0.09, 0.06, "sine", 0.12);
      this.fm(360, 4.0, 0.3, 0.16, 0.07, "sine", 0.26, 320); // klesající = klid
      break;

    case "prasata":
      // pomalé hrdelní bublání: 95 Hz FM modRatio 0.3
      this.fm(95, 0.3, 0.5, 0.55, 0.08, "sine", 0);
      this.fm(100, 0.3, 0.4, 0.45, 0.07, "sine", 0.28);
      break;

    case "stado":
      // klidné mú, vibrato slabé, klesá na konci
      this.fm(98, 0.06, 0.08, 1.6, 0.08, "sine", 0, 88);
      break;

    case "mazlici":
      // předení / vrčení: 55 Hz FM, modRatio 30 = charakter předení
      this.fm(55, 30.0, 0.04, 1.0, 0.07, "sine", 0);
      break;
  }
}
```

**Priority:** LOW. Přerušen jakýmkoli danger eventem.

### 2.4 animalEscape(kind)

**Trigger:** zvíře opustilo ohraničení ohrady — hned po detekci.

```typescript
animalEscape(kind: FeedGroup) {
  this.ensure();
  // 1. Alert pip — vždy, bez ohledu na druh
  this.tone(1400, 0.08, "sine", 0.14, 0);
  this.tone(1400, 0.08, "sine", 0.11, 0.12);
  // 2. Druh-specifický zvuk paniky
  this.animalPanic(kind);
  // 3. Tension → alert
  this.setTension(1);
}
```

**Priority:** HIGH. Přeruší ambient a music layers (ztiší na 60 %).

### 2.5 animalCaught()

**Trigger:** hráč úspěšně vrátil uprchlé zvíře do ohrady.

```typescript
animalCaught() {
  this.ensure();
  // Krátká "chytil jsem tě" fanfára — dvě noty nahoru + měkká tercie
  this.seq([
    { f: 523, d: 0.10, t: "sine",     g: 0.10 },
    { f: 659, d: 0.10, t: "sine",     g: 0.10 },
    { f: 784, d: 0.22, t: "triangle", g: 0.09 },
  ]);
  // Reset tension pokud žádný predátor aktivní
  if (this.tensionLevel <= 1) this.setTension(0);
}
```

---

## 3. Predátorské eventy

### 3.1 foxAlert()

**Trigger:** liška detekována systémem, ještě nenapadla.

```typescript
foxAlert() {
  this.ensure();
  // Liška: growl + alert pip
  // Growl: 65 Hz FM, modRatio 7.0 = charakter, krátký (0.28 s)
  this.fm(65, 7.0, 2.5, 0.28, 0.09, "sawtooth", 0);
  // Alert pip: 1400 Hz sine, ostrý, dvakrát
  this.tone(1400, 0.06, "sine", 0.13, 0.22);
  this.tone(1400, 0.06, "sine", 0.10, 0.32);
  // Tension → alert (level 1)
  this.setTension(1);
}
```

**Priority:** MEDIUM-HIGH. Spustí se přes ambient a npcSpeak.

### 3.2 foxAttack()

**Trigger:** liška zaútočila — zvíře v bezprostředním ohrožení.

```typescript
foxAttack() {
  this.ensure();
  // Útočný growl: delší, hlubší, více modulovaný
  this.fm(65, 7.0, 3.5, 0.55, 0.14, "sawtooth", 0);
  this.fm(72, 6.5, 3.0, 0.45, 0.11, "sawtooth", 0.12); // vrstvená drsnost
  // Noise šelest: skok v trávě
  this.noise(0.18, 0.09, 800, 0.08);
  // Zvíře reaguje panikou (drůbež jako výchozí — nejčastější cíl)
  this.animalPanic("drubez");
  // Tension → danger (level 2)
  this.setTension(2);
}
```

**Priority:** CRITICAL. Přeruší vše kromě eagleAttack.

### 3.3 eagleAttack()

**Trigger:** káně zaútočilo — přílét shora.

```typescript
eagleAttack() {
  this.ensure();
  // Kánistí glissando: 2200→800 Hz, dur 0.6 s (střemhlavý let)
  this.fm(2200, 1.0, 0.1, 0.6, 0.11, "sine", 0, 800);
  // Výkřik: 1800 Hz, krátký a ostrý
  this.tone(1800, 0.14, "sine", 0.14, 0.52);
  // Šum křídel: noise 80–2000 Hz, 0.25 s
  this.noise(0.25, 0.08, 2000, 0.18);
  // Zvíře v panice
  this.animalPanic("drubez");
  // Tension → danger (level 2)
  this.setTension(2);
}
```

**Priority:** CRITICAL. Nejvyšší priorita ze všech SFX.

### 3.4 dangerRelief()

**Trigger:** nebezpečí pominulo — predátor odháněn nebo odešel.

```typescript
dangerRelief() {
  this.ensure();
  // Jemný sestupný tón — úleva
  this.seq([
    { f: 784, d: 0.14, t: "sine",     g: 0.08 },
    { f: 659, d: 0.14, t: "sine",     g: 0.07 },
    { f: 523, d: 0.28, t: "triangle", g: 0.07 },
  ]);
  // Tension → relief (level 3), pak po 2 s → calm (0)
  this.setTension(3);
  window.setTimeout(() => this.setTension(0), 2000);
}
```

---

## 4. Tension System

### Stavový automat

```
calm (0) ──foxAlert──► alert (1) ──foxAttack/eagleAttack──► danger (2)
                                                              │
calm (0) ◄──2s po relief──(3) relief ◄──dangerRelief()──────┘
```

### Implementace setTension()

```typescript
setTension(level: 0 | 1 | 2 | 3) {
  if (this.tensionLevel === level) return;
  this.tensionLevel = level;
  this.updateMusicTension(level);
  this.updateAmbientTension(level);
}

private updateMusicTension(level: number) {
  if (!this.ctx || !this.master) return;
  const now = this.ctx.currentTime;
  // Upraví gain music layers přes crossfade 0.8 s
  const targetGain = [1.0, 0.7, 0.35, 0.85][level] ?? 1.0;
  if (this.master) {
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.3 * targetGain, now + 0.8);
  }

  // danger: spustí ostinato puls (nízký pravidelný drone)
  if (level === 2) this.startDangerDrone();
  else this.stopDangerDrone();

  // relief: krátký gain bump pak fade zpět
  if (level === 3) {
    this.master.gain.linearRampToValueAtTime(0.38, now + 0.3);
    this.master.gain.linearRampToValueAtTime(0.3, now + 1.8);
  }
}

private startDangerDrone() {
  if (!this.ctx || !this.master || this.dangerOsc) return;
  const t0 = this.ctx.currentTime;
  this.dangerOsc = this.ctx.createOscillator();
  this.dangerGain = this.ctx.createGain();
  this.dangerOsc.type = "sawtooth";
  this.dangerOsc.frequency.value = 55; // hluboké A1
  this.dangerGain.gain.setValueAtTime(0.0001, t0);
  this.dangerGain.gain.linearRampToValueAtTime(0.045, t0 + 1.2);
  this.dangerOsc.connect(this.dangerGain);
  this.dangerGain.connect(this.master);
  this.dangerOsc.start(t0);
}

private stopDangerDrone() {
  if (!this.dangerOsc || !this.dangerGain || !this.ctx) return;
  const t0 = this.ctx.currentTime;
  this.dangerGain.gain.linearRampToValueAtTime(0.0001, t0 + 1.5);
  this.dangerOsc.stop(t0 + 1.6);
  this.dangerOsc = null;
  this.dangerGain = null;
}

private updateAmbientTension(level: number) {
  // alert/danger: ambient tick interval zrychlit (pocit naléhavosti)
  // Stávající ambientTimer restart s jiným intervalem
  // calm:   2200–5700 ms  (stávající hodnoty)
  // alert:  1200–2800 ms
  // danger:  800–1600 ms
  // relief: 1800–4000 ms
  const intervals: [number, number][] = [
    [2200, 3500], [1200, 1600], [800, 800], [1800, 2200]
  ];
  // ambientTimer se restartne na startu příští tick — stačí uložit interval
  this.ambientIntervalRange = intervals[level];
}
// Přidej member:  private ambientIntervalRange: [number, number] = [2200, 3500];
// V tick() v startAmbient(): window.setTimeout(tick, this.ambientIntervalRange[0] + Math.random() * this.ambientIntervalRange[1]);
```

---

## 5. Sezónní přechod — seasonChange(season)

**Trigger:** reducere přepne `state.season` → UI ho zachytí a zavolá.

```typescript
seasonChange(season: Season) {
  this.ensure();
  // Stinger: modulace sezóny (pentatonická sekvence)
  const stingers: Record<Season, { f: number; d: number; g?: number }[]> = {
    jaro:   [{ f: 523, d: 0.14 }, { f: 659, d: 0.14 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.28, g: 0.09 }],
    leto:   [{ f: 659, d: 0.12 }, { f: 784, d: 0.12 }, { f: 880, d: 0.12 }, { f: 1175, d: 0.26, g: 0.09 }],
    podzim: [{ f: 440, d: 0.16 }, { f: 392, d: 0.16 }, { f: 349, d: 0.16 }, { f: 294, d: 0.34, g: 0.09 }],
    zima:   [{ f: 392, d: 0.20 }, { f: 330, d: 0.22 }, { f: 294, d: 0.26 }, { f: 220, d: 0.44, g: 0.08 }],
  };
  this.seq(stingers[season], 0.01);

  // Přepni hudební téma + ambient profil
  this.setSeason(season);
  // Restart muziky pro nové téma
  this.stopMusic();
  window.setTimeout(() => this.startMusic(), 800);
}
```

---

## 6. Hudební systém — 12 kombinací (4 sezóny × 3 fáze)

### Melodické sekvence (THEMES rozšíření)

Každá sezóna má 3 fázové varianty. Klíč: `${season}_${phase}`. Frekvence v Hz, 0 = pauza.

#### Pentatonika / mody per sezóna

| Sezóna | Tónina | Modus | Nálada |
|--------|--------|-------|--------|
| jaro | C dur | Iónský / Lydický | světlý, rozvibrovaný |
| léto | G dur | Mixolydický | hřejivý, uvolněný |
| podzim | A moll | Aiolský / Dórský | melancholický |
| zima | E moll | Frygický | introvertní, ledový |

#### Tabulka melodií (16 kroků × délka nota 1.0 s)

```typescript
private THEMES: Record<string, number[]> = {
  // ── JARO ──────────────────────────────────────────────────────────────────
  // Ráno: svěží, stoupající pentatonika — ptáci se probouzejí
  "jaro_rano":   [523,   0, 659, 0,   784,   0,   880,   0, 784,   0, 659, 0, 523, 0,   0, 0],
  // Poledne: plné, bohatší — vrchol dne, přídavné noty
  "jaro_poledne":[659,   0, 784, 0,   880, 988,   784,   0, 659, 784, 523, 0, 659, 0, 784, 0],
  // Večer: klesající, ztišené — uklidnění, cvrčci
  "jaro_vecer":  [784, 659,   0, 523,   0, 440,   523,   0, 392,   0,   0, 0, 330, 0,   0, 0],

  // ── LÉTO ──────────────────────────────────────────────────────────────────
  // Ráno: uvolněné, slunečné mixolydické téma
  "leto_rano":   [587,   0, 659, 0,   784,   0,   880,   0, 784, 0, 659, 0,   0,   587, 0, 0],
  // Poledne: pomalejší, teplo — volné a relaxed
  "leto_poledne":[659,   0,   0, 784,   0,   0,   880,   0, 784, 0,   0, 659, 0,   523, 0, 0],
  // Večer: teplá „zlatá hodinka", klesající
  "leto_vecer":  [880, 784, 659, 0,   587,   0,   523,   0, 440, 0,   0,   0, 392, 0,   0, 0],

  // ── PODZIM ────────────────────────────────────────────────────────────────
  // Ráno: aiolský, lehká melancholie, ale stále energický
  "podzim_rano": [440,   0, 523, 0,   392,   0,   440,   0, 349,   0, 392, 0,   0, 330,   0, 0],
  // Poledne: dórský charakter — hluboký klid, přijímající
  "podzim_poledne":[349, 0, 392, 440,   0, 349,   392,   0,   0, 330,   0, 294, 0,   0, 349, 0],
  // Večer: uklidňující klesání, příprava na spánek
  "podzim_vecer":[392, 349, 0, 294,   0,   0,   330,   0, 294, 0,   0, 247, 0,   0,   0, 0],

  // ── ZIMA ──────────────────────────────────────────────────────────────────
  // Ráno: frygický, osamělý — ticho sněhu
  "zima_rano":   [330,   0,   0, 294,   0,   0,   247,   0,   0, 0, 220, 0,   0,   0,   0, 0],
  // Poledne: o něco teplejší — chvilkový sluneční svit
  "zima_poledne":[294,   0, 330,   0,   294,   0,   247,   0, 220, 0,   0, 196,   0, 220, 0, 0],
  // Večer: nejpomalejší, nejtiší — hluboký zimní klid
  "zima_vecer":  [220,   0,   0,   0,   196,   0,   0,   0, 165, 0,   0,   0,   0,   0,   0, 0],
};
```

#### Bass tóny per sezóna (8-krokový cyklus)

```typescript
private BASS: Record<Season, number[]> = {
  jaro:   [196, 0, 0, 0, 196, 0, 165, 0],  // G2, G2, E2
  leto:   [174, 0, 0, 0, 174, 0, 146, 0],  // F2, F2, D2
  podzim: [147, 0, 0, 0, 131, 0, 110, 0],  // D2, C2, A1
  zima:   [110, 0, 0, 0, 110, 0,  98, 0],  // A1, A1, G1
};
```

#### Tempo per sezóna × fáze (ms/krok)

```typescript
private TEMPO_TABLE: Record<string, number> = {
  "jaro_rano": 440,   "jaro_poledne": 480,   "jaro_vecer": 560,
  "leto_rano": 500,   "leto_poledne": 560,   "leto_vecer": 620,
  "podzim_rano": 540, "podzim_poledne": 600, "podzim_vecer": 680,
  "zima_rano": 660,   "zima_poledne": 700,   "zima_vecer": 820,
};
```

#### Instrumentace per fáze

```typescript
private getMelodyGain(phase: Phase): number {
  return phase === "rano" ? 0.040 : phase === "poledne" ? 0.038 : 0.030;
}
private getBassGain(phase: Phase): number {
  return phase === "rano" ? 0.034 : phase === "poledne" ? 0.032 : 0.022;
}
// Noc (vecer): přidat jemný pad 8va níže, gain 0.018
// Ráno: přidat chorus (f × 1.004) pro svěžest
```

#### Aktualizace startMusic() pro nový systém

```typescript
startMusic() {
  if (this.musicTimer != null || !this.musicOn) return;
  const tick = () => {
    if (!this.muted && this.musicOn && this.ctx) {
      const key = `${this.season}_${this.phase}`;
      const mel = this.THEMES[key] ?? this.THEMES[`${this.season}_rano`];
      const bass = this.BASS[this.season];
      const tempo = this.TEMPO_TABLE[key] ?? 500;
      const mg = this.getMelodyGain(this.phase);
      const bg = this.getBassGain(this.phase);
      const tensionMult = [1.0, 0.7, 0.35, 0.9][this.tensionLevel];

      const f = mel[this.musicStep % mel.length];
      if (f > 0) {
        this.tone(f, 1.0, "sine", mg * tensionMult);
        this.tone(f * 1.004, 1.0, "sine", mg * 0.75 * tensionMult); // chorus
        if (this.phase === "vecer") this.tone(f * 0.5, 1.4, "sine", 0.018 * tensionMult); // pad
      }

      const bassF = bass[this.musicStep % bass.length];
      if (bassF > 0) {
        this.tone(bassF, 2.0, "sine", bg * tensionMult);
        this.tone(bassF * 1.5, 1.8, "sine", bg * 0.5 * tensionMult);
      }

      this.musicStep++;
      this.musicTimer = window.setTimeout(tick, tempo);
    } else {
      this.musicTimer = window.setTimeout(tick, 500);
    }
  };
  tick();
}
```

---

## 7. Transition Stingery

### 7.1 newDay() — rozšíření

```typescript
newDay() {
  this.ensure();
  // Ráno — fanfára dle sezóny
  const stingers: Record<Season, { f: number; d: number; t?: OscillatorType; g?: number }[]> = {
    jaro:   [{ f: 523, d: 0.16 }, { f: 659, d: 0.16 }, { f: 784, d: 0.16 }, { f: 1047, d: 0.32, g: 0.10 }],
    leto:   [{ f: 587, d: 0.14 }, { f: 740, d: 0.14 }, { f: 880, d: 0.14 }, { f: 1175, d: 0.30, g: 0.10 }],
    podzim: [{ f: 440, d: 0.18 }, { f: 523, d: 0.18 }, { f: 494, d: 0.18 }, { f: 587, d: 0.36, g: 0.09 }],
    zima:   [{ f: 392, d: 0.22 }, { f: 440, d: 0.22 }, { f: 415, d: 0.22 }, { f: 523, d: 0.44, g: 0.08 }],
  };
  this.seq(stingers[this.season], 0.015);
  // Reset tension na calm
  this.setTension(0);
}
```

### 7.2 questDone() — beze změny (funguje dobře)

Stávající implementace zachovat. Příp. přidat jitter 0.03 pro variaci.

### 7.3 build() — rozšíření

```typescript
build() {
  this.ensure();
  // Konstrukční "thud" + úspěch
  this.noise(0.15, 0.08, 400, 0); // rána kladiva
  this.seq([
    { f: 392, d: 0.12, g: 0.09 },
    { f: 523, d: 0.12, g: 0.09 },
    { f: 659, d: 0.22, t: "triangle", g: 0.09 },
  ], 0.02);
}
```

---

## 8. Ostatní SFX — přepracování stávajících

### 8.1 select() — jemnější klik

```typescript
select() {
  // FM klik 560 Hz, modRatio 4.0, dur 0.08 = kliknutí na dřevo (organic)
  this.fm(560, 4.0, 0.3, 0.08, 0.07);
}
```

### 8.2 interact()

```typescript
interact() {
  this.seq([{ f: 520, d: 0.09, t: "triangle" }, { f: 700, d: 0.13, t: "sine" }], 0.01);
}
```

### 8.3 error()

```typescript
error() {
  // Rustikální "ne" — nízké, organické, ne digitální
  this.fm(220, 2.0, 0.8, 0.22, 0.09, "sawtooth", 0);
  this.tone(180, 0.18, "triangle", 0.07, 0.08);
}
```

### 8.4 coin()

```typescript
coin() {
  // Kovový zvuk mince — FM vysoké frekvence s rychlým decay
  this.fm(1200, 7.0, 1.0, 0.22, 0.10, "sine", 0);
  this.fm(980, 5.5, 0.8, 0.18, 0.08, "sine", 0.04);
}
```

### 8.5 eat()

```typescript
eat() {
  // Žvýkání: nízký triangle + noise (organický zvuk)
  this.tone(300, 0.10, "triangle", 0.07, 0);
  this.noise(0.08, 0.04, 600, 0.06);
  this.tone(340, 0.12, "triangle", 0.06, 0.14);
}
```

### 8.6 success()

Zachovat, přidat jitter 0.03.

### 8.7 sleepy()

```typescript
sleepy() {
  // Pomalé klesání + jemný FM pad
  this.seq([{ f: 440, d: 0.22, t: "sine" }, { f: 330, d: 0.26, t: "sine" }, { f: 220, d: 0.42, t: "sine" }], 0.0);
  this.fm(110, 0.5, 0.1, 1.2, 0.04, "sine", 0.2); // hluboký pad pod tím
}
```

---

## 9. Ambient — rozšíření per fáze + sezóna

### Nový ambient profil

```typescript
// V startAmbient tick() — rozšíř switch na kombinaci season × phase
private ambientTick() {
  if (!this.muted && this.ctx) {
    const p = this.phase;
    const s = this.season;

    if (s === "zima") {
      // Zimní vítr: pravidelný sine drone 55–90 Hz
      if (Math.random() < 0.45) this.tone(55 + Math.random() * 35, 2.0, "sine", 0.025);
      // Sníh: noise burst LP 200 Hz
      if (Math.random() < 0.2) this.noise(1.8, 0.012, 200);

    } else if (p === "vecer") {
      // Cvrčci: 2500–2820 Hz, staccato páry
      if (Math.random() < 0.65) {
        const f = 2500 + Math.random() * 320;
        this.tone(f, 0.045, "sine", 0.020, 0);
        this.tone(f + 10, 0.045, "sine", 0.016, 0.07);
        this.tone(f, 0.045, "sine", 0.014, 0.14);
      }
      if (Math.random() < 0.3) this.tone(88 + Math.random() * 25, 1.4, "sine", 0.018); // vzdálená žába/sova

    } else if (p === "rano") {
      // Ptáci: dynamičtější, víc variace
      if (Math.random() < 0.6) {
        const base = 1600 + Math.random() * 900;
        this.tone(base, 0.07, "sine", 0.032, 0);
        this.tone(base * 1.33, 0.06, "sine", 0.025, 0.10);
        if (Math.random() < 0.5) this.tone(base * 0.75, 0.09, "sine", 0.018, 0.18);
      }
      // Ranní vítr: slabý, jen na jaře a létě
      if ((s === "jaro" || s === "leto") && Math.random() < 0.18)
        this.tone(75 + Math.random() * 20, 1.5, "sine", 0.014);

    } else { // poledne
      // Ticho přerušované buzením hmyzu (léto) nebo větrem (podzim)
      if (s === "leto" && Math.random() < 0.5) {
        const f = 3200 + Math.random() * 400; // cikádi
        this.tone(f, 0.03, "sine", 0.016);
        this.tone(f + 8, 0.03, "sine", 0.014, 0.04);
      } else if (s === "podzim" && Math.random() < 0.3) {
        this.tone(95 + Math.random() * 30, 1.8, "sine", 0.020); // vítr v korunách
      } else if (Math.random() < 0.35) {
        const base = 1800 + Math.random() * 600;
        this.tone(base, 0.06, "sine", 0.022);
      }
    }
  }
  // interval řízený ambientIntervalRange
  const [min, jit] = this.ambientIntervalRange;
  this.ambientTimer = window.setTimeout(() => this.ambientTick(), min + Math.random() * jit);
}
```

---

## 10. Priority tabulka (kolize)

| Event | Priorita | Přerušuje | Přerušen |
|-------|----------|-----------|----------|
| eagleAttack() | 10 | vše | nic |
| foxAttack() | 9 | ambient, npcSpeak, animalHappy, select | eagleAttack |
| animalPanic() | 8 | ambient, npcSpeak, animalHappy | fox/eagle |
| foxAlert() | 7 | ambient, npcSpeak | fox/eagle, panic |
| animalEscape() | 6 | ambient | vše výše |
| dangerRelief() | 5 | — | danger events |
| seasonChange() | 4 | music restart | danger |
| newDay() | 3 | — | danger |
| questDone() | 3 | — | danger |
| build() | 2 | — | danger, alert |
| coin(), success() | 2 | — | danger |
| npcSpeak() | 1 | — | alert+ |
| animalHappy() | 1 | — | vše výše |
| select(), interact() | 0 | — | vše |
| ambient (background) | bg | — | alert+, gain -60% |
| music (background) | bg | — | tension system |

**Implementace priority:** Pro eventy 8–10 přidat check `if (this.tensionLevel >= 2 && priority < 8) return;` před synth kódem. Ostatní přirozené překrývání je OK — Web Audio mixuje passivně.

---

## 11. Checklist implementace

- [ ] Přidat `fm()` helper do SoundEngine
- [ ] Přidat `noise()` helper
- [ ] Přidat `ambientIntervalRange` member + napojit do tick()
- [ ] Přidat `tensionLevel`, `dangerOsc`, `dangerGain` members
- [ ] Implementovat `setTension()` + `startDangerDrone()` + `stopDangerDrone()`
- [ ] Rozšířit `THEMES` na 12 klíčů `season_phase`
- [ ] Rozšířit `BASS` na pole (per krok)
- [ ] Přidat `TEMPO_TABLE` (12 klíčů)
- [ ] Aktualizovat `startMusic()` pro nové THEMES/BASS/TEMPO_TABLE
- [ ] Přidat `npcSpeak()` s cooldown logikou
- [ ] Přidat `lastNpcSpeak` member
- [ ] Implementovat `animal()` rozšíření (FM verze)
- [ ] Implementovat `animalPanic()`, `animalHappy()`, `animalEscape()`, `animalCaught()`
- [ ] Implementovat `foxAlert()`, `foxAttack()`, `eagleAttack()`, `dangerRelief()`
- [ ] Implementovat `seasonChange()`
- [ ] Aktualizovat `newDay()` s per-season stingery
- [ ] Aktualizovat `build()` s noise thud
- [ ] Aktualizovat `error()`, `coin()`, `eat()`, `sleepy()`
- [ ] Aktualizovat `ambientTick()` na nový profil

---

## Poznámky pro implementaci

1. **Web Audio polyfill:** `webkitAudioContext` fallback zachovat — stávající kód ho má správně.
2. **Autoplay policy:** `ensure()` musí být voláno před každým eventem — zachovat.
3. **Reverb pouze pro ambient a music** — SFX priority events (danger) reverb přeskočí (menší latence).
4. **FM `modDepth` škálování:** modDepth je v specifikaci jako násobek carrieru (= frekvenční deviace = carrier × modDepth). V implementaci: `modGain.gain.value = carrier * modDepth`.
5. **Portamento:** implementováno přes `linearRampToValueAtTime` na `osc.frequency`, ne přes detune (konzistentní s existujícím kódem).
6. **Cooldown pro npcSpeak:** 1800 ms per NPC, nestačí jeden globální — každý NPC má vlastní timestamp v `lastNpcSpeak` Record.
