import { useEffect, useRef, useState } from "react";
import type { FeedGroup } from "../../game/types";
import { GROUP_LABEL } from "../labels";
import { sound } from "../../audio/sound";
import { Icon } from "../icons/Icon";
import { EmojiIcon } from "../icons/emojiMap";

// „Vyhrabej podestýlku" — špinavá místa naskakují, naťukej je dřív, než vyprší čas.
const CELLS = 9;
const TARGET = 12;
const TIME = 15; // s
const DIRT = ["💩", "🌾", "🪶", "🍂"];

function seed(): (string | null)[] {
  const cells: (string | null)[] = Array(CELLS).fill(null);
  for (const i of [1, 4, 7]) cells[i] = DIRT[Math.floor(Math.random() * DIRT.length)];
  return cells;
}

export function CleanUp({ group, onWin }: { group: FeedGroup; onWin: () => void }) {
  const [dirty, setDirty] = useState<(string | null)[]>(seed);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(TIME);
  const [phase, setPhase] = useState<"play" | "win" | "fail">("play");
  const scoreRef = useRef(0);

  // odpočet času
  useEffect(() => {
    if (phase !== "play") return;
    const tick = window.setInterval(() => {
      setLeft((t) => {
        const nt = Math.max(0, +(t - 0.1).toFixed(1));
        if (nt <= 0) setPhase(scoreRef.current >= TARGET ? "win" : "fail");
        return nt;
      });
    }, 100);
    return () => window.clearInterval(tick);
  }, [phase]);

  // naskakování špíny
  useEffect(() => {
    if (phase !== "play") return;
    const spawn = window.setInterval(() => {
      setDirty((d) => {
        const empty = d.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
        if (empty.length === 0) return d;
        const i = empty[Math.floor(Math.random() * empty.length)];
        const nd = [...d];
        nd[i] = DIRT[Math.floor(Math.random() * DIRT.length)];
        return nd;
      });
    }, 620);
    return () => window.clearInterval(spawn);
  }, [phase]);

  const wipe = (i: number) => {
    if (phase !== "play" || !dirty[i]) return;
    setDirty((d) => { const nd = [...d]; nd[i] = null; return nd; });
    sound.interact();
    setScore((s) => {
      const ns = s + 1;
      scoreRef.current = ns;
      if (ns >= TARGET) { setPhase("win"); sound.success(); }
      return ns;
    });
  };

  const reset = () => {
    scoreRef.current = 0;
    setScore(0);
    setLeft(TIME);
    setDirty(seed());
    setPhase("play");
  };

  if (phase !== "play") {
    const win = phase === "win";
    return (
      <div className="mg">
        <h3><EmojiIcon emoji={win ? "🧹" : "🙂"} size={22} /> {win ? "Uklizeno!" : "Skoro!"}</h3>
        <p className="mg-result">
          {win
            ? `Podestýlka u ${GROUP_LABEL[group].toLowerCase()} je čistá a suchá. Zvířata budou zdravější a spokojenější.`
            : `Stihl(a) jsi ${score} z ${TARGET} míst. Zkus to znovu, ať je hotovo.`}
        </p>
        <div className="mg-actions">
          {win ? (
            <button className="big-btn" onClick={onWin}>Hotovo <Icon name="check" size={14} /></button>
          ) : (
            <button className="big-btn" onClick={reset}>Zkusit znovu</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mg">
      <p className="mg-progress">
        Úklid u {GROUP_LABEL[group].toLowerCase()} · <EmojiIcon emoji="⏱" size={14} /> {left.toFixed(0)} s ·{" "}
        <EmojiIcon emoji="🧹" size={14} /> {score}/{TARGET}
      </p>
      <p className="mg-q">Naťukej špinavá místa, než se rozmáznou!</p>
      <div className="clean-grid">
        {dirty.map((d, i) => (
          <button
            key={i}
            className={`clean-cell ${d ? "dirty" : ""}`}
            onClick={() => wipe(i)}
            aria-label={d ? "uklidit" : "čisto"}
          >
            {d && <EmojiIcon emoji={d} size={22} />}
          </button>
        ))}
      </div>
    </div>
  );
}
