import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";

/**
 * Sjednocená modální schránka (dřív 4 různé ruční kopie — viz audit UI
 * konsolidace). Vždy: tmavý backdrop + `overlay-modal paper` panel + hlavička
 * s ikonou/titulkem/křížkem + scrollovatelné tělo. `className` nese
 * per-modál specifickou třídu (animal-modal, over-modal, confirm-modal…),
 * díky které si každý modál drží svůj dosavadní vzhled.
 *
 * `onClose` chybí ⇒ žádný křížek, žádné zavření klikem na backdrop (GameOver:
 * hráč se z konce hry neproklikne pryč, musí zvolit "Hrát znovu").
 */
export function Modal({
  title,
  icon,
  onClose,
  dismissOnBackdrop = true,
  className,
  children,
}: {
  title: string;
  icon?: IconName;
  onClose?: () => void;
  dismissOnBackdrop?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose && dismissOnBackdrop ? onClose : undefined}>
      <div
        className={className ? `overlay-modal paper ${className}` : "overlay-modal paper"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overlay-head">
          <h2>
            {icon && <Icon name={icon} size={22} className="overlay-ico" />}
            {title}
          </h2>
          {onClose && (
            <button className="modal-close" onClick={onClose} aria-label="Zavřít">
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}

/**
 * Potvrzovací dialog postavený na Modal — titulek, volitelný text, dvě akce
 * (.big-btn / .ghost-btn). Křížek i klik na backdrop = zrušení (stejná akce
 * jako `cancelLabel`).
 */
export function ConfirmDialog({
  title,
  icon,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger,
  className,
}: {
  title: string;
  icon?: IconName;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <Modal title={title} icon={icon} onClose={onCancel} className={className ? `confirm-modal ${className}` : "confirm-modal"}>
      {body && <p className="intro-text">{body}</p>}
      <div className="intro-actions">
        <button className={danger ? "big-btn danger" : "big-btn"} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="ghost-btn" onClick={onCancel}>{cancelLabel}</button>
      </div>
    </Modal>
  );
}
