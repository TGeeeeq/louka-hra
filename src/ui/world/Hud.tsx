import { useEffect, useRef, useState } from "react";
import { useGame } from "../store";
import { sound } from "../../audio/sound";
import {
  PHASE_ICON,
  PHASE_LABEL,
  SEASON_ICON,
  SEASON_LABEL,
  WEATHER_ICON,
} from "../labels";
import { weatherName } from "../../game/engine/reducer";
import { MAIN_QUESTS, QUEST_LINES } from "../../game/content/quests";
import { CHAPTER_COUNT, currentStep, tutorialActive } from "../../game/content/tutorial";
import { ITEM_BY_ID } from "../../game/content/items";
import { invCount } from "../../game/engine/util";
import { demoGateActive } from "../../platform";

function MiniBar({ icon, value, max, tone }: { icon: string; value: number; max: number; tone: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mini-bar" title={`${Math.round(value)}/${max}`}>
      <span>{icon}</span>
      <div className="mini-track"><div className={`mini-fill ${tone}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/** Ukládá si hráčovo rozbalení/sbalení úkolů, ať to nemusí řešit každý den. */
const QUEST_OPEN_KEY = "louka.hud.questOpen";

function initialQuestOpen(): boolean {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage?.getItem(QUEST_OPEN_KEY);
  if (saved === "0") return false;
  if (saved === "1") return true;
  // Bez uložené volby: na malém displeji radši sbaleno, ať je vidět louka.
  return window.matchMedia("(min-width: 700px) and (min-height: 620px)").matches;
}

export function Hud({
  onOpen,
  onDevUnlock,
  editMode,
  onToggleEdit,
}: {
  onOpen: (panel: "denik" | "plna") => void;
  onDevUnlock?: () => void;
  editMode: boolean;
  onToggleEdit: () => void;
}) {
  const { state, dispatch } = useGame();
  const [bag, setBag] = useState(false);
  const [muted, setMuted] = useState(sound.muted);
  const [music, setMusic] = useState(sound.musicOn);
  const [menu, setMenu] = useState(false);
  const [questOpen, setQuestOpen] = useState(initialQuestOpen);

  const toggleQuest = () =>
    setQuestOpen((v) => {
      window.localStorage?.setItem(QUEST_OPEN_KEY, v ? "0" : "1");
      return !v;
    });

  // Skryté odemčení dev módu: 5× ťuknout na odznak „Den X" do 2 sekund.
  const tap = useRef({ count: 0, last: 0 });
  const onDayBadge = () => {
    const now = performance.now();
    tap.current.count = now - tap.current.last < 2000 ? tap.current.count + 1 : 1;
    tap.current.last = now;
    if (tap.current.count >= 5) {
      tap.current.count = 0;
      onDevUnlock?.();
    }
  };

  // Přepnutí do stavebního módu zavře rozbalené menu (překrývalo by panel).
  useEffect(() => { if (editMode) setMenu(false); }, [editMode]);

  const quest = MAIN_QUESTS[state.questProgress.main ?? state.questLine];
  const tut = tutorialActive(state);
  const step = currentStep(state);

  // Nejrozdělanější vedlejší linka — ukáže se kompaktně pod hlavním úkolem.
  const sideLine = QUEST_LINES.filter(
    (l) =>
      l.id !== "main" &&
      l.unlocked(state) &&
      (state.questProgress[l.id] ?? 0) < l.quests.length,
  )[0];
  const sideQuest = sideLine?.quests[state.questProgress[sideLine.id] ?? 0];

  const phaseBtn =
    state.phase === "vecer"
      ? { label: "🛌 Jít spát", cls: "sleep", act: () => { sound.sleepy(); dispatch({ type: "SLEEP" }); } }
      : { label: `▸ ${state.phase === "rano" ? "Poledne" : "Večer"}`, cls: "", act: () => { sound.select(); dispatch({ type: "ADVANCE_PHASE" }); } };

  const consum = ["chleba", "polevka", "voda", "caj"].filter((id) => invCount(state.inventory, id) > 0);

  // Druhořadá tlačítka — na širokém displeji rovnou v liště, na úzkém se
  // schovají pod „⋯", ať se horní lišta vejde do jediného řádku.
  const secondary = [
    { key: "bag", icon: "🎒", label: "Batoh / najíst se", act: () => setBag((b) => !b) },
    { key: "denik", icon: "📖", label: "Deník", act: () => onOpen("denik") },
    { key: "plna", icon: "🌾", label: "Plná verze", act: () => onOpen("plna") },
    { key: "zvuk", icon: muted ? "🔇" : "🔊", label: "Zvuk", act: () => setMuted(sound.toggleMute()) },
    { key: "hudba", icon: music ? "🎵" : "🎵̶", label: "Hudba", act: () => setMusic(sound.toggleMusic()) },
  ];

  const questBox = tut && step
    ? { cls: "", label: `🔨 Kapitola ${step.chapterIndex}/${CHAPTER_COUNT} — ${step.chapter}`, title: `Postav: ${step.buildLabel}`, hint: "Vyber stavbu v panelu dole, klepni na louku a potvrď — před potvrzením ji ještě můžeš posunout šipkami." }
    : quest
      ? { cls: "", label: `📋 Úkol ${(state.questProgress.main ?? 0) + 1}/${MAIN_QUESTS.length}`, title: quest.title, hint: quest.hint }
      : { cls: " done", label: "🎉 Hotovo", title: "Všechny úkoly splněné!", hint: "Teď je Louka jen tvoje — hospodař, jak umíš." };

  return (
    <>
      <div className="hud-stack">
      <div className="hud-top">
        <div className="hud-when">
          <span className="day-badge" onClick={onDayBadge}>Den {state.day}</span>
          {demoGateActive() && !state.fullVersion && <span className="demo-chip">DEMO</span>}
          <span className="season-pill" data-season={state.season}>
            {SEASON_ICON[state.season]} <i>{SEASON_LABEL[state.season]}</i>
          </span>
          <span className="hud-weather">{PHASE_ICON[state.phase]} {PHASE_LABEL[state.phase]} · {WEATHER_ICON[state.weather]} {weatherName(state.weather)}</span>
        </div>

        <div className="hud-bars">
          <MiniBar icon="⚡" value={state.energy} max={state.maxEnergy} tone="energy" />
          <MiniBar icon="🍞" value={state.hunger} max={100} tone="hunger" />
          <MiniBar icon="💧" value={state.thirst} max={100} tone="thirst" />
        </div>

        <div className="hud-right">
          <span className="money">💰 {state.money}</span>
          {!tut && (
            <button className={`icon-btn${editMode ? " on" : ""}`} title="Stavět (postavit / přesunout / zbořit)" onClick={onToggleEdit}>🔨</button>
          )}
          {secondary.map((b) => (
            <button key={b.key} className="icon-btn hud-secondary" title={b.label} onClick={b.act}>{b.icon}</button>
          ))}
          <button
            className={`icon-btn hud-menu-btn${menu ? " on" : ""}`}
            title="Další"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            ⋯
          </button>
        </div>
      </div>

      {menu && (
        <div className="hud-menu" onClick={() => setMenu(false)}>
          {secondary.map((b) => (
            <button key={b.key} onClick={(e) => { e.stopPropagation(); b.act(); setMenu(false); }}>
              <span>{b.icon}</span> {b.label}
            </button>
          ))}
        </div>
      )}

      <div className={`hud-quest${questBox.cls}${questOpen ? " open" : ""}`}>
        <button className="quest-toggle" onClick={toggleQuest} aria-expanded={questOpen}>
          <span className="quest-label">{questBox.label}</span>
          <b>{questBox.title}</b>
          <em aria-hidden>{questOpen ? "▾" : "▸"}</em>
        </button>
        {questOpen && <small>{questBox.hint}</small>}
      </div>

      {!tut && questOpen && sideQuest && (
        <div className="hud-quest side open">
          <span className="quest-label">{sideLine.icon} {sideLine.title}</span>
          <b>{sideQuest.title}</b>
        </div>
      )}
      </div>

      {!tut && !editMode && <button className={`phase-fab ${phaseBtn.cls}`} onClick={phaseBtn.act}>{phaseBtn.label}</button>}

      {bag && (
        <div className="bag-pop" onClick={() => setBag(false)}>
          <div className="bag-inner" onClick={(e) => e.stopPropagation()}>
            <h4>🎒 Postarej se o sebe</h4>
            {consum.length === 0 && <p className="bag-empty">Nemáš nic k jídlu ani pití. Nakup ve stánku nebo uvař.</p>}
            {consum.map((id) => {
              const it = ITEM_BY_ID[id];
              const drink = id === "voda" || id === "caj";
              return (
                <button
                  key={id}
                  className="bag-item"
                  onClick={() => {
                    sound.eat();
                    dispatch(drink ? { type: "DRINK", itemId: id } : { type: "EAT", itemId: id });
                  }}
                >
                  <span>{it.emoji} {it.name}</span>
                  <em>×{invCount(state.inventory, id)}</em>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
