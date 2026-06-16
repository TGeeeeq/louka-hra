import { useGame } from "../store";
import {
  PHASE_ICON,
  PHASE_LABEL,
  SEASON_ICON,
  SEASON_LABEL,
  WEATHER_ICON,
} from "../labels";
import { weatherName } from "../../game/engine/reducer";

function Bar({
  icon,
  label,
  value,
  max,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar" title={`${label}: ${Math.round(value)}/${max}`}>
      <span className="bar-icon" aria-hidden>
        {icon}
      </span>
      <div className="bar-track">
        <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-val">{Math.round(value)}</span>
    </div>
  );
}

export function TopBar() {
  const { state, dispatch } = useGame();

  const phaseBtn =
    state.phase === "rano"
      ? { label: "Ráno hotové → Poledne", action: () => dispatch({ type: "ADVANCE_PHASE" }) }
      : state.phase === "poledne"
        ? { label: "Poledne hotové → Večer", action: () => dispatch({ type: "ADVANCE_PHASE" }) }
        : { label: "Jít spát 😴", action: () => dispatch({ type: "SLEEP" }) };

  return (
    <header className="topbar">
      <div className="topbar-when">
        <span className="day-badge">Den {state.day}</span>
        <span className="season-pill" data-season={state.season}>
          {SEASON_ICON[state.season]} {SEASON_LABEL[state.season]}
        </span>
        <span className="when-sub">
          {PHASE_ICON[state.phase]} {PHASE_LABEL[state.phase]} ·{" "}
          {WEATHER_ICON[state.weather]} {weatherName(state.weather)}
        </span>
      </div>

      <div className="topbar-bars">
        <Bar icon="⚡" label="Energie" value={state.energy} max={state.maxEnergy} tone="energy" />
        <Bar icon="🍞" label="Sytost" value={state.hunger} max={100} tone="hunger" />
        <Bar icon="💧" label="Žízeň" value={state.thirst} max={100} tone="thirst" />
      </div>

      <div className="topbar-right">
        <span className="money">💰 {state.money} Kč</span>
        <button className={`phase-btn ${state.phase === "vecer" ? "sleep" : ""}`} onClick={phaseBtn.action}>
          {phaseBtn.label}
        </button>
      </div>
    </header>
  );
}
