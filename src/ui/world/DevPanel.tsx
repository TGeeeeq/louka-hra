import { useEffect, useState } from "react";
import { useGame } from "../store";
import { SEASON_ICON, SEASON_LABEL } from "../labels";
import { sound, type TensionLevel } from "../../audio/sound";
import { DLC_CATALOG } from "../../game/content/dlc";
import { grantDlc, revokeDlc } from "../../game/dlc/entitlements";
import {
  enableAutoTier,
  getPerfStats,
  getQualityTier,
  isAutoTier,
  setQualityTier,
  type PerfStats,
  type QualityTier,
} from "../../world/perf";

/**
 * Skrytý developerský panel pro rychlé testování hry.
 * Odemyká se tajně (5× ťuknout na odznak „Den X", nebo napsat „louka").
 * Nabízí nesmrtelnost (godmód), turbo pohyb a rychlé skoky časem.
 */
export function DevPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame();
  const dev = state.dev;
  const [tension, setTension] = useState<TensionLevel>(sound.getTension());
  const forceTension = (t: TensionLevel) => {
    sound.setTension(t);
    setTension(t);
  };

  const [perf, setPerf] = useState<PerfStats>(() => getPerfStats());
  const [tier, setTier] = useState<QualityTier>(() => getQualityTier());
  const [auto, setAuto] = useState<boolean>(() => isAutoTier());
  useEffect(() => {
    const id = setInterval(() => {
      setPerf(getPerfStats());
      setTier(getQualityTier());
      setAuto(isAutoTier());
    }, 500);
    return () => clearInterval(id);
  }, []);
  const pickTier = (t: QualityTier) => {
    setQualityTier(t);
    setTier(t);
    setAuto(false);
  };
  const pickAuto = () => {
    enableAutoTier();
    setTier(getQualityTier());
    setAuto(true);
  };

  return (
    <div className="dev-panel" onClick={(e) => e.stopPropagation()}>
      <div className="dev-head">
        <h3>🛠️ Developerský mód</h3>
        <button className="modal-close" onClick={onClose} aria-label="Zavřít">×</button>
      </div>

      <p className="dev-sub">
        Den {state.day} · {SEASON_ICON[state.season]} {SEASON_LABEL[state.season]} ·{" "}
        {state.dayInSeason}. den · rok {state.year}
      </p>

      <div className="dev-section">
        <label className="dev-toggle">
          <input
            type="checkbox"
            checked={dev.godMode}
            onChange={() => dispatch({ type: "DEV_TOGGLE", key: "godMode" })}
          />
          <span><b>💪 Godmód</b> — nesmrtelnost (plná energie, sytost, žízeň; žádný bankrot)</span>
        </label>
        <label className="dev-toggle">
          <input
            type="checkbox"
            checked={dev.turbo}
            onChange={() => dispatch({ type: "DEV_TOGGLE", key: "turbo" })}
          />
          <span><b>⚡ Turbo pohyb</b> — postava chodí po mapě ~2,7× rychleji</span>
        </label>
      </div>

      <div className="dev-section">
        <div className="dev-label">⚡ Výkon</div>
        <small className="dev-hint">
          {perf.fps.toFixed(0)} FPS · průměr {perf.avgMs.toFixed(1)} ms · p95{" "}
          {perf.p95Ms.toFixed(1)} ms · vykresleno {perf.drawn} objektů
        </small>
        <div className="dev-btn-row">
          <button className={auto ? "on" : ""} onClick={pickAuto}>Auto</button>
          <button className={!auto && tier === "high" ? "on" : ""} onClick={() => pickTier("high")}>
            Vysoká
          </button>
          <button className={!auto && tier === "medium" ? "on" : ""} onClick={() => pickTier("medium")}>
            Střední
          </button>
          <button className={!auto && tier === "low" ? "on" : ""} onClick={() => pickTier("low")}>
            Nízká
          </button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-label">Rychlé procházení časem</div>
        <div className="dev-btn-row">
          <button onClick={() => dispatch({ type: "DEV_SKIP_PHASE" })}>▸ Další fáze</button>
          <button onClick={() => dispatch({ type: "DEV_SKIP_DAY" })}>⏭ Další den</button>
          <button onClick={() => dispatch({ type: "DEV_SKIP_SEASON" })}>
            🗓️ Další období
          </button>
        </div>
        <small className="dev-hint">
          Skoky časem přeskočí noční vyhodnocení (vyplašení, veterinář, mráz) — jsou
          čistě na testování všech ročních období.
        </small>
      </div>

      <div className="dev-section">
        <div className="dev-label">Testovací pomůcky</div>
        <div className="dev-btn-row">
          <button onClick={() => dispatch({ type: "DEV_RESTOCK" })}>
            📦 Doplnit zásoby + 5000 Kč
          </button>
          <button onClick={() => dispatch({ type: "DEV_FOX" })}>
            🦊 Posunout liščí příběh ({state.fox.stage}, důvěra {state.fox.trust})
          </button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-label">🌾 DLC (testovací odemykání)</div>
        {DLC_CATALOG.map((d) => {
          const owned = state.dlcOwned.includes(d.id);
          return (
            <label className="dev-toggle" key={d.id}>
              <input
                type="checkbox"
                checked={owned}
                onChange={() =>
                  dispatch({ type: "SET_DLC", owned: owned ? revokeDlc(d.id) : grantDlc(d.id) })
                }
              />
              <span><b>{d.emoji} {d.name}</b> — {d.tagline}</span>
            </label>
          );
        })}
      </div>

      <div className="dev-section">
        <div className="dev-label">🔊 Audio — napětí a motivy (poslechové QA)</div>
        <div className="dev-btn-row">
          {([0, 1, 2, 3] as const).map((t) => (
            <button key={t} className={tension === t ? "on" : ""} onClick={() => forceTension(t)}>
              {["😌 klid", "⚠️ útěk", "🚨 poplach", "😮‍💨 úleva"][t]}
            </button>
          ))}
        </div>
        <div className="dev-btn-row">
          <button onClick={() => sound.foxAlert()}>🦊 alert</button>
          <button onClick={() => sound.foxTrustMotif(3)}>🦊 důvěra</button>
          <button onClick={() => sound.foxLullaby()}>🦊 mazlení</button>
          <button onClick={() => sound.lowEnergy()}>🥱 únava</button>
          <button onClick={() => sound.questDone()}>🎉 quest</button>
        </div>
      </div>

      <small className="dev-hint dev-foot">
        Skryté odemčení: 5× ťukni na odznak „Den {state.day}" nahoře, nebo napiš{" "}
        <code>louka</code>.
      </small>
    </div>
  );
}
