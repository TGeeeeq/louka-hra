import type { AnimalDef, SpritePalette, Species } from "../../game/types";

// Roztomilé, rozpoznatelné SVG postavičky. Chibi proporce: velká hlava,
// kulaté tělo, výrazné oči. Každý druh má svůj charakteristický znak
// (osel = dlouhé uši, muflon = rohy, kočka = uši + vousky…).
//
// Objem přidávají gradienty (světlo zleva-shora, stín vpravo-dole).
// Akcenty (oči, zobák, vousky, rohy…) zůstávají ploché.

const EYE = "#241f1c";

// Posune hex barvu o `amt` (kladně světlejší, záporně tmavší).
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + c(r + amt) + c(g + amt) + c(b + amt);
}

// Gradientové <defs> z palety — kulový objem pro tělo/hlavu, válcový pro tmavé části.
// Každá instance dostane vlastní prefix v ID, aby více spritů v jednom DOM nekolidovalo.
function VolumeDefs({ pal }: { pal: SpritePalette }) {
  const body = pal.body;
  const dark = pal.bodyDark ?? shade(body, -34);
  const belly = pal.belly ?? shade(body, 24);
  const detail = pal.detail ?? body;
  return (
    <defs>
      {/* Výraznější objem — sprity jsou ve světě malé (~36 px), jemný gradient
          se ztrácí, takže kontrast highlight/stín je schválně silný. */}
      <radialGradient id="bodyG" cx="34%" cy="26%" r="78%">
        <stop offset="0" stopColor={shade(body, 50)} />
        <stop offset="0.5" stopColor={body} />
        <stop offset="1" stopColor={shade(body, -42)} />
      </radialGradient>
      <radialGradient id="headG" cx="30%" cy="24%" r="74%">
        <stop offset="0" stopColor={shade(body, 60)} />
        <stop offset="0.48" stopColor={body} />
        <stop offset="1" stopColor={shade(body, -38)} />
      </radialGradient>
      <radialGradient id="bellyG" cx="40%" cy="28%" r="82%">
        <stop offset="0" stopColor={shade(belly, 34)} />
        <stop offset="1" stopColor={shade(belly, -26)} />
      </radialGradient>
      <linearGradient id="darkG" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor={shade(dark, 30)} />
        <stop offset="1" stopColor={shade(dark, -28)} />
      </linearGradient>
      <radialGradient id="detailG" cx="36%" cy="28%" r="78%">
        <stop offset="0" stopColor={shade(detail, 40)} />
        <stop offset="1" stopColor={shade(detail, -28)} />
      </radialGradient>
    </defs>
  );
}

function Eye({ x, y, r = 3.4 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill={EYE} />
      <circle cx={x - r * 0.3} cy={y - r * 0.4} r={r * 0.38} fill="#fff" opacity={0.95} />
    </g>
  );
}

function Cheek({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3} fill="#ef9a9a" opacity={0.5} />;
}

type P = { pal: SpritePalette; variant?: string };

function Hen({ pal }: P) {
  return (
    <g>
      <ellipse cx={36} cy={84} rx={14} ry={4} fill="#000" opacity={0.12} />
      {/* ocas */}
      <path d="M18 60 Q6 48 14 44 Q16 54 24 56 Z" fill="url(#darkG)" />
      <path d="M16 64 Q2 56 10 50 Q14 60 22 60 Z" fill="url(#bodyG)" />
      {/* tělo */}
      <ellipse cx={38} cy={62} rx={22} ry={20} fill="url(#bodyG)" />
      <ellipse cx={40} cy={68} rx={15} ry={12} fill="url(#bellyG)" opacity={0.6} />
      <ellipse cx={34} cy={60} rx={9} ry={11} fill={pal.bodyDark} opacity={0.5} />
      {/* hlava */}
      <circle cx={58} cy={44} r={14} fill="url(#headG)" />
      {/* hřebínek */}
      <circle cx={54} cy={30} r={4} fill={pal.detail} />
      <circle cx={60} cy={28} r={4.5} fill={pal.detail} />
      <circle cx={66} cy={31} r={3.5} fill={pal.detail} />
      {/* zobák */}
      <path d="M70 44 L80 47 L70 50 Z" fill={pal.accent} />
      {/* lalok */}
      <ellipse cx={66} cy={53} rx={3} ry={4} fill={pal.detail} />
      <Eye x={62} y={43} />
      <Cheek x={54} y={49} />
      {/* nohy */}
      <line x1={34} y1={80} x2={32} y2={88} stroke={pal.accent} strokeWidth={2.4} />
      <line x1={44} y1={80} x2={46} y2={88} stroke={pal.accent} strokeWidth={2.4} />
    </g>
  );
}

