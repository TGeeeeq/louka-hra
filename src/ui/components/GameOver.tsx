import { useGame } from "../store";
import { Icon } from "../icons/Icon";

export function GameOver() {
  const { state, dispatch } = useGame();
  if (!state.gameOver) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal over-modal paper">
        <h2>Konec hry</h2>
        <p className="over-msg">{state.gameOver}</p>
        <div className="over-stats">
          <div><b>{state.daysSurvived}</b><span>dní přežito</span></div>
          <div><b>{state.totalEarned}</b><span>Kč vyděláno</span></div>
          <div><b>{state.knownFacts.length}</b><span>zajímavostí</span></div>
        </div>
        <button className="big-btn" onClick={() => dispatch({ type: "RESET" })}>
          <Icon name="sprout" size={18} /> Hrát znovu
        </button>
      </div>
    </div>
  );
}
