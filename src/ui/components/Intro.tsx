import { useGame } from "../store";
import { PEOPLE } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";
import { ANIMAL_BY_ID } from "../../game/content/animals";
import { AnimalSprite } from "../sprites/AnimalSprite";
import AFLogo from "./AFLogo";
import { sound } from "../../audio/sound";

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
          Přijdeš na <b>zelenou louku</b> uprostřed lesů — a Tomáš tě provede od prvního kůlu.
          Postav si přístřešek, kuchyň, dílnu, chlívky i ohrady. Zvířátka už čekají na svůj domeček!
          A až bude Louka stát, začne to hlavní: přes <b>sto zachráněných zvířat</b> nakrmit,
          večer zavřít na klidnou noc a <b>přežít i zimu</b>. Zvládneš to?
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
          <button className="big-btn" onClick={() => { sound.ensure(); dispatch({ type: "START" }); }}>
            {hasSave ? "Pokračovat 🌱" : "Začít hrát 🌱"}
          </button>
          {hasSave && (
            <button className="ghost-btn" onClick={() => { sound.ensure(); dispatch({ type: "RESET" }); }}>
              Nová hra od začátku
            </button>
          )}
        </div>
        <p className="intro-credit">Postavičky a příběhy podle skutečných obyvatel Louky · nechmerust.org</p>
        <a className="af-credit" href="https://www.antoninfigueroa.cz" target="_blank" rel="noopener noreferrer" style={{ marginTop: 10 }}>
          <AFLogo size={34} />
          <span>web vytvořil <span className="af-name">Antonín Figueroa</span></span>
        </a>
      </div>
    </div>
  );
}
