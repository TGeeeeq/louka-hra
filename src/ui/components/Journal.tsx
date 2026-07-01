import { useState } from "react";
import type { AnimalDef, FactCategory } from "../../game/types";
import { ANIMALS } from "../../game/content/animals";
import { FACTS } from "../../game/content/facts";
import { QUEST_LINES } from "../../game/content/quests";
import { AnimalSprite } from "../sprites/AnimalSprite";
import { useGame } from "../store";
import { photoUrl } from "../photo";

type Tab = "zvirata" | "ukoly" | "vedomosti" | "olouce";

const CAT_LABEL: Record<FactCategory, string> = {
  zvirata: "🐾 Zvířata",
  byliny: "🌿 Byliny a výroba",
  priroda: "🌲 Příroda a les",
  obdobi: "🗓️ Roční období",
  azyl: "🏡 O azylu",
};

export function Journal({ onSelect }: { onSelect: (a: AnimalDef) => void }) {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>("zvirata");

  const known = new Set(state.knownFacts);
  const cats: FactCategory[] = ["byliny", "priroda", "obdobi", "azyl"];

  return (
    <div className="journal">
      <div className="subtabs">
        <button className={tab === "zvirata" ? "on" : ""} onClick={() => setTab("zvirata")}>🐾 Zvířata</button>
        <button className={tab === "ukoly" ? "on" : ""} onClick={() => setTab("ukoly")}>📋 Úkoly</button>
        <button className={tab === "vedomosti" ? "on" : ""} onClick={() => setTab("vedomosti")}>📖 Vědomosti</button>
        <button className={tab === "olouce" ? "on" : ""} onClick={() => setTab("olouce")}>🌿 O Louce</button>
      </div>

      {tab === "ukoly" && (
        <div className="facts">
          {QUEST_LINES.filter(
            (l) => (!l.dlc || state.dlcOwned.includes(l.dlc)) && l.unlocked(state),
          ).map((l) => {
            const idx = state.questProgress[l.id] ?? 0;
            const current = l.quests[idx];
            return (
              <div key={l.id} className="fact-cat">
                <h4>
                  {l.icon} {l.title}{" "}
                  <small className="quest-progress">
                    {Math.min(idx, l.quests.length)}/{l.quests.length}
                  </small>
                </h4>
                {l.quests.map((q, i) => (
                  <div key={q.id} className={`fact-row ${i < idx ? "" : i === idx ? "" : "locked"}`}>
                    {i < idx ? (
                      <b>✓ {q.title}</b>
                    ) : i === idx ? (
                      <>
                        <b>▸ {q.title}</b>
                        <p>{q.hint}</p>
                      </>
                    ) : (
                      <b className="lock">🔒 …</b>
                    )}
                  </div>
                ))}
                {!current && <p className="panel-lead">Linka dokončená! 🎉</p>}
              </div>
            );
          })}
        </div>
      )}

      {tab === "zvirata" && (
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
      )}

      {tab === "vedomosti" && (
        <div className="facts">
          <p className="panel-lead">
            Objeveno {FACTS.filter((f) => known.has(f.id)).length} z {FACTS.length} zajímavostí. Objevuj je
            prací — sběrem bylin, úklidem, zavíráním na noc…
          </p>
          {cats.map((c) => {
            const list = FACTS.filter((f) => f.category === c);
            return (
              <div key={c} className="fact-cat">
                <h4>{CAT_LABEL[c]}</h4>
                {list.map((f) => (
                  <div key={f.id} className={`fact-row ${known.has(f.id) ? "" : "locked"}`}>
                    {known.has(f.id) ? (
                      <>
                        <b>{f.title}</b>
                        <p>{f.text}</p>
                      </>
                    ) : (
                      <b className="lock">🔒 zatím neobjeveno</b>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === "olouce" && (
        <div className="about">
          <h3>🌳 Louka — azyl Nech mě růst</h3>
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
            <li><b>Večer</b> dokrm a hlavně <b>zavři zvířata</b> — venku je les a liška.</li>
            <li>Prodávej výrobky, kupuj zásoby a <b>stavby</b>, co ti ulehčí práci.</li>
            <li>Hlídej spokojenost zvířat i vlastní sytost — a přežij <b>zimu</b>.</li>
          </ul>
          <p className="credit">
            Postavičky a příběhy podle skutečných obyvatel Louky · nechmerust.org · 💚
          </p>
        </div>
      )}
    </div>
  );
}
