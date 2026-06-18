// Zvukový engine na Web Audio API — žádné soubory, čistá syntéza.
// FM syntéza, noise bursts, tension systém, NPC hlasy, adaptivní hudba.
// Spouští se až po prvním gestu uživatele (autoplay policy).

import type { Phase, Season } from "../game/types";

type Wave = OscillatorType;

export type TensionLevel = 0 | 1 | 2 | 3;
// 0 = calm, 1 = alert, 2 = danger, 3 = relief

export type NpcId = "tomas" | "maruska" | "tony";
export type NpcSentiment = "positive" | "neutral" | "negative" | "urgent" | "question";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null; // brání klipování (chrčení) při překryvu tónů
  private verb: ConvolverNode | null = null;
  muted = false;
  musicOn = true;

  // Ambient
  private ambientTimer: number | null = null;
  private ambientIntervalRange: [number, number] = [2200, 3500];

  // Music
  private musicTimer: number | null = null;
  private musicStep = 0;
  private season: Season = "jaro";
  private phase: Phase = "rano";

  // Tension system
  private tensionLevel: TensionLevel = 0;
  private dangerGain: GainNode | null = null;
  private dangerOsc: OscillatorNode | null = null;

  // NPC cooldown
  private lastNpcSpeak: Record<string, number> = {};
  private NPC_SPEAK_COOLDOWN = 1800; // ms

  // ─── INIT ──────────────────────────────────────────────────────────────────

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      // Limiter na výstupu: chytá špičky z překrývajících se FM tónů + dozvuku,
      // takže se signál nepřebudí do tvrdého ořezu (to bylo to „zachrčení").
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -8;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.12;
      this.verb = this.ctx.createConvolver();
      this.verb.buffer = this.makeReverb(1.1, 2.2);
      const verbGain = this.ctx.createGain();
      verbGain.gain.value = 0.18;
      // vše teče přes master → limiter → výstup (dozvuk taky, ať respektuje mute i limit)
      this.master.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
      this.verb.connect(verbGain);
      verbGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private makeReverb(seconds: number, decay: number): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx!.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // ─── PRIMITIVES ────────────────────────────────────────────────────────────

  // Měkký sinusový tón — základ pro melodie a ambient
  private tone(freq: number, dur: number, type: Wave = "sine", gain = 0.1, delay = 0, jitter = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    if (jitter) {
      freq *= 1 + (Math.random() - 0.5) * jitter;
      gain *= 0.82 + Math.random() * 0.36;
    }
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.06, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    if (this.verb) g.connect(this.verb);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Sekvence tónů
  private seq(notes: { f: number; d: number; t?: Wave; g?: number }[], gap = 0.02) {
    let when = 0;
    for (const n of notes) {
      this.tone(n.f, n.d, n.t ?? "sine", n.g ?? 0.1, when, 0.04);
      when += n.d + gap;
    }
  }

  // FM syntéza — modulátor ovlivňuje frekvenci carrieru
  private fm(
    carrier: number,
    modRatio: number,
    modDepth: number,
    dur: number,
    gain: number,
    wave: Wave = "sine",
    delay = 0,
    portamentoTo?: number,
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

  // Noise burst — přes LP filtr, s průběhem gain
  private noise(dur: number, gain: number, lpFreq: number, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const bufLen = Math.floor(this.ctx.sampleRate * Math.max(dur, 0.05));
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

  // ─── SFX — základní (zpětná kompatibilita) ─────────────────────────────────

  step() {} // záměrně tiché
  move() {}

  select() {
    this.ensure();
    this.fm(560, 4.0, 0.3, 0.08, 0.07);
  }

  interact() {
    this.ensure();
    this.seq([{ f: 520, d: 0.09, t: "triangle" }, { f: 700, d: 0.13, t: "sine" }], 0.01);
  }

  error() {
    this.ensure();
    this.fm(220, 2.0, 0.8, 0.22, 0.09, "sawtooth", 0);
    this.tone(180, 0.18, "triangle", 0.07, 0.08);
  }

  coin() {
    this.ensure();
    this.fm(1200, 7.0, 1.0, 0.22, 0.10, "sine", 0);
    this.fm(980, 5.5, 0.8, 0.18, 0.08, "sine", 0.04);
  }

  eat() {
    this.ensure();
    this.tone(300, 0.10, "triangle", 0.07, 0);
    this.noise(0.08, 0.04, 600, 0.06);
    this.tone(340, 0.12, "triangle", 0.06, 0.14);
  }

  success() {
    this.ensure();
    this.seq([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.2 }]);
  }

  questDone() {
    this.ensure();
    this.seq([{ f: 587, d: 0.14 }, { f: 740, d: 0.14 }, { f: 880, d: 0.14 }, { f: 1175, d: 0.3 }]);
  }

  build() {
    this.ensure();
    this.noise(0.15, 0.08, 400, 0);
    this.seq([
      { f: 392, d: 0.12, g: 0.09 },
      { f: 523, d: 0.12, g: 0.09 },
      { f: 659, d: 0.22, t: "triangle", g: 0.09 },
    ], 0.02);
  }

  newDay() {
    this.ensure();
    const stingers: Record<Season, { f: number; d: number; t?: Wave; g?: number }[]> = {
      jaro:   [{ f: 523, d: 0.16 }, { f: 659, d: 0.16 }, { f: 784, d: 0.16 }, { f: 1047, d: 0.32, g: 0.10 }],
      leto:   [{ f: 587, d: 0.14 }, { f: 740, d: 0.14 }, { f: 880, d: 0.14 }, { f: 1175, d: 0.30, g: 0.10 }],
      podzim: [{ f: 440, d: 0.18 }, { f: 523, d: 0.18 }, { f: 494, d: 0.18 }, { f: 587, d: 0.36, g: 0.09 }],
      zima:   [{ f: 392, d: 0.22 }, { f: 440, d: 0.22 }, { f: 415, d: 0.22 }, { f: 523, d: 0.44, g: 0.08 }],
    };
    this.seq(stingers[this.season], 0.015);
    this.setTension(0);
  }

  sleepy() {
    this.ensure();
    this.seq([{ f: 440, d: 0.22 }, { f: 330, d: 0.26 }, { f: 220, d: 0.42 }], 0.0);
    this.fm(110, 0.5, 0.1, 1.2, 0.04, "sine", 0.2);
  }

  note(freq: number) {
    this.ensure();
    this.tone(freq, 0.42, "sine", 0.13);
  }

  // ─── ZVÍŘATA — stávající kompatibilní + FM verze ───────────────────────────

  animal(kind: string) {
    this.ensure();
    switch (kind) {
      case "drubez":
        // FM klovkání 320–380 Hz, modRatio 6.0 = ostré harmoniky
        this.fm(340 + Math.random() * 40, 6.0, 0.8, 0.07, 0.08, "sine", 0);
        this.fm(320 + Math.random() * 40, 6.0, 0.7, 0.06, 0.07, "sine", 0.09);
        if (Math.random() < 0.4)
          this.fm(380, 5.0, 0.6, 0.18, 0.06, "sine", 0.18, 340);
        break;

      case "prasata":
        // Hluboké FM 85–110 Hz, modRatio 0.5 = hrubé, + noise frknutí
        this.fm(90 + Math.random() * 20, 0.5, 1.2, 0.28, 0.10, "sawtooth", 0);
        if (Math.random() < 0.5) this.noise(0.12, 0.07, 320, 0.24);
        break;

      case "stado":
        // Kráva: 98 Hz FM + vibrato přes FM modRatio 0.06 + kvinta dozvuk
        this.fm(98, 0.06, 0.15, 1.4, 0.09, "sine", 0);
        this.fm(98 * 1.5, 1.0, 0.3, 0.9, 0.05, "sine", 0.3);
        break;

      case "mazlici":
        // Psi/kočky — portamento klesající
        this.seq([{ f: 580, d: 0.1, g: 0.07 }, { f: 460, d: 0.13, g: 0.06 }]);
        break;

      default:
        this.interact();
    }
  }

  // ─── NOVÉ ANIMAL EVENTY ────────────────────────────────────────────────────

  animalPanic(kind: string) {
    this.ensure();
    switch (kind) {
      case "drubez":
        // Rychlé opakované klovkání × 4 + panický výkřik
        for (let i = 0; i < 4; i++) {
          this.fm(440 + Math.random() * 80, 7.0, 1.2, 0.06, 0.10, "sine", i * 0.08);
        }
        this.fm(520, 8.0, 1.5, 0.22, 0.13, "sine", 0.35);
        break;

      case "prasata":
        // Kvičení: 220 Hz FM portamento nahoru 220→380
        this.fm(220, 4.0, 1.8, 0.35, 0.13, "sawtooth", 0, 380);
        this.noise(0.18, 0.08, 600, 0.32);
        break;

      case "stado":
        // Stádo: rychlý mú + dupání (noise)
        this.fm(130, 2.0, 0.9, 0.3, 0.12, "sine", 0);
        this.fm(145, 2.0, 0.9, 0.25, 0.10, "sine", 0.12);
        this.noise(0.2, 0.06, 200, 0.05);
        this.noise(0.2, 0.06, 200, 0.28);
        break;

      case "mazlici":
        this.seq([
          { f: 720, d: 0.08, g: 0.09 },
          { f: 680, d: 0.08, g: 0.09 },
          { f: 640, d: 0.10, g: 0.08 },
        ], 0.01);
        break;

      default:
        // Generický panic — opakované FM pipy
        for (let i = 0; i < 3; i++) {
          this.fm(500 + Math.random() * 100, 5.0, 1.0, 0.07, 0.09, "sine", i * 0.09);
        }
    }
  }

  animalHappy(kind: string) {
    this.ensure();
    switch (kind) {
      case "drubez":
        // Dvě měkká klopknutí + portamento klesající (spokojené)
        this.fm(350, 5.0, 0.5, 0.10, 0.07, "sine", 0);
        this.fm(370, 4.5, 0.4, 0.09, 0.06, "sine", 0.12);
        this.fm(360, 4.0, 0.3, 0.16, 0.07, "sine", 0.26, 320);
        break;

      case "prasata":
        // Pomalé hrdelní bublání: 95 Hz FM modRatio 0.3
        this.fm(95, 0.3, 0.5, 0.55, 0.08, "sine", 0);
        this.fm(100, 0.3, 0.4, 0.45, 0.07, "sine", 0.28);
        break;

      case "stado":
        // Klidné mú, vibrato slabé, klesá na konci
        this.fm(98, 0.06, 0.08, 1.6, 0.08, "sine", 0, 88);
        break;

      case "mazlici":
        // Předení / vrčení: 55 Hz FM, modRatio 30 = charakter předení
        this.fm(55, 30.0, 0.04, 1.0, 0.07, "sine", 0);
        break;

      default:
        this.interact();
    }
  }

  animalEscape(kind: string) {
    this.ensure();
    // Alert pip — vždy
    this.tone(1400, 0.08, "sine", 0.14, 0);
    this.tone(1400, 0.08, "sine", 0.11, 0.12);
    // Druh-specifická panika
    this.animalPanic(kind);
    // Tension → alert
    this.setTension(1);
  }

  animalCaught() {
    this.ensure();
    // Vzestupná triáda — "chytil jsem tě"
    this.seq([
      { f: 523, d: 0.10, t: "sine",     g: 0.10 },
      { f: 659, d: 0.10, t: "sine",     g: 0.10 },
      { f: 784, d: 0.22, t: "triangle", g: 0.09 },
    ]);
    // Reset tension pokud žádný predátor aktivní
    if (this.tensionLevel <= 1) this.setTension(0);
  }

  // ─── PREDÁTORSKÉ EVENTY ────────────────────────────────────────────────────

  foxAlert() {
    this.ensure();
    // Growl: 65 Hz FM, modRatio 7.0 = znepokojivý charakter
    this.fm(65, 7.0, 2.5, 0.28, 0.09, "sawtooth", 0);
    // Alert pip dvakrát
    this.tone(1400, 0.06, "sine", 0.13, 0.22);
    this.tone(1400, 0.06, "sine", 0.10, 0.32);
    this.setTension(1);
  }

  foxAttack() {
    this.ensure();
    // Útočný growl — delší, hlubší, více modulovaný
    this.fm(65, 7.0, 3.5, 0.55, 0.14, "sawtooth", 0);
    this.fm(72, 6.5, 3.0, 0.45, 0.11, "sawtooth", 0.12);
    // Noise šelest: skok v trávě
    this.noise(0.18, 0.09, 800, 0.08);
    // Zvíře reaguje panikou
    this.animalPanic("drubez");
    this.setTension(2);
  }

  eagleAttack() {
    this.ensure();
    // Glissando střemhlavý let: 2200→800 Hz
    this.fm(2200, 1.0, 0.1, 0.6, 0.11, "sine", 0, 800);
    // Výkřik: 1800 Hz krátký a ostrý
    this.tone(1800, 0.14, "sine", 0.14, 0.52);
    // Šum křídel
    this.noise(0.25, 0.08, 2000, 0.18);
    // Zvíře v panice
    this.animalPanic("drubez");
    this.setTension(2);
  }

  dangerRelief() {
    this.ensure();
    // Sestupný tón — úleva
    this.seq([
      { f: 784, d: 0.14, t: "sine",     g: 0.08 },
      { f: 659, d: 0.14, t: "sine",     g: 0.07 },
      { f: 523, d: 0.28, t: "triangle", g: 0.07 },
    ]);
    this.setTension(3);
    window.setTimeout(() => this.setTension(0), 2000);
  }

  // ─── NPC HLASY ─────────────────────────────────────────────────────────────

  npcSpeak(npcId: NpcId, sentiment: NpcSentiment = "neutral") {
    this.ensure();
    const now = Date.now();
    if ((this.lastNpcSpeak[npcId] ?? 0) + this.NPC_SPEAK_COOLDOWN > now) return;
    this.lastNpcSpeak[npcId] = now;

    const profiles = {
      tomas:   { carrier: 155, modRatio: 1.8, modDepth: 0.25, wave: "triangle" as Wave, syllDur: 0.16, syllGap: 0.06 },
      maruska: { carrier: 275, modRatio: 2.1, modDepth: 0.18, wave: "triangle" as Wave, syllDur: 0.09, syllGap: 0.025 },
      tony:    { carrier: 120, modRatio: 0.9, modDepth: 0.45, wave: "sawtooth" as Wave, syllDur: 0.20, syllGap: 0.09 },
    };
    const p = profiles[npcId];

    const sentMult: Record<NpcSentiment, number> = {
      positive: 1.08, neutral: 1.0, negative: 0.88, urgent: 1.05, question: 1.0,
    };
    const baseFreq = p.carrier * sentMult[sentiment];

    const syllCount = sentiment === "urgent" ? 6 + Math.floor(Math.random() * 4)
                    : sentiment === "neutral" ? 4 + Math.floor(Math.random() * 3)
                    : 3 + Math.floor(Math.random() * 4);

    let t = 0;
    for (let i = 0; i < syllCount; i++) {
      const jitter = 0.92 + Math.random() * 0.16;
      let freq = baseFreq * jitter;

      // question: poslední dvě slabiky stoupají
      if (sentiment === "question" && i >= syllCount - 2)
        freq *= 1.0 + (i - syllCount + 2) * 0.09;
      // negative: slabiky klesají
      if (sentiment === "negative")
        freq *= 1.0 - (i / syllCount) * 0.14;
      // positive: mírný oblouk nahoru pak dolů
      if (sentiment === "positive")
        freq *= 1.0 + Math.sin((i / syllCount) * Math.PI) * 0.1;

      this.fm(freq, p.modRatio, p.modDepth, p.syllDur, 0.12, p.wave, t);
      t += p.syllDur + p.syllGap + Math.random() * 0.03;
    }
  }

  // ─── TENSION SYSTEM ────────────────────────────────────────────────────────

  setTension(level: TensionLevel) {
    if (this.tensionLevel === level) return;
    this.tensionLevel = level;
    this.updateMusicTension(level);
    this.updateAmbientTension(level);
  }

  private updateMusicTension(level: TensionLevel) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const targetGain = ([1.0, 0.7, 0.35, 0.85] as const)[level] ?? 1.0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.3 * targetGain, now + 0.8);

    if (level === 2) this.startDangerDrone();
    else this.stopDangerDrone();

    if (level === 3) {
      // Relief: krátký bump pak fade zpět
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
    this.dangerOsc.frequency.value = 55; // hluboké A1 — drone nebezpečí
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

  private updateAmbientTension(level: TensionLevel) {
    // Různé intervaly ticků dle urgence
    const intervals: [number, number][] = [
      [2200, 3500], // calm
      [1200, 1600], // alert
      [800,  800],  // danger
      [1800, 2200], // relief
    ];
    this.ambientIntervalRange = intervals[level];
  }

  // ─── SEZÓNNÍ ZMĚNA ─────────────────────────────────────────────────────────

  seasonChange(season: Season) {
    this.ensure();
    const stingers: Record<Season, { f: number; d: number; g?: number }[]> = {
      jaro:   [{ f: 523, d: 0.14 }, { f: 659, d: 0.14 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.28, g: 0.09 }],
      leto:   [{ f: 659, d: 0.12 }, { f: 784, d: 0.12 }, { f: 880, d: 0.12 }, { f: 1175, d: 0.26, g: 0.09 }],
      podzim: [{ f: 440, d: 0.16 }, { f: 392, d: 0.16 }, { f: 349, d: 0.16 }, { f: 294, d: 0.34, g: 0.09 }],
      zima:   [{ f: 392, d: 0.20 }, { f: 330, d: 0.22 }, { f: 294, d: 0.26 }, { f: 220, d: 0.44, g: 0.08 }],
    };
    this.seq(stingers[season], 0.01);
    this.setSeason(season);
    this.stopMusic();
    window.setTimeout(() => this.startMusic(), 800);
  }

  // ─── AMBIENT ───────────────────────────────────────────────────────────────

  startAmbient(season: Season) {
    this.season = season;
    if (this.ambientTimer != null) return;
    this.ambientTick();
  }

  private ambientTick() {
    if (!this.muted && this.ctx) {
      const p = this.phase;
      const s = this.season;

      if (s === "zima") {
        if (Math.random() < 0.45) this.tone(55 + Math.random() * 35, 2.0, "sine", 0.025);
        if (Math.random() < 0.2) this.noise(1.8, 0.012, 200);

      } else if (p === "vecer") {
        if (Math.random() < 0.65) {
          const f = 2500 + Math.random() * 320;
          this.tone(f, 0.045, "sine", 0.020, 0);
          this.tone(f + 10, 0.045, "sine", 0.016, 0.07);
          this.tone(f, 0.045, "sine", 0.014, 0.14);
        }
        if (Math.random() < 0.3) this.tone(88 + Math.random() * 25, 1.4, "sine", 0.018);

      } else if (p === "rano") {
        if (Math.random() < 0.6) {
          const base = 1600 + Math.random() * 900;
          this.tone(base, 0.07, "sine", 0.032, 0);
          this.tone(base * 1.33, 0.06, "sine", 0.025, 0.10);
          if (Math.random() < 0.5) this.tone(base * 0.75, 0.09, "sine", 0.018, 0.18);
        }
        if ((s === "jaro" || s === "leto") && Math.random() < 0.18)
          this.tone(75 + Math.random() * 20, 1.5, "sine", 0.014);

      } else { // poledne
        if (s === "leto" && Math.random() < 0.5) {
          const f = 3200 + Math.random() * 400;
          this.tone(f, 0.03, "sine", 0.016);
          this.tone(f + 8, 0.03, "sine", 0.014, 0.04);
        } else if (s === "podzim" && Math.random() < 0.3) {
          this.tone(95 + Math.random() * 30, 1.8, "sine", 0.020);
        } else if (Math.random() < 0.35) {
          const base = 1800 + Math.random() * 600;
          this.tone(base, 0.06, "sine", 0.022);
        }
      }
    }
    const [min, jit] = this.ambientIntervalRange;
    this.ambientTimer = window.setTimeout(() => this.ambientTick(), min + Math.random() * jit);
  }

  setSeason(s: Season) { this.season = s; }
  setMood(p: Phase) { this.phase = p; }

  stopAmbient() {
    if (this.ambientTimer != null) { window.clearTimeout(this.ambientTimer); this.ambientTimer = null; }
  }

  // ─── HUDBA — 12 kombinací sezóna × fáze ────────────────────────────────────

  // 16-krokové melodické sekvence (0 = pauza)
  private THEMES: Record<string, number[]> = {
    // JARO
    "jaro_rano":      [523,   0, 659, 0,   784,   0,   880,   0, 784,   0, 659, 0, 523, 0,   0, 0],
    "jaro_poledne":   [659,   0, 784, 0,   880, 988,   784,   0, 659, 784, 523, 0, 659, 0, 784, 0],
    "jaro_vecer":     [784, 659,   0, 523,   0, 440,   523,   0, 392,   0,   0, 0, 330, 0,   0, 0],
    // LÉTO
    "leto_rano":      [587,   0, 659, 0,   784,   0,   880,   0, 784,   0, 659, 0,   0, 587, 0, 0],
    "leto_poledne":   [659,   0,   0, 784,   0,   0,   880,   0, 784,   0,   0, 659, 0, 523, 0, 0],
    "leto_vecer":     [880, 784, 659,   0, 587,   0,   523,   0, 440,   0,   0,   0, 392, 0,  0, 0],
    // PODZIM
    "podzim_rano":    [440,   0, 523, 0,   392,   0,   440,   0, 349,   0, 392, 0,   0, 330,  0, 0],
    "podzim_poledne": [349,   0, 392, 440,   0, 349,   392,   0,   0, 330,   0, 294, 0,   0, 349, 0],
    "podzim_vecer":   [392, 349,   0, 294,   0,   0,   330,   0, 294,   0,   0, 247, 0,   0,   0, 0],
    // ZIMA
    "zima_rano":      [330,   0,   0, 294,   0,   0,   247,   0,   0,   0, 220, 0,   0,   0,   0, 0],
    "zima_poledne":   [294,   0, 330,   0,   294,   0,   247,   0, 220,   0,   0, 196,  0, 220, 0, 0],
    "zima_vecer":     [220,   0,   0,   0,   196,   0,   0,   0, 165,   0,   0,   0,   0,   0,  0, 0],
  };

  // Basové tóny — 8-krokový cyklus
  private BASS: Record<Season, number[]> = {
    jaro:   [196, 0, 0, 0, 196, 0, 165, 0],
    leto:   [174, 0, 0, 0, 174, 0, 146, 0],
    podzim: [147, 0, 0, 0, 131, 0, 110, 0],
    zima:   [110, 0, 0, 0, 110, 0,  98, 0],
  };

  // Tempo ms/krok per sezóna × fáze
  private TEMPO_TABLE: Record<string, number> = {
    "jaro_rano": 440,    "jaro_poledne": 480,   "jaro_vecer": 560,
    "leto_rano": 500,    "leto_poledne": 560,   "leto_vecer": 620,
    "podzim_rano": 540,  "podzim_poledne": 600, "podzim_vecer": 680,
    "zima_rano": 660,    "zima_poledne": 700,   "zima_vecer": 820,
  };

  private getMelodyGain(phase: Phase): number {
    return phase === "rano" ? 0.040 : phase === "poledne" ? 0.038 : 0.030;
  }
  private getBassGain(phase: Phase): number {
    return phase === "rano" ? 0.034 : phase === "poledne" ? 0.032 : 0.022;
  }

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
        const tensionMult = ([1.0, 0.7, 0.35, 0.9] as const)[this.tensionLevel];

        const f = mel[this.musicStep % mel.length];
        if (f > 0) {
          this.tone(f, 1.0, "sine", mg * tensionMult);
          this.tone(f * 1.004, 1.0, "sine", mg * 0.75 * tensionMult); // jemný chorus
          if (this.phase === "vecer") this.tone(f * 0.5, 1.4, "sine", 0.018 * tensionMult); // pad 8va níže
        }

        const bassF = bass[this.musicStep % bass.length];
        if (bassF > 0) {
          this.tone(bassF, 2.0, "sine", bg * tensionMult);
          this.tone(bassF * 1.5, 1.8, "sine", bg * 0.5 * tensionMult); // kvinta
        }

        this.musicStep++;
        this.musicTimer = window.setTimeout(tick, tempo);
      } else {
        this.musicTimer = window.setTimeout(tick, 500);
      }
    };
    tick();
  }

  stopMusic() {
    if (this.musicTimer != null) { window.clearTimeout(this.musicTimer); this.musicTimer = null; }
  }

  // ─── OVLÁDÁNÍ ──────────────────────────────────────────────────────────────

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.3;
    return this.muted;
  }
  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicOn) this.startMusic();
    else this.stopMusic();
    return this.musicOn;
  }
}

export const sound = new SoundEngine();
