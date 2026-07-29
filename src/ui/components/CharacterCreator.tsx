import { useState } from "react";
import type { PlayerAppearance, PlayerProfile, PlayerVariant } from "../../game/types";
import { PersonSprite } from "../sprites/PersonSprite";
import { sound } from "../../audio/sound";

// Přednastavené podoby pečovatele — teplé, k azylu se hodící palety.
const PRESETS: PlayerAppearance[] = [
  { skin: "#f0c49a", hair: "#6a4a2c", shirt: "#2d5a3d", variant: "hat" },
  { skin: "#e8b088", hair: "#2a1c12", shirt: "#8a4a3c", variant: "ponytail" },
  { skin: "#c98a5c", hair: "#141414", shirt: "#3a5f8a", variant: "beard" },
  { skin: "#f5d0a8", hair: "#c07a3a", shirt: "#6a4a8a", variant: "ponytail" },
  { skin: "#8a5a3c", hair: "#0e0e0e", shirt: "#4a7a4a", variant: "hat" },
  { skin: "#f0c49a", hair: "#8a8a8a", shirt: "#a05c3c", variant: "beard" },
  { skin: "#e8b088", hair: "#5a3a8a", shirt: "#2d5a5a" },
  { skin: "#d4a074", hair: "#c8a24a", shirt: "#7a3a5a", variant: "ponytail" },
];

const SKINS = ["#f5d0a8", "#f0c49a", "#e8b088", "#d4a074", "#c98a5c", "#8a5a3c"];
const HAIRS = ["#6a4a2c", "#2a1c12", "#0e0e0e", "#c07a3a", "#c8a24a", "#8a8a8a", "#5a3a8a"];
const SHIRTS = ["#2d5a3d", "#8a4a3c", "#3a5f8a", "#6a4a8a", "#a05c3c", "#2d5a5a", "#7a3a5a"];

const VARIANTS: { value: PlayerVariant | undefined; label: string }[] = [
  { value: "hat", label: "Klobouk" },
  { value: "ponytail", label: "Culík" },
  { value: "beard", label: "Vousy" },
  { value: undefined, label: "Bez" },
];

const sameLook = (a: PlayerAppearance, b: PlayerAppearance) =>
  a.skin === b.skin && a.hair === b.hair && a.shirt === b.shirt && a.variant === b.variant;

/**
 * Tvůrce postavy — vybere se podoba a jméno pečovatele před novou hrou.
 * Živý náhled i miniatury používají PersonSprite s UNIKÁTNÍM id (jinak si
 * sprity v jednom DOM kradou gradienty).
 */
export function CharacterCreator({
  initial,
  onConfirm,
  onBack,
}: {
  initial: PlayerProfile;
  onConfirm: (p: PlayerProfile) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(initial.name === "Ty" ? "" : initial.name);
  const [app, setApp] = useState<PlayerAppearance>(initial.appearance);

  const set = (patch: Partial<PlayerAppearance>) => {
    sound.select();
    setApp((a) => ({ ...a, ...patch }));
  };

  const swatch = (colors: string[], key: "skin" | "hair" | "shirt") =>
    colors.map((c) => (
      <button
        key={c}
        className={`cc-swatch${app[key] === c ? " on" : ""}`}
        style={{ background: c }}
        aria-label={c}
        onClick={() => set({ [key]: c } as Partial<PlayerAppearance>)}
      />
    ));

  return (
    <div className="intro-splash cc-screen">
      <p className="cc-eyebrow">Nový začátek na Louce</p>
      <h1 className="cc-title">Kdo se dnes stará o zvířata?</h1>
      <p className="cc-lede">Vyber si podobu — na vzhledu Louce nezáleží, na srdci ano.</p>

      <div className="cc-body">
        <div className="cc-preview">
          <PersonSprite person={{ id: "ty-preview", name: name || "Ty", role: "", line: "", ...app }} size={168} dir="down" />
          <input
            className="cc-name"
            type="text"
            value={name}
            placeholder="Ty"
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            aria-label="Jméno pečovatele"
          />
        </div>

        <div className="cc-controls">
          <div className="cc-presets" role="radiogroup" aria-label="Přednastavené podoby">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                className={`cc-preset${sameLook(app, p) ? " on" : ""}`}
                role="radio"
                aria-checked={sameLook(app, p)}
                onClick={() => set(p)}
              >
                <PersonSprite person={{ id: `ty-preset-${i}`, name: "Ty", role: "", line: "", ...p }} size={56} dir="down" />
              </button>
            ))}
          </div>

          <label className="cc-row"><span>Pleť</span><div className="cc-swatches">{swatch(SKINS, "skin")}</div></label>
          <label className="cc-row"><span>Vlasy</span><div className="cc-swatches">{swatch(HAIRS, "hair")}</div></label>
          <label className="cc-row"><span>Triko</span><div className="cc-swatches">{swatch(SHIRTS, "shirt")}</div></label>
          <div className="cc-row">
            <span>Styl</span>
            <div className="cc-variants">
              {VARIANTS.map((v) => (
                <button
                  key={v.label}
                  className={`cc-variant${app.variant === v.value ? " on" : ""}`}
                  onClick={() => set({ variant: v.value })}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="cc-actions">
        <button className="ghost-btn" onClick={onBack}>Zpět</button>
        <button className="cc-go" onClick={() => onConfirm({ name: name.trim() || "Ty", appearance: app })}>
          Začít ▸
        </button>
      </div>
    </div>
  );
}
