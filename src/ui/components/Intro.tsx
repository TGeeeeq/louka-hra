import { useEffect, useState, type CSSProperties } from "react";
import { useGame } from "../store";
import { PEOPLE } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";
import { personPhotoUrl } from "../photo";
import { ANIMAL_BY_ID } from "../../game/content/animals";
import { AnimalSprite } from "../sprites/AnimalSprite";
import AFLogo from "./AFLogo";
import { CharacterCreator } from "./CharacterCreator";
import { SEASON_LABEL } from "../labels";
import { sound } from "../../audio/sound";
import { demoGateActive } from "../../platform";
import type { PlayerProfile } from "../../game/types";

type Stage = "af" | "choice" | "logo" | "outro" | "menu" | "creator";
type Orient = "landscape" | "portrait";

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

// Pasoucí se zvířata v menu — klidná dekorace na kopcích (left/bottom v %).
const GRAZE: { id: string; x: number; y: number; size: number; flip?: boolean }[] = [
  { id: "avala", x: 5, y: 9, size: 74 },
  { id: "karel", x: 16, y: 4, size: 86, flip: true },
  { id: "kralici", x: 30, y: 2, size: 44 },
  { id: "husy", x: 58, y: 3, size: 52, flip: true },
  { id: "princezna", x: 79, y: 7, size: 78 },
  { id: "riky", x: 91, y: 3, size: 62, flip: true },
];

// Světelné pyly plující scénou menu (left %, velikost px, délka a zpoždění s).
const MOTES: { x: number; s: number; dur: number; delay: number }[] = [
  { x: 12, s: 5, dur: 11, delay: 0 },
  { x: 26, s: 3, dur: 14, delay: 3 },
  { x: 41, s: 6, dur: 9, delay: 1.5 },
  { x: 58, s: 4, dur: 13, delay: 5 },
  { x: 71, s: 5, dur: 10, delay: 2.5 },
  { x: 86, s: 3, dur: 12, delay: 6.5 },
];

// Načasování intra: malba loga (2,4 s od 0,5 s) → usazení + záře → outro,
// při kterém se logo rozpustí do rozednění — žádný tvrdý střih do menu.
const OUTRO_AT = 6800;
const MENU_AT = OUTRO_AT + 1600;

// Studiová znělka AF na úvod: monogram drží ~2 s, pak crossfade do loga azylu.
const AF_HOLD = 2000;
const AF_FADE = 800;

// Dotykové zařízení na výšku → nabídnout volbu, jak hrát (hra umí obojí,
// naležato je ale pohodlnější). Desktop jde rovnou na intro.
const needsChoice = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(orientation: portrait)").matches &&
  window.matchMedia("(pointer: coarse)").matches;

// Volba „na šířku": zkusit fullscreen + zámek orientace. Best-effort —
// iOS Safari neumí ani jedno, hra pak prostě běží tak, jak telefon drží.
const tryLockLandscape = () => {
  const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
  const lock = () => {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    o?.lock?.("landscape").catch(() => {});
  };
  const fs = el.requestFullscreen?.();
  if (fs) fs.then(lock).catch(lock);
  else lock();
};

/**
 * Úvodní sekvence: (dotyk na výšku → volba orientace) → zvířecí stampede,
 * při které se štětcem „nakreslí" logo azylu → logo se rozpustí do východu
 * slunce → hlavní menu ve stejné scéně (plynulý crossfade, žádný střih).
 * Klik/klávesa přeskočí, prefers-reduced-motion jde rovnou na menu.
 * Vše CSS/SVG + jeden webp — žádné knihovny, žádné velké assety.
 */
