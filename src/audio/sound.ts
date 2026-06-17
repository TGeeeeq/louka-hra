// Jemný zvukový engine na Web Audio API — žádné soubory. Měkké sinusové tóny
// s pomalým náběhem/doozněním, nízká hlasitost. Cíl: příjemná atmosféra, ne
// ostré pípání. Spouští se až po prvním gestu uživatele (autoplay policy).

import type { Season } from "../game/types";

type Wave = OscillatorType;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private verb: ConvolverNode | null = null;
  muted = false;
  musicOn = true;
  private ambientTimer: number | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private season: Season = "jaro";

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      // jemný „prostor" — krátký šumový dozvuk, ať tóny nejsou tak suché
      this.verb = this.ctx.createConvolver();
      this.verb.buffer = this.makeReverb(1.1, 2.2);
      const verbGain = this.ctx.createGain();
      verbGain.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
      this.verb.connect(verbGain);
      verbGain.connect(this.ctx.destination);
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

  // měkký tón: pomalý náběh, plynulé doznění, sinus jako základ
  private tone(freq: number, dur: number, type: Wave = "sine", gain = 0.1, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
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

  private seq(notes: { f: number; d: number; t?: Wave; g?: number }[], gap = 0.02) {
    let when = 0;
    for (const n of notes) {
      this.tone(n.f, n.d, n.t ?? "sine", n.g ?? 0.1, when);
      when += n.d + gap;
    }
  }

  // --- efekty (vše jemné) --------------------------------------------------
  step() {} // bez zvuku kroků (dřív to bylo otravné)
  move() {}
  select() { this.tone(560, 0.1, "sine", 0.08); }
  interact() { this.seq([{ f: 520, d: 0.1 }, { f: 700, d: 0.14 }]); }
  error() { this.seq([{ f: 360, d: 0.12 }, { f: 280, d: 0.18 }], 0.0); }
  coin() { this.seq([{ f: 880, d: 0.1 }, { f: 1170, d: 0.16 }]); }
  eat() { this.seq([{ f: 300, d: 0.1, t: "triangle", g: 0.07 }, { f: 360, d: 0.12, t: "triangle", g: 0.07 }]); }
  success() { this.seq([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.2 }]); }
  questDone() { this.seq([{ f: 587, d: 0.14 }, { f: 740, d: 0.14 }, { f: 880, d: 0.14 }, { f: 1175, d: 0.3 }]); }
  build() { this.seq([{ f: 392, d: 0.12 }, { f: 523, d: 0.12 }, { f: 659, d: 0.2 }]); }
  newDay() { this.seq([{ f: 523, d: 0.18 }, { f: 659, d: 0.18 }, { f: 784, d: 0.18 }, { f: 1047, d: 0.34 }]); }
  sleepy() { this.seq([{ f: 440, d: 0.22 }, { f: 330, d: 0.24 }, { f: 220, d: 0.4 }]); }
  note(freq: number) { this.tone(freq, 0.42, "sine", 0.13); }

  animal(kind: string) {
    switch (kind) {
      case "drubez": this.seq([{ f: 760, d: 0.09, g: 0.07 }, { f: 920, d: 0.08, g: 0.06 }, { f: 700, d: 0.1, g: 0.06 }]); break;
      case "prasata": this.tone(180, 0.2, "triangle", 0.09); break;
      case "stado": this.seq([{ f: 196, d: 0.34, t: "triangle", g: 0.09 }, { f: 175, d: 0.2, t: "triangle", g: 0.07 }]); break;
      case "mazlici": this.seq([{ f: 620, d: 0.1, g: 0.07 }, { f: 500, d: 0.12, g: 0.06 }]); break;
      default: this.interact();
    }
  }

  // --- ambient (řídké, tiché) ---------------------------------------------
  startAmbient(season: Season) {
    this.season = season;
    if (this.ambientTimer != null) return;
    const tick = () => {
      if (!this.muted && this.ctx) {
        if (this.season === "zima") {
          if (Math.random() < 0.4) this.tone(70 + Math.random() * 30, 1.4, "sine", 0.03);
        } else {
          if (Math.random() < 0.55) {
            const base = 1700 + Math.random() * 700;
            this.tone(base, 0.08, "sine", 0.035);
            this.tone(base * 1.25, 0.07, "sine", 0.028, 0.09);
          }
        }
      }
      this.ambientTimer = window.setTimeout(tick, 2200 + Math.random() * 3500);
    };
    tick();
  }
  setSeason(s: Season) { this.season = s; }
  stopAmbient() {
    if (this.ambientTimer != null) { window.clearTimeout(this.ambientTimer); this.ambientTimer = null; }
  }

  // --- hudba: pomalé, tiché sinusové pady (pentatonika dle období) ---------
  private THEMES: Record<Season, number[]> = {
    jaro: [659, 0, 0, 784, 0, 880, 0, 0, 784, 0, 659, 0, 587, 0, 0, 0],
    leto: [523, 0, 0, 659, 0, 0, 784, 0, 659, 0, 587, 0, 0, 523, 0, 0],
    podzim: [440, 0, 0, 523, 0, 0, 392, 0, 440, 0, 0, 349, 0, 0, 0, 0],
    zima: [392, 0, 0, 0, 440, 0, 0, 0, 330, 0, 0, 0, 294, 0, 0, 0],
  };
  private BASS: Record<Season, number> = { jaro: 196, leto: 174, podzim: 147, zima: 131 };
  private TEMPO: Record<Season, number> = { jaro: 460, leto: 500, podzim: 560, zima: 680 };

  startMusic() {
    if (this.musicTimer != null || !this.musicOn) return;
    const tick = () => {
      const s = this.season;
      if (!this.muted && this.musicOn && this.ctx) {
        const mel = this.THEMES[s];
        const f = mel[this.musicStep % mel.length];
        if (f > 0) this.tone(f, 0.9, "sine", 0.045);
        if (this.musicStep % 8 === 0) this.tone(this.BASS[s], 1.6, "sine", 0.04);
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
