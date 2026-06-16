import { useEffect, useRef, useState } from "react";
import type { AnimalDef, FeedGroup } from "./game/types";
import { useGame } from "./ui/store";
import { WorldCanvas, type InteractTarget } from "./ui/world/WorldCanvas";
import { Hud } from "./ui/world/Hud";
import { DialogBox } from "./ui/world/DialogBox";
import { Controls } from "./ui/world/Controls";
import { Shop } from "./ui/components/Shop";
import { Craft } from "./ui/components/Craft";
import { Journal } from "./ui/components/Journal";
import { AnimalCard } from "./ui/components/AnimalCard";
import { FlashToast } from "./ui/components/FlashToast";
import { Intro } from "./ui/components/Intro";
import { GameOver } from "./ui/components/GameOver";
import { ANIMAL_BY_ID } from "./game/content/animals";
import { sound } from "./audio/sound";

type Overlay = "shop" | "craft" | "denik" | null;

const CEDULE_HELP = [
  "Vítej na Louce! 🌿 Chodíš šipkami / WASD (na mobilu křížem vlevo dole).",
  "Dojdi ke zvířeti nebo stavení a zmáčkni MEZERNÍK (nebo tlačítko A) — uděláš, co je třeba.",
  "Ráno vypusť a nakrm, přes den vyráběj a sbírej byliny, večer zavři před liškou a jdi spát.",
  "Sleduj úkoly nahoře. A ber to s klidem — zvířata na tebe počkají. (Většinou.)",
];

function useGameSounds() {
  const { state } = useGame();
  const prev = useRef({
    day: state.day,
    money: state.money,
    quests: state.questCompleted.length,
    flashId: 0,
    season: state.season as string,
  });
  useEffect(() => {
    const p = prev.current;
    if (state.day > p.day) sound.newDay();
    if (state.questCompleted.length > p.quests) sound.questDone();
    else if (state.money > p.money) sound.coin();
    if (state.season !== p.season) sound.setSeason(state.season);
    if (state.flash && state.flash.id !== p.flashId && (state.flash.tone === "bad" || state.flash.tone === "warn"))
      sound.error();
    prev.current = {
      day: state.day,
      money: state.money,
      quests: state.questCompleted.length,
      flashId: state.flash ? state.flash.id : p.flashId,
      season: state.season,
    };
  }, [state]);
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="overlay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Zavřít">×</button>
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const { state, dispatch } = useGame();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [sel, setSel] = useState<AnimalDef | null>(null);
  useGameSounds();

  useEffect(() => {
    if (state.started) {
      sound.ensure();
      sound.startAmbient(state.season);
      sound.startMusic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.started]);

  if (!state.started) return <Intro />;

  const paused = !!state.dialog || overlay !== null || !!sel || !!state.gameOver;

  const feedStation = (group: FeedGroup) => {
    if (state.phase === "rano") dispatch({ type: "FEED", group });
    else if (state.phase === "vecer") dispatch({ type: "EVENING_FEED" });
    else dispatch({ type: "PUSH_DIALOG", speaker: "Tip", lines: ["Hlavní krmení je ráno, večer dokrmíš. Přes den raď spíš úklid, dřevo a byliny."] });
  };

  const handleKurnik = () => {
    if (state.phase === "rano" && !state.birdsReleased) dispatch({ type: "RELEASE_BIRDS" });
    else if (state.phase === "rano" && !state.tasksDone.feed_drubez) dispatch({ type: "FEED", group: "drubez" });
    else if (state.birdsReleased && !state.tasksDone.eggs) dispatch({ type: "COLLECT_EGGS" });
    else if (state.phase === "vecer") dispatch({ type: "EVENING_FEED" });
    else dispatch({ type: "PUSH_DIALOG", speaker: "Kurník", lines: ["Drůbež spokojeně hrabe. Hotovo. 🐔"] });
  };

  const onInteract = (t: InteractTarget) => {
    if (t.kind === "animal") {
      const a = ANIMAL_BY_ID[t.animalId];
      if (!a) return;
      sound.animal(a.feedGroup);
      if (a.id === "flicek") dispatch({ type: "SET_FLAG", key: "pet_flicek" });
      if (a.special === "missing") {
        dispatch({
          type: "PUSH_DIALOG",
          speaker: a.name,
          lines: ["…ticho. Štěně List se na Louce pořád pohřešuje.", "Necháváš mu u plotu misku. Třeba se jednou vrátí. 🐾"],
        });
      } else {
        setSel(a);
      }
      return;
    }
    const it = t.it;
    switch (it.kind) {
      case "kurnik": handleKurnik(); break;
      case "chlivek": feedStation("prasata"); break;
      case "pastvina": feedStation("stado"); break;
      case "buda": feedStation("mazlici"); break;
      case "studna": dispatch({ type: "WATER" }); break;
      case "ohniste":
        if (!state.fireLit) dispatch({ type: "LIGHT_FIRE" });
        else setOverlay("craft");
        break;
      case "dilna": setOverlay("craft"); break;
      case "stanek": setOverlay("shop"); break;
      case "chalupa":
        if (state.phase === "vecer") {
          if (!state.tasksDone.closed) dispatch({ type: "CLOSE_ANIMALS" });
          else { sound.sleepy(); dispatch({ type: "SLEEP" }); }
        } else {
          dispatch({ type: "PUSH_DIALOG", speaker: "Chalupa", lines: ["Domov sladký domov. Spát se chodí večer — teď čeká práce!"] });
        }
        break;
      case "cedule": dispatch({ type: "PUSH_DIALOG", speaker: "Cedule", lines: CEDULE_HELP }); break;
      case "byliny": dispatch({ type: "FORAGE" }); break;
    }
  };

  return (
    <div className="game-world">
      <WorldCanvas season={state.season} phase={state.phase} paused={paused} onInteract={onInteract} />
      <Hud onOpen={(p) => setOverlay(p)} />
      <Controls />
      <DialogBox />

      {overlay === "shop" && <Overlay title="🏪 Stánek" onClose={() => setOverlay(null)}><Shop /></Overlay>}
      {overlay === "craft" && <Overlay title="🛠️ Výroba" onClose={() => setOverlay(null)}><Craft /></Overlay>}
      {overlay === "denik" && (
        <Overlay title="📖 Deník" onClose={() => setOverlay(null)}>
          <Journal onSelect={(a) => setSel(a)} />
        </Overlay>
      )}

      {sel && <AnimalCard animal={sel} onClose={() => setSel(null)} />}
      <FlashToast />
      <GameOver />
    </div>
  );
}
