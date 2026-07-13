import { useEffect, useRef, useState } from "react";
import type { AnimalDef, FeedGroup } from "./game/types";
import { useGame } from "./ui/store";
import { WorldCanvas, type InteractTarget, type WorldEvent } from "./ui/world/WorldCanvas";
import { Hud } from "./ui/world/Hud";
import { DialogBox } from "./ui/world/DialogBox";
import { Controls } from "./ui/world/Controls";
import { DevPanel } from "./ui/world/DevPanel";
import { Shop } from "./ui/components/Shop";
import { Craft } from "./ui/components/Craft";
import { Journal } from "./ui/components/Journal";
import { DlcStore } from "./ui/components/DlcStore";
import { AnimalCard } from "./ui/components/AnimalCard";
import { FlashToast } from "./ui/components/FlashToast";
import { Intro } from "./ui/components/Intro";
import { GameOver } from "./ui/components/GameOver";
import { ANIMAL_BY_ID } from "./game/content/animals";
import { PERSON_BY_ID } from "./game/content/people";
import { reactionFor } from "./game/content/npcReactions";
import { NpcPanel } from "./ui/world/NpcPanel";
import { HerbQuiz } from "./ui/minigames/HerbQuiz";
import { ChopWood } from "./ui/minigames/ChopWood";
import { TechFix } from "./ui/minigames/TechFix";
import { ForestGate } from "./ui/minigames/ForestGate";
import { CleanUp } from "./ui/minigames/CleanUp";
import { PlayBar } from "./ui/minigames/PlayBar";
import { BuildIt } from "./ui/minigames/BuildIt";
import { openGate, type Interactable } from "./world/entities";
import { currentStep, settledGroups, tutorialActive, tutorialTargets } from "./game/content/tutorial";
import { invalidateGround } from "./world/draw";
import { sound } from "./audio/sound";
import type { NpcId } from "./audio/sound";

type Overlay = "shop" | "craft" | "denik" | "dlc" | null;
type Minigame = "herb" | "chop" | "tech";

type RewardPayload = { money?: number; energy?: number; items?: { item: string; qty: number }[] };

