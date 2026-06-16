import { useEffect } from "react";
import { useGame } from "../store";

export function FlashToast() {
  const { state, dispatch } = useGame();
  const flash = state.flash;

  useEffect(() => {
    if (!flash) return;
    const ms = flash.fact ? 9000 : 4200;
    const id = window.setTimeout(() => dispatch({ type: "DISMISS_FLASH" }), ms);
    return () => window.clearTimeout(id);
  }, [flash, dispatch]);

  if (!flash) return null;

  return (
    <div className={`toast ${flash.tone}`} role="status" onClick={() => dispatch({ type: "DISMISS_FLASH" })}>
      <p className="toast-text">{flash.text}</p>
      {flash.fact && (
        <div className="toast-fact">
          <span className="fact-badge">🎓 {flash.fact.title}</span>
          <p>{flash.fact.text}</p>
        </div>
      )}
      <span className="toast-x">klikni pro zavření</span>
    </div>
  );
}
