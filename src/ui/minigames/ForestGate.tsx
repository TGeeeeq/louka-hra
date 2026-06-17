import { useEffect, useRef, useState } from "react";
import { sound } from "../../audio/sound";

// Simon: ptáci zazpívají pořadí, ty ho zopakuješ. Vyřešení otevře bránu.
const PADS = [
  { c: "#e0584a", f: 392, name: "🐦" },
  { c: "#f0c048", f: 523, name: "🐤" },
  { c: "#4aa6d6", f: 659, name: "🕊️" },
  { c: "#6fae45", f: 784, name: "🦜" },
];
const LEN = 4;

const randSeq = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 4));

export function ForestGate({ onWin, onClose }: { onWin: () => void; onClose: () => void }) {
  const [seq, setSeq] = useState<number[]>(() => randSeq(LEN));
  const [phase, setPhase] = useState<"watch" | "input" | "win" | "lose">("watch");
  const [lit, setLit] = useState(-1);
  const posRef = useRef(0);

  useEffect(() => {
    if (phase !== "watch") return;
    posRef.current = 0;
    let i = 0;
    let inner = 0;
    const playNext = () => {
      if (i >= seq.length) {
        setLit(-1);
        setPhase("input");
        return;
      }
      const pad = seq[i];
      setLit(pad);
      sound.note(PADS[pad].f);
      inner = window.setTimeout(() => {
        setLit(-1);
        inner = window.setTimeout(() => {
          i++;
          playNext();
        }, 190);
      }, 520);
    };
    const start = window.setTimeout(playNext, 600);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(inner);
    };
  }, [phase, seq]);

  const click = (i: number) => {
    if (phase !== "input") return;
    sound.note(PADS[i].f);
    setLit(i);
    window.setTimeout(() => setLit(-1), 170);
    if (seq[posRef.current] === i) {
      posRef.current += 1;
      if (posRef.current >= seq.length) {
        setPhase("win");
        sound.questDone();
      }
    } else {
      setPhase("lose");
      sound.error();
    }
  };

  const reset = () => {
    setSeq(randSeq(LEN));
    posRef.current = 0;
    setLit(-1);
    setPhase("watch");
  };

  if (phase === "win") {
    return (
      <div className="mg">
        <h3>🚪 Brána povolila!</h3>
        <p className="mg-result">Zopakoval jsi ptačí píseň správně. Cesta k hájku je volná — a čeká tam truhla se zásobami.</p>
        <div className="mg-actions"><button className="big-btn" onClick={onWin}>Otevřít cestu 🌲</button></div>
      </div>
    );
  }
  if (phase === "lose") {
    return (
      <div className="mg">
        <h3>🙉 Skoro!</h3>
        <p className="mg-result">Pořadí ti uteklo. Zaposlouchej se znovu.</p>
        <div className="mg-actions">
          <button className="big-btn" onClick={reset}>Poslechnout znovu</button>
          <button className="ghost-btn" onClick={onClose}>Zavřít</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mg">
      <p className="mg-q">{phase === "watch" ? "🎵 Poslouchej, jak ptáci zpívají…" : "Teď to zopakuj!"}</p>
      <div className="gate-pads">
        {PADS.map((pad, i) => (
          <button
            key={i}
            className="gate-pad"
            disabled={phase !== "input"}
            style={{ background: pad.c, opacity: lit === i ? 1 : 0.55, transform: lit === i ? "scale(1.06)" : "none" }}
            onClick={() => click(i)}
          >
            {pad.name}
          </button>
        ))}
      </div>
      <p className="mg-progress">{phase === "input" ? `${posRef.current}/${seq.length}` : " "}</p>
    </div>
  );
}
