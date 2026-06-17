import { useEffect, useRef, useState } from "react";
import type { AnimalDef, FeedGroup } from "./game/types";
import { useGame } from "./ui/store";
import { WorldCanvas, type InteractTarget, type WorldEvent } from "./ui/world/WorldCanvas";
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
import { PERSON_BY_ID } from "./game/content/people";
import { NpcPanel } from "./ui/world/NpcPanel";
import { HerbQuiz } from "./ui/minigames/HerbQuiz";
import { ChopWood } from "./ui/minigames/ChopWood";
import { AnimalMemory } from "./ui/minigames/AnimalMemory";
import { ForestGate } from "./ui/minigames/ForestGate";
import { openGate } from "./world/entities";
import { invalidateGround } from "./world/draw";
import { sound } from "./audio/sound";

type Overlay = "shop" | "craft" | "denik" | null;
type Minigame = "herb" | "chop" | "memory";

type RewardPayload = { money?: number; energy?: number; items?: { item: string; qty: number }[] };

const MG_FOR_NPC: Record<string, Minigame> = { maruska: "herb", tomas: "chop", tony: "memory" };
const MG_TITLE: Record<Minigame, string> = { herb: "🌿 Poznej bylinku", chop: "🪓 Naseč dřevo", memory: "🐾 Pexeso zvířat" };
const MG_REWARD: Record<Minigame, { flag: string; first: RewardPayload; again: RewardPayload; speaker: string; msg: string }> = {
  herb: { flag: "taught_maruska", first: { items: [{ item: "byliny", qty: 5 }] }, again: { items: [{ item: "byliny", qty: 1 }] }, speaker: "Maruška", msg: "Bylinkář se z tebe stává! Tahle hrst se hodí na mast." },
  chop: { flag: "taught_tomas", first: { items: [{ item: "drevo", qty: 8 }] }, again: { items: [{ item: "drevo", qty: 2 }] }, speaker: "Tomáš", msg: "Máš v sobě sílu! Dřevo na zimu se vždycky hodí." },
  memory: { flag: "taught_tony", first: { money: 120 }, again: { money: 20 }, speaker: "Tony", msg: "Paměť jako slon! Pár korun do kasy, zasloužíš si." },
};
const WELCOME = [
  "Tomáš: Vítej na Louce! My tři — já, Maruška a Tony — postáváme kousek od cedule.",
  "Maruška: Zastav se u nás. Naučíme tě poznávat byliny, sekat dřevo i bystřit paměť.",
  "Tony: A za každou minihru kápne odměna. Tak hurá do toho — sto zvířat se samo nenakrmí!",
];

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
    sound.setMood(state.phase);
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
  const [npc, setNpc] = useState<string | null>(null);
  const [minigame, setMinigame] = useState<Minigame | null>(null);
  const [puzzle, setPuzzle] = useState(false);
  const welcomeOnce = useRef(false);
  useGameSounds();

  useEffect(() => {
    if (state.started) {
      sound.ensure();
      sound.startAmbient(state.season);
      sound.startMusic();
      if (!state.flags.welcomed && !welcomeOnce.current) {
        welcomeOnce.current = true;
        dispatch({ type: "PUSH_DIALOG", speaker: "Louka", lines: WELCOME });
        dispatch({ type: "SET_FLAG", key: "welcomed" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.started]);

  if (!state.started) return <Intro />;

  const paused = !!state.dialog || overlay !== null || !!sel || !!npc || !!minigame || puzzle || !!state.gameOver;

  const winMinigame = (mg: Minigame) => {
    const r = MG_REWARD[mg];
    const taught = !!state.flags[r.flag];
    dispatch({ type: "REWARD", ...(taught ? r.again : r.first), flag: r.flag });
    dispatch({ type: "PUSH_DIALOG", speaker: r.speaker, lines: [r.msg] });
    sound.questDone();
    setMinigame(null);
  };

  const solveGate = () => {
    openGate();
    invalidateGround();
    dispatch({ type: "SET_FLAG", key: "gate_open" });
    dispatch({ type: "PUSH_DIALOG", speaker: "Louka", lines: ["Brána se rozevřela — k hájku teď vede volná cesta. 🌲"] });
    sound.build();
    setPuzzle(false);
  };

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

  const onWorldEvent = (e: WorldEvent) => {
    const name = ANIMAL_BY_ID[e.animalId]?.name ?? "Zvíře";
    if (e.type === "escape") {
      sound.error();
      dispatch({ type: "PUSH_DIALOG", speaker: "Pozor!", lines: [`${name} se prodral(a) plotem a pádí k zahrádce! Dožeň ho a zmáčkni akci, ať ho zaženeš zpátky.`] });
    } else if (e.type === "raid") {
      dispatch({ type: "REWARD", money: -15, items: [{ item: "zelenina", qty: -2 }, { item: "brambory", qty: -1 }] });
      dispatch({ type: "PUSH_DIALOG", speaker: name, lines: [`Mňam mňam! ${name} se cpe v zahrádce — ubyla zelenina i pár korun. Honem ho zažeň zpátky!`] });
    } else {
      sound.success();
      dispatch({ type: "PUSH_DIALOG", speaker: name, lines: [`Uf! ${name} je zpátky ve výběhu. Plot zase drží. 🐑`] });
    }
  };

  const onInteract = (t: InteractTarget) => {
    if (t.kind === "npc") {
      sound.select();
      setNpc(t.npcId);
      return;
    }
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
      case "zahrada":
        dispatch({ type: "PUSH_DIALOG", speaker: "Zahrádka", lines: ["Permakulturní záhonky — zelí, mrkev, brambory. Ale pozor: uprchlíci z výběhů si tu rádi pochutnají!"] });
        break;
      case "brana":
        if (state.flags.gate_open)
          dispatch({ type: "PUSH_DIALOG", speaker: "Lesní brána", lines: ["Brána je dokořán. Cesta k hájku je volná."] });
        else { sound.select(); setPuzzle(true); }
        break;
      case "truhla":
        if (!state.flags.gate_open)
          dispatch({ type: "PUSH_DIALOG", speaker: "Truhla", lines: ["K truhle se nedostaneš — cestu hlídá zavřená lesní brána."] });
        else if (!state.flags.chest) {
          dispatch({ type: "REWARD", money: 80, items: [{ item: "tuk", qty: 2 }, { item: "sklenice", qty: 2 }, { item: "obili", qty: 4 }, { item: "seno", qty: 1 }], flag: "chest" });
          dispatch({ type: "PUSH_DIALOG", speaker: "Truhla", lines: ["Uvnitř je poctivá zásoba: sádlo, skleničky, obilí a balík sena — a pár korun navrch! 🎁"] });
          sound.coin();
        } else dispatch({ type: "PUSH_DIALOG", speaker: "Truhla", lines: ["Prázdná. Tu už jsi vybral."] });
        break;
    }
  };

  return (
    <div className="game-world">
      <WorldCanvas season={state.season} phase={state.phase} paused={paused} onInteract={onInteract} onEvent={onWorldEvent} />
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

      {npc && (
        <Overlay title={PERSON_BY_ID[npc].name} onClose={() => setNpc(null)}>
          <NpcPanel
            person={PERSON_BY_ID[npc]}
            taught={!!state.flags[MG_REWARD[MG_FOR_NPC[npc]].flag]}
            onPlay={() => { setMinigame(MG_FOR_NPC[npc]); setNpc(null); }}
            onClose={() => setNpc(null)}
          />
        </Overlay>
      )}
      {minigame && (
        <Overlay title={MG_TITLE[minigame]} onClose={() => setMinigame(null)}>
          {minigame === "herb" && <HerbQuiz onWin={() => winMinigame("herb")} onClose={() => setMinigame(null)} />}
          {minigame === "chop" && <ChopWood onWin={() => winMinigame("chop")} onClose={() => setMinigame(null)} />}
          {minigame === "memory" && <AnimalMemory onWin={() => winMinigame("memory")} onClose={() => setMinigame(null)} />}
        </Overlay>
      )}
      {puzzle && (
        <Overlay title="🚪 Lesní brána" onClose={() => setPuzzle(false)}>
          <ForestGate onWin={solveGate} onClose={() => setPuzzle(false)} />
        </Overlay>
      )}

      {sel && <AnimalCard animal={sel} onClose={() => setSel(null)} />}
      <FlashToast />
      <GameOver />
    </div>
  );
}
