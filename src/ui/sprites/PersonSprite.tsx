import type { PersonDef } from "../../game/content/people";

export type Facing = "down" | "up" | "side";

/** Posune barvu o `amt` v každém RGB kanálu (kladné = světlejší, záporné = tmavší). */
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + c(r + amt) + c(g + amt) + c(b + amt);
}

/** Roztomilá lidská postavička. `dir` = směr pohledu (z profilu se kreslí
 *  doprava, vlevo se zrcadlí na Canvasu), `frame` 0/1 = krok chůze.
 *  Objemové stínování přes gradienty — světlo z levého-horního rohu. */
export function PersonSprite({
  person,
  size = 88,
  className,
  dir = "down",
  frame = 0,
}: {
  person: PersonDef;
  size?: number;
  className?: string;
  dir?: Facing;
  frame?: 0 | 1;
}) {
  const { skin, hair, shirt, variant } = person;
  // krok: jedna noha/ruka dopředu, druhá dozadu
  const swing = frame === 0 ? 1 : -1;
  const lL = 44 + (dir === "side" ? -swing * 3 : 0);
  const lR = 54 + (dir === "side" ? swing * 3 : 0);
  const legYL = 92 + swing * 2;
  const legYR = 92 - swing * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={person.name}
    >
      <defs>
        {/* hlava jako koule — světlo vlevo-nahoře (výrazný objem, ať je vidět i v malém) */}
        <radialGradient id="skinG" cx="34%" cy="26%" r="74%">
          <stop offset="0" stopColor={shade(skin, 40)} />
          <stop offset="0.5" stopColor={skin} />
          <stop offset="1" stopColor={shade(skin, -34)} />
        </radialGradient>
        {/* trup jako válec — světlo z levého-horního */}
        <linearGradient id="shirtG" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={shade(shirt, 40)} />
          <stop offset="0.5" stopColor={shirt} />
          <stop offset="1" stopColor={shade(shirt, -36)} />
        </linearGradient>
        {/* vlasy jako objem */}
        <radialGradient id="hairG" cx="32%" cy="22%" r="72%">
          <stop offset="0" stopColor={shade(hair, 46)} />
          <stop offset="1" stopColor={shade(hair, -30)} />
        </radialGradient>
        {/* nohy (kalhoty) — válcový objem */}
        <linearGradient id="legG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e5440" />
          <stop offset="1" stopColor="#4a3828" />
        </linearGradient>
      </defs>

      <ellipse cx={50} cy={94} rx={18} ry={3} fill="#000" opacity={0.14} />
      {/* nohy (animované) */}
      <rect x={lL - 3} y={legYL - 6} width={6} height={10} rx={3} fill="url(#legG)" />
      <rect x={lR - 3} y={legYR - 6} width={6} height={10} rx={3} fill="url(#legG)" />
      {/* tělo / triko */}
      <path d="M31 90 Q31 62 50 62 Q69 62 69 90 Z" fill="url(#shirtG)" />
      {/* ruce (švih s krokem) */}
      <circle cx={29 + (dir === "side" ? swing * 2 : 0)} cy={76 + swing} r={5} fill={dir === "up" ? "url(#shirtG)" : "url(#skinG)"} />
      <circle cx={71 - (dir === "side" ? swing * 2 : 0)} cy={76 - swing} r={5} fill={dir === "up" ? "url(#shirtG)" : "url(#skinG)"} />
      {/* krk */}
      <rect x={45} y={52} width={10} height={10} fill="url(#skinG)" />

      {dir === "down" && <HeadFront variant={variant} />}
      {dir === "up" && <HeadBack variant={variant} />}
      {dir === "side" && <HeadSide variant={variant} />}
    </svg>
  );
}

function HeadFront({ variant }: { variant?: string }) {
  return (
    <g>
      <circle cx={50} cy={42} r={17} fill="url(#skinG)" />
      <path d="M33 40 Q33 22 50 22 Q67 22 67 40 Q60 30 50 30 Q40 30 33 40 Z" fill="url(#hairG)" />
      {variant === "ponytail" && (
        <>
          <ellipse cx={70} cy={42} rx={5} ry={11} fill="url(#hairG)" />
          <circle cx={66} cy={31} r={3} fill="url(#hairG)" />
        </>
      )}
      {variant === "hat" && (
        <>
          <ellipse cx={50} cy={28} rx={22} ry={5} fill="#9a7b4a" />
          <path d="M38 28 Q40 14 50 14 Q60 14 62 28 Z" fill="#b08a52" />
        </>
      )}
      <circle cx={43} cy={43} r={2.3} fill="#241f1c" />
      <circle cx={57} cy={43} r={2.3} fill="#241f1c" />
      <circle cx={42.3} cy={42.3} r={0.7} fill="#fff" />
      <circle cx={56.3} cy={42.3} r={0.7} fill="#fff" />
      <circle cx={40} cy={48} r={2.6} fill="#ef9a9a" opacity={0.5} />
      <circle cx={60} cy={48} r={2.6} fill="#ef9a9a" opacity={0.5} />
      <path d="M45 50 Q50 54 55 50" stroke="#7a4a3a" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {variant === "beard" && <path d="M37 47 Q39 62 50 62 Q61 62 63 47 Q57 56 50 56 Q43 56 37 47 Z" fill="url(#hairG)" />}
    </g>
  );
}

function HeadBack({ variant }: { variant?: string }) {
  return (
    <g>
      <circle cx={50} cy={42} r={17} fill="url(#hairG)" />
      <path d="M34 46 Q34 60 50 60 Q66 60 66 46" fill="none" stroke="url(#hairG)" strokeWidth={3} />
      {variant === "ponytail" && <ellipse cx={50} cy={44} rx={6} ry={13} fill="url(#hairG)" stroke="#0002" strokeWidth={0.5} />}
      {variant === "hat" && (
        <>
          <ellipse cx={50} cy={30} rx={22} ry={5} fill="#9a7b4a" />
          <path d="M36 30 Q38 16 50 16 Q62 16 64 30 Z" fill="#a07e48" />
        </>
      )}
    </g>
  );
}

function HeadSide({ variant }: { variant?: string }) {
  return (
    <g>
      <circle cx={50} cy={42} r={17} fill="url(#skinG)" />
      {/* vlasy vzadu (vlevo) a nahoře */}
      <path d="M33 44 Q31 22 50 22 Q60 22 63 30 Q54 28 46 30 Q37 33 36 46 Z" fill="url(#hairG)" />
      {variant === "hat" && (
        <>
          <ellipse cx={48} cy={28} rx={22} ry={5} fill="#9a7b4a" />
          <path d="M40 28 Q42 14 52 15 Q60 16 60 28 Z" fill="#b08a52" />
        </>
      )}
      {variant === "ponytail" && <ellipse cx={34} cy={42} rx={5} ry={11} fill="url(#hairG)" />}
      {/* nos a oko na pravé (čelní) straně */}
      <path d="M65 42 q4 2 0 5" stroke="url(#skinG)" strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={60} cy={42} r={2.3} fill="#241f1c" />
      <circle cx={59.3} cy={41.3} r={0.7} fill="#fff" />
      <circle cx={56} cy={48} r={2.4} fill="#ef9a9a" opacity={0.5} />
      <path d="M58 50 Q62 52 64 49" stroke="#7a4a3a" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {variant === "beard" && <path d="M52 48 Q54 60 62 56 Q64 50 62 47 Q58 52 52 48 Z" fill="url(#hairG)" />}
    </g>
  );
}
