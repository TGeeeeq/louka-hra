import { useGame } from "../store";
import { SEASON_ICON, SEASON_LABEL } from "../labels";

/**
 * Skrytý developerský panel pro rychlé testování hry.
 * Odemyká se tajně (5× ťuknout na odznak „Den X", nebo napsat „louka").
 * Nabízí nesmrtelnost (godmód), turbo pohyb a rychlé skoky časem.
 */
export function DevPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame();
  const dev = state.dev;

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
        <div className="dev-label">Rychlé procházení časem</div>
        <div className="dev-btn-row">
          <button onClick={() => dispatch({ type: "DEV_SKIP_PHASE" })}>▸ Další fáze</button>
          <button onClick={() => dispatch({ type: "DEV_SKIP_DAY" })}>⏭ Další den</button>
          <button onClick={() => dispatch({ type: "DEV_SKIP_SEASON" })}>
            🗓️ Další období
          </button>
        </div>
        <small className="dev-hint">
          Skoky časem přeskočí noční dopady (liška, veterinář, mráz) — jsou čistě na
          testování všech ročních období.
        </small>
      </div>

      <div className="dev-section">
        <div className="dev-label">Testovací pomůcky</div>
        <div className="dev-btn-row">
          <button onClick={() => dispatch({ type: "DEV_RESTOCK" })}>
            📦 Doplnit zásoby + 5000 Kč
          </button>
        </div>
      </div>

      <small className="dev-hint dev-foot">
        Skryté odemčení: 5× ťukni na odznak „Den {state.day}" nahoře, nebo napiš{" "}
        <code>louka</code>.
      </small>
    </div>
  );
}
