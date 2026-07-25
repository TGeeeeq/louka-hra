import { useEffect, useState } from "react";
import type { BuildCategory, Placed } from "../../game/types";
import { BUILDABLE_BY_ID, BUILDABLES } from "../../game/content/buildables";
import { hasBuilt } from "../../game/build/placement";

const TAB_LABEL: Record<BuildCategory, string> = {
  zaklad: "🏠 Základ",
  upgrade: "✨ Upgrady",
  ohrada: "🚧 Ohrady",
  dekorace: "🪧 Dekorace",
};

const TABS: BuildCategory[] = ["zaklad", "upgrade", "ohrada", "dekorace"];

const ICON: Record<string, string> = {
  chalupa: "🏠",
  stanek: "🏪",
  dilna: "🛠️",
  ohniste: "🔥",
  kurnik: "🐔",
  chlivek: "🐖",
  pastvina: "🐑",
  buda: "🐾",
  studna: "💧",
  zahrada: "🥕",
  plot: "🚧",
  cedule_deko: "🪧",
};

interface Props {
  money: number;
  wood: number;
  structures: Placed[];
  selection: string | null;
  onSelect: (defId: string | null) => void;
  /** Tutoriál: omezí panel jen na tuto stavbu (aktuální krok) a rovnou ji
   *  vybere. `null`/`undefined` = normální volný výběr. */
  restrictTo?: string | null;
  /** Ukončení stavebního módu — tlačítko „✓ Hotovo" v hlavičce panelu.
   *  `undefined` v tutoriálu (odtamtud se odejít nedá). */
  onDone?: () => void;
}

/** Cenovka stavby („💰420 🪵2" / „zdarma"). */
function priceOf(id: string, free: boolean) {
  if (free) return "zdarma";
  const c = BUILDABLE_BY_ID[id]?.cost ?? {};
  return [c.money ? `💰${c.money}` : null, c.wood ? `🪵${c.wood}` : null].filter(Boolean).join(" ") || "zdarma";
}

export function BuildPanel({ money, wood, structures, selection, onSelect, restrictTo, onDone }: Props) {
  const restrictCategory = restrictTo ? BUILDABLE_BY_ID[restrictTo]?.category : undefined;
  const [tab, setTab] = useState<BuildCategory>(restrictCategory ?? "zaklad");
  // Katalog je rozbalený jen když si hráč vybírá. Jakmile stavbu vybere,
  // panel se scvrkne na jeden řádek — hlavní je vidět louku, kam ji dát.
  const [open, setOpen] = useState(!selection);

  // Tutoriál: skoč na kartu s cílovou stavbou a rovnou ji vyber (hráč nemá
  // co jinýho v panelu dělat, tak ať se rovnou zaměří).
  useEffect(() => {
    if (!restrictTo) return;
    if (restrictCategory) setTab(restrictCategory);
    onSelect(restrictTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restrictTo]);

  // Vybráno → sbal katalog a uvolni výhled na louku. Zrušeno → zase rozbal.
  useEffect(() => { setOpen(!selection); }, [selection]);

  const items = restrictTo
    ? BUILDABLES.filter((b) => b.id === restrictTo)
    : BUILDABLES.filter((b) => b.category === tab);
  const sel = selection ? BUILDABLE_BY_ID[selection] : null;

  return (
    <div className={`build-panel${open ? " open" : ""}`}>
      <div className="build-head">
        <button className="build-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {sel ? (
            <>
              <span className="bp-ico">{ICON[sel.id] ?? "🔨"}</span>
              <span className="bp-text">
                <b>{sel.label}</b>
                <small>klepni na louku, kam ji chceš</small>
              </span>
            </>
          ) : (
            <>
              <span className="bp-ico">🔨</span>
              <span className="bp-text">
                <b>Stavění</b>
                <small>vyber si, co postavíš</small>
              </span>
            </>
          )}
          <em aria-hidden>{open ? "▾" : "▴"}</em>
        </button>
        {sel && !restrictTo && (
          <button className="build-clear" onClick={() => onSelect(null)} title="Zrušit výběr stavby">✕</button>
        )}
        {onDone && <button className="build-done" onClick={onDone}>✓ Hotovo</button>}
      </div>

      {open && (
        <>
          {!restrictTo && (
            <div className="subtabs build-tabs">
              {TABS.map((t) => (
                <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                  {TAB_LABEL[t]}
                </button>
              ))}
            </div>
          )}
          <div className="build-strip">
            {items.map((b) => {
              const already = b.unique && hasBuilt(structures, b.id);
              // Tutoriál: aktuální krok se staví zdarma (viz reducer PLACE_STRUCTURE).
              const free = b.id === restrictTo;
              const affordable =
                free || ((!b.cost.money || money >= b.cost.money) && (!b.cost.wood || wood >= b.cost.wood));
              const disabled = already || !affordable;
              const on = selection === b.id;
              return (
                <button
                  key={b.id}
                  className={`build-chip${already ? " owned" : ""}${disabled ? " dim" : ""}${on ? " on" : ""}`}
                  disabled={disabled}
                  onClick={() => onSelect(on ? null : b.id)}
                >
                  <span className="bc-ico">{ICON[b.id] ?? "🔨"}</span>
                  <b>{b.label}</b>
                  <small>{already ? "✓ máš" : `${priceOf(b.id, free)} · ${b.fw}×${b.fh}`}</small>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
