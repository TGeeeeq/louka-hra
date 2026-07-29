import { useEffect, useRef, useState, type CSSProperties } from "react";
import { canLockLandscape, tryLockLandscape, usePortraitBlocked } from "../orientation";

// Světelné pyly nad kopci (left %, velikost px, délka a zpoždění v s) — stejný
// jazyk jako v menu, jen jich je méně: obrazovka má vést oko k telefonu.
const MOTES: { x: number; s: number; dur: number; delay: number }[] = [
  { x: 14, s: 5, dur: 12, delay: 0 },
  { x: 33, s: 3, dur: 15, delay: 2.5 },
  { x: 62, s: 4, dur: 10, delay: 1.2 },
  { x: 84, s: 5, dur: 13, delay: 4 },
];

/** Jak dlouho po otočení ještě dobíhá odchodová animace (ms). */
const OUT_MS = 460;

/** Miniatura louky uvnitř telefonu — akvarelový výsek, aby bylo co „nevejde se". */
function MiniMeadow() {
  return (
    <svg className="rg-mini" viewBox="0 0 240 240" aria-hidden>
      <defs>
        <linearGradient id="rg-sky-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe6f2" />
          <stop offset="62%" stopColor="#dcf1e4" />
        </linearGradient>
        <radialGradient id="rg-sun-g">
          <stop offset="0%" stopColor="#fff3c9" />
          <stop offset="55%" stopColor="#ffd36e" />
          <stop offset="100%" stopColor="rgba(255,211,110,0)" />
        </radialGradient>
      </defs>
      <rect width="240" height="240" fill="url(#rg-sky-g)" />
      <circle cx="168" cy="74" r="34" fill="url(#rg-sun-g)" />
      <path d="M0 168 Q56 138 112 162 T240 150 L240 240 L0 240 Z" fill="#8cc270" />
      <path d="M0 192 Q64 170 130 190 T240 182 L240 240 L0 240 Z" fill="#5e8a52" />
      <path d="M0 214 Q70 200 148 214 T240 208 L240 240 L0 240 Z" fill="#3f6b3c" />
      {/* pár keříků, ať se poznají hloubky */}
      <circle cx="42" cy="186" r="9" fill="#3f6b3c" opacity="0.7" />
      <circle cx="196" cy="196" r="11" fill="#2d5a3d" opacity="0.6" />
    </svg>
  );
}

/**
 * Zámek orientace: dokud je telefon na výšku, přes celou hru leží tahle
 * obrazovka. Scéna je stejná jako v intru (úsvit, kopce, pyly), aby to
 * nepůsobilo jako chybová hláška, ale jako první záběr Louky.
 *
 * Animace: rám telefonu se otočí na šířku, obraz louky uvnitř zůstává
 * vzpřímený (protiotočka) a v naležato ho konečně vidíš celý — vysvětlí to bez
 * jediného slova. Kolem obíhá oblouk se šipkou, pod tím výzva a nabídka
 * „otočit za mě" (fullscreen + zámek, kde to prohlížeč umí).
 *
 * Reduced-motion: telefon je staticky naležato, nic se netočí.
 */
export function RotateGate() {
  const blocked = usePortraitBlocked();
  // Po otočení se obrazovka neztrácí střihem, ale prolne do hry.
  const [visible, setVisible] = useState(blocked);
  const outTimer = useRef(0);

  useEffect(() => {
    window.clearTimeout(outTimer.current);
    if (blocked) setVisible(true);
    else if (visible) outTimer.current = window.setTimeout(() => setVisible(false), OUT_MS);
    return () => window.clearTimeout(outTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  // Dokud obrazovka leží nahoře, nic pod ní nesmí odscrollovat pryč.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`rotate-gate${blocked ? "" : " out"}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="rg-title"
      aria-describedby="rg-sub"
    >
      {/* scéna: úsvit nad kopci — stejná paleta jako intro */}
      <div className="rg-sky" aria-hidden>
        <span className="rg-sun" />
        <svg className="rg-hills back" viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice">
          <path
            d="M0 160 L0 90 Q80 40 160 82 T340 74 T520 88 T700 66 T880 84 T1060 70 L1200 84 L1200 160 Z"
            fill="#5e8a52"
          />
        </svg>
        <svg className="rg-hills front" viewBox="0 0 1200 140" preserveAspectRatio="xMidYMax slice">
          <path
            d="M0 140 L0 96 Q100 60 200 92 T420 86 T640 98 T860 80 T1080 94 L1200 88 L1200 140 Z"
            fill="#3f6b3c"
          />
        </svg>
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="rg-mote"
            style={{
              left: `${m.x}%`,
              width: m.s,
              height: m.s,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className="rg-stage">
        <div className="rg-anim" aria-hidden>
          <span className="rg-halo" />
          {/* oblouk se šipkou: dokreslí se přesně v okamžiku otáčení */}
          <svg className="rg-arc" viewBox="0 0 200 200">
            <path
              className="rg-arc-line"
              d="M158 46 A78 78 0 0 0 42 46"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <polygon className="rg-arc-tip" points="0,11 -7,-4 7,-4" transform="translate(42 46) rotate(42)" />
          </svg>
          <div className="rg-phone">
            <div className="rg-screen">
              <div className="rg-screen-inner">
                <MiniMeadow />
              </div>
            </div>
            <span className="rg-speaker" />
          </div>
        </div>

        <p className="rg-eyebrow">Louka</p>
        <h1 id="rg-title" className="rg-title">
          Otoč telefon na&nbsp;šířku
        </h1>
        <p id="rg-sub" className="rg-sub">
          Louka se hraje naležato. Jen tak před sebou uvidíš celou pastvinu, zvířata i cestu k lesu.
        </p>

        {canLockLandscape() && (
          <button className="rg-lock" onClick={tryLockLandscape}>
            Otočit za mě
          </button>
        )}

        <p className="rg-hint">
          <span className="rg-dot" aria-hidden />
          Hra se rozběhne sama, jak telefon otočíš.
        </p>
      </div>

      <p className="rg-foot" aria-hidden>
        azyl pro zvířata Nech mě růst
      </p>
    </div>
  );
}
