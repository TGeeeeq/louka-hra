import type { AnimalDef, FeedGroup } from "../../game/types";
import { ANIMALS_BY_GROUP } from "../../game/content/animals";
import { PEOPLE } from "../../game/content/people";
import { BUILDING_BY_ID } from "../../game/content/buildings";
import { AnimalSprite } from "../sprites/AnimalSprite";
import { PersonSprite } from "../sprites/PersonSprite";
import { GROUP_ICON, GROUP_LABEL } from "../labels";
import { useGame } from "../store";

function mood(w: number) {
  if (w >= 70) return { face: "😊", cls: "good", label: "spokojení" };
  if (w >= 45) return { face: "😐", cls: "ok", label: "ujde to" };
  if (w >= 25) return { face: "😟", cls: "low", label: "strádají" };
  return { face: "😢", cls: "bad", label: "zle" };
}

function Zone({
  group,
  onSelect,
}: {
  group: FeedGroup;
  onSelect: (a: AnimalDef) => void;
}) {
  const { state } = useGame();
  const animals = ANIMALS_BY_GROUP[group];
  const w = state.welfare[group];
  const m = mood(w);
  const fedMorning = state.tasksDone[`feed_${group}`];
  return (
    <section className={`zone zone-${group}`}>
      <header className="zone-head">
        <span className="zone-title">
          {GROUP_ICON[group]} {GROUP_LABEL[group]}
        </span>
        <span className="zone-count">{state.population[group]} ks</span>
        <span className={`zone-mood ${m.cls}`} title={`Spokojenost ${Math.round(w)} % — ${m.label}`}>
          {m.face} {Math.round(w)} %
        </span>
        {fedMorning && <span className="zone-fed" title="Dnes ráno nakrmeno">✓ nakrmeno</span>}
      </header>
      <div className="zone-animals">
        {animals.map((a) => (
          <button
            key={a.id}
            className={`animal-btn ${a.special === "missing" ? "missing" : ""}`}
            onClick={() => onSelect(a)}
            title={a.special === "missing" ? `${a.name} — pohřešuje se` : a.name}
          >
            <AnimalSprite animal={a} size={66} />
            <span className="animal-tag">{a.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function MeadowMap({ onSelect }: { onSelect: (a: AnimalDef) => void }) {
  const { state } = useGame();
  const owned = state.buildings.map((id) => BUILDING_BY_ID[id]).filter(Boolean);

  return (
    <div className="meadow" data-season={state.season} data-phase={state.phase}>
      <div className="meadow-sky" aria-hidden />
      <div className="meadow-forest" aria-hidden />

      <div className="meadow-inner">
        <div className="yard">
          <div className="yard-people">
            {PEOPLE.map((p) => (
              <div key={p.id} className="person" title={`${p.name} — ${p.role}`}>
                <PersonSprite person={p} size={64} />
                <span className="person-tag">{p.name.split(" ")[0]}</span>
              </div>
            ))}
            <div className="cottage" title="Chalupa na Louce">🏡</div>
          </div>
          {owned.length > 0 && (
            <div className="yard-buildings" title="Tvoje stavby a vybavení">
              {owned.map((b) => (
                <span key={b.id} className="built" title={`${b.name} — ${b.benefit}`}>
                  {b.emoji}
                </span>
              ))}
            </div>
          )}
        </div>

        <Zone group="drubez" onSelect={onSelect} />
        <Zone group="prasata" onSelect={onSelect} />
        <Zone group="stado" onSelect={onSelect} />
        <Zone group="mazlici" onSelect={onSelect} />
      </div>
    </div>
  );
}
