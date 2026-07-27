// Zvukový engine na Web Audio API — žádné soubory, čistá syntéza.
// FM syntéza, noise bursts, tension systém, NPC hlasy a VRSTVENÁ adaptivní
// hudba (melodie / bas / pad / perkuse / akční arpeggio) s lookahead
// schedulerem. Napětí mění mix i tempo; blížící se zima hudbu postupně
// ztmavuje („hardship"). Spouští se až po prvním gestu uživatele.

import type { Phase, Season, Weather } from "../game/types";
import { DAYS_PER_SEASON } from "../game/balance";

type Wave = OscillatorType;

export type TensionLevel = 0 | 1 | 2 | 3;
// 0 = calm, 1 = alert (útěk), 2 = danger (poplach), 3 = relief (úleva)

export type NpcId = "tomas" | "maruska" | "tony";
export type NpcSentiment = "positive" | "neutral" | "negative" | "urgent" | "question";

type LayerName = "melody" | "bass" | "pad" | "perc" | "arp";

export interface MusicContext {
  season: Season;
  phase: Phase;
  dayInSeason: number;
  weather: Weather;
}

const BASE_MASTER = 0.3;

// Strop hloubky FM modulace: modGain nesmí přesáhnout 0.85× carrier, jinak
// okamžitá frekvence padá k nule/zápornu → aliasovaný "chrčivý" artefakt
// (nejhorší u sawtooth). Exportováno kvůli unit testu (fm() je private).
export function clampModGain(carrier: number, modDepth: number): number {
  return Math.min(carrier * modDepth, carrier * 0.85);
}

// Mix vrstev + tempo podle napětí. Alert = „heartbeat", danger = hnací
// rytmus s arpeggiem, relief = krátké projasnění.
const MIX: Record<TensionLevel, { melody: number; bass: number; pad: number; perc: number; arp: number; tempo: number }> = {
  0: { melody: 1.0, bass: 1.0, pad: 0.9, perc: 0.25, arp: 0, tempo: 1.0 },
  1: { melody: 0.65, bass: 1.0, pad: 0.6, perc: 0.85, arp: 0.4, tempo: 1.15 },
  2: { melody: 0.3, bass: 1.2, pad: 0.3, perc: 1.0, arp: 1.0, tempo: 1.35 },
  3: { melody: 1.1, bass: 1.0, pad: 1.0, perc: 0.2, arp: 0, tempo: 1.0 },
};

