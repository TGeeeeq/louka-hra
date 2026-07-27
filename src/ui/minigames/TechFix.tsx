import { useState } from "react";
import { sound } from "../../audio/sound";
import { EmojiIcon } from "../icons/emojiMap";

// Tonyho technika: spoj každý vynález s tím, co dělá. Učí, jaká technika
// Louce reálně pomáhá (solár, pumpa, vyhřívaná napáječka, ohradník).
interface Gadget { id: string; icon: string; name: string; does: string }
const GADGETS: Gadget[] = [
  { id: "solar", icon: "☀️", name: "Solární panel", does: "Přes den dobíjí baterii — večer svítí" },
  { id: "pump", icon: "💧", name: "Vodní pumpa", does: "Žene vodu do napáječek" },
  { id: "heat", icon: "♨️", name: "Vyhřívaná napáječka", does: "V zimě voda nezamrzne" },
  { id: "fence", icon: "⚡", name: "Elektrický ohradník", does: "Udrží stádo uvnitř a noční zvědavce venku" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TechFix({ onWin }: { onWin: () => void }) {
  const [rights] = useState(() => shuffle(GADGETS));
  const [sel, setSel] = useState<string | null>(null); // vybraný vynález (levý sloupec)
  const [done, setDone] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);

  const win = done.length === GADGETS.length;

  const pickLeft = (id: string) => {
    if (done.includes(id)) return;
    sound.select();
    setSel(id);
  };
  const pickRight = (id: string) => {
    if (!sel || done.includes(id)) return;
    if (id === sel) {
      const nd = [...done, id];
      setDone(nd);
      setSel(null);
      if (nd.length === GADGETS.length) sound.questDone();
      else sound.success();
    } else {
      setBad(id);
      sound.error();
      setSel(null);
      window.setTimeout(() => setBad(null), 420);
    }
  };

  if (win) {
    return (
      <div className="mg">
        <h3><EmojiIcon emoji="🔌" size={22} /> Zapojeno!</h3>
        <p className="mg-result">Všechno běží, jak má. S Tonyho vychytávkami si Louka skoro pomáhá sama — a tobě zbude víc sil na zvířata.</p>
        <div className="mg-actions"><button className="big-btn" onClick={onWin}>Hotovo <EmojiIcon emoji="⚡" size={15} /></button></div>
      </div>
    );
  }

  return (
    <div className="mg">
      <p className="mg-q">Spoj vynález s tím, co umí <EmojiIcon emoji="🔧" size={15} /></p>
      <p className="mg-progress">{done.length}/{GADGETS.length} zapojeno</p>
      <div className="tech-cols">
        <div className="tech-col">
          {GADGETS.map((g) => (
            <button
              key={g.id}
              className={`tech-node${sel === g.id ? " sel" : ""}${done.includes(g.id) ? " done" : ""}`}
              disabled={done.includes(g.id)}
              onClick={() => pickLeft(g.id)}
            >
              <span className="tech-ico"><EmojiIcon emoji={g.icon} size={20} /></span>
              <b>{g.name}</b>
            </button>
          ))}
        </div>
        <div className="tech-col">
          {rights.map((g) => (
            <button
              key={g.id}
              className={`tech-node fn${done.includes(g.id) ? " done" : ""}${bad === g.id ? " bad" : ""}`}
              disabled={done.includes(g.id)}
              onClick={() => pickRight(g.id)}
            >
              {g.does}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
