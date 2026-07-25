import { useEffect, useRef, useState } from "react";
import type { AnimalDef, FeedGroup } from "./game/types";
import { useGame, flushSave } from "./ui/store";
import { registerBackButton, registerLifecycle, exitApp } from "./native";
import { WorldCanvas, type InteractTarget, type PendingPlacement, type WorldEvent } from "./ui/world/WorldCanvas";
import { Hud } from "./ui/world/Hud";
import { DialogBox } from "./ui/world/DialogBox";
import { Controls } from "./ui/world/Controls";
import { DevPanel } from "./ui/world/DevPanel";
import { Shop } from "./ui/components/Shop";
import { Craft } from "./ui/components/Craft";
import { BuildPanel } from "./ui/world/BuildPanel";
import { Journal } from "./ui/components/Journal";
import { FullVersion } from "./ui/components/FullVersion";
import { AnimalCard } from "./ui/components/AnimalCard";
import { FlashToast } from "./ui/components/FlashToast";
import { Intro } from "./ui/components/Intro";
import { GameOver } from "./ui/components/GameOver";
import { ANIMAL_BY_ID } from "./game/content/animals";
import { PERSON_BY_ID } from "./game/content/people";
import { reactionFor } from "./game/content/npcReactions";
import { NPC_LIFE } from "./game/content/npcLife";
import { BUILDABLE_BY_ID } from "./game/content/buildables";
import { nudgeWithinMap, placementIssue } from "./game/build/preview";
import { NpcPanel } from "./ui/world/NpcPanel";
import { HerbQuiz } from "./ui/minigames/HerbQuiz";
import { ChopWood } from "./ui/minigames/ChopWood";
import { TechFix } from "./ui/minigames/TechFix";
import { ForestGate } from "./ui/minigames/ForestGate";
import { CleanUp } from "./ui/minigames/CleanUp";
import { PlayBar } from "./ui/minigames/PlayBar";
import { openGate } from "./world/entities";
import { currentStep, settledGroups, tutorialActive, tutorialTargets } from "./game/content/tutorial";
import { invalidateGround } from "./world/draw";
import { sound } from "./audio/sound";
import { Icon, type IconName } from "./ui/icons/Icon";
import type { NpcId } from "./audio/sound";

type Overlay = "shop" | "craft" | "denik" | "plna" | null;
type Minigame = "herb" | "chop" | "tech";

type RewardPayload = { money?: number; energy?: number; items?: { item: string; qty: number }[] };

const MG_FOR_NPC: Record<string, Minigame> = { maruska: "herb", tomas: "chop", tony: "tech" };

/**
 * Uvítací sestřih: pomalý přelet nad celou domovskou loukou (elipsa 18..78 x
 * 12..56), pak dojezd na Tomáše, který vysvětlí stavění.
 *
 * `ease` je rychlost dorovnání kamery — nízká hodnota dělá ten pomalý filmový
 * pohyb, `hold` je jak dlouho záběr trvá, než se přepne na další.
 */
type CineShot = { tx: number; ty: number; ease: number; hold: number };
// Záběry drží středy tak, aby byl ve výřezu (~35x22 dlaždic) hlavně trávník,
// ne okolní les — proto se nejde až na kraj elipsy.
const WELCOME_FLYOVER: CineShot[] = [
  { tx: 37, ty: 25, ease: 1.0, hold: 3000 }, // severozápad louky
  { tx: 59, ty: 26, ease: 0.7, hold: 3400 }, // přelet na východ
  { tx: 59, ty: 43, ease: 0.7, hold: 3200 }, // dolů k jihu
  { tx: 37, ty: 42, ease: 0.7, hold: 3200 }, // zpátky na západ
];
/** Dojezd na Tomáše — o něco rychlejší, ať se řeč nerozjede pozdě. */
const TOMAS_SHOT_EASE = 2.0;
const MG_TITLE: Record<Minigame, string> = { herb: "Poznej bylinku", chop: "Naseč dřevo", tech: "Zapoj vynález" };
const MG_ICON: Record<Minigame, IconName> = { herb: "leaf", chop: "axe", tech: "plug" };
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

