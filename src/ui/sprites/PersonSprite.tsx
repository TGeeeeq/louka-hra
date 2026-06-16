import type { PersonDef } from "../../game/content/people";

export function PersonSprite({
  person,
  size = 88,
  className,
}: {
  person: PersonDef;
  size?: number;
  className?: string;
}) {
  const { skin, hair, shirt, variant } = person;
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
      <ellipse cx={50} cy={92} rx={22} ry={4} fill="#000" opacity={0.12} />
      {/* tělo / triko */}
      <path d="M30 92 Q30 64 50 64 Q70 64 70 92 Z" fill={shirt} />
      <path d="M50 64 L50 92" stroke="#000" strokeWidth={0.6} opacity={0.08} />
      {/* ruce */}
      <circle cx={30} cy={78} r={5} fill={skin} />
      <circle cx={70} cy={78} r={5} fill={skin} />
      {/* krk */}
      <rect x={45} y={52} width={10} height={10} fill={skin} />
      {/* hlava */}
      <circle cx={50} cy={42} r={17} fill={skin} />
      {/* vlasy */}
      <path d="M33 40 Q33 22 50 22 Q67 22 67 40 Q60 30 50 30 Q40 30 33 40 Z" fill={hair} />
      {variant === "ponytail" && (
        <>
          <ellipse cx={70} cy={42} rx={5} ry={11} fill={hair} />
          <circle cx={66} cy={31} r={3} fill={hair} />
        </>
      )}
      {variant === "hat" && (
        <>
          <ellipse cx={50} cy={28} rx={22} ry={5} fill="#9a7b4a" />
          <path d="M38 28 Q40 14 50 14 Q60 14 62 28 Z" fill="#b08a52" />
        </>
      )}
      {/* oči */}
      <circle cx={43} cy={43} r={2.3} fill="#241f1c" />
      <circle cx={57} cy={43} r={2.3} fill="#241f1c" />
      <circle cx={42.3} cy={42.3} r={0.7} fill="#fff" />
      <circle cx={56.3} cy={42.3} r={0.7} fill="#fff" />
      {/* tváře + úsměv */}
      <circle cx={40} cy={48} r={2.6} fill="#ef9a9a" opacity={0.5} />
      <circle cx={60} cy={48} r={2.6} fill="#ef9a9a" opacity={0.5} />
      <path d="M45 50 Q50 54 55 50" stroke="#7a4a3a" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {variant === "beard" && (
        <path d="M37 47 Q39 62 50 62 Q61 62 63 47 Q57 56 50 56 Q43 56 37 47 Z" fill={hair} />
      )}
    </svg>
  );
}