// Perkusní vzory — 32 pozic (grid = osminy, 2 takty). 0 = nic, jinak gain mult.
const PERC: Record<TensionLevel, { kick: number[]; hat: number[]; shaker: number[]; block: number[] }> = {
  // calm: jen jemný shaker na osminách
  0: {
    kick: [],
    hat: [],
    shaker: [1, 0, 0, 0, 0.7, 0, 0, 0, 1, 0, 0, 0, 0.7, 0, 0, 0, 1, 0, 0, 0, 0.7, 0, 0, 0, 1, 0, 0, 0, 0.7, 0, 0, 0],
    block: [],
  },
  // alert: „heartbeat" — lub-dub na začátku taktu
  1: {
    kick: [1, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0, 0, 0, 0, 0, 0],
    shaker: [],
    block: [],
  },
  // danger: hnací čtvrťový kick + off-beat hi-haty + akcenty
  2: {
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 1, 0],
    shaker: [],
    block: [0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  // relief: jediný měkký shaker
  3: {
    kick: [],
    hat: [],
    shaker: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    block: [],
  },
};

// Akční arpeggio per sezóna (v jejím modu, oktáva nad basem). 8 kroků.
const ARPS: Record<Season, number[]> = {
  jaro: [523, 659, 784, 659, 523, 784, 659, 784], // C dur (lydicky světlé)
  leto: [587, 740, 880, 740, 587, 880, 740, 880], // D mixolydicky
  podzim: [440, 523, 659, 523, 440, 659, 523, 659], // A aiolsky
  zima: [330, 392, 494, 392, 330, 494, 392, 494], // E moll — ledové
};

// Akordové pady — 2 akordy per sezóna, střídají se po taktu (16 grid kroků).
// Zima schválně bez tercie (prázdné kvinty = chlad).
const PADS: Record<Season, number[][]> = {
  jaro: [
    [130.8, 164.8, 196.0, 246.9], // Cmaj7
    [146.8, 185.0, 220.0], // D
  ],
  leto: [
    [98.0, 123.5, 146.8, 174.6], // G7
    [87.3, 110.0, 130.8], // F
  ],
  podzim: [
    [110.0, 130.8, 164.8], // Am
    [98.0, 123.5, 146.8], // G
  ],
  zima: [
    [82.4, 123.5, 164.8], // E5 (bez tercie)
    [65.4, 98.0, 130.8], // C5 (bez tercie)
  ],
};

// Kořen tóniny sezóny (pro fanfáry a motivy v tónině).
const KEY_ROOT: Record<Season, number> = { jaro: 261.6, leto: 293.7, podzim: 220.0, zima: 164.8 };
// Tercie modu: dur pro jaro/léto, moll pro podzim/zimu.
const KEY_THIRD: Record<Season, number> = { jaro: 1.26, leto: 1.26, podzim: 1.19, zima: 1.19 };

// ─── SAMPLE LAYER (nahrané SFX, viz public/audio/sfx/) ──────────────────────
// Assety dorazí postupně (ZeroGPU kvóta) — dokud soubor chybí, engine tiše
// jede na dosavadní FM syntéze. Jednou zjištěné selhání (404/dekódování) se
// pamatuje na celou session, žádný opakovaný fetch ani spam v konzoli.
type SampleState = AudioBuffer | "failed";

// Kterou konkrétní zvířecí vzorku zahrát za danou skupinu krmení (feedGroup).
// Voláme jen s feedGroup (App.tsx/PlayBar.tsx nevědí o konkrétním druhu), tak
// z možných druhů skupiny náhodně vybíráme — druhy bez vzorku (holub, osel,
// muflon, králík) tak přirozeně dál zůstávají jen na syntéze.
const GROUP_SAMPLES: Record<string, { species: string; sample?: string }[]> = {
  drubez: [
    { species: "slepice", sample: "chicken" },
    { species: "husa", sample: "goose" },
    { species: "kachna", sample: "duck" },
    { species: "holub" },
  ],
  prasata: [{ species: "prase", sample: "pig" }],
  stado: [
    { species: "osel" },
    { species: "muflon" },
    { species: "krava", sample: "cow" },
    { species: "ovce", sample: "sheep" },
  ],
  mazlici: [
    { species: "pes", sample: "dog" },
    { species: "kocka", sample: "cat" },
    { species: "kralik" },
  ],
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null; // brání klipování při překryvu tónů
  private verb: ConvolverNode | null = null;
  private verbIn: GainNode | null = null; // send do dozvuku (přes predelay)
  muted = false;
  musicOn = true;

  // Ambient
  private ambientTimer: number | null = null;
  private ambientIntervalRange: [number, number] = [2200, 3500];

  // Hudba — vrstvy + lookahead scheduler
  private musicBus: GainNode | null = null;
  private layers: Record<LayerName, GainNode> | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private schedTimer: number | null = null;
  private nextStepTime = 0;
  private gridStep = 0;
  private tempoMult = 1.0;
  private noiseBuf: AudioBuffer | null = null; // sdílený šum pro haty/shaker/vítr

  private season: Season = "jaro";
  private phase: Phase = "rano";
  private dayInSeason = 1;
  /** 0..1 — jak „tvrdý" je právě život (pozdní podzim → zima = 1). */
  private hardship = 0;

  // Zimní drone + vítr (meteorologická vrstva)
  private winterOsc: OscillatorNode[] = [];
  private winterGain: GainNode | null = null;
  private windSrc: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windLfo: OscillatorNode | null = null;

  // Menu/intro téma — nahraný orchestrální track (HTMLAudioElement, ne
  // syntéza). Jde přes vlastní gain do master, ať funguje mute i limiter.
  private menuAudio: HTMLAudioElement | null = null;
  private menuMediaSrc: MediaElementAudioSourceNode | null = null;
  private menuGain: GainNode | null = null;
  private menuFadeTimer: number | null = null;
  private menuWantsPlay = false;
  private menuRetryBound = false;

  // „Vzduch louky" — tichý kontinuální podklad, ať svět nikdy neztichne úplně
  private airSrc: AudioBufferSourceNode | null = null;
  private airGain: GainNode | null = null;
  private airLfo: OscillatorNode | null = null;

  // Tension system
  private tensionLevel: TensionLevel = 0;
  private dangerGain: GainNode | null = null;
  private dangerOsc: OscillatorNode | null = null;
  private dangerLfo: OscillatorNode | null = null;
  private reliefTimer: number | null = null;

  // Cooldowny
  private lastNpcSpeak: Record<string, number> = {};
  private NPC_SPEAK_COOLDOWN = 1800; // ms
  private lastLowEnergy = 0;
  private stepThrottleUntil = 0; // interní pojistka pro step() (viz níže)

  // Nahrané SFX vzorky (public/audio/sfx/<name>.ogg) — lazy fetch+decode,
  // cache úspěchu i selhání per session.
  private sampleCache = new Map<string, SampleState>();
  private samplePending = new Set<string>();

  // ─── INIT ──────────────────────────────────────────────────────────────────

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      // „balanced": o chlup větší audio buffer než default — na slabších
      // zařízeních nepraská, když canvas smyčka vytíží CPU.
      this.ctx = new AC({ latencyHint: "balanced" });
      this.master = this.ctx.createGain();
      this.master.gain.value = BASE_MASTER;
      // Limiter na výstupu: chytá špičky z překrývajících se FM tónů + dozvuku.
      // Měkké koleno a mírnější ratio — tvrdé koleno s 20:1 na basech „žvýkalo".
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 10;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.25;
      this.verb = this.ctx.createConvolver();
      this.verb.buffer = this.makeReverb(2.4);
      const verbGain = this.ctx.createGain();
      verbGain.gain.value = 0.2;
      this.master.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
      // Predelay před konvolucí: oddělí přímý zvuk od dozvuku → víc „prostoru".
      this.verbIn = this.ctx.createGain();
      const preDelay = this.ctx.createDelay(0.1);
      preDelay.delayTime.value = 0.025;
      this.verbIn.connect(preDelay);
      preDelay.connect(this.verb);
      this.verb.connect(verbGain);
      verbGain.connect(this.master);

      // Hudební sběrnice: vrstvy → musicBus → master. Ducking (tension) se
      // děje TADY — SFX na masteru zůstávají v plné síle i při poplachu.
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 1.0;
      this.musicBus.connect(this.master);
      const mk = (v: number) => {
        const g = this.ctx!.createGain();
        g.gain.value = v;
        g.connect(this.musicBus!);
        return g;
      };
      const m0 = MIX[0];
      this.layers = {
        melody: mk(m0.melody),
        bass: mk(m0.bass),
        pad: mk(m0.pad),
        perc: mk(m0.perc),
        arp: mk(m0.arp),
      };
      // Pad má společný lowpass — „teplota" zvuku podle hardship.
      this.padFilter = this.ctx.createBiquadFilter();
      this.padFilter.type = "lowpass";
      this.padFilter.frequency.value = 3000;
      this.padFilter.connect(this.layers.pad);

      // Sdílený 2s šumový buffer (haty, shaker, vítr) — žádné alokace za běhu.
      const rate = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, rate * 2, rate);
      const nd = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  // Impulzní odezva dozvuku: exponenciálně doznívající šum hnaný one-pole
  // lowpassem, který se s časem zavírá — výšky mizí dřív než basy, ocas zní
  // jako vzduch nad loukou. (Surový bílý šum v konvoluci syčel a „chrčel".)
  private makeReverb(seconds: number): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx!.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const p = i / len;
        const a = 0.45 - 0.38 * p; // filtr se zavírá → tmavnoucí ocas
        lp += (Math.random() * 2 - 1 - lp) * a;
        d[i] = lp * Math.exp(-4.6 * p) * 2.2;
      }
    }
    return buf;
  }

  // ─── PRIMITIVES ────────────────────────────────────────────────────────────

  // Vloží mezi uzel a výstup StereoPanner (pokud pan ≠ 0 a prohlížeč ho umí).
  private panTo(node: AudioNode, out: AudioNode, pan: number): void {
    if (pan && this.ctx && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      p.connect(out);
    } else {
      node.connect(out);
    }
  }

  // Měkký tón — okamžitý (SFX). Výstup jde na master (+ dozvuk).
  private tone(freq: number, dur: number, type: Wave = "sine", gain = 0.1, delay = 0, jitter = 0, pan = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    this.toneAt(freq, dur, this.ctx.currentTime + delay, type, gain, this.master, true, jitter, pan);
  }

  // Tón v absolutním čase `when` do zadaného uzlu — základ scheduleru.
  private toneAt(freq: number, dur: number, when: number, type: Wave, gain: number, out: AudioNode, verbSend = false, jitter = 0, pan = 0) {
    if (!this.ctx || this.muted) return;
    if (jitter) {
      freq *= 1 + (Math.random() - 0.5) * jitter;
      gain *= 0.82 + Math.random() * 0.36;
    }
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), when + Math.min(0.06, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    this.panTo(g, out, pan);
    if (verbSend && this.verbIn) g.connect(this.verbIn);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  // Sekvence tónů (SFX)
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
    pan = 0,
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;

    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    mod.frequency.value = carrier * modRatio;
    modGain.gain.value = clampModGain(carrier, modDepth);
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
    this.panTo(g, this.master, pan);
    if (this.verbIn) g.connect(this.verbIn);

    mod.start(t0); mod.stop(t0 + dur + 0.05);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  // Noise burst — přes LP filtr (SFX). Čte ze sdíleného bufferu s náhodným
  // offsetem — žádné alokace + GC pauzy za běhu.
  private noise(dur: number, gain: number, lpFreq: number, delay = 0): void {
    if (!this.ctx || !this.master || !this.noiseBuf || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
  }

  // Spustí fetch+decode vzorku, pokud ještě neběží a výsledek není v cache.
  // Fire-and-forget — chyby se tiše zapamatují jako "failed", nic nehlásí do
  // konzole a nezkouší to znovu (dokud nedojde k reloadu stránky).
  private loadSample(name: string): void {
    if (!this.ctx || this.sampleCache.has(name) || this.samplePending.has(name)) return;
    this.samplePending.add(name);
    const url = `${import.meta.env.BASE_URL}audio/sfx/${name}.ogg`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`sfx ${name}: HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => this.ctx!.decodeAudioData(buf))
      .then((decoded) => {
        this.sampleCache.set(name, decoded);
      })
      .catch(() => {
        this.sampleCache.set(name, "failed");
      })
      .finally(() => {
        this.samplePending.delete(name);
      });
  }

  // Přehraje nahraný vzorek (pokud je už načtený) přes stejnou master/limiter
  // větev jako ostatní SFX, s drobnou náhodnou obměnou výšky. Vrací, jestli se
  // opravdu něco přehrálo — voláno vždy s fallbackem na syntézu v případě false.
  private playSample(name: string, opts: { gain?: number; rate?: number; rateJitter?: number; pan?: number } = {}): boolean {
    this.loadSample(name); // ať je příště (nebo hned) po síti co přehrát
    const buf = this.sampleCache.get(name);
    if (!this.ctx || !this.master || this.muted || !buf || buf === "failed") return false;
    const { gain = 0.12, rate = 1, rateJitter = 0.16, pan = 0 } = opts;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (1 + (Math.random() - 0.5) * rateJitter);
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    this.panTo(g, this.master, pan);
    src.start();
    return true;
  }

  // Náhodně vybere vzorek druhu ze skupiny krmení (viz GROUP_SAMPLES) —
  // voláme jen s feedGroup, takže konkrétní druh nevolíme, ale losujeme.
  private pickGroupSample(kind: string): string | undefined {
    const entries = GROUP_SAMPLES[kind];
    if (!entries || !entries.length) return undefined;
    return entries[Math.floor(Math.random() * entries.length)].sample;
  }

  // ─── PERKUSE (plánované v absolutním čase, suché — bez dozvuku) ─────────────

  private percKick(t: number, g: number) {
    if (!this.ctx || !this.layers) return;
    const osc = this.ctx.createOscillator();
    const gn = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.04);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.004);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(gn);
    gn.connect(this.layers.perc);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  private noiseHit(t: number, g: number, dur: number, type: BiquadFilterType, freq: number, q = 1, pan = 0) {
    if (!this.ctx || !this.layers || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const gn = this.ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.008);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(gn);
    this.panTo(gn, this.layers.perc, pan);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private percHat(t: number, g: number, open = false) {
    this.noiseHit(t, g, open ? 0.12 : 0.03, "highpass", 7000, 1, 0.22);
  }

  private percShaker(t: number, g: number) {
    this.noiseHit(t, g * (0.7 + Math.random() * 0.6), 0.06, "bandpass", 4000, 1.2, -0.22);
  }

  private percBlock(t: number, g: number) {
    if (!this.ctx || !this.layers) return;
    // dřevěné ťuknutí — krátký FM tón do perc vrstvy
    const osc = this.ctx.createOscillator();
    const gn = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(820 + Math.random() * 60, t);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.003);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gn);
    this.panTo(gn, this.layers.perc, 0.15);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // ─── SFX — základní (zpětná kompatibilita) ─────────────────────────────────

  // Krok postavy — dokud public/audio/sfx/footsteps-grass.ogg neexistuje,
  // zůstává tiché (přesně jako dřív). Volající (WorldCanvas) už throttluje na
  // ~300 ms akumulovaného pohybu; tady je jen tenká pojistka navíc.
  step() {
    this.ensure();
    const now = Date.now();
    if (now < this.stepThrottleUntil) return;
    this.stepThrottleUntil = now + 220;
    this.loadSample("footsteps-grass");
    const buf = this.sampleCache.get("footsteps-grass");
    if (!this.ctx || !this.master || this.muted || !buf || buf === "failed") return;
    const dur = 0.25 + Math.random() * 0.15;
    const maxStart = Math.max(0, buf.duration - dur);
    const offset = maxStart > 0 ? Math.random() * maxStart : 0;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.16;
    const g = this.ctx.createGain();
    const vol = 0.045 + Math.random() * 0.015;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.setValueAtTime(vol, t0 + Math.max(0.02, dur - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(this.master);
    src.start(t0, offset, dur);
  }
  move() {}

  select() {
    this.ensure();
    this.fm(560, 4.0, 0.3, 0.08, 0.07);
  }

  /** Studiová znělka AF — teplá kvinta (G–D) s dozněním, zlato na sumi černi. */
  ident() {
    this.ensure();
    this.fm(392, 4.0, 0.15, 0.9, 0.06, "sine", 0); // G
    this.fm(587, 3.0, 0.12, 1.2, 0.05, "sine", 0.18); // D (kvinta), jemný rozkvět
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

  // Fanfára v tónině aktuální sezóny — sedí k padu, nezní „mimo".
  questDone() {
    this.ensure();
    const r = KEY_ROOT[this.season];
    const third = KEY_THIRD[this.season];
    this.seq([
      { f: r, d: 0.14 },
      { f: r * third, d: 0.14 },
      { f: r * 1.5, d: 0.14 },
      { f: r * 2, d: 0.3 },
    ]);
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

  // Docházejí síly — měkký klesající motiv (max 1× za 30 s).
  lowEnergy() {
    this.ensure();
    const now = Date.now();
    if (now - this.lastLowEnergy < 30_000) return;
    this.lastLowEnergy = now;
    this.seq([
      { f: 392, d: 0.18, g: 0.07 },
      { f: 330, d: 0.3, g: 0.06 },
    ]);
    this.fm(98, 0.5, 0.15, 0.9, 0.04, "sine", 0.15);
  }

  // ─── ZVÍŘATA ────────────────────────────────────────────────────────────────

  animal(kind: string) {
    this.ensure();
    const sample = this.pickGroupSample(kind);
    if (sample && this.playSample(sample, { gain: 0.10, rate: 1.0, rateJitter: 0.16, pan: (Math.random() - 0.5) * 0.3 })) return;
    switch (kind) {
      case "drubez":
        this.fm(340 + Math.random() * 40, 6.0, 0.8, 0.07, 0.08, "sine", 0);
        this.fm(320 + Math.random() * 40, 6.0, 0.7, 0.06, 0.07, "sine", 0.09);
        if (Math.random() < 0.4)
          this.fm(380, 5.0, 0.6, 0.18, 0.06, "sine", 0.18, 340);
        break;

      case "prasata":
        this.fm(90 + Math.random() * 20, 0.5, 1.2, 0.28, 0.10, "sawtooth", 0);
        if (Math.random() < 0.5) this.noise(0.12, 0.07, 320, 0.24);
        break;

      case "stado":
        this.fm(98, 0.06, 0.15, 1.4, 0.09, "sine", 0);
        this.fm(98 * 1.5, 1.0, 0.3, 0.9, 0.05, "sine", 0.3);
        break;

      case "mazlici":
        this.seq([{ f: 580, d: 0.1, g: 0.07 }, { f: 460, d: 0.13, g: 0.06 }]);
        break;

      default:
        this.interact();
    }
  }

  animalPanic(kind: string) {
    this.ensure();
    const sample = this.pickGroupSample(kind);
    if (sample && this.playSample(sample, { gain: 0.16, rate: 1.15, rateJitter: 0.14, pan: (Math.random() - 0.5) * 0.4 })) return;
    switch (kind) {
      case "drubez":
        for (let i = 0; i < 4; i++) {
          this.fm(440 + Math.random() * 80, 7.0, 1.2, 0.06, 0.10, "sine", i * 0.08);
        }
        this.fm(520, 8.0, 1.5, 0.22, 0.13, "sine", 0.35);
        break;

      case "prasata":
        this.fm(220, 4.0, 1.8, 0.35, 0.13, "sawtooth", 0, 380);
        this.noise(0.18, 0.08, 600, 0.32);
        break;

      case "stado":
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
        for (let i = 0; i < 3; i++) {
          this.fm(500 + Math.random() * 100, 5.0, 1.0, 0.07, 0.09, "sine", i * 0.09);
        }
    }
  }

  animalHappy(kind: string) {
    this.ensure();
    const sample = this.pickGroupSample(kind);
    if (sample && this.playSample(sample, { gain: 0.11, rate: 1.05, rateJitter: 0.16, pan: (Math.random() - 0.5) * 0.3 })) return;
    switch (kind) {
      case "drubez":
        this.fm(350, 5.0, 0.5, 0.10, 0.07, "sine", 0);
        this.fm(370, 4.5, 0.4, 0.09, 0.06, "sine", 0.12);
        this.fm(360, 4.0, 0.3, 0.16, 0.07, "sine", 0.26, 320);
        break;

      case "prasata":
        this.fm(95, 0.3, 0.5, 0.55, 0.08, "sine", 0);
        this.fm(100, 0.3, 0.4, 0.45, 0.07, "sine", 0.28);
        break;

      case "stado":
        this.fm(98, 0.06, 0.08, 1.6, 0.08, "sine", 0, 88);
        break;

      case "mazlici":
        this.fm(55, 30.0, 0.04, 1.0, 0.07, "sine", 0);
        break;

      default:
        this.interact();
    }
  }

  animalEscape(kind: string) {
    this.ensure();
    this.tone(1400, 0.08, "sine", 0.14, 0);
    this.tone(1400, 0.08, "sine", 0.11, 0.12);
    this.animalPanic(kind);
    this.setTension(1);
  }

  animalCaught() {
    this.ensure();
    this.seq([
      { f: 523, d: 0.10, t: "sine",     g: 0.10 },
      { f: 659, d: 0.10, t: "sine",     g: 0.10 },
      { f: 784, d: 0.22, t: "triangle", g: 0.09 },
    ]);
    if (this.tensionLevel <= 1) this.setTension(0);
  }

  // ─── DIVOKÉ EVENTY (poplach = úlek, nikdy útok na zvíře) ───────────────────

  foxAlert() {
    this.ensure();
    // zvědavé liščí pípnutí + growl (charakter, ne hrozba)
    this.fm(65, 7.0, 2.5, 0.28, 0.09, "sawtooth", 0);
    this.tone(1400, 0.06, "sine", 0.13, 0.22);
    this.tone(1400, 0.06, "sine", 0.10, 0.32);
    this.setTension(1);
  }

  foxAttack() {
    this.ensure();
    this.fm(65, 7.0, 3.5, 0.55, 0.14, "sawtooth", 0);
    this.fm(72, 6.5, 3.0, 0.45, 0.11, "sawtooth", 0.12);
    this.noise(0.18, 0.09, 800, 0.08);
    this.animalPanic("drubez");
    this.setTension(2);
  }

  eagleAttack() {
    this.ensure();
    this.fm(2200, 1.0, 0.1, 0.6, 0.11, "sine", 0, 800);
    this.tone(1800, 0.14, "sine", 0.14, 0.52);
    this.noise(0.25, 0.08, 2000, 0.18);
    this.animalPanic("drubez");
    this.setTension(2);
  }

  dangerRelief() {
    this.ensure();
    this.seq([
      { f: 784, d: 0.14, t: "sine",     g: 0.08 },
      { f: 659, d: 0.14, t: "sine",     g: 0.07 },
      { f: 523, d: 0.28, t: "triangle", g: 0.07 },
    ]);
    this.setTension(3);
  }

  // Rostoucí liščí důvěra — hřejivý stoupající motiv v tónině sezóny.
  foxTrustMotif(level: 1 | 2 | 3 = 1) {
    this.ensure();
    const r = KEY_ROOT[this.season];
    const third = KEY_THIRD[this.season];
    const notes: { f: number; d: number; t?: Wave; g?: number }[] = [
      { f: r * 0.5, d: 0.2, g: 0.07 },
      { f: r * 0.5 * 1.5, d: 0.2, g: 0.07 },
    ];
    if (level >= 2) notes.push({ f: r * 0.5 * third * 1.5, d: 0.24, g: 0.07 });
    if (level >= 3) notes.push({ f: r, d: 0.4, t: "triangle", g: 0.08 });
    this.seq(notes, 0.03);
    // krátké prohřátí padu
    if (this.padFilter && this.ctx) {
      const now = this.ctx.currentTime;
      const cur = this.padFilter.frequency.value;
      this.padFilter.frequency.cancelScheduledValues(now);
      this.padFilter.frequency.setValueAtTime(cur, now);
      this.padFilter.frequency.linearRampToValueAtTime(Math.min(4200, cur + 1200), now + 0.5);
      this.padFilter.frequency.linearRampToValueAtTime(cur, now + 3);
    }
  }

  // Mazlení s liškou — pomalá kolébavá figura, perkuse na chvíli ztichnou.
  foxLullaby() {
    this.ensure();
    const r = KEY_ROOT[this.season] * 0.5;
    const third = KEY_THIRD[this.season];
    this.seq([
      { f: r, d: 0.5, g: 0.07 },
      { f: r * 1.5, d: 0.5, g: 0.06 },
      { f: r * third, d: 0.7, t: "triangle", g: 0.07 },
    ], 0.05);
    if (this.layers && this.ctx) {
      const now = this.ctx.currentTime;
      for (const l of ["perc", "arp"] as const) {
        const g = this.layers[l].gain;
        const back = MIX[this.tensionLevel][l];
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(0.0001, now + 0.4);
        g.linearRampToValueAtTime(back, now + 4);
      }
    }
  }

  // ─── NPC HLASY ─────────────────────────────────────────────────────────────

  npcSpeak(npcId: NpcId, sentiment: NpcSentiment = "neutral") {
    this.ensure();
    const now = Date.now();
    if ((this.lastNpcSpeak[npcId] ?? 0) + this.NPC_SPEAK_COOLDOWN > now) return;
    this.lastNpcSpeak[npcId] = now;

    // Každý mluvčí má „své místo" mírně mimo střed — dialog se dá sledovat ušima.
    const profiles = {
      tomas:   { carrier: 155, modRatio: 1.8, modDepth: 0.25, wave: "triangle" as Wave, syllDur: 0.16, syllGap: 0.06, pan: -0.15 },
      maruska: { carrier: 275, modRatio: 2.1, modDepth: 0.18, wave: "triangle" as Wave, syllDur: 0.09, syllGap: 0.025, pan: 0.18 },
      tony:    { carrier: 120, modRatio: 0.9, modDepth: 0.45, wave: "sawtooth" as Wave, syllDur: 0.20, syllGap: 0.09, pan: -0.22 },
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

      if (sentiment === "question" && i >= syllCount - 2)
        freq *= 1.0 + (i - syllCount + 2) * 0.09;
      if (sentiment === "negative")
        freq *= 1.0 - (i / syllCount) * 0.14;
      if (sentiment === "positive")
        freq *= 1.0 + Math.sin((i / syllCount) * Math.PI) * 0.1;

      this.fm(freq, p.modRatio, p.modDepth, p.syllDur, 0.12, p.wave, t, undefined, p.pan);
      t += p.syllDur + p.syllGap + Math.random() * 0.03;
    }
  }

  // ─── TENSION SYSTEM — mix vrstev + tempo ───────────────────────────────────

  setTension(level: TensionLevel) {
    if (this.tensionLevel === level) return;
    this.tensionLevel = level;
    this.applyTensionMix(level);
    this.updateAmbientTension(level);
    if (level === 2) this.startDangerDrone();
    else this.stopDangerDrone();
    // relief se po 2 s sám rozpustí do klidu
    if (this.reliefTimer != null) { window.clearTimeout(this.reliefTimer); this.reliefTimer = null; }
    if (level === 3) {
      this.reliefTimer = window.setTimeout(() => {
        this.reliefTimer = null;
        this.setTension(0);
      }, 2000);
    }
  }

  getTension(): TensionLevel {
    return this.tensionLevel;
  }

  private applyTensionMix(level: TensionLevel) {
    if (!this.ctx || !this.layers) {
      this.tempoMult = MIX[level].tempo;
      return;
    }
    const m = MIX[level];
    const now = this.ctx.currentTime;
    const ramp = (g: GainNode, v: number, dur = 1.0) => {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(Math.max(v, 0.0001), now + dur);
    };
    ramp(this.layers.melody, m.melody * (1 - 0.3 * this.hardship));
    ramp(this.layers.bass, m.bass);
    ramp(this.layers.pad, m.pad);
    ramp(this.layers.perc, m.perc, 0.8);
    ramp(this.layers.arp, m.arp, 0.8);
    // tempo se projeví na dalším kroku scheduleru → plynulé accelerando
    this.tempoMult = m.tempo;
    // relief: krátké projasnění celé hudby (mírné — ať netlačí do limiteru)
    if (level === 3 && this.musicBus) {
      const g = this.musicBus.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(1.15, now + 0.3);
      g.linearRampToValueAtTime(1.0, now + 1.8);
    }
  }

  private startDangerDrone() {
    if (!this.ctx || !this.musicBus || this.dangerOsc) return;
    const t0 = this.ctx.currentTime;
    this.dangerOsc = this.ctx.createOscillator();
    this.dangerGain = this.ctx.createGain();
    this.dangerOsc.type = "sawtooth";
    this.dangerOsc.frequency.value = 55; // hluboké A1 — drone poplachu
    // Lowpass: z pily zbyde temné dunění, ne bzučivé „chrčení".
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    lp.Q.value = 0.7;
    // Pomalé vlnění hlasitosti — drone žije, netlačí staticky.
    this.dangerLfo = this.ctx.createOscillator();
    this.dangerLfo.frequency.value = 0.22;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.012;
    this.dangerLfo.connect(lfoGain);
    lfoGain.connect(this.dangerGain.gain);
    this.dangerGain.gain.setValueAtTime(0.0001, t0);
    this.dangerGain.gain.linearRampToValueAtTime(0.045, t0 + 1.2);
    this.dangerOsc.connect(lp);
    lp.connect(this.dangerGain);
    this.dangerGain.connect(this.musicBus);
    this.dangerOsc.start(t0);
    this.dangerLfo.start(t0);
  }

  private stopDangerDrone() {
    if (!this.dangerOsc || !this.dangerGain || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    this.dangerGain.gain.cancelScheduledValues(t0);
    this.dangerGain.gain.setValueAtTime(this.dangerGain.gain.value, t0);
    this.dangerGain.gain.linearRampToValueAtTime(0.0001, t0 + 1.5);
    this.dangerOsc.stop(t0 + 1.6);
    this.dangerLfo?.stop(t0 + 1.6);
    this.dangerOsc = null;
    this.dangerLfo = null;
    this.dangerGain = null;
  }

  private updateAmbientTension(level: TensionLevel) {
    const intervals: [number, number][] = [
      [2200, 3500], // calm
      [1200, 1600], // alert
      [800,  800],  // danger
      [1800, 2200], // relief
    ];
    this.ambientIntervalRange = intervals[level];
  }

  // ─── HERNÍ KONTEXT (sezóna / fáze / den / počasí) ──────────────────────────

  /**
   * Jediný vstup pro herní stav: přepočítá „hardship" (pozdní podzim tmavne,
   * zima = 1), zimní drone, vítr při sněžení/mrazu a padový lowpass.
   */
  updateMusicContext(c: Partial<MusicContext>) {
    if (c.season) this.season = c.season;
    if (c.phase) this.phase = c.phase;
    if (c.dayInSeason) this.dayInSeason = c.dayInSeason;

    // hardship: jaro po zimě povoluje, podzim postupně přituhuje, zima = max
    const t = Math.min(1, (this.dayInSeason - 1) / Math.max(1, DAYS_PER_SEASON - 1));
    this.hardship =
      this.season === "zima" ? 1
      : this.season === "podzim" ? 0.15 + t * 0.7
      : this.season === "jaro" ? Math.max(0, 0.35 - t * 0.35)
      : 0;

    if (this.ctx && this.padFilter) {
      const now = this.ctx.currentTime;
      this.padFilter.frequency.cancelScheduledValues(now);
      this.padFilter.frequency.setValueAtTime(this.padFilter.frequency.value, now);
      this.padFilter.frequency.linearRampToValueAtTime(800 + (1 - this.hardship) * 2200, now + 2);
    }
    this.updateWinterDrone();
    const windy = c.weather === "snezeni" || c.weather === "mraz" || (c.weather === "destivo" && this.season === "podzim");
    if (c.weather) this.setWind(windy);
    // hardship se promítá i do mixu melodie
    this.applyTensionMix(this.tensionLevel);
  }

  private updateWinterDrone() {
    if (!this.ctx || !this.musicBus) return;
    const target = this.hardship > 0.45 ? 0.02 * this.hardship : 0;
    if (target > 0 && !this.winterGain) {
      this.winterGain = this.ctx.createGain();
      this.winterGain.gain.value = 0.0001;
      this.winterGain.connect(this.musicBus);
      for (const f of [55, 55.4]) {
        const o = this.ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(this.winterGain);
        o.start();
        this.winterOsc.push(o);
      }
    }
    if (this.winterGain) {
      const now = this.ctx.currentTime;
      this.winterGain.gain.cancelScheduledValues(now);
      this.winterGain.gain.setValueAtTime(this.winterGain.gain.value, now);
      this.winterGain.gain.linearRampToValueAtTime(Math.max(target, 0.0001), now + 3);
      if (target === 0) {
        const oscs = this.winterOsc;
        const wg = this.winterGain;
        this.winterOsc = [];
        this.winterGain = null;
        window.setTimeout(() => {
          for (const o of oscs) { try { o.stop(); } catch { /* už zastaven */ } }
          wg.disconnect();
        }, 3500);
      }
    }
  }

  private setWind(on: boolean) {
    if (!this.ctx || !this.musicBus || !this.noiseBuf) return;
    const now = this.ctx.currentTime;
    if (on && !this.windSrc) {
      this.windSrc = this.ctx.createBufferSource();
      this.windSrc.buffer = this.noiseBuf;
      this.windSrc.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 400;
      bp.Q.value = 0.7;
      // pomalé LFO houpe středem pásma — kvílení větru
      this.windLfo = this.ctx.createOscillator();
      this.windLfo.frequency.value = 0.1;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 180;
      this.windLfo.connect(lfoGain);
      lfoGain.connect(bp.frequency);
      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.0001, now);
      this.windGain.gain.linearRampToValueAtTime(0.014, now + 3);
      this.windSrc.connect(bp);
      bp.connect(this.windGain);
      this.windGain.connect(this.musicBus);
      this.windSrc.start(now, Math.random());
      this.windLfo.start(now);
    } else if (!on && this.windSrc && this.windGain) {
      const src = this.windSrc;
      const lfo = this.windLfo;
      const g = this.windGain;
      this.windSrc = null;
      this.windLfo = null;
      this.windGain = null;
      g.gain.linearRampToValueAtTime(0.0001, now + 3);
      window.setTimeout(() => {
        try { src.stop(); lfo?.stop(); } catch { /* už zastaveny */ }
        g.disconnect();
      }, 3500);
    }
  }

  // ─── SEZÓNNÍ ZMĚNA — crossfade, hudba nikdy nezmlkne ───────────────────────

  seasonChange(season: Season) {
    this.ensure();
    const stingers: Record<Season, { f: number; d: number; g?: number }[]> = {
      jaro:   [{ f: 523, d: 0.14 }, { f: 659, d: 0.14 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.28, g: 0.09 }],
      leto:   [{ f: 659, d: 0.12 }, { f: 784, d: 0.12 }, { f: 880, d: 0.12 }, { f: 1175, d: 0.26, g: 0.09 }],
      podzim: [{ f: 440, d: 0.16 }, { f: 392, d: 0.16 }, { f: 349, d: 0.16 }, { f: 294, d: 0.34, g: 0.09 }],
      zima:   [{ f: 392, d: 0.20 }, { f: 330, d: 0.22 }, { f: 294, d: 0.26 }, { f: 220, d: 0.44, g: 0.08 }],
    };
    this.seq(stingers[season], 0.01);
    // melodické vrstvy se na vteřinu stáhnou, vymění se téma, a zase naběhnou
    if (this.ctx && this.layers) {
      const now = this.ctx.currentTime;
      const m = MIX[this.tensionLevel];
      for (const l of ["melody", "pad", "arp"] as const) {
        const g = this.layers[l].gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(0.0001, now + 0.8);
        g.linearRampToValueAtTime(Math.max(m[l], 0.0001), now + 2.2);
      }
    }
    this.updateMusicContext({ season, dayInSeason: 1 });
  }

  // ─── AMBIENT ───────────────────────────────────────────────────────────────

  startAmbient(season: Season) {
    this.season = season;
    this.startAir();
    if (this.ambientTimer != null) return;
    this.ambientTick();
  }

  // Tichý „vzduch louky": filtrovaný šum s pomalým vlněním. Svět tak nikdy
  // neztichne úplně — mezi ptačími ozvami nezůstává digitální ticho.
  private startAir() {
    if (!this.ctx || !this.master || !this.noiseBuf || this.airSrc) return;
    const now = this.ctx.currentTime;
    this.airSrc = this.ctx.createBufferSource();
    this.airSrc.buffer = this.noiseBuf;
    this.airSrc.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 520;
    bp.Q.value = 0.4;
    this.airGain = this.ctx.createGain();
    this.airGain.gain.setValueAtTime(0.0001, now);
    this.airGain.gain.linearRampToValueAtTime(0.005, now + 4);
    // pomalé dýchání hladiny (±40 %) — jako vánek v trávě
    this.airLfo = this.ctx.createOscillator();
    this.airLfo.frequency.value = 0.06;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.002;
    this.airLfo.connect(lfoGain);
    lfoGain.connect(this.airGain.gain);
    this.airSrc.connect(bp);
    bp.connect(this.airGain);
    this.airGain.connect(this.master);
    this.airSrc.start(now, Math.random());
    this.airLfo.start(now);
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
          // cvrček se ozývá z náhodného místa scény
          const f = 2500 + Math.random() * 320;
          const pan = (Math.random() - 0.5) * 0.9;
          this.tone(f, 0.045, "sine", 0.020, 0, 0, pan);
          this.tone(f + 10, 0.045, "sine", 0.016, 0.07, 0, pan);
          this.tone(f, 0.045, "sine", 0.014, 0.14, 0, pan);
        }
        if (Math.random() < 0.3) this.tone(88 + Math.random() * 25, 1.4, "sine", 0.018);

      } else if (p === "rano") {
        if (Math.random() < 0.6) {
          // pták zpívá z jednoho místa, odpověď může přijít odjinud
          const base = 1600 + Math.random() * 900;
          const pan = (Math.random() - 0.5) * 0.9;
          this.tone(base, 0.07, "sine", 0.032, 0, 0, pan);
          this.tone(base * 1.33, 0.06, "sine", 0.025, 0.10, 0, pan);
          if (Math.random() < 0.5) this.tone(base * 0.75, 0.09, "sine", 0.018, 0.18, 0, -pan * 0.7);
        }
        if ((s === "jaro" || s === "leto") && Math.random() < 0.18)
          this.tone(75 + Math.random() * 20, 1.5, "sine", 0.014);

      } else { // poledne
        if (s === "leto" && Math.random() < 0.5) {
          const f = 3200 + Math.random() * 400;
          const pan = (Math.random() - 0.5) * 0.8;
          this.tone(f, 0.03, "sine", 0.016, 0, 0, pan);
          this.tone(f + 8, 0.03, "sine", 0.014, 0.04, 0, pan);
        } else if (s === "podzim" && Math.random() < 0.3) {
          this.tone(95 + Math.random() * 30, 1.8, "sine", 0.020);
        } else if (Math.random() < 0.35) {
          const base = 1800 + Math.random() * 600;
          this.tone(base, 0.06, "sine", 0.022, 0, 0, (Math.random() - 0.5) * 0.8);
        }
      }
    }
    const [min, jit] = this.ambientIntervalRange;
    this.ambientTimer = window.setTimeout(() => this.ambientTick(), min + Math.random() * jit);
  }

  /** @deprecated — použij updateMusicContext. Zachováno pro kompatibilitu. */
  setSeason(s: Season) { this.updateMusicContext({ season: s }); }
  /** @deprecated — použij updateMusicContext. Zachováno pro kompatibilitu. */
  setMood(p: Phase) { this.updateMusicContext({ phase: p }); }

  stopAmbient() {
    if (this.ambientTimer != null) { window.clearTimeout(this.ambientTimer); this.ambientTimer = null; }
    if (this.airSrc && this.airGain && this.ctx) {
      const src = this.airSrc;
      const lfo = this.airLfo;
      const g = this.airGain;
      this.airSrc = null;
      this.airLfo = null;
      this.airGain = null;
      const now = this.ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + 1);
      window.setTimeout(() => {
        try { src.stop(); lfo?.stop(); } catch { /* už zastaveny */ }
        g.disconnect();
      }, 1200);
    }
  }

  // ─── HUDBA — vrstvený lookahead scheduler ──────────────────────────────────
  // Grid = osminy (půlka původního melodického kroku): melodie/bas hrají na
  // sudých pozicích (původní tabulky beze změn), perkuse a arpeggio využívají
  // celé rozlišení. „Tale of Two Clocks": interval 30 ms, lookahead 120 ms.

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

  private BASS: Record<Season, number[]> = {
    jaro:   [196, 0, 0, 0, 196, 0, 165, 0],
    leto:   [174, 0, 0, 0, 174, 0, 146, 0],
    podzim: [147, 0, 0, 0, 131, 0, 110, 0],
    zima:   [110, 0, 0, 0, 110, 0,  98, 0],
  };

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

  /** Délka jednoho grid kroku (osmina) v sekundách. */
  private gridDurSec(): number {
    const tempo = this.TEMPO_TABLE[`${this.season}_${this.phase}`] ?? 500;
    return ((tempo / 1000 / 2) / this.tempoMult) * (1 + this.hardship * 0.06);
  }

  startMusic() {
    if (this.schedTimer != null || !this.musicOn) return;
    this.ensure();
    if (!this.ctx) return;
    if (this.musicBus) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
      this.musicBus.gain.linearRampToValueAtTime(1.0, now + 0.3);
    }
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.schedTimer = window.setInterval(() => this.schedulerLoop(), 30);
  }

  private schedulerLoop() {
    if (!this.ctx) return;
    // Po uspání tabu (prohlížeč škrtí/pozastaví interval) je nextStepTime
    // hluboko v minulosti — bez resyncu by se všechny zameškané kroky
    // naplánovaly „do minulosti" a zazněly NARÁZ jako chrčivý shluk.
    if (this.nextStepTime < this.ctx.currentTime - 0.05) {
      const d = this.gridDurSec();
      const missed = Math.ceil((this.ctx.currentTime - this.nextStepTime) / d);
      this.nextStepTime += missed * d;
      this.gridStep += missed;
    }
    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      if (!this.muted && this.musicOn) this.scheduleStep(this.gridStep, this.nextStepTime);
      this.nextStepTime += this.gridDurSec();
      this.gridStep++;
    }
  }

  private scheduleStep(step: number, t: number) {
    if (!this.ctx || !this.layers) return;
    const key = `${this.season}_${this.phase}`;
    const mel = this.THEMES[key] ?? this.THEMES[`${this.season}_rano`];
    const grid32 = step % 32;
    // lehký swing: liché osminy o kousek později — rytmus „dýchá"
    const swing = step % 2 === 1 ? this.gridDurSec() * 0.08 : 0;

    // melodie + bas: na sudých gridech (původní krok)
    if (step % 2 === 0) {
      const mstep = step / 2;
      const f = mel[mstep % mel.length];
      if (f > 0) {
        // humanizace: ±5 ms časování, ±8 % síly, akcent na těžké době
        const th = t + (Math.random() - 0.5) * 0.01;
        const accent = mstep % 8 === 0 ? 1.12 : 1;
        const mg = this.getMelodyGain(this.phase) * accent * (0.92 + Math.random() * 0.16);
        this.toneAt(f, 1.0, th, "sine", mg, this.layers.melody, true, 0, -0.14);
        this.toneAt(f * 1.004, 1.0, th + 0.012, "sine", mg * 0.75, this.layers.melody, true, 0, 0.18); // chorus vpravo
        if (this.phase === "vecer") this.toneAt(f * 0.5, 1.4, th, "sine", 0.018, this.layers.melody, true);
      }
      const bass = this.BASS[this.season];
      const bassF = bass[mstep % bass.length];
      if (bassF > 0) {
        const bg = this.getBassGain(this.phase);
        this.toneAt(bassF, 2.0, t, "sine", bg, this.layers.bass);
        this.toneAt(bassF * 1.5, 1.8, t, "sine", bg * 0.5, this.layers.bass);
      }
    }

    // pad: nový akord na začátku každého taktu (16 grid kroků)
    if (step % 16 === 0) {
      const chords = PADS[this.season];
      const chord = chords[Math.floor(step / 16) % chords.length];
      for (const f of chord) {
        // dva jemně rozladěné trianglee roztažené do stran — široký, měkký koberec
        this.padVoice(f * 0.998, t, -0.35);
        this.padVoice(f * 1.002, t, 0.35);
      }
    }

    // perkuse podle tension vzoru (haty/shaker se swingem, kick drží tempo)
    const pat = PERC[this.tensionLevel];
    const kick = pat.kick[grid32] ?? 0;
    const hat = pat.hat[grid32] ?? 0;
    const shk = pat.shaker[grid32] ?? 0;
    const blk = pat.block[grid32] ?? 0;
    if (kick) this.percKick(t, 0.16 * kick);
    if (hat) this.percHat(t + swing, 0.05 * hat, grid32 === 30);
    if (shk) this.percShaker(t + swing, 0.035 * shk);
    if (blk) this.percBlock(t + swing, 0.07 * blk);

    // akční arpeggio — jede na každém gridu (slyšet jen při arp gain > 0),
    // ping-ponguje mezi kanály
    if (this.tensionLevel >= 1) {
      const arp = ARPS[this.season];
      const f = arp[step % arp.length] * (this.tensionLevel === 2 ? 1.19 : 1); // danger o malou tercii výš
      this.toneAt(f, 0.09, t + swing, "triangle", 0.05, this.layers.arp, false, 0, step % 2 ? 0.24 : -0.24);
    }
  }

  // Jedna nota padu — triangle s pomalým náběhem a dozvukem přes lowpass.
  private padVoice(freq: number, t: number, pan = 0) {
    if (!this.ctx || !this.padFilter) return;
    const barDur = this.gridDurSec() * 16;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.016, t + Math.min(1.5, barDur * 0.35));
    g.gain.setValueAtTime(0.016, t + barDur);
    g.gain.linearRampToValueAtTime(0.0001, t + barDur + 2);
    osc.connect(g);
    this.panTo(g, this.padFilter, pan);
    if (this.verbIn) g.connect(this.verbIn);
    osc.start(t);
    osc.stop(t + barDur + 2.1);
  }

  stopMusic() {
    if (this.schedTimer != null) { window.clearInterval(this.schedTimer); this.schedTimer = null; }
    if (this.ctx && this.musicBus) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
      this.musicBus.gain.linearRampToValueAtTime(0.0001, now + 0.3);
    }
  }

  // ─── OVLÁDÁNÍ ──────────────────────────────────────────────────────────────

  // ─── D3: ŽIVOTNÍ CYKLUS APLIKACE (pauza/probuzení) ─────────────────────────

  /**
   * Aplikace jde na pozadí: zastaví hudební scheduler (existující stopMusic,
   * beze změny uživatelského přepínače musicOn) a uspí AudioContext, ať
   * appka na pozadí nežere baterii. Vrací, jestli hudba právě hrála — použij
   * to při probuzení (resumeFromBackground) k rozhodnutí, jestli ji obnovit.
   */
  pauseForBackground(): boolean {
    const wasPlaying = this.schedTimer != null;
    if (wasPlaying) this.stopMusic();
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
    return wasPlaying;
  }

  /**
   * Aplikace se probouzí na popředí: probudí AudioContext (existující
   * ensure()) a — hrála-li hudba předtím a hráč ji mezitím ručně nevypnul —
   * znovu nahodí scheduler přes startMusic() (čistý start, žádné dohánění
   * zameškaných kroků).
   */
  resumeFromBackground(wasPlaying: boolean) {
    this.ensure();
    if (wasPlaying && this.musicOn) this.startMusic();
  }

  // ─── MENU HUDBA (nahraný track, intro/menu) ────────────────────────────────
  // Přehrává se přes HTMLAudioElement → MediaElementAudioSourceNode → master,
  // aby ji ovládal mute a limiter stejně jako syntetizovanou hudbu ve hře.

  /** Spustí (nebo pokračuje v) menu téma s fade-inem ~2 s. Idempotentní. */
  startMenuMusic() {
    if (!this.musicOn) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    this.menuWantsPlay = true;
    if (this.menuFadeTimer != null) {
      window.clearTimeout(this.menuFadeTimer);
      this.menuFadeTimer = null;
    }

    if (!this.menuAudio) {
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/menu-theme.mp3`);
      audio.loop = true;
      audio.preload = "auto";
      try {
        this.menuMediaSrc = this.ctx.createMediaElementSource(audio);
        this.menuGain = this.ctx.createGain();
        this.menuGain.gain.value = 0.0001;
        this.menuMediaSrc.connect(this.menuGain);
        this.menuGain.connect(this.master);
        this.menuAudio = audio;
      } catch {
        // MediaElementSource se nepodařilo vytvořit (např. starý WebView) —
        // menu téma prostě zůstane tiché, hra běží dál beze změny.
        return;
      }
    }
    if (!this.menuGain) return;

    const now = this.ctx.currentTime;
    this.menuGain.gain.cancelScheduledValues(now);
    this.menuGain.gain.setValueAtTime(this.menuGain.gain.value, now);
    this.menuGain.gain.linearRampToValueAtTime(1.0, now + 2.0);

    if (this.menuAudio.paused) {
      const p = this.menuAudio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => this.bindMenuRetry());
      }
    }
  }

  // Autoplay policy odmítla play() mimo gesto — tiše počkej na další klik/dotyk.
  private bindMenuRetry() {
    if (this.menuRetryBound) return;
    this.menuRetryBound = true;
    const retry = () => {
      this.menuRetryBound = false;
      window.removeEventListener("click", retry, true);
      window.removeEventListener("keydown", retry, true);
      window.removeEventListener("touchstart", retry, true);
      if (this.menuWantsPlay && this.menuAudio && this.menuAudio.paused) {
        this.menuAudio.play().catch(() => this.bindMenuRetry());
      }
    };
    window.addEventListener("click", retry, true);
    window.addEventListener("keydown", retry, true);
    window.addEventListener("touchstart", retry, true);
  }

  /** Fade-out menu tématu (default 1.5 s) a pauza — beze ztráty pozice/nodů. */
  stopMenuMusic(fadeSec = 1.5) {
    this.menuWantsPlay = false;
    if (!this.menuAudio || !this.menuGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.menuGain;
    const audio = this.menuAudio;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
    if (this.menuFadeTimer != null) window.clearTimeout(this.menuFadeTimer);
    this.menuFadeTimer = window.setTimeout(() => {
      this.menuFadeTimer = null;
      if (!audio.paused) {
        try { audio.pause(); } catch { /* ignore */ }
      }
    }, fadeSec * 1000 + 60);
  }

  toggleMute() {
    this.muted = !this.muted;
    // Mute jde přes master, tension mix žije na musicBus/vrstvách — nehádají se.
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0.0001 : BASE_MASTER, now + 0.1);
    }
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