export function Intro({ onFullVersion }: { onFullVersion?: () => void }) {
  const { state, dispatch } = useGame();
  const hasSave = state.day > 1 || Object.keys(state.tasksDone).length > 0;
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [stage, setStage] = useState<Stage>(reduced ? "menu" : needsChoice() ? "choice" : "af");
  const [orient, setOrient] = useState<Orient>("landscape");
  const [leaving, setLeaving] = useState(false);
  const [afLeaving, setAfLeaving] = useState(false);
  const [about, setAbout] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Intro: nejdřív studiová znělka AF (crossfade do loga azylu), pak se v čase
  // OUTRO_AT logo rozpouští a scéna rozednívá, v MENU_AT nastoupí menu.
  useEffect(() => {
    if (stage === "af") {
      sound.ensure();
      sound.ident();
      const t1 = window.setTimeout(() => setAfLeaving(true), AF_HOLD);
      const t2 = window.setTimeout(() => {
        setStage("logo");
        setAfLeaving(false);
      }, AF_HOLD + AF_FADE);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    if (stage === "logo") {
      const t = window.setTimeout(() => setStage("outro"), OUTRO_AT);
      return () => window.clearTimeout(t);
    }
    if (stage === "outro") {
      const t = window.setTimeout(() => setStage("menu"), MENU_AT - OUTRO_AT);
      return () => window.clearTimeout(t);
    }
  }, [stage]);

  // Jakýkoli klik/klávesa během intra skočí rovnou na menu. Schválně „click",
  // ne „pointerdown": menu by se jinak vykreslilo ještě před click fází a tentýž
  // ťuk by omylem zmáčkl tlačítko, které se objeví pod prstem.
  useEffect(() => {
    if (stage !== "af" && stage !== "logo" && stage !== "outro") return;
    const skip = () => setStage("menu");
    window.addEventListener("click", skip);
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("click", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [stage]);

  const confirmChoice = (e: React.MouseEvent) => {
    // nesmí probublat na window — skip listener intra by ho vzal jako „přeskoč"
    e.stopPropagation();
    sound.ensure();
    sound.select();
    if (orient === "landscape") tryLockLandscape();
    setStage("af");
  };

  const start = (type: "START" | "RESET", profile?: PlayerProfile) => {
    sound.ensure();
    if (reduced) {
      dispatch(type === "RESET" ? { type, profile } : { type });
      return;
    }
    // krátký crossfade do hry místo tvrdého střihu
    setLeaving(true);
    window.setTimeout(() => dispatch(type === "RESET" ? { type, profile } : { type }), 420);
  };

  const newGame = () => {
    if (hasSave) setConfirmReset(true);
    else setStage("creator");
  };

  // Tvůrce postavy potvrdil podobu → ulož profil a začni novou hru.
  const finishCreator = (p: PlayerProfile) => {
    dispatch({ type: "SET_PLAYER_PROFILE", profile: p });
    start("RESET", p);
  };

  const inMenu = stage === "menu";
  const dawn = inMenu || stage === "outro";

  return (
    <div className={`intro ${dawn ? "sunrise" : ""} ${leaving ? "leaving" : ""}`}>
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
      {(stage === "logo" || stage === "outro") && (
        <div className={`stampede${stage === "outro" ? " out" : ""}`} aria-hidden>
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

      {/* studiová znělka AF — přes černou, plynule přejde do loga azylu */}
      {(stage === "af" || afLeaving) && (
        <div className={`af-splash${afLeaving ? " out" : ""}`}>
          <AFLogo size={300} className="af-hero" />
          <p className="af-splash-sub">Antonín Figueroa uvádí</p>
        </div>
      )}

      {stage === "creator" ? (
        <CharacterCreator initial={state.profile} onBack={() => setStage("menu")} onConfirm={finishCreator} />
      ) : stage === "choice" ? (
        <div className="intro-splash orient-splash">
          <p className="orient-eyebrow">Nech mě růst uvádí</p>
          <h1 className="orient-title">Jak chceš hrát?</h1>
          <p className="orient-sub">Louku si nejlíp užiješ na šířku — ale je to na tobě.</p>
          <div className="orient-cards" role="radiogroup" aria-label="Orientace obrazovky">
            <button
              className={`orient-card${orient === "landscape" ? " on" : ""}`}
              role="radio"
              aria-checked={orient === "landscape"}
              onClick={() => setOrient("landscape")}
            >
              <span className="orient-badge">doporučeno</span>
              <span className="orient-glyph wide" aria-hidden />
              <b>Na šířku</b>
              <small>celá Louka před tebou</small>
            </button>
            <button
              className={`orient-card${orient === "portrait" ? " on" : ""}`}
              role="radio"
              aria-checked={orient === "portrait"}
              onClick={() => setOrient("portrait")}
            >
              <span className="orient-glyph tall" aria-hidden />
              <b>Na výšku</b>
              <small>hraní jednou rukou</small>
            </button>
          </div>
          <button className="orient-go" onClick={confirmChoice}>
            Spustit ▸
          </button>
        </div>
      ) : stage === "menu" ? (
        <div className="menu-screen">
          {/* pasoucí se zvířata + světelné pyly — klidný život ve scéně */}
          <div className="menu-fauna" aria-hidden>
            {GRAZE.map((g, i) => {
              const a = ANIMAL_BY_ID[g.id];
              return a ? (
                <span
                  key={g.id}
                  className={`graze${g.flip ? " flip" : ""}`}
                  style={{ left: `${g.x}%`, bottom: `${g.y}%`, animationDelay: `${0.4 + i * 0.12}s`, "--bob": `${3.2 + i * 0.4}s` } as CSSProperties}
                >
                  <AnimalSprite animal={a} size={g.size} />
                </span>
              ) : null;
            })}
            {MOTES.map((m, i) => (
              <span
                key={i}
                className="mote"
                style={{ left: `${m.x}%`, width: m.s, height: m.s, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }}
              />
            ))}
          </div>

          <div className="menu-hero">
            <h1 className="menu-title">Louka</h1>
            <p className="menu-tag">survival azylu Nech mě růst</p>
            {demoGateActive() && !state.fullVersion && (
              <p className="menu-demo-note">Demo verze — plnou hru odemkneš ve hře</p>
            )}
          </div>

          <nav className="menu-nav" aria-label="Hlavní menu">
            {hasSave ? (
              <>
                <button className="menu-btn primary" style={{ animationDelay: "0.55s" }} onClick={() => start("START")}>
                  Pokračovat
                  <small>Den {state.day} · {SEASON_LABEL[state.season]}</small>
                </button>
                <button className="menu-btn" style={{ animationDelay: "0.65s" }} onClick={newGame}>
                  Nová hra
                </button>
              </>
            ) : (
              <button className="menu-btn primary" style={{ animationDelay: "0.55s" }} onClick={() => setStage("creator")}>
                Začít hrát
              </button>
            )}
            <button className="menu-btn" style={{ animationDelay: "0.75s" }} onClick={() => setAbout(true)}>
              O Louce
            </button>
            {onFullVersion && (
              <button className="menu-btn" style={{ animationDelay: "0.85s" }} onClick={onFullVersion}>
                Plná verze
              </button>
            )}
          </nav>

          <footer className="menu-foot">
            <span>Podle skutečných zvířat azylu · nechmerust.org</span>
            <a className="af-credit" href="https://www.antoninfigueroa.cz" target="_blank" rel="noopener noreferrer">
              <AFLogo size={26} />
              <span>web vytvořil <span className="af-name">Antonín Figueroa</span></span>
            </a>
          </footer>
        </div>
      ) : (
        <div className={`intro-splash logo-splash${stage === "outro" ? " out" : ""}`}>
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
      )}

      {/* O Louce — příběh hry a průvodci (dřív rozházené po menu kartě) */}
      {about && (
        <div className="modal-backdrop" onClick={() => setAbout(false)}>
          <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAbout(false)} aria-label="Zavřít">×</button>
            <h2>O Louce</h2>
            <p className="intro-text">
              Přijdeš na <b>zelenou louku</b> uprostřed lesů — a Tomáš tě provede od prvního kůlu.
              Postav si přístřešek, kuchyň, dílnu, chlívky i ohrady. Zvířátka už čekají na svůj domeček!
              A až bude Louka stát, začne to hlavní: přes <b>sto zachráněných zvířat</b> nakrmit,
              večer zavřít na klidnou noc a <b>přežít i zimu</b>. Zvládneš to?
            </p>
            <div className="intro-people">
              {PEOPLE.map((p) => (
                <div key={p.id} className="intro-person">
                  {personPhotoUrl(p) ? (
                    <img className="npc-photo" src={personPhotoUrl(p)!} alt={p.name} width={84} height={84} />
                  ) : (
                    <PersonSprite person={p} size={84} />
                  )}
                  <b>{p.name}</b>
                  <small>{p.role}</small>
                  <p>„{p.line}“</p>
                </div>
              ))}
            </div>
            <p className="intro-credit">Postavičky, fotky a příběhy podle skutečných obyvatel Louky · nechmerust.org</p>
          </div>
        </div>
      )}

      {/* Nová hra přes uložený postup — potvrzení, ať o něj hráč nepřijde omylem */}
      {confirmReset && (
        <div className="modal-backdrop" onClick={() => setConfirmReset(false)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Začít znovu?</h2>
            <p className="intro-text">
              Uložený postup (Den {state.day} · {SEASON_LABEL[state.season]}) se smaže a Louka začne od prvního dne.
            </p>
            <div className="intro-actions">
              <button className="big-btn" onClick={() => { setConfirmReset(false); setStage("creator"); }}>Ano, začít znovu</button>
              <button className="ghost-btn" onClick={() => setConfirmReset(false)}>Zpět</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
