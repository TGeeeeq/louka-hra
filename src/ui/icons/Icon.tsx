import { GLYPHS, type IconName } from "./glyphs";

export type { IconName };

interface Props {
  name: IconName;
  /** Rendered box in px (glyphs are drawn on a 24x24 grid). */
  size?: number;
  /** Extra class — use `ic-accent` / `ic-gold` for tinted variants. */
  className?: string;
  /** Accessible label; without it the icon is decorative (aria-hidden). */
  title?: string;
  strokeWidth?: number;
}

/**
 * Single entry point for every glyph in the UI. Colour comes from
 * `currentColor`, so an icon always matches the text it sits next to.
 */
export function Icon({ name, size = 18, className, title, strokeWidth = 1.7 }: Props) {
  const g = GLYPHS[name];
  return (
    <svg
      className={className ? `ic ${className}` : "ic"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {"wash" in g && g.wash && <path className="ic-wash" d={g.wash} />}
      {g.ink.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {"dots" in g &&
        g.dots?.map(([cx, cy, r], i) => <circle key={i} className="ic-dot" cx={cx} cy={cy} r={r} />)}
    </svg>
  );
}
