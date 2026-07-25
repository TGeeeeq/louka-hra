import { Icon, type IconName } from "./Icon";

/**
 * Game data (items, buildings, recipes, achievements…) stores a platform emoji.
 * The data layer stays untouched — the UI translates those emoji into the
 * hand-drawn icon set here, so the look is identical on every device. Anything
 * unmapped keeps the emoji and just gets a proper emoji font stack.
 */
export const EMOJI_ICON: Record<string, IconName> = {
  // season / weather / daytime
  "🌸": "flower",
  "🌼": "flower",
  "☀️": "sun",
  "🍂": "leaf",
  "❄️": "snowflake",
  "⛅": "sunCloud",
  "🌧️": "rain",
  "🌫️": "fog",
  "🌨️": "snow",
  "🥶": "thermo",
  "🌅": "sunrise",
  "🌞": "sun",
  "🌇": "sunset",
  "🌙": "moon",
  "📅": "calendar",

  // needs / player
  "⚡": "spark",
  "💧": "droplet",
  "❤️": "heart",
  "💚": "heart",
  "🫂": "friends",
  "🎒": "backpack",
  "🛌": "bed",

  // money / trade
  "💰": "coins",
  "🛒": "cart",
  "💱": "exchange",

  // food & crafted goods
  "🌾": "wheat",
  "🌽": "corn",
  "🥣": "bowl",
  "🦴": "bowl",
  "🟨": "haybale",
  "🥕": "carrot",
  "🥔": "potato",
  "🍲": "pot",
  "🥘": "pot",
  "🌿": "leaf",
  "🍒": "berry",
  "🧈": "butter",
  "🫙": "jar",
  "🪻": "jar",
  "🍵": "teacup",
  "🍯": "syrup",
  "🍞": "bread",
  "🥚": "egg",
  "🧶": "wool",
  "🪵": "log",
  "🌱": "sprout",
  "🍴": "cook",

  // buildings & places
  "🏠": "home",
  "🏡": "home",
  "🛖": "home",
  "🏚️": "home",
  "🏪": "stall",
  "🏗️": "hammer",
  "🛠️": "tools",
  "🔨": "hammer",
  "🪓": "axe",
  "🔥": "fire",
  "⛲": "well",
  "🚧": "fence",
  "🪧": "sign",
  "🚪": "gate",
  "🌳": "tree",
  "🌲": "tree",
  "🔁": "refresh",

  // animals
  "🐔": "chicken",
  "🐖": "pig",
  "🐑": "sheep",
  "🐄": "cow",
  "🐕": "paw",
  "🐾": "paw",
  "🦊": "fox",
  "🦔": "hedgehog",
  "🦌": "deer",
  "🪶": "feather",
  "🕊️": "feather",

  // ui / feedback
  "📖": "book",
  "📋": "clipboard",
  "🏅": "trophy",
  "🏆": "trophy",
  "🎓": "cap",
  "🧠": "lightbulb",
  "💡": "lightbulb",
  "🧹": "brush",
  "🧪": "flask",
  "🔌": "plug",
  "🎮": "gamepad",
  "🎁": "chest",
  "🎉": "party",
  "✨": "sparkle",
  "🔒": "lock",
  "🔊": "soundOn",
  "🔇": "soundOff",
  "🎵": "musicOn",
};

/**
 * Renders the hand-drawn equivalent of a data-provided emoji, falling back to
 * the emoji itself (in the emoji font stack) when there is no glyph for it.
 */
export function EmojiIcon({
  emoji,
  size = 20,
  className,
}: {
  emoji: string;
  size?: number;
  className?: string;
}) {
  const name = EMOJI_ICON[emoji];
  if (name) return <Icon name={name} size={size} className={className} />;
  return (
    <span className={className ? `emoji ${className}` : "emoji"} aria-hidden style={{ fontSize: size * 0.9 }}>
      {emoji}
    </span>
  );
}
