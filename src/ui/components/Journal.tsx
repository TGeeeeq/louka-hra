import { useState, useSyncExternalStore } from "react";
import type { AnimalDef, FactCategory } from "../../game/types";
import { ANIMALS } from "../../game/content/animals";
import { WILD_ANIMALS } from "../../game/content/wild";
import { FACTS } from "../../game/content/facts";
import { QUEST_LINES } from "../../game/content/quests";
import { dayPlan } from "../../game/content/objectives";
import { getAlerts, subscribeAlerts } from "../../world/markers";
import { ACHIEVEMENTS } from "../../game/achievements";
import { AnimalSprite } from "../sprites/AnimalSprite";
import { useGame } from "../store";
import { photoUrl } from "../photo";
import { Icon, type IconName } from "../icons/Icon";
import { EmojiIcon } from "../icons/emojiMap";

type Tab = "zvirata" | "ukoly" | "vedomosti" | "uspechy" | "olouce";

const CAT_LABEL: Record<FactCategory, string> = {
  zvirata: "Zvířata",
  byliny: "Byliny a výroba",
  priroda: "Příroda a les",
  obdobi: "Roční období",
  azyl: "O azylu",
};

const CAT_ICON: Record<FactCategory, IconName> = {
  zvirata: "paw",
  byliny: "leaf",
  priroda: "tree",
  obdobi: "calendar",
  azyl: "home",
};

// Bylinné ilustrace (public/herbs/<id>.webp) dorazí postupně — dokud soubor
// chybí, jednoduše nic nezobraz (přesně dosavadní vzhled deníku). Selhání se
// pamatuje napříč rendery, ať se nezkouší donekonečna.
const failedHerbThumbs = new Set<string>();

function HerbThumb({ id }: { id: string }) {
  const [broken, setBroken] = useState(() => failedHerbThumbs.has(id));
  if (broken) return null;
  return (
    <img
      className="fact-herb-thumb"
      src={`${import.meta.env.BASE_URL}herbs/${id}.webp`}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        failedHerbThumbs.add(id);
        setBroken(true);
      }}
    />
  );
}

const TAB_META: { id: Tab; label: string; icon: IconName }[] = [
  { id: "zvirata", label: "Zvířata", icon: "paw" },
  { id: "ukoly", label: "Úkoly", icon: "clipboard" },
  { id: "vedomosti", label: "Vědomosti", icon: "book" },
  { id: "uspechy", label: "Úspěchy", icon: "trophy" },
  { id: "olouce", label: "O Louce", icon: "leaf" },
];