function Overlay({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon?: IconName;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="overlay-modal paper" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <h2>
            {icon && <Icon name={icon} size={22} className="overlay-ico" />}
            {title}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Zavřít">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const { state, dispatch, demoGateHit } = useGame();
  const [overlay, setOverlay] = useState<Overlay>(null);
  // Byla obrazovka „Plná verze" otevřená demo bránou (a ne ručně z HUD/menu)?
  // Ovlivňuje jen nadpis ve FullVersion — samotná brána žije ve store.tsx.
  const [demoGateOpen, setDemoGateOpen] = useState(false);
  const [sel, setSel] = useState<AnimalDef | null>(null);
  const [npc, setNpc] = useState<string | null>(null);
  const [minigame, setMinigame] = useState<Minigame | null>(null);
  const [puzzle, setPuzzle] = useState(false);
  const [clean, setClean] = useState<FeedGroup | null>(null);
  const [play, setPlay] = useState<AnimalDef | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  // Stavební mód: katalogové defId právě vybrané v BuildPanelu (null = zatím
  // nic, klepnutím na louku se pak vybírá existující stavba k přesunu/zboření).
  const [buildSelection, setBuildSelection] = useState<string | null>(null);
  // D2: potvrzovací dialog „Opustit Louku?" (hardwarové tlačítko Zpět, když
  // nic jiného není otevřené a hra běží).
  const [exitConfirm, setExitConfirm] = useState(false);
  // Rozestavěná stavba (nová i přesouvaná) čekající na potvrzení „opravdu
  // sem?". Dokud tu něco je, WorldCanvas drží rozsvícený půdorys na tomhle
  // místě a hráč s ním může hýbat — šipkami po dlaždicích nebo ťuknutím
  // jinam do louky.
  const [pending, setPending] = useState<PendingPlacement | null>(null);
  // Task 4: uvítací kamerový sestřih — přelet nad loukou, pak záběr na Tomáše.
  // `talk: true` = poslední záběr, kdy už Tomáš mluví; kamera na něm drží,
  // dokud hráč jeho repliku nedočte (viz efekt „uvolnit kameru" níž).
  const [cinematic, setCinematic] = useState<
    { tx: number; ty: number; ease: number; talk: boolean } | null
  >(null);
  const welcomeStarted = useRef(false);
  // Naplánované přepnutí záběrů — při přeskočení je NUTNÉ je zrušit, jinak by
  // pozdější timer kameru znovu zabral po tom, co ji hráč už uvolnil.
  const cineTimers = useRef<number[]>([]);
  const clearCineTimers = () => {
    for (const t of cineTimers.current) window.clearTimeout(t);
    cineTimers.current = [];
  };
  const skipCinematic = () => {
    clearCineTimers();
    setCinematic(null);
  };
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

  // Demo brána (C3): store.tsx zablokoval SLEEP a signalizuje to přes
  // demoGateHit (transientní čítač mimo GameState). Otevři Plnou verzi.
  useEffect(() => {
    if (demoGateHit > 0) {
      setDemoGateOpen(true);
      setOverlay("plna");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoGateHit]);

  // Task 4: uvítací sestřih — jen jednou, při prvním vstupu na prázdnou louku
  // (tutorialStep 0, flag ještě nenastavený). Tomášova replika je ve frontě už
  // od akce START, ale DialogBox ji přes přelet schová (`hidden`) a zobrazí ji
  // teprve v posledním záběru, kdy na Tomáše dojede kamera.
  useEffect(() => {
    if (!state.started || welcomeStarted.current) return;
    if (state.tutorialStep !== 0 || state.flags.welcome_seen) return;
    welcomeStarted.current = true;
    dispatch({ type: "SET_FLAG", key: "welcome_seen" });

    setCinematic({ ...WELCOME_FLYOVER[0], talk: false });
    let at = 0;
    for (let i = 1; i < WELCOME_FLYOVER.length; i++) {
      at += WELCOME_FLYOVER[i - 1].hold;
      const shot = WELCOME_FLYOVER[i];
      cineTimers.current.push(
        window.setTimeout(() => setCinematic({ ...shot, talk: false }), at),
      );
    }
    // Poslední záběr: Tomáš na svém stanovišti pro aktuální fázi dne.
    at += WELCOME_FLYOVER[WELCOME_FLYOVER.length - 1].hold;
    const tomas = NPC_LIFE.tomas.schedule[state.phase];
    cineTimers.current.push(
      window.setTimeout(
        () => setCinematic({ tx: tomas.tx, ty: tomas.ty, ease: TOMAS_SHOT_EASE, talk: true }),
        at,
      ),
    );
    // POZOR: tady schválně NENÍ `return clearCineTimers`. Efekt si sám nastaví
    // flag `welcome_seen`, čímž změní vlastní závislosti — cleanup by se spustil
    // hned a zrušil všechny naplánované záběry (kamera by zamrzla na prvním).
    // Timery se proto uklízí až při odmountování, v efektu níž.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.started, state.tutorialStep, state.flags.welcome_seen]);

  useEffect(() => clearCineTimers, []);

  // Uvolnit kameru, až Tomáš domluví (hráč dočetl celou repliku).
  useEffect(() => {
    if (cinematic?.talk && !state.dialog) setCinematic(null);
  }, [cinematic?.talk, state.dialog]);

  // --- Rozestavěná stavba: posun po dlaždicích + potvrzení ------------------
  // Půdorys se dá doladit šipkami (i WASD) nebo tlačítky v potvrzovací liště,
  // Enter/„✓" ho postaví, Esc/„✕" zruší. Chůze hráče je po tu dobu vypnutá
  // (viz WorldCanvas → arrowsOwnedByPlacement).
  const pendingRef = useRef<PendingPlacement | null>(null);
  pendingRef.current = pending;
  const pendingIssue = pending
    ? placementIssue(state.structures, pending.defId, pending.tx, pending.ty, pending.uid)
    : null;
  const pendingValid = !!pending && !pendingIssue;

  const nudgePending = (dx: number, dy: number) =>
    setPending((p) => (p ? { ...p, ...nudgeWithinMap(p.defId, p.tx, p.ty, dx, dy) } : p));

  const commitPending = () => {
    const p = pendingRef.current;
    if (!p) return;
    if (placementIssue(state.structures, p.defId, p.tx, p.ty, p.uid)) {
      sound.error();
      return;
    }
    sound.build();
    if (p.kind === "new") {
      dispatch({ type: "PLACE_STRUCTURE", defId: p.defId, tx: p.tx, ty: p.ty });
      // Unikátní stavbu už podruhé neumístíš — výběr v panelu zhasni, ať
      // panel nezůstane „zamčený" na hotové stavbě. U plotů a cedulí ho
      // naopak nech, aby šlo klidně postavit celou řadu za sebou.
      if (BUILDABLE_BY_ID[p.defId]?.unique) setBuildSelection(null);
    } else if (p.uid) {
      dispatch({ type: "MOVE_STRUCTURE", uid: p.uid, tx: p.tx, ty: p.ty });
    }
    setPending(null);
  };

  const NUDGE_KEYS: Record<string, [number, number]> = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };
  const hasDialog = !!state.dialog;
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      const d = NUDGE_KEYS[e.code];
      if (d) { e.preventDefault(); nudgePending(d[0], d[1]); return; }
      if (e.code === "Escape") { e.preventDefault(); setPending(null); return; }
      // Enter/mezerník při otevřené replice patří dialogu, ne stavbě.
      if ((e.code === "Enter" || e.code === "Space") && !hasDialog) { e.preventDefault(); commitPending(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, hasDialog, state.structures]);

  // D2: priorita zavírání pro hardwarové tlačítko Zpět — od nejvyšší vrstvy
  // (potvrzovací dialog) přes herní dialog a vývojářský panel, jednotlivé
  // mini-panely/minihry, až po velké overlaye (obchod/výroba/deník/plná
  // verze) a editační režim rozestavení. Zavře se vždy jen TA NEJVRCHNĚJŠÍ.
  const closeTopmostRef = useRef<() => boolean>(() => false);
  closeTopmostRef.current = () => {
    if (exitConfirm) { setExitConfirm(false); return true; }
    if (pending) { setPending(null); return true; } // Zpět = zahodit rozestavěné
    if (cinematic) { skipCinematic(); return true; } // Zpět = přeskočit sestřih
    if (state.dialog) { dispatch({ type: "DISMISS_DIALOG" }); return true; }
    if (devOpen) { setDevOpen(false); return true; }
    if (sel) { setSel(null); return true; }
    if (npc) { setNpc(null); return true; }
    if (minigame) { setMinigame(null); return true; }
    if (puzzle) { setPuzzle(false); return true; }
    if (clean) { setClean(null); return true; }
    if (play) { setPlay(null); return true; }
    if (overlay) { setOverlay(null); setDemoGateOpen(false); return true; }
    if (editMode) { setEditMode(false); return true; }
    return false;
  };

  // Skutečná reakce na Zpět: zavře nejvyšší vrstvu, jinak na úvodní
  // obrazovce rovnou ukončí appku, jinak (za běhu hry) se zeptá potvrzením.
  const backHandlerRef = useRef<() => void>(() => {});
  backHandlerRef.current = () => {
    if (closeTopmostRef.current()) return;
    if (!state.started) { void exitApp(); return; }
    setExitConfirm(true);
  };
  useEffect(() => {
    // Zaregistrováno jen jednou (na webu no-op) — indirekce přes ref
    // zajistí, že posluchač vždy vidí AKTUÁLNÍ stav bez nutnosti se
    // znovu a znovu přeregistrovávat.
    return registerBackButton(() => backHandlerRef.current());
  }, []);

  // D3: pauza/probuzení appky (nativně appStateChange, na webu
  // visibilitychange) — na pozadí ihned uloží postup a ztlumí zvuk (šetří
  // baterii), po návratu zvuk i případně běžící hudbu obnoví.
  const wasMusicPlayingRef = useRef(false);
  useEffect(() => {
    return registerLifecycle({
      onBackground: () => {
        wasMusicPlayingRef.current = sound.pauseForBackground();
        flushSave();
      },
      onForeground: () => {
        sound.resumeFromBackground(wasMusicPlayingRef.current);
      },
    });
  }, []);

  if (!state.started)
    return (
      <>
        <Intro onFullVersion={() => setOverlay("plna")} />
        {overlay === "plna" && (
          <Overlay title="Plná verze" icon="wheat" onClose={() => setOverlay(null)}>
            <FullVersion />
          </Overlay>
        )}
      </>
    );

  const paused = !!state.dialog || overlay !== null || !!sel || !!npc || !!minigame || puzzle || !!clean || !!play || !!state.gameOver;

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
  ];
  const wildActive = {
    kaneCircle: !!state.tasksDone.kane_circle,
    kanePerch: !!state.tasksDone.kane_perch,
    jezekOut: !!state.flags.jezek_domek && state.season === "podzim" && state.phase === "vecer",
    srnkaOut: state.phase === "rano" && !tutorialActive(state) && state.day >= 4,
  };

  // Tutoriál: hráč je pořád ve stavebním módu, panel ukazuje jen aktuální
  // krok a rovnou ho vybere — nic jiného teď stejně postavit nejde.
  const tut = tutorialActive(state);
  const restrictTo = tut ? currentStep(state)?.buildingId ?? null : null;
  const buildModeOn = tut || editMode;
  // Běží přelet nad loukou (ještě než Tomáš začne mluvit)? Pak schovej ovládání.
  const flyover = !!cinematic && !cinematic.talk;
  const pendingLabel = pending ? BUILDABLE_BY_ID[pending.defId]?.label ?? "stavbu" : "";

  return (
    <div className="game-world">
      {/* měkké rozednění po startu hry (místo tvrdého střihu z intra) */}
      <div className="game-fade-in" aria-hidden />
      <WorldCanvas
        season={state.season} phase={state.phase} paused={paused} welfare={state.welfare} weather={state.weather} money={state.money} built={state.built}
        tutorialTargets={tutorialTargets(state)} settledGroups={settledGroups(state.built)} tutorial={tutorialActive(state)} turbo={state.dev.turbo}
        foxStage={foxStage} wildActive={wildActive} hiddenIds={hiddenIds} appearance={state.profile.appearance}
        structures={state.structures} editMode={buildModeOn} buildSelection={buildSelection}
        cinematic={cinematic} onSkipCinematic={skipCinematic}
        onPlaceRequest={(defId, tx, ty) => setPending({ kind: "new", defId, tx, ty })}
        onMoveRequest={(uid, tx, ty) => {
          const inst = state.structures.find((s) => s.uid === uid);
          if (inst) setPending({ kind: "move", defId: inst.defId, uid, tx, ty });
        }}
        pending={pending}
        onDemolishStructure={(uid) => { sound.build(); dispatch({ type: "DEMOLISH_STRUCTURE", uid }); }}
        onEditReject={(reason) => dispatch({ type: "PUSH_DIALOG", speaker: "Stavění", lines: [reason ?? "Sem se to nevejde — je tam les, voda nebo jiná stavba."] })}
        onInteract={onInteract} onEvent={onWorldEvent}
      />
      <Hud onOpen={(p) => { if (p === "plna") setDemoGateOpen(false); setOverlay(p); }} onDevUnlock={unlockDev} editMode={editMode} onToggleEdit={() => setEditMode((v) => { const next = !v; if (!next) setBuildSelection(null); return next; })} />
      <Controls />
      {/* přes dotaz „postavit sem?" panel schovej — stavba je už vybraná a
          lišta s posunem/potvrzením potřebuje spodek obrazovky pro sebe */}
      {buildModeOn && !flyover && !pending && (
        <BuildPanel
          money={state.money}
          wood={state.inventory.drevo ?? 0}
          structures={state.structures}
          selection={buildSelection}
          onSelect={setBuildSelection}
          restrictTo={restrictTo}
          onDone={editMode && !tut ? () => setEditMode(false) : undefined}
        />
      )}
      {pending && (
        <div className="place-bar" role="dialog" aria-live="polite">
          {/* Hlavička roste nahoru (lišta je ukotvená spodkem) a lišta má pevnou
              šířku — hláška „sem to nejde" tak nikdy nepohne šipkami ani
              tlačítky pod sebou. */}
          <div className="place-bar-head">
            {/* Název je v 1. pádu (katalog), tak ho nechávám vepředu — jinak by
                z toho lezlo „Postavit Chalupa sem?". */}
            <b>{pendingLabel}</b>
            <span>— {pending.kind === "move" ? "přesunout" : "postavit"} sem?</span>
            {pendingIssue && (
              <span className="place-bar-warn">
                <Icon name="warn" size={14} /> {pendingIssue.short}
              </span>
            )}
          </div>
          <div className="place-bar-row">
            <div className="nudge-pad" role="group" aria-label="Posunout stavbu">
              <button className="nudge up" aria-label="posunout nahoru" onClick={() => nudgePending(0, -1)}>
                <Icon name="chevronUp" size={18} />
              </button>
              <button className="nudge left" aria-label="posunout vlevo" onClick={() => nudgePending(-1, 0)}>
                <Icon name="chevronLeft" size={18} />
              </button>
              <button className="nudge right" aria-label="posunout vpravo" onClick={() => nudgePending(1, 0)}>
                <Icon name="chevronRight" size={18} />
              </button>
              <button className="nudge down" aria-label="posunout dolů" onClick={() => nudgePending(0, 1)}>
                <Icon name="chevronDown" size={18} />
              </button>
            </div>
            <div className="place-bar-actions">
              <button className="build-select-btn confirm" disabled={!pendingValid} onClick={commitPending}>
                <Icon name="check" size={15} /> {pending.kind === "move" ? "Přesunout" : "Postavit"}
              </button>
              <button className="build-select-btn cancel" onClick={() => setPending(null)}>
                <Icon name="close" size={15} /> Zrušit
              </button>
            </div>
          </div>
          <small className="place-bar-hint">Šipkami posuneš po dlaždicích · ťuknutím na louku přehodíš jinam</small>
        </div>
      )}
      {/* přes přelet nad loukou repliku schovej — ukáže se až v záběru na Tomáše */}
      <DialogBox hidden={!!cinematic && !cinematic.talk} />

      {overlay === "shop" && <Overlay title="Stánek" icon="stall" onClose={() => setOverlay(null)}><Shop /></Overlay>}
      {overlay === "craft" && <Overlay title="Výroba" icon="tools" onClose={() => setOverlay(null)}><Craft /></Overlay>}
      {overlay === "denik" && (
        <Overlay title="Deník" icon="book" onClose={() => setOverlay(null)}>
          <Journal onSelect={(a) => setSel(a)} />
        </Overlay>
      )}
      {overlay === "plna" && (
        <Overlay title="Plná verze" icon="wheat" onClose={() => { setOverlay(null); setDemoGateOpen(false); }}>
          <FullVersion demo={demoGateOpen} />
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
        <Overlay title={MG_TITLE[minigame]} icon={MG_ICON[minigame]} onClose={() => setMinigame(null)}>
          {minigame === "herb" && <HerbQuiz onWin={() => winMinigame("herb")} onClose={() => setMinigame(null)} />}
          {minigame === "chop" && <ChopWood onWin={() => winMinigame("chop")} onClose={() => setMinigame(null)} />}
          {minigame === "tech" && <TechFix onWin={() => winMinigame("tech")} onClose={() => setMinigame(null)} />}
        </Overlay>
      )}
      {puzzle && (
        <Overlay title="Lesní brána" icon="gate" onClose={() => setPuzzle(false)}>
          <ForestGate onWin={solveGate} onClose={() => setPuzzle(false)} />
        </Overlay>
      )}
      {clean && (
        <Overlay title="Úklid u zvířat" icon="brush" onClose={() => setClean(null)}>
          <CleanUp group={clean} onWin={winClean} onClose={() => setClean(null)} />
        </Overlay>
      )}

      {play && <PlayBar animal={play} onDone={winPlay} onClose={() => setPlay(null)} />}
      {sel && <AnimalCard animal={sel} onClose={() => setSel(null)} onPlay={() => sel && openPlay(sel)} />}
      <FlashToast />
      <GameOver />

      {state.dev.enabled && !devOpen && (
        <button className="dev-fab" title="Developerský mód" onClick={() => setDevOpen(true)}>
          <Icon name="gear" size={22} />
        </button>
      )}
      {devOpen && <DevPanel onClose={() => setDevOpen(false)} />}

      {exitConfirm && (
        <div className="modal-backdrop" onClick={() => setExitConfirm(false)}>
          <div className="modal confirm-modal paper" onClick={(e) => e.stopPropagation()}>
            <h2>Opustit Louku?</h2>
            <p>Postup je uložený.</p>
            <div className="intro-actions">
              <button
                className="big-btn"
                onClick={() => {
                  flushSave();
                  void exitApp();
                }}
              >
                Ano, opustit
              </button>
              <button className="ghost-btn" onClick={() => setExitConfirm(false)}>Zpět</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
