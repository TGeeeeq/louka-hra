import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGame } from "../store";
import { sound } from "../../audio/sound";
import { PHASE_LABEL, SEASON_LABEL } from "../labels";
import { Icon, type IconName } from "../icons/Icon";
import { EmojiIcon } from "../icons/emojiMap";
import { PHASE_ICON_NAME, SEASON_ICON_NAME, WEATHER_ICON_NAME } from "../icons/maps";
import { useTween } from "../hud/useTween";
import { weatherName } from "../../game/engine/reducer";
import { MAIN_QUESTS, QUEST_LINES } from "../../game/content/quests";
import { tutorialActive } from "../../game/content/tutorial";
import { dayPlan } from "../../game/content/objectives";
import { ITEM_BY_ID } from "../../game/content/items";
import { invCount } from "../../game/engine/util";
import { demoGateActive } from "../../platform";
import { getAlerts, subscribeAlerts } from "../../world/markers";

/** Under this share of the maximum a stat starts pulsing for attention. */
const CRITICAL = 0.22;

function StatBar({
  icon,
  label,
  value,
  max,
  tone,
}: {
  icon: IconName;
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const shown = useTween(value);
  const pct = Math.max(0, Math.min(100, (shown / max) * 100));
  const crit = value / max < CRITICAL;
  return (
    <div className={`stat${crit ? " crit" : ""}`} title={`${label}: ${Math.round(value)}/${max}`}>
      <Icon name={icon} size={15} className="stat-ico" />
      <div className="stat-track">
        <div className={`stat-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-val">{Math.round(shown)}</span>
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
  onOpenPlan,
  onDevUnlock,
  editMode,
  onToggleEdit,
}: {
  onOpen: (panel: "denik" | "plna" | "mapa") => void;
  /** Otevřít deník rovnou na kartě Úkoly (celý denní plán). */
  onOpenPlan: () => void;
  onDevUnlock?: () => void;
  editMode: boolean;
  onToggleEdit: () => void;
}) {
  const { state, dispatch } = useGame();
  const [bag, setBag] = useState(false);
  const [muted, setMuted] = useState(sound.muted);
  const [music, setMusic] = useState(sound.musicOn);
  const money = useTween(state.money, 650);
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

  const tut = tutorialActive(state);
  const plan = dayPlan(state);
  // Akutní věci (utečené zvíře) žijí mimo GameState — hlásí je herní smyčka.
  const alerts = useSyncExternalStore(subscribeAlerts, getAlerts, getAlerts);

  // Příběh běží vedle denního plánu: hlavní linka + nejrozdělanější vedlejší.
  // Denní plán je „co teď", tohle je „kam to celé vede".
  const mainQuest = MAIN_QUESTS[state.questProgress.main ?? state.questLine];
  const sideLine = QUEST_LINES.filter(
    (l) =>
      l.id !== "main" &&
      l.unlocked(state) &&
      (state.questProgress[l.id] ?? 0) < l.quests.length,
  )[0];
  const sideQuest = sideLine?.quests[state.questProgress[sideLine.id] ?? 0];

  const phaseBtn: { label: string; icon: IconName; cls: string; act: () => void } =
    state.phase === "vecer"
      ? { label: "Jít spát", icon: "bed", cls: "sleep", act: () => { sound.sleepy(); dispatch({ type: "SLEEP" }); } }
      : {
          label: state.phase === "rano" ? "Poledne" : "Večer",
          icon: "chevronRight",
          cls: "",
          act: () => { sound.select(); dispatch({ type: "ADVANCE_PHASE" }); },
        };

  const consum = ["chleba", "polevka", "voda", "caj"].filter((id) => invCount(state.inventory, id) > 0);

  // Druhořadá tlačítka — na širokém displeji rovnou v liště, na úzkém se
  // schovají pod „…", ať se horní lišta vejde do jediného řádku.
  const secondary: { key: string; icon: IconName; label: string; act: () => void }[] = [
    { key: "bag", icon: "backpack", label: "Batoh / najíst se", act: () => setBag((b) => !b) },
    { key: "mapa", icon: "map", label: "Mapa Louky", act: () => onOpen("mapa") },
    { key: "denik", icon: "book", label: "Deník", act: () => onOpen("denik") },
    { key: "plna", icon: "wheat", label: "Plná verze", act: () => onOpen("plna") },
    { key: "zvuk", icon: muted ? "soundOff" : "soundOn", label: muted ? "Zapnout zvuk" : "Vypnout zvuk", act: () => setMuted(sound.toggleMute()) },
    { key: "hudba", icon: music ? "musicOn" : "musicOff", label: music ? "Vypnout hudbu" : "Zapnout hudbu", act: () => setMusic(sound.toggleMusic()) },
  ];

  // Hlavička panelu: co je teď na řadě. Uvnitř (po rozbalení) je pak CELÝ
  // seznam kroků fáze dne — dřív tam byla jen jedna věta a hráč nevěděl, co
  // ho ještě dělí od dalšího dílu dne.
  const questBox: { cls: string; icon: IconName; label: string; title: string } =
    alerts.length > 0
      ? { cls: " alarm", icon: "warn", label: "Akutně!", title: alerts[0].label }
      : plan.next
        ? {
            cls: "",
            icon: tut ? "hammer" : "clipboard",
            label: `${plan.title} · ${plan.requiredDone}/${plan.requiredTotal}`,
            title: plan.next.label,
          }
        : { cls: " done", icon: "party", label: plan.title, title: tut ? "Zázemí stojí!" : `Hotovo — můžeš na ${plan.nextPhase.toLowerCase()}` };

  return (
    <>
      <div className="hud-stack">
      <div className="hud-top">
        <div className="hud-card hud-when">
          <span className="day-badge" onClick={onDayBadge}>Den {state.day}</span>
          {demoGateActive() && !state.fullVersion && <span className="demo-chip">DEMO</span>}
          <span className="season-pill" data-season={state.season}>
            <Icon name={SEASON_ICON_NAME[state.season]} size={14} />
            <i>{SEASON_LABEL[state.season]}</i>
          </span>
          <span className="hud-weather">
            <Icon name={PHASE_ICON_NAME[state.phase]} size={14} />
            {PHASE_LABEL[state.phase]}
            <i className="hud-dot" aria-hidden />
            <Icon name={WEATHER_ICON_NAME[state.weather]} size={14} />
            {weatherName(state.weather)}
          </span>
        </div>

        <div className="hud-card hud-bars">
          <StatBar icon="spark" label="Energie" value={state.energy} max={state.maxEnergy} tone="energy" />
          <StatBar icon="bread" label="Sytost" value={state.hunger} max={100} tone="hunger" />
          <StatBar icon="droplet" label="Napojení" value={state.thirst} max={100} tone="thirst" />
        </div>

        <div className="hud-card hud-right">
          <span className="money">
            <Icon name="coins" size={16} className="ic-gold" />
            {Math.round(money)}
          </span>
          <span className="hud-sep" aria-hidden />
          {!tut && (
            <button className={`icon-btn${editMode ? " on" : ""}`} title="Stavět (postavit / přesunout / zbořit)" onClick={onToggleEdit}>
              <Icon name="hammer" size={19} />
            </button>
          )}
          {secondary.map((b) => (
            <button key={b.key} className="icon-btn hud-secondary" title={b.label} onClick={b.act}>
              <Icon name={b.icon} size={19} />
            </button>
          ))}
          <button
            className={`icon-btn hud-menu-btn${menu ? " on" : ""}`}
            title="Další"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <Icon name="ellipsis" size={19} />
          </button>
        </div>
      </div>

      {menu && (
        <div className="hud-menu paper" onClick={() => setMenu(false)}>
          {secondary.map((b) => (
            <button key={b.key} onClick={(e) => { e.stopPropagation(); b.act(); setMenu(false); }}>
              <span><Icon name={b.icon} size={18} /></span> {b.label}
            </button>
          ))}
        </div>
      )}

      <div className={`hud-quest paper${questBox.cls}${questOpen ? " open" : ""}`}>
        <button className="quest-toggle" onClick={toggleQuest} aria-expanded={questOpen}>
          <span className="quest-label">
            <Icon name={questBox.icon} size={13} />
            {questBox.label}
          </span>
          <b>{questBox.title}</b>
          <em aria-hidden>
            <Icon name={questOpen ? "chevronDown" : "chevronRight"} size={13} />
          </em>
        </button>
        {questOpen && (
          <div className="quest-body">
            {alerts.map((a) => (
              <p key={a.id} className="quest-alarm">
                {a.emoji} {a.hint}
              </p>
            ))}
            <small>{plan.next ? plan.next.hint : plan.lead}</small>
            <ul className="quest-steps">
              {plan.steps.map((o) => (
                <li
                  key={o.id}
                  className={o.done ? "done" : o.locked ? "locked" : o.id === plan.next?.id ? "now" : ""}
                >
                  <Icon
                    name={o.done ? "check" : o.locked ? "lock" : o.id === plan.next?.id ? "chevronRight" : "clipboard"}
                    size={13}
                  />
                  <span>{o.label}</span>
                  {!o.required && !o.done && <em>navíc</em>}
                </li>
              ))}
            </ul>
            <div className="quest-links">
              <button onClick={onOpenPlan}>
                <Icon name="clipboard" size={13} /> Celý plán
              </button>
              <button onClick={() => onOpen("mapa")}>
                <Icon name="map" size={13} /> Mapa
              </button>
            </div>
          </div>
        )}
      </div>

      {!tut && questOpen && mainQuest && (
        <div className="hud-quest paper side open">
          <span className="quest-label">
            <EmojiIcon emoji="📋" size={13} />
            Příběh · Život na Louce
          </span>
          <b>{mainQuest.title}</b>
          <small>{mainQuest.hint}</small>
        </div>
      )}

      {!tut && questOpen && sideQuest && (
        <div className="hud-quest paper side open">
          <span className="quest-label">
            <EmojiIcon emoji={sideLine.icon} size={13} />
            {sideLine.title}
          </span>
          <b>{sideQuest.title}</b>
        </div>
      )}
      </div>

      {!tut && !editMode && (
        <button className={`phase-fab ${phaseBtn.cls}`} onClick={phaseBtn.act}>
          <Icon name={phaseBtn.icon} size={18} />
          {phaseBtn.label}
        </button>
      )}

      {bag && (
        <div className="bag-pop" onClick={() => setBag(false)}>
          <div className="bag-inner paper" onClick={(e) => e.stopPropagation()}>
            <h4>
              <Icon name="backpack" size={20} /> Postarej se o sebe
            </h4>
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
                  <span>
                    <EmojiIcon emoji={it.emoji} size={18} /> {it.name}
                  </span>
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