function Goose({ pal }: P) {
  return (
    <g>
      <ellipse cx={42} cy={84} rx={16} ry={4} fill="#000" opacity={0.12} />
      <ellipse cx={40} cy={66} rx={24} ry={17} fill="url(#bodyG)" />
      <ellipse cx={36} cy={70} rx={16} ry={11} fill="url(#bellyG)" opacity={0.7} />
      <path d="M58 36 Q60 22 54 16" stroke={pal.body} strokeWidth={11} fill="none" strokeLinecap="round" />
      <circle cx={54} cy={18} r={9} fill="url(#headG)" />
      <path d="M62 18 L74 21 L62 24 Z" fill={pal.detail} />
      <Eye x={57} y={16} r={3} />
      {/* křídlo */}
      <path d="M30 60 Q44 56 50 66 Q40 70 30 66 Z" fill={pal.bodyDark} opacity={0.5} />
      <line x1={38} y1={82} x2={36} y2={90} stroke={pal.detail} strokeWidth={2.6} />
      <line x1={48} y1={82} x2={50} y2={90} stroke={pal.detail} strokeWidth={2.6} />
    </g>
  );
}

function Duck({ pal, variant }: P) {
  const mallard = variant === "mallard";
  const head = mallard ? pal.bodyDark : pal.body;
  const headFill = mallard ? "url(#darkG)" : "url(#headG)";
  return (
    <g>
      <ellipse cx={40} cy={84} rx={16} ry={4} fill="#000" opacity={0.12} />
      <ellipse cx={38} cy={66} rx={23} ry={16} fill="url(#bodyG)" />
      <ellipse cx={34} cy={70} rx={15} ry={10} fill="url(#bellyG)" opacity={0.7} />
      {/* křídlo s modrým zrcátkem */}
      <path d="M28 60 Q42 56 50 66 Q40 71 28 67 Z" fill={pal.accent} opacity={0.55} />
      <path d="M54 40 Q56 30 52 24" stroke={head} strokeWidth={12} fill="none" strokeLinecap="round" />
      <circle cx={56} cy={26} r={11} fill={headFill} />
      {mallard && <path d="M46 30 Q56 33 66 30" stroke="#e8e2d0" strokeWidth={1.6} fill="none" />}
      <path d="M66 26 Q78 25 78 29 Q78 33 66 31 Z" fill={pal.detail} />
      <Eye x={59} y={24} r={3} />
      <line x1={36} y1={81} x2={34} y2={89} stroke={pal.detail} strokeWidth={2.6} />
      <line x1={46} y1={81} x2={48} y2={89} stroke={pal.detail} strokeWidth={2.6} />
    </g>
  );
}

function Dove({ pal }: P) {
  return (
    <g>
      <ellipse cx={42} cy={84} rx={14} ry={4} fill="#000" opacity={0.12} />
      <ellipse cx={42} cy={62} rx={21} ry={18} fill="url(#bodyG)" />
      <ellipse cx={40} cy={68} rx={13} ry={10} fill="url(#bellyG)" opacity={0.7} />
      <path d="M22 58 Q16 54 20 50 Q26 56 30 58 Z" fill="url(#darkG)" />
      <circle cx={60} cy={46} r={12} fill="url(#headG)" />
      <path d="M58 40 Q62 38 66 41" stroke={pal.accent} strokeWidth={3} fill="none" opacity={0.6} />
      <path d="M71 46 L79 48 L71 50 Z" fill={pal.detail} />
      <Eye x={64} y={45} r={3} />
      <line x1={38} y1={79} x2={37} y2={87} stroke={pal.detail} strokeWidth={2.2} />
      <line x1={47} y1={79} x2={48} y2={87} stroke={pal.detail} strokeWidth={2.2} />
    </g>
  );
}

