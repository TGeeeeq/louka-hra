type AFLogoProps = { size?: number; className?: string };

/* Antonín Figueroa — animovaný monogram AF ve vesica piscis. Zlato na sumi.
   Páruje se s keyframes af-spin / af-spin-rev v global.css. */
export default function AFLogo({ size = 40, className = "" }: AFLogoProps) {
  return (
    <span aria-hidden className={`af-logo ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx="50" cy="50" r="50" fill="#0a0908" />
        <g className="af-spin-slow">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#d4a45a" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="2 4" />
        </g>
        <g className="af-spin-rev">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#d4a45a" strokeOpacity="0.55" strokeWidth="0.5" />
          <circle cx="50" cy="22" r="1.6" fill="#d4a45a" />
        </g>
        <circle cx="40" cy="50" r="22" fill="none" stroke="#d4a45a" strokeOpacity="0.7" strokeWidth="0.7" />
        <circle cx="60" cy="50" r="22" fill="none" stroke="#d4a45a" strokeOpacity="0.7" strokeWidth="0.7" />
      </svg>
      <span className="af-mono" style={{ fontSize: size * 0.42 }}>
        <span style={{ color: "#d4a45a" }}>A</span>
        <span style={{ marginLeft: -size * 0.06 }}>F</span>
      </span>
    </span>
  );
}
