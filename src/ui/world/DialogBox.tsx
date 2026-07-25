import { useEffect } from "react";
import { useGame } from "../store";

/**
 * `hidden` = replika je ve frontě, ale zatím se nemá zobrazit (běží uvítací
 * přelet kamery). Musí blokovat i klávesy, jinak by hráč mezerníkem odklikal
 * Tomášovo vysvětlení, aniž by ho vůbec viděl.
 */
export function DialogBox({ hidden = false }: { hidden?: boolean }) {
  const { state, dispatch } = useGame();
  const d = hidden ? null : state.dialog;

  useEffect(() => {
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        dispatch({ type: "DISMISS_DIALOG" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d, dispatch]);

  if (!d) return null;
  const more = d.lines.length > 1;
  return (
    <div className="dialog-layer" onClick={() => dispatch({ type: "DISMISS_DIALOG" })}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        {d.speaker && <span className="dialog-speaker">{d.speaker}</span>}
        <p className="dialog-text">{d.lines[0]}</p>
        <button className="dialog-next" onClick={() => dispatch({ type: "DISMISS_DIALOG" })}>
          {more ? "▼ dál" : "▼ zavřít"}
        </button>
      </div>
    </div>
  );
}
