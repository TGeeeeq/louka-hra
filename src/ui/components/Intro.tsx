import { useGame } from "../store";
import { PEOPLE } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";
import { ANIMAL_BY_ID } from "../../game/content/animals";
import { AnimalSprite } from "../sprites/AnimalSprite";

const PEEK = ["karel", "princezna", "avala", "pogo", "riky", "roman", "husy", "kralici"];

export function Intro() {
  const { state, dispatch } = useGame();
  const hasSave = state.day > 1 || Object.keys(state.tasksDone).length > 0;

  return (
    <div className="intro">
      <div className="intro-card">
        <div className="intro-peek">
          {PEEK.map((id) => {
            const a = ANIMAL_BY_ID[id];
            return a ? <AnimalSprite key={id} animal={a} size={62} /> : null;
          })}
        </div>
        <h1 className="intro-title">Louka</h1>
        <p className="intro-sub">survival azylu <b>Nech mě růst</b></p>
        <p className="intro-text">
          Dlouhá louka uprostřed lesů. Přes <b>sto zachráněných zvířat</b>, jeden den, jedny ruce.
          Vypusť drůbež, nakrm prasata i stádo, navař, nasbírej byliny, vyrob mast, prodej, ukliď,
          naštípej dřevo — a hlavně všechny <b>zavři před nocí</b>. Zvládneš se postarat a přežít i zimu?
        </p>

        <div className="intro-people">
          {PEOPLE.map((p) => (
            <div key={p.id} className="intro-person">
              <PersonSprite person={p} size={84} />
              <b>{p.name}</b>
              <small>{p.role}</small>
              <p>„{p.line}“</p>
            </div>
          ))}
        </div>

        <div className="intro-actions">
          <button className="big-btn" onClick={() => dispatch({ type: "START" })}>
            {hasSave ? "Pokračovat 🌱" : "Začít hrát 🌱"}
          </button>
          {hasSave && (
            <button className="ghost-btn" onClick={() => dispatch({ type: "RESET" })}>
              Nová hra od začátku
            </button>
          )}
        </div>
        <p className="intro-credit">Postavičky a příběhy podle skutečných obyvatel Louky · nechmerust.org</p>
      </div>
    </div>
  );
}
