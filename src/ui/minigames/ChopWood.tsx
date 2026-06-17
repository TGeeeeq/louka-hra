import { useEffect, useRef, useState } from "react";
import { sound } from "../../audio/sound";

const NEED = 5;
const MAX_TRY = 9;
const ZONE_HALF = 0.1; // poloviční šířka zásahové zóny kolem středu

export function ChopWood({ onWin, onClose }: { onWin: () => void; onClose: () => void }) {
  const [pos, setPos] = useState(0);
  const [hits, setHits] = useState(0);
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<null | "win" | "lose">(null);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(0.013);
  const hitsRef = useRef(0);
  const triesRef = useRef(0);

  // pohyb značky (herní smyčka)
  useEffect(() => {
    if (result) return;
    let raf = 0;
    const loop = () => {
      posRef.current += dirRef.current * speedRef.current;
      if (posRef.current >= 1) { posRef.current = 1; dirRef.current = -1; }
      if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }
      setPos(posRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  const chop = () => {
    if (result) return;
    const inZone = Math.abs(posRef.current - 0.5) <= ZONE_HALF;
    triesRef.current += 1;
    setTries(triesRef.current);
    if (inZone) {
      hitsRef.current += 1;
      setHits(hitsRef.current);
      sound.build();
      speedRef.current = Math.min(0.034, speedRef.current + 0.003);
    } else {
      sound.error();
    }
    if (hitsRef.current >= NEED) setResult("win");
    else if (triesRef.current >= MAX_TRY) setResult("lose");
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); chop(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const reset = () => {
    posRef.current = 0; dirRef.current = 1; speedRef.current = 0.013; hitsRef.current = 0; triesRef.current = 0;
    setPos(0); setHits(0); setTries(0); setResult(null);
  };

  if (result) {
    const win = result === "win";
    return (
      <div className="mg">
        <h3>{win ? "🪓 Pecka!" : "😅 Vedle."}</h3>
        <p className="mg-result">
          {win ? "Trefil jsi to do špalku jako profík. Tomáš ti dává plnou náruč dřeva." : "Sekal jsi do prázdna. Zkus chytit rytmus."}
        </p>
        <div className="mg-actions">
          {win ? (
            <button className="big-btn" onClick={onWin}>Vzít dřevo 🪵</button>
          ) : (
            <>
              <button className="big-btn" onClick={reset}>Zkusit znovu</button>
              <button className="ghost-btn" onClick={onClose}>Zavřít</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mg">
      <p className="mg-q">Sekni do špalku, když je značka v zeleném! (mezerník nebo tlačítko)</p>
      <p className="mg-progress">Zásahy {hits}/{NEED} · pokusy {tries}/{MAX_TRY}</p>
      <div className="chop-bar">
        <div className="chop-zone" style={{ left: `${(0.5 - ZONE_HALF) * 100}%`, width: `${ZONE_HALF * 200}%` }} />
        <div className="chop-marker" style={{ left: `${pos * 100}%` }} />
      </div>
      <button className="big-btn mg-next" onClick={chop}>🪓 Seknout!</button>
    </div>
  );
}
