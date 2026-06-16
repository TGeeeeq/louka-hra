import { useState } from "react";
import type { AnimalDef } from "./game/types";
import { useGame } from "./ui/store";
import { TopBar } from "./ui/components/TopBar";
import { MeadowMap } from "./ui/components/MeadowMap";
import { TaskPanel } from "./ui/components/TaskPanel";
import { Shop } from "./ui/components/Shop";
import { Craft } from "./ui/components/Craft";
import { Journal } from "./ui/components/Journal";
import { AnimalCard } from "./ui/components/AnimalCard";
import { FlashToast } from "./ui/components/FlashToast";
import { Intro } from "./ui/components/Intro";
import { GameOver } from "./ui/components/GameOver";

type Tab = "prace" | "obchod" | "vyroba" | "denik";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "prace", icon: "🧺", label: "Práce" },
  { id: "obchod", icon: "🛒", label: "Obchod" },
  { id: "vyroba", icon: "🧪", label: "Výroba" },
  { id: "denik", icon: "📖", label: "Deník" },
];

function Log() {
  const { state } = useGame();
  return (
    <div className="log">
      {state.log.slice(0, 7).map((e) => (
        <p key={e.id} className={`log-line ${e.tone}`}>
          <span className="log-day">D{e.day}</span> {e.text}
        </p>
      ))}
    </div>
  );
}

export default function App() {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>("prace");
  const [sel, setSel] = useState<AnimalDef | null>(null);

  if (!state.started) return <Intro />;

  return (
    <div className="app">
      <TopBar />
      <div className="layout">
        <main className="stage">
          <MeadowMap onSelect={setSel} />
        </main>
        <aside className="side">
          <nav className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
                <span aria-hidden>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="panel-body">
            {tab === "prace" && <TaskPanel />}
            {tab === "obchod" && <Shop />}
            {tab === "vyroba" && <Craft />}
            {tab === "denik" && <Journal onSelect={setSel} />}
          </div>
          <Log />
        </aside>
      </div>

      <FlashToast />
      {sel && <AnimalCard animal={sel} onClose={() => setSel(null)} />}
      <GameOver />
    </div>
  );
}