const MG_FOR_NPC: Record<string, Minigame> = { maruska: "herb", tomas: "chop", tony: "tech" };
const MG_TITLE: Record<Minigame, string> = { herb: "🌿 Poznej bylinku", chop: "🪓 Naseč dřevo", tech: "🔌 Zapoj vynález" };
const MG_REWARD: Record<Minigame, { flag: string; first: RewardPayload; again: RewardPayload; speaker: string; msg: string }> = {
  herb: { flag: "taught_maruska", first: { items: [{ item: "byliny", qty: 5 }] }, again: { items: [{ item: "byliny", qty: 1 }] }, speaker: "Maruška", msg: "Bylinkář se z tebe stává! Tahle hrst se hodí na mast." },
  chop: { flag: "taught_tomas", first: { items: [{ item: "drevo", qty: 8 }] }, again: { items: [{ item: "drevo", qty: 2 }] }, speaker: "Tomáš", msg: "Máš v sobě sílu! Dřevo na zimu se vždycky hodí." },
  tech: { flag: "taught_tony", first: { money: 120 }, again: { money: 20 }, speaker: "Tony", msg: "Zapojeno! Pár korun na další vychytávky — zasloužíš si." },
};
const CEDULE_HELP = [
  "Vítej na Louce! 🌿 Chodíš šipkami / WASD (na mobilu křížem vlevo dole).",
  "Dojdi ke zvířeti nebo stavení a zmáčkni MEZERNÍK (nebo tlačítko A) — uděláš, co je třeba.",
  "Ráno vypusť a nakrm, přes den vyráběj a sbírej byliny, večer zvířata zavři na klidnou noc a jdi spát.",
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
    energy: state.energy,
    foxTrust: state.fox.trust,
    foxStage: state.fox.stage as string,
    foxAlertDay: 0,
    foxPet: false,
  });
  useEffect(() => {
    const p = prev.current;
    if (state.day > p.day) sound.newDay();
    if (state.questCompleted.length > p.quests) sound.questDone();
    else if (state.money > p.money) sound.coin();
    // sezónní přechod = stinger + crossfade témat (hudba nezmlkne)
    if (state.season !== p.season) sound.seasonChange(state.season);
    // hudební kontext: fáze dne, den v sezóně (blížící se zima tmavne), počasí (vítr)
    sound.updateMusicContext({
      season: state.season,
      phase: state.phase,
      dayInSeason: state.dayInSeason,
      weather: state.weather,
    });
    // docházejí síly → tichý varovný motiv (uvnitř 30s cooldown)
    if (state.energy < 15 && p.energy >= 15) sound.lowEnergy();
    // liščí důvěra roste → hřejivý motiv; mazlení → ukolébavka
    if (state.fox.trust > p.foxTrust)
      sound.foxTrustMotif(state.fox.trust >= 90 ? 3 : state.fox.trust >= 60 ? 2 : 1);
    if (state.fox.stage === "kamarad" && p.foxStage !== "kamarad") sound.foxTrustMotif(3);
    if (!!state.tasksDone.fox_pet && !p.foxPet) sound.foxLullaby();
    // večer s otevřenými výběhy: liška obchází — jemné napětí (1× za den)
    if (state.phase === "vecer" && !state.tasksDone.closed && p.foxAlertDay !== state.day && !state.dialog) {
      p.foxAlertDay = state.day;
      sound.foxAlert();
    }
    if (state.flash && state.flash.id !== p.flashId && (state.flash.tone === "bad" || state.flash.tone === "warn"))
      sound.error();
    prev.current = {
      day: state.day,
      money: state.money,
      quests: state.questCompleted.length,
      flashId: state.flash ? state.flash.id : p.flashId,
      season: state.season,
      energy: state.energy,
      foxTrust: state.fox.trust,
      foxStage: state.fox.stage,
      foxAlertDay: p.foxAlertDay,
      foxPet: !!state.tasksDone.fox_pet,
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
  const [clean, setClean] = useState<FeedGroup | null>(null);
  const [play, setPlay] = useState<AnimalDef | null>(null);
  const [build, setBuild] = useState<Interactable | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  useGameSounds();

  // Skryté odemčení dev módu: napsat na klávesnici „louka".
  const devSeq = useRef("");
  const unlockDev = () => {
    if (!state.dev.enabled) dispatch({ type: "DEV_UNLOCK" });
    setDevOpen(true);
  };
  useEffect(() => {
    if (!state.started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      devSeq.current = (devSeq.current + e.key.toLowerCase()).slice(-5);
      if (devSeq.current === "louka") {
        devSeq.current = "";
        unlockDev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.started, state.dev.enabled]);

  useEffect(() => {
    if (state.started) {
      sound.ensure();
      sound.startAmbient(state.season);
      sound.startMusic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.started]);

  if (!state.started)
    return (
      <>
        <Intro onDlc={() => setOverlay("dlc")} />
        {overlay === "dlc" && (
          <Overlay title="🌾 Rozšíření" onClose={() => setOverlay(null)}>
            <DlcStore />
          </Overlay>
        )}
      </>
    );

  const paused = !!state.dialog || overlay !== null || !!sel || !!npc || !!minigame || puzzle || !!clean || !!play || !!build || !!state.gameOver;

  const openClean = (group: FeedGroup) => {
    if (state.energy < 6) { dispatch({ type: "PUSH_DIALOG", speaker: "Tip", lines: ["Na úklid teď nemáš sílu. Nejdřív se najez a napij."] }); return; }
    sound.select();
    setClean(group);
  };
  const winClean = () => {
    if (clean) dispatch({ type: "CLEAN", group: clean });
    setClean(null);
  };

  const openPlay = (a: AnimalDef) => {
    if (state.energy < 4) { dispatch({ type: "PUSH_DIALOG", speaker: "Tip", lines: ["Na hraní teď nemáš sílu. Nejdřív se najez a napij."] }); return; }
    setSel(null);
    setPlay(a);
  };
  const winPlay = () => {
    if (play) dispatch({ type: "PLAY", animalId: play.id });
    setPlay(null);
  };

  const winBuild = () => {
    if (build) dispatch({ type: "BUILD_STRUCTURE", id: build.id });
    setBuild(null);
  };

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
    if (state.phase === "rano") {
      if (!state.tasksDone[`feed_${group}`]) dispatch({ type: "FEED", group });
      else if (!state.tasksDone[`clean_${group}`]) openClean(group);
      else dispatch({ type: "PUSH_DIALOG", speaker: "Tip", lines: ["Nakrmeno i uklizeno. Přes den se hodí dřevo a byliny."] });
    } else if (state.phase === "vecer") {
      dispatch({ type: "EVENING_FEED" });
    } else if (!state.tasksDone[`clean_${group}`]) {
      openClean(group); // poledne — čas vyhrabat podestýlku
    } else {
      dispatch({ type: "PUSH_DIALOG", speaker: "Tip", lines: ["Tady je čisto. Přes den se hodí dřevo a byliny."] });
    }
  };

  const handleKurnik = () => {
    if (state.phase === "rano" && !state.birdsReleased) dispatch({ type: "RELEASE_BIRDS" });
    else if (state.phase === "rano" && !state.tasksDone.feed_drubez) dispatch({ type: "FEED", group: "drubez" });
    else if (state.birdsReleased && !state.tasksDone.eggs) dispatch({ type: "COLLECT_EGGS" });
    else if (state.phase === "vecer") dispatch({ type: "EVENING_FEED" });
    else if (!state.tasksDone.clean_drubez) openClean("drubez");
    else dispatch({ type: "PUSH_DIALOG", speaker: "Kurník", lines: ["Drůbež spokojeně hrabe a je čisto. Hotovo. 🐔"] });
  };

  const onWorldEvent = (e: WorldEvent) => {
    if (e.type === "wildSpooked") {
      if (e.which === "liska") dispatch({ type: "FOX_SEEN", spooked: true });
      return;
    }
    if (e.type === "wildSeen") {
      dispatch({ type: "WILD_SEEN", which: e.which as "kane" | "jezek" | "srnka" });
      return;
    }
    const name = ANIMAL_BY_ID[e.animalId]?.name ?? "Zvíře";
    if (e.type === "escape") {
      sound.animalEscape(ANIMAL_BY_ID[e.animalId]?.feedGroup ?? "stado");
      const lines = [`${name} se prodral(a) plotem a pádí k zahrádce!`];
      if (e.npcId) {
        const npcName = PERSON_BY_ID[e.npcId]?.name ?? "Kolega";
        lines.push(`${npcName}: ${e.line}`);
      }
      if (!e.helped) lines.push("Tak honem — dožeň ho a zmáčkni akci, ať ho zaženeš zpátky! 🏃");
      dispatch({ type: "PUSH_DIALOG", speaker: "Pozor!", lines });
    } else if (e.type === "raid") {
      // zvíře se dorvalo do zahrádky — hudba přejde do plného poplachu
      sound.setTension(2);
      dispatch({ type: "REWARD", money: -15, items: [{ item: "zelenina", qty: -2 }, { item: "brambory", qty: -1 }] });
      dispatch({ type: "PUSH_DIALOG", speaker: name, lines: [`Mňam mňam! ${name} se cpe v zahrádce — ubyla zelenina i pár korun. Honem ho zažeň zpátky!`] });
    } else {
      // chycen: při plném poplachu zahraje úlevová fanfára, jinak jen „mám tě"
      if (sound.getTension() >= 2) sound.dangerRelief();
      else sound.animalCaught();
      dispatch({ type: "PUSH_DIALOG", speaker: name, lines: [`Uf! ${name} je zpátky ve výběhu. Plot zase drží. 🐑`] });
    }
  };

  const onInteract = (t: InteractTarget) => {
    if (t.kind === "npc") {
      sound.npcSpeak(t.npcId as NpcId, "neutral");
      setNpc(t.npcId);
      return;
    }
    if (t.kind === "wild") {
      if (t.id === "liska") {
        sound.foxAlert();
        if (state.fox.stage === "kamarad") dispatch({ type: "FOX_PET" });
        else dispatch({ type: "FOX_SEEN", spooked: false });
      } else {
        dispatch({ type: "WILD_SEEN", which: t.id as "kane" | "jezek" | "srnka" });
      }
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
    // Tutoriál: svítící „plán" aktuálního kroku → spustit stavební minihru.
    if (tutorialActive(state)) {
      const step = currentStep(state);
      if (step && it.id === step.buildingId && !state.built.includes(it.id)) {
        sound.select();
        setBuild(it);
        return;
      }
    }
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
      case "stopy": dispatch({ type: "FOX_TRACKS" }); break;
      case "krmne_misto": dispatch({ type: "FOX_BOWL" }); break;
      case "listi":
        if (!state.flags.jezek_domek) dispatch({ type: "LEAF_PILE" });
        else dispatch({ type: "PUSH_DIALOG", speaker: "Ježčí vila", lines: ["Uvnitř někdo spokojeně funí. Nerušit — nájemník spí. 🦔"] });
        break;
      case "seniste": dispatch({ type: "HAY_WORK" }); break;
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

  // Viditelnost příběhových objektů (liščí stopy/miska, ježčí listí).
  const foxStage = state.fox.stage;
  const hiddenIds = [
    ...(foxStage === "les" || foxStage === "krmeni" || foxStage === "duvera" || foxStage === "kamarad" ? ["fox_stopy"] : []),
    ...(foxStage === "les" || foxStage === "stopy" || foxStage === "pozorovani" ? ["fox_misto"] : []),
    ...(!state.flags.jezek_intro ? ["jezek_listi"] : []),
    ...(!state.dlcOwned.includes("senne") ? ["seniste"] : []),
  ];
  const wildActive = {
    kaneCircle: !!state.tasksDone.kane_circle,
    kanePerch: !!state.tasksDone.kane_perch,
    jezekOut: !!state.flags.jezek_domek && state.season === "podzim" && state.phase === "vecer",
    srnkaOut: state.phase === "rano" && !tutorialActive(state) && state.day >= 4,
  };

  return (
    <div className="game-world">
      {/* měkké rozednění po startu hry (místo tvrdého střihu z intra) */}
      <div className="game-fade-in" aria-hidden />
      <WorldCanvas season={state.season} phase={state.phase} paused={paused} welfare={state.welfare} weather={state.weather} money={state.money} built={state.built} tutorialTargets={tutorialTargets(state)} settledGroups={settledGroups(state.built)} tutorial={tutorialActive(state)} turbo={state.dev.turbo} foxStage={foxStage} wildActive={wildActive} hiddenIds={hiddenIds} appearance={state.profile.appearance} placements={state.placements} editMode={editMode} onMoveStructure={(id, tx, ty) => { sound.build(); dispatch({ type: "MOVE_STRUCTURE", id, tx, ty }); }} onEditReject={() => dispatch({ type: "PUSH_DIALOG", speaker: "Zabydlování", lines: ["Sem se to nevejde — je tam les, voda nebo jiná stavba."] })} onInteract={onInteract} onEvent={onWorldEvent} />
      <Hud onOpen={(p) => setOverlay(p)} onDevUnlock={unlockDev} editMode={editMode} onToggleEdit={() => setEditMode((v) => !v)} />
      <Controls />
      {editMode && (
        <button className="edit-done-fab" onClick={() => setEditMode(false)}>✓ Hotovo</button>
      )}
      <DialogBox />

      {overlay === "shop" && <Overlay title="🏪 Stánek" onClose={() => setOverlay(null)}><Shop /></Overlay>}
      {overlay === "craft" && <Overlay title="🛠️ Výroba" onClose={() => setOverlay(null)}><Craft /></Overlay>}
      {overlay === "denik" && (
        <Overlay title="📖 Deník" onClose={() => setOverlay(null)}>
          <Journal onSelect={(a) => setSel(a)} />
        </Overlay>
      )}
      {overlay === "dlc" && (
        <Overlay title="🌾 Rozšíření" onClose={() => setOverlay(null)}>
          <DlcStore />
        </Overlay>
      )}

      {npc && (
        <Overlay title={PERSON_BY_ID[npc].name} onClose={() => setNpc(null)}>
          <NpcPanel
            person={PERSON_BY_ID[npc]}
            taught={!!state.flags[MG_REWARD[MG_FOR_NPC[npc]].flag]}
            mood={reactionFor(npc, { welfare: state.welfare, weather: state.weather, season: state.season, phase: state.phase, money: state.money })?.comment}
            onPlay={() => { setMinigame(MG_FOR_NPC[npc]); setNpc(null); }}
            onClose={() => setNpc(null)}
          />
        </Overlay>
      )}
      {minigame && (
        <Overlay title={MG_TITLE[minigame]} onClose={() => setMinigame(null)}>
          {minigame === "herb" && <HerbQuiz onWin={() => winMinigame("herb")} onClose={() => setMinigame(null)} />}
          {minigame === "chop" && <ChopWood onWin={() => winMinigame("chop")} onClose={() => setMinigame(null)} />}
          {minigame === "tech" && <TechFix onWin={() => winMinigame("tech")} onClose={() => setMinigame(null)} />}
        </Overlay>
      )}
      {puzzle && (
        <Overlay title="🚪 Lesní brána" onClose={() => setPuzzle(false)}>
          <ForestGate onWin={solveGate} onClose={() => setPuzzle(false)} />
        </Overlay>
      )}
      {clean && (
        <Overlay title="🧹 Úklid u zvířat" onClose={() => setClean(null)}>
          <CleanUp group={clean} onWin={winClean} onClose={() => setClean(null)} />
        </Overlay>
      )}

      {build && (
        <Overlay title="🔨 Stavba" onClose={() => setBuild(null)}>
          <BuildIt label={build.label} onWin={winBuild} onClose={() => setBuild(null)} />
        </Overlay>
      )}

      {play && <PlayBar animal={play} onDone={winPlay} onClose={() => setPlay(null)} />}
      {sel && <AnimalCard animal={sel} onClose={() => setSel(null)} onPlay={() => sel && openPlay(sel)} />}
      <FlashToast />
      <GameOver />

      {state.dev.enabled && !devOpen && (
        <button className="dev-fab" title="Developerský mód" onClick={() => setDevOpen(true)}>
          🛠️
        </button>
      )}
      {devOpen && <DevPanel onClose={() => setDevOpen(false)} />}
    </div>
  );
}
