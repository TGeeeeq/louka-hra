import { useMemo, useState } from "react";
import { FACTS } from "../../game/content/facts";
import { useGame } from "../store";

const HERBS = FACTS.filter((f) => f.category === "byliny");

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const ROUNDS = 5;
const PASS = 3;

export function HerbQuiz({ onWin, onClose }: { onWin: () => void; onClose: () => void }) {
  const { dispatch } = useGame();
  const questions = useMemo(() => shuffle(HERBS).slice(0, ROUNDS), []);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const q = questions[i];
  const options = useMemo(
    () => (q ? shuffle([q, ...shuffle(HERBS.filter((h) => h.id !== q.id)).slice(0, 3)]) : []),
    [q],
  );

  if (i >= questions.length) {
    const win = score >= PASS;
    return (
      <div className="mg">
        <h3>{win ? "🌿 Výborně!" : "🙂 Skoro!"}</h3>
        <p className="mg-result">
          Poznal{win ? "a" : ""} jsi {score} z {ROUNDS} bylin.
          {win ? " Maruška ti přidává hrst nasbíraných bylin." : " Zkus to znovu, ať se zlepšíš."}
        </p>
        <div className="mg-actions">
          {win ? (
            <button className="big-btn" onClick={onWin}>Vzít odměnu 🌿</button>
          ) : (
            <>
              <button className="big-btn" onClick={() => { setI(0); setScore(0); setPicked(null); }}>Zkusit znovu</button>
              <button className="ghost-btn" onClick={onClose}>Zavřít</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mg">
      <p className="mg-progress">Bylinka {i + 1}/{ROUNDS} · skóre {score}</p>
      <p className="mg-clue">„{q.text}“</p>
      <p className="mg-q">Která bylina to je?</p>
      <div className="mg-options">
        {options.map((o) => {
          const isPicked = picked === o.id;
          const reveal = picked !== null;
          const correct = o.id === q.id;
          return (
            <button
              key={o.id}
              className={`mg-opt ${reveal && correct ? "ok" : ""} ${reveal && isPicked && !correct ? "bad" : ""}`}
              disabled={reveal}
              onClick={() => {
                setPicked(o.id);
                if (correct) {
                  setScore((s) => s + 1);
                  // Správné odpovědi se sčítají napříč hrami — živí achievement
                  // „Kvízový mistr“ (viz src/game/achievements.ts).
                  dispatch({ type: "HERB_QUIZ_RESULT", correct: 1 });
                }
              }}
            >
              🌿 {o.title}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button className="big-btn mg-next" onClick={() => { setPicked(null); setI((v) => v + 1); }}>
          {i + 1 < ROUNDS ? "Další ▸" : "Výsledek ▸"}
        </button>
      )}
    </div>
  );
}