function Pig({ pal, variant }: P) {
  const boar = variant === "boar";
  return (
    <g>
      <ellipse cx={50} cy={85} rx={26} ry={5} fill="#000" opacity={0.12} />
      {/* ocásek */}
      <path d="M22 60 q-8 0 -8 -6 q0 -5 5 -4" stroke={pal.bodyDark} strokeWidth={2.6} fill="none" />
      <ellipse cx={50} cy={62} rx={30} ry={22} fill="url(#bodyG)" />
      <ellipse cx={52} cy={70} rx={20} ry={13} fill="url(#bellyG)" opacity={0.55} />
      {variant === "spot" && <ellipse cx={38} cy={56} rx={8} ry={7} fill={pal.accent} opacity={0.85} />}
      {/* uši */}
      <path d="M64 44 L72 30 L78 46 Z" fill={pal.bodyDark} />
      <path d="M40 44 L34 32 L48 40 Z" fill={pal.bodyDark} opacity={0.85} />
      {/* hlava + rypák */}
      <circle cx={66} cy={56} r={18} fill="url(#headG)" />
      <ellipse cx={80} cy={60} rx={9} ry={8} fill={pal.detail} />
      <circle cx={77} cy={60} r={1.8} fill="#7a3a3a" />
      <circle cx={83} cy={60} r={1.8} fill="#7a3a3a" />
      <Eye x={68} y={50} r={3.2} />
      <Cheek x={60} y={58} />
      {boar && <path d="M74 66 L70 72 L76 70 Z" fill="#efe6d2" />}
      {/* nožky */}
      <rect x={36} y={80} width={6} height={8} rx={2} fill="url(#darkG)" />
      <rect x={58} y={80} width={6} height={8} rx={2} fill="url(#darkG)" />
    </g>
  );
}

function Donkey({ pal }: P) {
  return (
    <g>
      <ellipse cx={48} cy={86} rx={26} ry={5} fill="#000" opacity={0.12} />
      <ellipse cx={46} cy={58} rx={27} ry={19} fill="url(#bodyG)" />
      <ellipse cx={46} cy={66} rx={18} ry={11} fill="url(#bellyG)" opacity={0.6} />
      {/* ocas */}
      <path d="M20 52 q-6 8 -3 16" stroke={pal.detail} strokeWidth={3} fill="none" />
      <circle cx={17} cy={68} r={3} fill={pal.detail} />
      {/* dlouhé uši — poznávací znak */}
      <ellipse cx={62} cy={24} rx={5} ry={15} fill={pal.body} transform="rotate(-12 62 24)" />
      <ellipse cx={62} cy={26} rx={2.4} ry={11} fill={pal.detail} transform="rotate(-12 62 24)" opacity={0.6} />
      <ellipse cx={76} cy={26} rx={5} ry={15} fill={pal.body} transform="rotate(10 76 26)" />
      <ellipse cx={76} cy={28} rx={2.4} ry={11} fill={pal.detail} transform="rotate(10 76 26)" opacity={0.6} />
      {/* hříva */}
      <path d="M56 30 Q60 40 66 44" stroke={pal.detail} strokeWidth={4} fill="none" />
      {/* hlava */}
      <ellipse cx={70} cy={50} rx={14} ry={15} fill="url(#headG)" />
      <ellipse cx={78} cy={58} rx={9} ry={8} fill="url(#bellyG)" />
      <circle cx={75} cy={58} r={1.6} fill={pal.detail} />
      <circle cx={81} cy={58} r={1.6} fill={pal.detail} />
      <Eye x={71} y={47} r={3} />
      {/* nohy */}
      <rect x={32} y={72} width={6} height={15} rx={2} fill="url(#darkG)" />
      <rect x={52} y={72} width={6} height={15} rx={2} fill="url(#darkG)" />
    </g>
  );
}

function Mouflon({ pal }: P) {
  return (
    <g>
      <ellipse cx={48} cy={86} rx={25} ry={5} fill="#000" opacity={0.12} />
      <ellipse cx={46} cy={60} rx={26} ry={18} fill="url(#bodyG)" />
      <ellipse cx={46} cy={67} rx={17} ry={10} fill="url(#bellyG)" opacity={0.55} />
      <path d="M22 56 q-6 6 -2 14" stroke={pal.bodyDark} strokeWidth={3} fill="none" />
      <ellipse cx={70} cy={52} rx={14} ry={14} fill="url(#headG)" />
      <ellipse cx={78} cy={58} rx={8} ry={7} fill="url(#bellyG)" />
      {/* zatočené rohy — poznávací znak */}
      <path d="M62 42 Q50 34 54 22 Q58 16 64 20" stroke={pal.detail} strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M78 42 Q90 34 86 22 Q82 16 76 20" stroke={pal.detail} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Eye x={70} y={50} r={3} />
      <circle cx={78} cy={59} r={1.6} fill={pal.accent} />
      <rect x={34} y={74} width={5.5} height={13} rx={2} fill="url(#darkG)" />
      <rect x={54} y={74} width={5.5} height={13} rx={2} fill="url(#darkG)" />
    </g>
  );
}

