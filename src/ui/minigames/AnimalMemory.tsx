import { useMemo, useState } from "react";
import { ANIMAL_BY_ID } from "../../game/content/animals";
import { AnimalSprite } from "../sprites/AnimalSprite";
import { sound } from "../../audio/sound";

interface Card {
  key: number;
  animalId: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const POOL = ["karel", "princezna", "avala", "pogo", "roman", "kralici", "husy", "yakul"];
const PAIRS = 6;

export function AnimalMemory({ onWin, onClose }: { onWin: () => void; onClose: () => void }) {
  const initial = useMemo<Card[]>(() => {
    const pick = shuffle(POOL).slice(0, PAIRS);
    return shuffle([...pick, ...pick]).map((id, i) => ({ key: i, animalId: id, flipped: false, matched: false }));
  }, []);
  const [cards, setCards] = useState<Card[]>(initial);
  const [sel, setSel] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);

  const allMatched = cards.every((c) => c.matched);

  const flip = (i: number) => {
    if (busy || cards[i].flipped || cards[i].matched) return;
    const nc = cards.map((x, j) => (j === i ? { ...x, flipped: true } : x));
    const ns = [...sel, i];
    setCards(nc);
    setSel(ns);
    if (ns.length === 2) {
      setMoves((m) => m + 1);
      setBusy(true);
      const [a, b] = ns;
      const match = nc[a].animalId === nc[b].animalId;
      window.setTimeout(() => {
        setCards((cs) => cs.map((x, j) => (j === a || j === b ? { ...x, matched: match, flipped: match } : x)));
        setSel([]);
        setBusy(false);
        if (match) sound.success();
      }, match ? 380 : 760);
    }
  };

  if (allMatched) {
    return (
      <div className="mg">
        <h3>🧠 Paráda!</h3>
        <p className="mg-result">Všechny páry máš na {moves} tahů. Tony uznale píská — a hází pár korun do kasy.</p>
        <div className="mg-actions">
          <button className="big-btn" onClick={onWin}>Vzít odměnu 💰</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mg">
      <p className="mg-q">Najdi dvojice obyvatel Louky. Tahy: {moves}</p>
      <div className="memory-grid">
        {cards.map((c, i) => {
          const show = c.flipped || c.matched;
          const a = ANIMAL_BY_ID[c.animalId];
          return (
            <button key={c.key} className={`mem-card ${show ? "open" : ""} ${c.matched ? "done" : ""}`} onClick={() => flip(i)} disabled={show}>
              {show && a ? (
                <span className="mem-face">
                  <AnimalSprite animal={a} size={44} />
                  <em>{a.name}</em>
                </span>
              ) : (
                <span className="mem-back">🐾</span>
              )}
            </button>
          );
        })}
      </div>
      <button className="ghost-btn" onClick={onClose}>Vzdát to</button>
    </div>
  );
}
