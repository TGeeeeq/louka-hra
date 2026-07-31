import { useEffect, useState } from "react";
import type { BuildCategory, Placed } from "../../game/types";
import { BUILDABLE_BY_ID, BUILDABLES } from "../../game/content/buildables";
import { hasBuilt } from "../../game/build/placement";
import { Icon, type IconName } from "../icons/Icon";
import { BUILDABLE_ICON } from "../icons/maps";

const TAB_LABEL: Record<BuildCategory, string> = {
  zaklad: "Základ",
  upgrade: "Upgrady",
  ohrada: "Ohrady",
  dekorace: "Dekorace",
};

const TAB_ICON: Record<BuildCategory, IconName> = {
  zaklad: "home",
  upgrade: "sparkle",
  ohrada: "fence",
  dekorace: "sign",
};

const TABS: BuildCategory[] = ["zaklad", "upgrade", "ohrada", "dekorace"];

interface Props {
  money: number;
  wood: number;
  structures: Placed[];
  selection: string | null;
  onSelect: (defId: string | null) => void;
  /** Tutoriál: omezí panel jen na tuto stavbu (aktuální krok) a rovnou ji
   *  vybere. `null`/`undefined` = normální volný výběr. */
  restrictTo?: string | null;
  /** Ukončení stavebního módu — tlačítko „Hotovo" v hlavičce panelu.
   *  `undefined` v tutoriálu (odtamtud se odejít nedá). */
  onDone?: () => void;
  /** Oddálená kamera — ať je vidět celý stavební prostor i s výběhem. */
  zoomedOut: boolean;
  onToggleZoom: () => void;
}

/** Cenovka stavby — ikonky mincí/dřeva, nebo „zdarma". */
function Price({ id, free }: { id: string; free: boolean }) {
  const c = BUILDABLE_BY_ID[id]?.cost ?? {};
  if (free || (!c.money && !c.wood)) return <>zdarma</>;
  return (
    <>
      {c.money ? (
        <span className="cost">
          <Icon name="coins" size={12} />
          {c.money}
        </span>
      ) : null}
      {c.wood ? (
        <span className="cost">
          <Icon name="log" size={12} />
          {c.wood}
        </span>
      ) : null}
    </>
  );
}

export function BuildPanel({ money, wood, structures, selection, onSelect, restrictTo, onDone, zoomedOut, onToggleZoom }: Props) {
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
    <div className={`build-panel paper${open ? " open" : ""}`}>
      <div className="build-head">
        <button className="build-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {sel ? (
            <>
              <span className="bp-ico">
                <Icon name={BUILDABLE_ICON[sel.id] ?? "hammer"} size={22} />
              </span>
              <span className="bp-text">
                <b>{sel.label}</b>
                <small>klepni na louku, kam ji chceš</small>
              </span>
            </>
          ) : (
            <>
              <span className="bp-ico">
                <Icon name="hammer" size={22} />
              </span>
              <span className="bp-text">
                <b>Stavění</b>
                <small>vyber si, co postavíš</small>
              </span>
            </>
          )}
          <em aria-hidden>
            <Icon name="chevronDown" size={14} className={open ? "bp-chev open" : "bp-chev"} />
          </em>
        </button>
        {sel && !restrictTo && (
          <button className="build-clear" onClick={() => onSelect(null)} title="Zrušit výběr stavby">
            <Icon name="close" size={14} />
          </button>
        )}
        <button
          className={zoomedOut ? "build-zoom on" : "build-zoom"}
          onClick={onToggleZoom}
          title={zoomedOut ? "Přiblížit kameru" : "Oddálit kameru — uvidíš celou ohradu"}
          aria-pressed={zoomedOut}
        >
          <Icon name={zoomedOut ? "zoomIn" : "zoomOut"} size={16} />
        </button>
        {onDone && (
          <button className="build-done" onClick={onDone}>
            <Icon name="check" size={14} /> Hotovo
          </button>
        )}
      </div>

      {open && (
        <>
          {!restrictTo && (
            <div className="subtabs build-tabs">
              {TABS.map((t) => (
                <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                  <Icon name={TAB_ICON[t]} size={16} />
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
                  <span className="bc-ico">
                    <Icon name={BUILDABLE_ICON[b.id] ?? "hammer"} size={22} />
                  </span>
                  <b>{b.label}</b>
                  <small>
                    {already ? (
                      <>
                        <Icon name="check" size={12} /> máš
                      </>
                    ) : (
                      <>
                        <Price id={b.id} free={free} /> · {b.fw}×{b.fh}
                      </>
                    )}
                  </small>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