function Cow({ pal, variant }: P) {
  return (
    <g>
      <ellipse cx={50} cy={87} rx={28} ry={5} fill="#000" opacity={0.12} />
      <ellipse cx={48} cy={58} rx={30} ry={21} fill="url(#bodyG)" />
      <ellipse cx={48} cy={66} rx={20} ry={12} fill="url(#bellyG)" opacity={0.5} />
      {variant === "strakata" && (
        <>
          <ellipse cx={34} cy={52} rx={10} ry={9} fill={pal.bodyDark} />
          <ellipse cx={62} cy={62} rx={9} ry={8} fill={pal.bodyDark} />
        </>
      )}
      {variant === "hneda" && <ellipse cx={40} cy={54} rx={11} ry={9} fill={pal.bodyDark} opacity={0.5} />}
      <path d="M22 50 q-7 9 -3 18" stroke={pal.bodyDark} strokeWidth={3} fill="none" />
      {/* hlava */}
      <ellipse cx={72} cy={50} rx={15} ry={14} fill="url(#headG)" />
      {/* růžky + uši */}
      <path d="M64 40 q-3 -8 2 -10" stroke="#d8cdb6" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <path d="M82 40 q3 -8 -2 -10" stroke="#d8cdb6" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <ellipse cx={60} cy={48} rx={5} ry={3.5} fill={pal.body} transform="rotate(-20 60 48)" />
      <ellipse cx={86} cy={50} rx={5} ry={3.5} fill={pal.body} transform="rotate(20 86 50)" />
      {/* čenich */}
      <ellipse cx={78} cy={58} rx={11} ry={8} fill={pal.detail} />
      <circle cx={75} cy={59} r={1.8} fill="#9a5a5a" />
      <circle cx={82} cy={59} r={1.8} fill="#9a5a5a" />
      <Eye x={70} y={46} r={3.2} />
      <Cheek x={64} y={53} />
      <rect x={36} y={76} width={6} height={12} rx={2} fill="url(#darkG)" />
      <rect x={58} y={76} width={6} height={12} rx={2} fill="url(#darkG)" />
    </g>
  );
}

function woolBumps(cx: number, cy: number, rx: number, ry: number, fill: string) {
  const pts = [
    [-rx, 0], [-rx * 0.7, -ry * 0.7], [0, -ry], [rx * 0.7, -ry * 0.7],
    [rx, 0], [rx * 0.7, ry * 0.6], [0, ry * 0.85], [-rx * 0.7, ry * 0.6],
  ];
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
      {pts.map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx} cy={cy + dy} r={ry * 0.5} fill={fill} />
      ))}
    </g>
  );
}

function Sheep({ pal, variant }: P) {
  const old = variant === "stara";
  const beran = variant === "beran";
  return (
    <g>
      <ellipse cx={48} cy={87} rx={26} ry={5} fill="#000" opacity={0.12} />
      {woolBumps(44, 58, 24, 18, "url(#bodyG)")}
      <ellipse cx={44} cy={60} rx={12} ry={9} fill="url(#bellyG)" opacity={0.5} />
      {/* hlava */}
      <ellipse cx={70} cy={52} rx={12} ry={13} fill="url(#detailG)" />
      <ellipse cx={70} cy={46} rx={11} ry={8} fill={old ? pal.bodyDark : "url(#detailG)"} />
      {/* ofina vlny */}
      <circle cx={66} cy={42} r={5} fill="url(#bodyG)" />
      <circle cx={74} cy={42} r={5} fill="url(#bodyG)" />
      {/* uši */}
      <ellipse cx={58} cy={50} rx={5} ry={3} fill={pal.detail} transform="rotate(20 58 50)" />
      <ellipse cx={82} cy={50} rx={5} ry={3} fill={pal.detail} transform="rotate(-20 82 50)" />
      {beran && (
        <>
          <path d="M60 48 Q52 52 56 60 Q60 62 62 56" stroke={pal.accent} strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <path d="M80 48 Q88 52 84 60 Q80 62 78 56" stroke={pal.accent} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        </>
      )}
      <Eye x={67} y={50} r={2.8} />
      <Eye x={75} y={50} r={2.8} />
      <ellipse cx={71} cy={58} rx={3} ry={2} fill="#3a3330" />
      <rect x={34} y={74} width={5} height={13} rx={2} fill="url(#detailG)" />
      <rect x={52} y={74} width={5} height={13} rx={2} fill="url(#detailG)" />
    </g>
  );
}

