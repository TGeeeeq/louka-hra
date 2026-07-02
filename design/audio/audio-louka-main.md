# Louka — Audio Design Document

**Verze:** 2.0 | **Datum:** 2026-07-02 | **Status:** Implementováno

> **v2 (vrstvená adaptivní hudba):** hudba přešla ze `setTimeout`-sekvenceru na
> lookahead scheduler (30 ms / 120 ms, grid = osminy) s pěti vrstvami
> (melody/bass/pad/perc/arp) na vlastní sběrnici `musicBus`. Tension teď mění
> **mix vrstev a tempo** (calm = shaker; alert = heartbeat kick ×1,15; danger =
> hnací kick/hat + akční arpeggio v tónině sezóny ×1,35), ne jen hlasitost —
> a ducking už NEztlumuje SFX (přesun z masteru na musicBus). Nově: sezónní
> akordové pady (zima = prázdné kvinty), parametr **hardship** (pozdní podzim
> postupně ztmavuje — lowpass padu, řidší melodie, zimní drone 55 Hz, mírné
> zpomalení), vítr při sněžení/mrazu, crossfade při změně sezóny (hudba nikdy
> nezmlkne), `updateMusicContext()`, `lowEnergy()`, `foxTrustMotif()`,
> `foxLullaby()`, `getTension()`. Poslechové QA: DevPanel → sekce 🔊 Audio.
> Tabulky níže popisují v1 témata/SFX — melodie, basy a SFX recepty platí dál.

## Sonic Identity

Folk-elektronika / Pastoral Synthesis — teplá, živá, reagující na dění.
FM syntéza (ne čisté sinusy), noise bursts, NPC hlasy Animal Crossing styl.

## Architektura

```
Oscillators/BufferSources → [SFX bus] ──→ [master (0.3)] → ctx.destination
                          → [musicGain]─┘                 ↑
                                                    [verb reverb wet]
```

`musicGain` klesá při duckingu (NPC hlas, SFX eventy) — hudba vždy ustupuje.

## Tension System

| Level | Stav | Trigger | musicGain | Ambient |
|-------|------|---------|-----------|---------|
| 0 | calm | normální hra | 0.3 | 2200–5700 ms tick |
| 1 | alert | zvíře uteklo | 0.18 | 1200–2800 ms tick |
| 2 | danger | liška/káně útočí | 0.06 + danger drone (55 Hz) | 800–1600 ms tick |
| 3 | relief | zvíře zachráněno | 0.38 (jásot) | → auto calm po 2 s |

Crossfade: `exponentialRampToValueAtTime` za 1.5 s — žádné přeskoky.

## Hudební témata

12 kombinací (4 sezóny × 3 fáze dne):

| Sezóna | Mód | Ráno | Poledne | Večer |
|--------|-----|------|---------|-------|
| Jaro | Lydický | rychlá, světlá | plné aranžmá | tišší pady |
| Léto | Mixolydický | teplá, uvolněná | plné aranžmá | pomalá |
| Podzim | Dórský | nostalgická | plné aranžmá | pomalá |
| Zima | Aiolský | meditativní | plné aranžmá | velmi tichá |

Večer = tempo ×1.3, gain ×0.65.

## NPC Hlasy

| NPC | Freq range | Waveform | Charakter |
|-----|-----------|----------|-----------|
| Tomáš | 140–185 Hz | sine+triangle | hluboký baryton, pomalý |
| Maruška | 255–340 Hz | triangle | zvučné mezzosopráno, staccato |
| Tony | 105–135 Hz | sawtooth LP400Hz | bručivý basbaryton |

Cooldown 1800 ms per NPC — nikdy se nepřekrývají.

## Zvuky zvířat

| Zvíře | Syntéza | Klíčové parametry |
|-------|---------|-------------------|
| Drůbež | FM klovkání | carrier 320–380 Hz, modRatio 6.0 |
| Prasata | FM + noise frknutí | carrier 85–110 Hz, modRatio 0.5 + LP200 |
| Krávy | FM vibrato + kvinta | 98 Hz + LFO, + 147 Hz |
| Ovce | FM portamento | 320→420 Hz, modRatio 3.5 |
| Pes | Noise formant bark | BP 380+720 Hz noise |
| Kočka | FM portamento | 420→680→520 Hz |
| Liška | Growl + pip | 65 Hz FM modRatio 7.0 + 1400 Hz |
| Káně | Glissando + výkřik | 2200→800 Hz + sawtooth 1800 Hz |

## Public API

```typescript
// Stávající (beze změny):
sound.select(), interact(), error(), coin(), eat(), success()
sound.questDone(), build(), newDay(), sleepy(), note(freq)
sound.animal(kind), startAmbient(season), setSeason(s), setMood(p)
sound.startMusic(), stopMusic(), toggleMute(), toggleMusic()

// Nové:
sound.setTension(level: 0|1|2|3)
sound.animalEscape(kind)    // escape event v App.tsx
sound.animalCaught()        // caught event v App.tsx  
sound.animalPanic(kind)
sound.animalHappy(kind)
sound.foxAlert()
sound.foxAttack()
sound.eagleAttack()
sound.dangerRelief()
sound.npcSpeak(npcId: 'tomas'|'maruska'|'tony', sentiment)
```

## Soubory

- `src/audio/sound.ts` — kompletní 706-řádkový engine
- `docs/audio-events-spec.md` — kompletní parametrická specifikace
- `src/App.tsx` — upraven onWorldEvent + onInteract

## Budoucí rozšíření

- Liška trigger z WorldCanvas (zatím není událost foxAlert z herní logiky)
- Káně trigger (zatím není herní mechanikou)
- `animalHappy()` volat při nakrmení zvířete
- Více sentimentů pro NPC dle kontextu (quest dialog vs. routine)

## Changelog — mix & imerze (2026-07)

Oprava „občasného chrčení" + pozvednutí prostoru. Vše v `src/audio/sound.ts`:

- **Resync scheduleru po uspání tabu** *(hlavní příčina chrčení)*: po probuzení
  prohlížeče se zameškané kroky přeskočí místo naplánování do minulosti —
  dřív zazněly všechny naráz jako chrčivý shluk.
- **Dozvuk**: impulz už není surový bílý šum (syčel), ale exponenciálně
  doznívající šum s postupně se zavírajícím lowpassem (2,4 s) + 25ms predelay.
- **Danger drone**: pila 55 Hz nově přes lowpass 240 Hz + pomalé LFO — temné
  dunění místo bzučení.
- **Limiter**: měkké koleno (knee 10), ratio 12:1, pomalejší release — nežvýká basy.
- **Latence**: `latencyHint: "balanced"` — větší buffer, méně podtečení na mobilech.
- **`noise()`** čte ze sdíleného bufferu (žádné alokace/GC pauzy za běhu).
- **Stereo obraz**: melodie/chorus L↔P, pad ±0.35, hat/shaker/block rozmístěné,
  arpeggio ping-pong, ptáci a cvrčci z náhodných míst, NPC hlasy mají „své místo".
- **Humanizace**: melodie ±5 ms / ±8 % velocity + akcent těžké doby; haty,
  shaker a arp s lehkým swingem (8 % osminy).
- **„Vzduch louky"**: tichý kontinuální bandpass šum (520 Hz) s pomalým LFO
  dýcháním — svět mezi ptačími ozvami neztichne do digitálního ticha.
