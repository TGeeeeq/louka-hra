import { useEffect, useState } from "react";
import { useGame } from "../store";
import { PEOPLE } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";
import { ANIMAL_BY_ID } from "../../game/content/animals";
import { AnimalSprite } from "../sprites/AnimalSprite";
import AFLogo from "./AFLogo";
import { sound } from "../../audio/sound";

const PEEK = ["karel", "princezna", "avala", "pogo", "riky", "roman", "husy", "kralici"];

type Stage = "logo" | "menu";

/**
 * Úvodní sekvence: logo azylu (kreslený lísteček) → východ slunce nad loukou
 * → menu. Klik/klávesa přeskočí, prefers-reduced-motion jde rovnou na menu.
 * Vše CSS/SVG — žádné knihovny, žádné velké assety.
 */
export function Intro({ onDlc }: { onDlc?: () => void }) {
  const { state, dispatch } = useGame();
  const hasSave = state.day > 1 || Object.keys(state.tasksDone).length > 0;
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [stage, setStage] = useState<Stage>(reduced ? "menu" : "logo");
  const [leaving, setLeaving] = useState(false);

  // Logo splash ~2,2 s, pak menu. Jakýkoli klik/klávesa přeskočí.
  useEffect(() => {
    if (stage !== "logo") return;
    const t = window.setTimeout(() => setStage("menu"), 2200);
    const skip = () => setStage("menu");
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [stage]);

  const start = (type: "START" | "RESET") => {
    sound.ensure();
    if (reduced) {
      dispatch({ type });
      return;
    }
    // krátký crossfade do hry místo tvrdého střihu
    setLeaving(true);
    window.setTimeout(() => dispatch({ type }), 420);
  };

  return (
    <div className={`intro ${stage === "menu" ? "sunrise" : ""} ${leaving ? "leaving" : ""}`}>
      {/* parallax vrstvy: slunce + siluety lesa (jen transform/opacity) */}
      <div className="intro-sky" aria-hidden>
        <div className="intro-sun" />
        <svg className="intro-hills back" viewBox="0 0 1200 160" preserveAspectRatio="none">
          <path d="M0 160 L0 90 Q80 40 160 82 T340 74 T520 88 T700 66 T880 84 T1060 70 L1200 84 L1200 160 Z" fill="#5e8a52" />
        </svg>
        <svg className="intro-hills front" viewBox="0 0 1200 140" preserveAspectRatio="none">
          <path d="M0 140 L0 96 Q100 60 200 92 T420 86 T640 98 T860 80 T1080 94 L1200 88 L1200 140 Z" fill="#3f6b3c" />
        </svg>
      </div>

      {stage === "logo" ? (
        <div className="intro-splash">
          <svg viewBox="0 0 120 120" width="120" height="120" aria-label="Nech mě růst">
            {/* stonek + lístky — kreslí se tahem (stroke-dashoffset) */}
            <path className="sprout draw1" d="M60 104 C60 84 60 66 60 48" fill="none" stroke="#2d5a3d" strokeWidth="5" strokeLinecap="round" />
            <path className="sprout draw2" d="M60 70 C48 66 38 56 36 42 C50 44 60 54 60 70 Z" fill="none" stroke="#4a8a5c" strokeWidth="4" strokeLinejoin="round" />
            <path className="sprout draw3" d="M60 56 C72 52 82 42 84 28 C70 30 60 40 60 56 Z" fill="none" stroke="#4a8a5c" strokeWidth="4" strokeLinejoin="round" />
          </svg>
          <p className="splash-name">Nech mě růst</p>
          <p className="splash-sub">azyl pro zvířata uvádí</p>
          <p className="splash-skip">klepni pro přeskočení</p>
        </div>
      ) : (
        <div className="intro-card">
          <div className="intro-peek">
            {PEEK.map((id, i) => {
              const a = ANIMAL_BY_ID[id];
              return a ? (
                <span key={id} className="peek-pop" style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
                  <AnimalSprite animal={a} size={62} />
                </span>
              ) : null;
            })}
          </div>
          <h1 className="intro-title">
            {"Louka".split("").map((ch, i) => (
              <span key={i} className="title-letter" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>{ch}</span>
            ))}
          </h1>
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
            <button className="big-btn" onClick={() => start("START")}>
              {hasSave ? "Pokračovat 🌱" : "Začít hrát 🌱"}
            </button>
            {hasSave && (
              <button className="ghost-btn" onClick={() => start("RESET")}>
                Nová hra od začátku
              </button>
            )}
            {onDlc && <button className="ghost-btn" onClick={onDlc}>🌾 Rozšíření</button>}
          </div>
          <p className="intro-credit">Postavičky, fotky a příběhy podle skutečných obyvatel Louky · nechmerust.org</p>
          <a className="af-credit" href="https://www.antoninfigueroa.cz" target="_blank" rel="noopener noreferrer" style={{ marginTop: 10 }}>
            <AFLogo size={34} />
            <span>web vytvořil <span className="af-name">Antonín Figueroa</span></span>
          </a>
        </div>
      )}
    </div>
  );
}
