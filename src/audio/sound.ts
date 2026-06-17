// Chiptune zvukový engine na Web Audio API — žádné zvukové soubory.
// Vše se syntetizuje oscilátory (GameBoy feeling). Spouští se až po
// prvním gestu uživatele (autoplay policy).

import type { Season } from "../game/types";

type Wave = OscillatorType;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  musicOn = true;
  private ambientTimer: number | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private season: Season = "jaro";

  /** Vytvoří/probudí AudioContext. Volat z user gesture. */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: Wave = "square", gain = 0.18, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private seq(notes: { f: number; d: number; t?: Wave; g?: number }[], gap = 0) {
    let when = 0;
    for (const n of notes) {
      this.tone(n.f, n.d, n.t ?? "square", n.g ?? 0.16, when);
      when += n.d + gap;
    }
  }

  // --- jednotlivé efekty ---------------------------------------------------
  step() { this.tone(180 + Math.random() * 30, 0.06, "triangle", 0.06); }
  select() { this.tone(520, 0.06, "square", 0.12); }
  move() { this.tone(420, 0.05, "square", 0.1); }
  interact() { this.seq([{ f: 480, d: 0.07 }, { f: 700, d: 0.09 }]); }
  note(freq: number) { this.tone(freq, 0.32, "triangle", 0.13); }
  error() { this.tone(140, 0.18, "sawtooth", 0.14); }
  coin() { this.seq([{ f: 988, d: 0.07, t: "square" }, { f: 1319, d: 0.12, t: "square" }]); }
  eat() { this.seq([{ f: 300, d: 0.06, t: "triangle" }, { f: 240, d: 0.08, t: "triangle" }]); }
  success() { this.seq([{ f: 659, d: 0.09 }, { f: 784, d: 0.09 }, { f: 1047, d: 0.16 }]); }
  questDone() {
    this.seq([
      { f: 784, d: 0.1 }, { f: 880, d: 0.1 }, { f: 988, d: 0.1 }, { f: 1319, d: 0.26 },
    ]);
  }
  build() { this.seq([{ f: 392, d: 0.08, t: "square" }, { f: 523, d: 0.08 }, { f: 659, d: 0.16 }]); }
  newDay() {
    this.seq([
      { f: 523, d: 0.14 }, { f: 659, d: 0.14 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.3 },
    ]);
  }
  sleepy() { this.seq([{ f: 440, d: 0.16, t: "sine" }, { f: 330, d: 0.18, t: "sine" }, { f: 220, d: 0.3, t: "sine" }]); }
  // zvuky zvířat
  animal(kind: string) {
    switch (kind) {
      case "drubez": this.seq([{ f: 900, d: 0.05, t: "square", g: 0.1 }, { f: 1100, d: 0.05 }, { f: 800, d: 0.06 }]); break;
      case "prasata": this.tone(150, 0.16, "sawtooth", 0.14); break;
      case "stado": this.tone(196, 0.3, "sawtooth", 0.13); break;
      case "mazlici": this.seq([{ f: 700, d: 0.08, t: "square" }, { f: 520, d: 0.1 }]); break;
      default: this.interact();
    }
  }

  // --- ambient (ptáci/vítr dle období) ------------------------------------
  startAmbient(season: Season) {
    this.season = season;
    if (this.ambientTimer != null) return;
    const tick = () => {
      if (!this.muted && this.ctx) {
        if (this.season === "zima") {
          // vítr — tiché nízké tóny
          if (Math.random() < 0.5) this.tone(80 + Math.random() * 40, 0.6, "sine", 0.04);
        } else {
          // cvrlikání
          if (Math.random() < 0.7) {
            const base = 1600 + Math.random() * 900;
            this.tone(base, 0.05, "sine", 0.05);
            this.tone(base * 1.3, 0.05, "sine", 0.04, 0.06);
          }
        }
      }
      this.ambientTimer = window.setTimeout(tick, 900 + Math.random() * 2200);
    };
    tick();
  }
  setSeason(s: Season) { this.season = s; }
  stopAmbient() {
    if (this.ambientTimer != null) { window.clearTimeout(this.ambientTimer); this.ambientTimer = null; }
  }

  // --- hudba: klidný pentatonický motiv podle ročního období --------------
  // 0 = pomlka. Pentatonika = nic nezní falešně. Pomalejší a tišší než dřív.
  private THEMES: Record<Season, number[]> = {
    jaro: [659, 0, 784, 880, 0, 784, 659, 587, 659, 784, 0, 880, 784, 659, 0, 0],
    leto: [523, 0, 659, 784, 0, 659, 587, 0, 523, 587, 659, 784, 0, 659, 0, 0],
    podzim: [440, 0, 523, 587, 0, 523, 440, 392, 0, 440, 523, 0, 440, 392, 0, 0],
    zima: [392, 0, 0, 440, 0, 0, 523, 0, 0, 440, 0, 0, 330, 0, 0, 0],
  };
  private BASS: Record<Season, number> = { jaro: 196, leto: 174, podzim: 220, zima: 165 };
  private TEMPO: Record<Season, number> = { jaro: 340, leto: 360, podzim: 400, zima: 520 };

  startMusic() {
    if (this.musicTimer != null || !this.musicOn) return;
    const tick = () => {
      const s = this.season;
      if (!this.muted && this.musicOn && this.ctx) {
        const mel = this.THEMES[s];
        const f = mel[this.musicStep % mel.length];
        if (f > 0) {
          this.tone(f, 0.26, "triangle", 0.055);
          this.tone(f * 2, 0.18, "sine", 0.02); // jemný svrchní třpyt
        }
        if (this.musicStep % 4 === 0) this.tone(this.BASS[s], 0.42, "sine", 0.05);
        this.musicStep++;
      }
      this.musicTimer = window.setTimeout(tick, this.TEMPO[s]);
    };
    tick();
  }
  stopMusic() {
    if (this.musicTimer != null) { window.clearTimeout(this.musicTimer); this.musicTimer = null; }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) this.master.gain.value = this.muted ? 0 : 0.5;
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