function Dog({ pal, variant }: P) {
  const shaggy = variant === "shaggy";
  const guard = variant === "guard";
  return (
    <g>
      <ellipse cx={48} cy={86} rx={26} ry={5} fill="#000" opacity={0.12} />
      {/* ocas */}
      <path d="M20 56 q-10 -4 -8 -14" stroke={pal.body} strokeWidth={6} fill="none" strokeLinecap="round" />
      {shaggy ? woolBumps(46, 60, 26, 19, "url(#bodyG)") : <ellipse cx={46} cy={60} rx={26} ry={19} fill="url(#bodyG)" />}
      <ellipse cx={48} cy={67} rx={17} ry={11} fill="url(#bellyG)" opacity={0.6} />
      {variant === "blacktan" && <ellipse cx={50} cy={68} rx={15} ry={9} fill={pal.belly} />}
      {/* uši */}
      {guard ? (
        <>
          <path d="M62 40 L60 26 L70 38 Z" fill={pal.bodyDark} />
          <path d="M82 40 L86 26 L76 38 Z" fill={pal.bodyDark} />
        </>
      ) : (
        <>
          <ellipse cx={61} cy={44} rx={6} ry={12} fill={pal.bodyDark} transform="rotate(20 61 44)" />
          <ellipse cx={84} cy={44} rx={6} ry={12} fill={pal.bodyDark} transform="rotate(-20 84 44)" />
        </>
      )}
      {shaggy && <circle cx={72} cy={40} r={4} fill={pal.body} />}
      <circle cx={72} cy={52} r={15} fill="url(#headG)" />
      <ellipse cx={80} cy={58} rx={9} ry={7} fill="url(#bellyG)" />
      <ellipse cx={84} cy={56} rx={3.4} ry={2.8} fill={pal.detail} />
      <Eye x={68} y={48} r={3.2} />
      <Eye x={78} y={49} r={3} />
      <path d="M82 61 q-2 4 -4 4" stroke={pal.accent} strokeWidth={2} fill="none" />
      <rect x={36} y={74} width={6} height={13} rx={2.5} fill="url(#darkG)" />
      <rect x={56} y={74} width={6} height={13} rx={2.5} fill="url(#darkG)" />
    </g>
  );
}

