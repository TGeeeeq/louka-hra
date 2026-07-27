import { Icon } from "../icons/Icon";
import type { PlacementIssue } from "../../game/build/preview";

/**
 * Sjednocená lišta pro stavební workflow „vyber existující stavbu → přesuň/
 * potvrď umístění" — dřív dvě oddělené implementace (build-select-bar ve
 * WorldCanvas + place-bar v App), jedna emoji, druhá SVG ikony. Teď jeden
 * komponent, jedna ikonová řeč, dva `mode`.
 */
type SelectModeProps = {
  mode: "select";
  /** Jméno vybrané stavby (z katalogu). */
  label: string;
  /** `true` = hráč právě volí, kam stavbu přesunout (druhý krok). */
  moving: boolean;
  onMove: () => void;
  onDemolish: () => void;
  /** Zruší přesun (je-li rozjetý), jinak zruší celý výběr. */
  onCancel: () => void;
};

type PlaceModeProps = {
  mode: "place";
  /** Jméno stavby v 1. pádu (katalog) — „Postavit {label} sem?". */
  label: string;
  kind: "new" | "move";
  issue?: PlacementIssue | null;
  valid: boolean;
  onNudge: (dx: number, dy: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

type Props = SelectModeProps | PlaceModeProps;

export function StructureActionBar(props: Props) {
  if (props.mode === "select") {
    const { label, moving, onMove, onDemolish, onCancel } = props;
    return (
      <div className="build-select-bar">
        {!moving ? (
          <>
            <span className="build-select-label">{label}</span>
            <button className="build-select-btn move" onClick={onMove}>
              <Icon name="move" size={15} /> Přesunout
            </button>
            <button className="build-select-btn demolish" onClick={onDemolish}>
              <Icon name="demolish" size={15} /> Zbořit
            </button>
            <button className="build-select-btn cancel" onClick={onCancel} aria-label="Zrušit výběr">
              <Icon name="close" size={14} />
            </button>
          </>
        ) : (
          <>
            <span className="build-select-label">Klepni na louku, kam ji přesunout</span>
            <button className="build-select-btn cancel" onClick={onCancel}>
              <Icon name="close" size={14} /> Zrušit
            </button>
          </>
        )}
      </div>
    );
  }

  const { label, kind, issue, valid, onNudge, onConfirm, onCancel } = props;
  return (
    <div className="place-bar" role="dialog" aria-live="polite">
      {/* Hlavička roste nahoru (lišta je ukotvená spodkem) a lišta má pevnou
          šířku — hláška „sem to nejde" tak nikdy nepohne šipkami ani
          tlačítky pod sebou. */}
      <div className="place-bar-head">
        <b>{label}</b>
        <span>— {kind === "move" ? "přesunout" : "postavit"} sem?</span>
        {issue && (
          <span className="place-bar-warn">
            <Icon name="warn" size={14} /> {issue.short}
          </span>
        )}
      </div>
      <div className="place-bar-row">
        <div className="nudge-pad" role="group" aria-label="Posunout stavbu">
          <button className="nudge up" aria-label="posunout nahoru" onClick={() => onNudge(0, -1)}>
            <Icon name="chevronUp" size={18} />
          </button>
          <button className="nudge left" aria-label="posunout vlevo" onClick={() => onNudge(-1, 0)}>
            <Icon name="chevronLeft" size={18} />
          </button>
          <button className="nudge right" aria-label="posunout vpravo" onClick={() => onNudge(1, 0)}>
            <Icon name="chevronRight" size={18} />
          </button>
          <button className="nudge down" aria-label="posunout dolů" onClick={() => onNudge(0, 1)}>
            <Icon name="chevronDown" size={18} />
          </button>
        </div>
        <div className="place-bar-actions">
          <button className="build-select-btn confirm" disabled={!valid} onClick={onConfirm}>
            <Icon name="check" size={15} /> {kind === "move" ? "Přesunout" : "Postavit"}
          </button>
          <button className="build-select-btn cancel" onClick={onCancel}>
            <Icon name="close" size={15} /> Zrušit
          </button>
        </div>
      </div>
      <small className="place-bar-hint">Šipkami posuneš po dlaždicích · ťuknutím na louku přehodíš jinam</small>
    </div>
  );
}