export function Journal({
  onSelect,
  initialTab = "zvirata",
}: {
  onSelect: (a: AnimalDef) => void;
  initialTab?: Tab;
}) {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>(initialTab);
  const plan = dayPlan(state);
  const alerts = useSyncExternalStore(subscribeAlerts, getAlerts, getAlerts);

  const known = new Set(state.knownFacts);
  const ownedFacts = FACTS;
  const cats: FactCategory[] = ["byliny", "priroda", "obdobi", "azyl"];

  return (
    <div className="journal">
      <div className="subtabs subtabs-wrap">
        {TAB_META.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ukoly" && (
        <div className="facts">
          {/* Denní plán je to hlavní: co všechno musím udělat, než se den
              posune dál. Příběhové linky jsou až pod tím. */}
          <div className="plan-card">
            <h4>
              <Icon name="clipboard" size={17} /> {plan.title}
              <small className="quest-progress">
                {plan.requiredDone}/{plan.requiredTotal} povinných
              </small>
            </h4>
            <p className="panel-lead">{plan.lead}</p>
            {alerts.map((a) => (
              <p key={a.id} className="plan-alarm">
                <b>{a.emoji} {a.label}</b> {a.hint}
              </p>
            ))}
            <ul className="plan-steps">
              {plan.steps.map((o) => (
                <li
                  key={o.id}
                  className={o.done ? "done" : o.locked ? "locked" : o.id === plan.next?.id ? "now" : ""}
                >
                  <span className="plan-mark">
                    {o.done ? (
                      <Icon name="check" size={14} className="ic-good" />
                    ) : o.locked ? (
                      <Icon name="lock" size={13} />
                    ) : (
                      <EmojiIcon emoji={o.emoji} size={15} />
                    )}
                  </span>
                  <span className="plan-text">
                    <b>{o.label}</b>
                    {!o.required && <em className="plan-extra">navíc</em>}
                    {!o.done && <span className="plan-hint">{o.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="plan-foot">
              {plan.ready ? (
                <>
                  <Icon name="check" size={14} className="ic-good" /> Povinné kroky máš hotové — dál pokračuje{" "}
                  <b>{plan.nextPhase}</b>.
                </>
              ) : (
                <>
                  <Icon name="chevronRight" size={14} /> Až budou povinné kroky hotové, pokračuje{" "}
                  <b>{plan.nextPhase}</b>.
                </>
              )}
            </p>
          </div>

          <h4 className="plan-story-head">
            <Icon name="book" size={18} /> Příběhové linky
          </h4>
          {QUEST_LINES.filter((l) => l.unlocked(state)).map((l) => {
            const idx = state.questProgress[l.id] ?? 0;
            const current = l.quests[idx];
            return (
              <div key={l.id} className="fact-cat">
                <h4>
                  <EmojiIcon emoji={l.icon} size={17} /> {l.title}{" "}
                  <small className="quest-progress">
                    {Math.min(idx, l.quests.length)}/{l.quests.length}
                  </small>
                </h4>
                {l.quests.map((q, i) => (
                  <div key={q.id} className={`fact-row ${i < idx ? "" : i === idx ? "" : "locked"}`}>
                    {i < idx ? (
                      <b>
                        <Icon name="check" size={15} className="ic-good" /> {q.title}
                      </b>
                    ) : i === idx ? (
                      <>
                        <b>
                          <Icon name="chevronRight" size={15} /> {q.title}
                        </b>
                        <p>{q.hint}</p>
                      </>
                    ) : (
                      // Zamčené kroky ukazujeme i s názvem — hráč má vidět,
                      // co ho v lince čeká, ne jen tři tečky.
                      <b className="lock">
                        <Icon name="lock" size={14} /> {q.title}
                      </b>
                    )}
                  </div>
                ))}
                {!current && (
                  <p className="panel-lead">
                    Linka dokončená! <Icon name="party" size={15} />
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "zvirata" && (
        <>
        <div className="enc-grid">
          {ANIMALS.map((a) => {
            const met = state.seenAnimals.includes(a.id);
            const photo = met ? photoUrl(a) : null;
            return (
              <button key={a.id} className="enc-card" onClick={() => onSelect(a)}>
                <span className="enc-portrait">
                  <AnimalSprite animal={a} size={58} />
                  {photo && (
                    <img
                      className="enc-photo"
                      src={photo}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => e.currentTarget.remove()}
                    />
                  )}
                </span>
                <b>{a.name}</b>
                <small>{a.personality}</small>
              </button>
            );
          })}
        </div>
        {(() => {
          const met = WILD_ANIMALS.filter((w) =>
            w.id === "liska" ? state.fox.stage !== "les" : (state.wildSeen[w.id] ?? 0) > 0,
          );
          if (!met.length) return null;
          return (
            <>
              <h4 className="enc-wild-head">
                <Icon name="tree" size={18} /> Divocí sousedé
              </h4>
              <div className="enc-grid">
                {met.map((w) => (
                  <button key={w.id} className="enc-card" onClick={() => onSelect(w)}>
                    <AnimalSprite animal={w} size={58} />
                    <b>{w.name}</b>
                    <small>{w.personality}</small>
                  </button>
                ))}
              </div>
            </>
          );
        })()}
        </>
      )}

      {tab === "vedomosti" && (
        <div className="facts">
          <p className="panel-lead">
            Objeveno {ownedFacts.filter((f) => known.has(f.id)).length} z {ownedFacts.length} zajímavostí. Objevuj je
            prací — sběrem bylin, úklidem, zavíráním na noc…
          </p>
          {cats.map((c) => {
            const list = ownedFacts.filter((f) => f.category === c);
            return (
              <div key={c} className="fact-cat">
                <h4>
                  <Icon name={CAT_ICON[c]} size={17} /> {CAT_LABEL[c]}
                </h4>
                {list.map((f) => (
                  <div key={f.id} className={`fact-row ${known.has(f.id) ? "" : "locked"}`}>
                    {known.has(f.id) ? (
                      <>
                        <div className="fact-herb-head">
                          {c === "byliny" && <HerbThumb id={f.id} />}
                          <b>{f.title}</b>
                        </div>
                        <p>{f.text}</p>
                        {f.more?.map((m, mi) => (
                          <p key={mi} className="fact-more">
                            <Icon name="sprout" size={13} /> {m}
                          </p>
                        ))}
                      </>
                    ) : (
                      <b className="lock">
                        <Icon name="lock" size={14} /> zatím neobjeveno
                      </b>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === "uspechy" && (
        <div className="facts">
          <p className="panel-lead">
            Odemčeno {ACHIEVEMENTS.filter((a) => state.achievements.includes(a.id)).length} z {ACHIEVEMENTS.length} úspěchů.
            Odemykají se samy od sebe pořádnou péčí o Louku.
          </p>
          <div className="fact-cat">
            {ACHIEVEMENTS.map((a) => {
              const owned = state.achievements.includes(a.id);
              return (
                <div key={a.id} className={`fact-row ${owned ? "" : "locked"}`}>
                  <b>
                    {owned ? <EmojiIcon emoji={a.emoji} size={18} /> : <Icon name="lock" size={15} />} {a.name}
                  </b>
                  <p>{a.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "olouce" && (
        <div className="about">
          <h3>
            <Icon name="tree" size={20} /> Louka — azyl Nech mě růst
          </h3>
          <p>
            Dlouhá louka uprostřed lesů, kde našlo domov přes sto zachráněných zvířat. Není to farma ani
            zoo — zvířata tu <b>dožívají v klidu a nikdo je nevyužívá</b>. To je celý smysl azylu.
          </p>
          <p>
            Provoz drží dary, virtuální adopce a prodej vlastních výrobků — bylinné masti, čaje a ruční tvorby.
            Krmivo pro stovku zvířat ale není levné, a tak je každý den malou výzvou.
          </p>
          <h4>Jak na to</h4>
          <ul>
            <li><b>Ráno</b> vypusť drůbež, nakrm a napoj všechny, sesbírej vejce.</li>
            <li><b>Poledne</b> ukliď, naštípej dřevo, rozdělej oheň, sbírej byliny a vyráběj.</li>
            <li><b>Večer</b> dokrm a hlavně <b>zavři zvířata</b> — v klidu se spí líp a les má v noci svůj vlastní život.</li>
            <li>Prodávej výrobky, kupuj zásoby a <b>stavby</b>, co ti ulehčí práci.</li>
            <li>Hlídej spokojenost zvířat i vlastní sytost — a přežij <b>zimu</b>.</li>
          </ul>
          <p className="credit">
            Postavičky a příběhy podle skutečných obyvatel Louky · nechmerust.org{" "}
            <Icon name="heart" size={13} className="ic-heart" />
          </p>
        </div>
      )}
    </div>
  );
}