function Cat({ pal, variant }: P) {
  const tripod = variant === "tripod";
  const blue = variant === "blueeyes";
  const eyeColor = blue ? "#3a8ec0" : EYE;
  return (
    <g>
      <ellipse cx={48} cy={86} rx={24} ry={5} fill="#000" opacity={0.12} />
      {/* ocas */}
      <path d="M22 64 q-12 2 -10 -10 q1 -6 7 -5" stroke={pal.body} strokeWidth={6} fill="none" strokeLinecap="round" />
      {variant === "shaggy" ? woolBumps(46, 62, 23, 17, "url(#bodyG)") : <ellipse cx={46} cy={62} rx={23} ry={17} fill="url(#bodyG)" />}
      <ellipse cx={48} cy={69} rx={14} ry={9} fill="url(#bellyG)" opacity={0.65} />
      {variant === "calico" && (
        <>
          <ellipse cx={36} cy={56} rx={8} ry={7} fill={pal.detail} opacity={0.85} />
          <ellipse cx={60} cy={60} rx={6} ry={6} fill={pal.accent} opacity={0.7} />
        </>
      )}
      {variant === "tabby" && (
        <>
          <path d="M40 50 q4 4 0 8" stroke={pal.bodyDark} strokeWidth={2} fill="none" />
          <path d="M48 48 q4 5 0 10" stroke={pal.bodyDark} strokeWidth={2} fill="none" />
        </>
      )}
      {/* uši */}
      <path d="M60 40 L57 26 L69 38 Z" fill={pal.body} />
      <path d="M84 40 L87 26 L75 38 Z" fill={pal.body} />
      <path d="M61 38 L59 30 L66 37 Z" fill={pal.detail} opacity={0.6} />
      <circle cx={72} cy={50} r={15} fill="url(#headG)" />
      {/* oči */}
      <ellipse cx={67} cy={49} rx={3.2} ry={4} fill={eyeColor} />
      <ellipse cx={78} cy={49} rx={3.2} ry={4} fill={eyeColor} />
      <circle cx={66} cy={47.5} r={1} fill="#fff" />
      <circle cx={77} cy={47.5} r={1} fill="#fff" />
      {/* čumák + vousky */}
      <path d="M70 55 L74 55 L72 58 Z" fill={pal.detail} />
      <line x1={62} y1={55} x2={50} y2={53} stroke={pal.bodyDark} strokeWidth={1} opacity={0.6} />
      <line x1={62} y1={57} x2={50} y2={58} stroke={pal.bodyDark} strokeWidth={1} opacity={0.6} />
      <line x1={82} y1={55} x2={94} y2={53} stroke={pal.bodyDark} strokeWidth={1} opacity={0.6} />
      <line x1={82} y1={57} x2={94} y2={58} stroke={pal.bodyDark} strokeWidth={1} opacity={0.6} />
      {/* nožky (tripod = jen jedna přední vidět) */}
      <rect x={38} y={76} width={5.5} height={11} rx={2.5} fill="url(#bodyG)" />
      {!tripod && <rect x={56} y={76} width={5.5} height={11} rx={2.5} fill="url(#bodyG)" />}
    </g>
  );
}

function Rabbit({ pal }: P) {
  return (
    <g>
      <ellipse cx={48} cy={86} rx={22} ry={5} fill="#000" opacity={0.12} />
      {/* dlouhé uši */}
      <ellipse cx={56} cy={26} rx={5} ry={18} fill={pal.body} transform="rotate(-8 56 26)" />
      <ellipse cx={56} cy={26} rx={2.4} ry={13} fill={pal.detail} transform="rotate(-8 56 26)" opacity={0.5} />
      <ellipse cx={70} cy={26} rx={5} ry={18} fill={pal.body} transform="rotate(8 70 26)" />
      <ellipse cx={70} cy={26} rx={2.4} ry={13} fill={pal.detail} transform="rotate(8 70 26)" opacity={0.5} />
      <ellipse cx={44} cy={66} rx={22} ry={16} fill="url(#bodyG)" />
      <ellipse cx={46} cy={70} rx={13} ry={9} fill="url(#bellyG)" opacity={0.7} />
      <circle cx={22} cy={64} r={6} fill={pal.belly} />
      <circle cx={64} cy={54} r={15} fill="url(#headG)" />
      <Eye x={60} y={52} r={3} />
      <Eye x={70} y={52} r={3} />
      <path d="M63 58 L67 58 L65 61 Z" fill={pal.detail} />
      <Cheek x={56} y={57} />
      <rect x={36} y={78} width={7} height={6} rx={3} fill={pal.belly} />
      <rect x={52} y={78} width={7} height={6} rx={3} fill={pal.belly} />
    </g>
  );
}

const RENDERERS: Record<Species, (p: P) => JSX.Element> = {
  slepice: Hen,
  husa: Goose,
  kachna: Duck,
  holub: Dove,
  prase: Pig,
  osel: Donkey,
  muflon: Mouflon,
  krava: Cow,
  ovce: Sheep,
  pes: Dog,
  kocka: Cat,
  kralik: Rabbit,
};

export function AnimalSprite({
  animal,
  size = 88,
  className,
}: {
  animal: AnimalDef;
  size?: number;
  className?: string;
}) {
  const Renderer = RENDERERS[animal.species];
  const missing = animal.special === "missing";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={animal.name}
      style={missing ? { opacity: 0.5, filter: "grayscale(0.6)" } : undefined}
    >
      <VolumeDefs pal={animal.palette} />
      <Renderer pal={animal.palette} variant={animal.variant} />
    </svg>
  );
}
