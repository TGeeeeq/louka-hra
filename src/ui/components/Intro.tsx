import { useEffect, useState, type CSSProperties } from "react";
import { useGame } from "../store";
import { PEOPLE } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";
import { ANIMAL_BY_ID } from "../../game/content/animals";
import { AnimalSprite } from "../sprites/AnimalSprite";
import AFLogo from "./AFLogo";
import { sound } from "../../audio/sound";

const PEEK = ["karel", "princezna", "avala", "pogo", "riky", "roman", "husy", "kralici"];

type Stage = "rotate" | "logo" | "menu";

// Zběsilá smečka úvodního přeběhu: dráha (bottom v %), velikost, tempo,
// zpoždění a směr jsou ručně rozhozené, ať se zvířata míjejí a kříží.
// „jump" = skokani s výraznějším hopsáním (ovce, králíci, psi…).
const STAMPEDE: { id: string; y: number; size: number; dur: number; delay: number; dir: 1 | -1; jump?: boolean }[] = [
  { id: "riky", y: 4, size: 88, dur: 2.0, delay: 0.0, dir: 1, jump: true },
  { id: "husy", y: 16, size: 68, dur: 2.6, delay: 0.15, dir: -1 },
  { id: "pogo", y: 9, size: 80, dur: 1.7, delay: 0.4, dir: 1, jump: true },
  { id: "princezna", y: 2, size: 100, dur: 2.9, delay: 0.6, dir: -1 },
  { id: "kralici", y: 20, size: 54, dur: 1.5, delay: 0.8, dir: 1, jump: true },
  { id: "karel", y: 6, size: 106, dur: 3.2, delay: 1.0, dir: 1 },
  { id: "roman", y: 14, size: 62, dur: 1.8, delay: 1.2, dir: -1, jump: true },
  { id: "kachny", y: 22, size: 56, dur: 2.4, delay: 1.5, dir: 1 },
  { id: "avala", y: 3, size: 112, dur: 3.5, delay: 1.7, dir: -1 },
  { id: "flicek", y: 11, size: 74, dur: 1.9, delay: 2.0, dir: 1, jump: true },
  { id: "yakul", y: 7, size: 94, dur: 2.5, delay: 2.3, dir: -1 },
  { id: "pipinky", y: 18, size: 46, dur: 2.1, delay: 2.5, dir: 1, jump: true },
];

// Mobil držený na výšku → nejdřív poprosit o otočení (hra je dělaná naležato).
const needsRotate = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(orientation: portrait)").matches &&
  window.matchMedia("(pointer: coarse)").matches;

/**
 * Úvodní sekvence: (mobil na výšku → výzva k otočení) → zvířecí stampede,
 * při které se štětcem „nakreslí" logo azylu → východ slunce nad loukou
 * → menu. Klik/klávesa přeskočí, prefers-reduced-motion jde rovnou na menu.
 * Vše CSS/SVG + jeden webp — žádné knihovny, žádné velké assety.
 */
export function Intro({ onDlc }: { onDlc?: () => void }) {
  const { state, dispatch } = useGame();
  const hasSave = state.day > 1 || Object.keys(state.tasksDone).length > 0;
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [stage, setStage] = useState<Stage>(reduced ? "menu" : needsRotate() ? "rotate" : "logo");
  const [leaving, setLeaving] = useState(false);

  // Výzva k otočení: jakmile se telefon překlopí na šířku, spustí se animace.
  useEffect(() => {
    if (stage !== "rotate") return;
    const mq = window.matchMedia("(orientation: landscape)");
    const onChange = () => { if (mq.matches) setStage("logo"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [stage]);

  // Logo animace ~5,4 s (kreslení ~3 s + doznění), pak menu.
  // Jakýkoli klik/klávesa přeskočí.
  useEffect(() => {
    if (stage !== "logo") return;
    const t = window.setTimeout(() => setStage("menu"), 5400);
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

      {/* zběsilý přeběh zvířat přes spodek obrazovky během kreslení loga */}
      {stage === "logo" && (
        <div className="stampede" aria-hidden>
          {STAMPEDE.map((r) => {
            const a = ANIMAL_BY_ID[r.id];
            return a ? (
              <span
                key={r.id}
                className={`runner${r.jump ? " jumpy" : ""}${r.dir < 0 ? " rev" : ""}`}
                style={{ bottom: `${r.y}%`, "--dur": `${r.dur}s`, "--delay": `${r.delay}s` } as CSSProperties}
              >
                <span className="runner-bob">
                  <AnimalSprite animal={a} size={r.size} />
                </span>
              </span>
            ) : null;
          })}
        </div>
      )}

      {stage === "rotate" ? (
        <div className="intro-splash rotate-hint">
          <div className="rotate-phone" aria-hidden />
          <p className="rotate-title">Otoč telefon na šířku</p>
          <p className="rotate-sub">Louka se hraje naležato — zvířátka potřebují rozběh 🐾</p>
          <button className="rotate-anyway" onClick={() => setStage("logo")}>
            pokračovat na výšku
          </button>
        </div>
      ) : stage === "logo" ? (
        <div className="intro-splash logo-splash">
          <div className="splash-logo">
            <img
              className="splash-logo-img"
              src={`${import.meta.env.BASE_URL}logo.webp`}
              alt="Nech mě růst"
              width={1000}
              height={707}
            />
            {/* zlatá „tužka", která logo maluje */}
            <span className="splash-pen" aria-hidden />
          </div>
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
