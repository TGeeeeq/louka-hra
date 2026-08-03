import { useEffect, useRef, useState } from "react";
import type { Objective } from "../../game/content/objectives";
import type { Alert } from "../../world/markers";
import { INTERACTABLE_BY_ID } from "../../world/entities";
import { PEOPLE, type PersonDef } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";
import { personPhotoUrl } from "../photo";
import { Icon } from "../icons/Icon";

// ---------------------------------------------------------------------------
// Ukazatel „teď je potřeba tohle" — Tomáš (nebo Maruška) ukáže, co se má dělat
// a kam jít, s vtipnou hláškou. Ve světě k tomu patří pulzující bod na cíli a
// šipka u kraje obrazovky (viz WorldCanvas → drawBeacon/drawEdgeArrow).
//
// Chování: při KAŽDÉ změně kroku se karta rozbalí, chvíli si počká (ať se to
// dá přečíst) a pak se sbalí do jednoho řádku, aby nezakrývala louku. Ťuknutím
// se zase rozbalí. Akutní věci (utečené zvíře) se nesbalují nikdy.
// ---------------------------------------------------------------------------

const COLLAPSE_AFTER = 11_000; // ms

const PERSON_BY_NAME: Record<string, PersonDef> = Object.fromEntries(
  PEOPLE.filter((p) => p.id !== "ty").map((p) => [p.name, p]),
);

export function GuideHint({
  objective,
  alert,
  onOpenPlan,
  onOpenMap,
}: {
  objective: Objective | null;
  alert: Alert | null;
  onOpenPlan: () => void;
  onOpenMap: () => void;
}) {
  const urgent = !!alert;
  const key = alert ? alert.id : objective?.id ?? "";
  const [open, setOpen] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    if (key) {
      setOpen(true);
      // Poplach zůstává rozbalený, dokud se nevyřeší.
      if (!urgent) timer.current = window.setTimeout(() => setOpen(false), COLLAPSE_AFTER);
    }
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, [key, urgent]);

  if (!key) return null;

  const title = alert ? alert.label : objective!.label;
  const hint = alert ? alert.hint : objective!.hint;
  const emoji = alert ? alert.emoji : objective!.emoji;
  const speakerName = alert ? "Pozor!" : objective!.speaker;
  const person = alert ? undefined : PERSON_BY_NAME[speakerName];
  const photo = person ? personPhotoUrl(person) : null;
  const targetId = alert ? undefined : objective!.target ?? objective!.targets?.[0];
  const place = targetId ? INTERACTABLE_BY_ID[targetId]?.label : undefined;

  if (!open)
    return (
      <button className="guide-chip paper" onClick={() => setOpen(true)}>
        <span className="guide-hand" aria-hidden>
          👉
        </span>
        <b>{title}</b>
        <Icon name="chevronDown" size={13} />
      </button>
    );

  return (
    <div className={`guide-card paper${urgent ? " urgent" : ""}`}>
      <div className="guide-head">
        <span className="guide-portrait">
          {photo ? (
            <img src={photo} alt={speakerName} width={40} height={40} />
          ) : person ? (
            <PersonSprite person={person} size={40} />
          ) : (
            <span className="guide-bang" aria-hidden>
              ❗
            </span>
          )}
        </span>
        <div className="guide-titles">
          <span className="guide-speaker">
            {speakerName} <em>ukazuje</em>
          </span>
          <b>
            {emoji} {title}
          </b>
        </div>
        <button className="guide-close" onClick={() => setOpen(false)} aria-label="Sbalit">
          <Icon name="chevronUp" size={16} />
        </button>
      </div>
      <p className="guide-hint">{hint}</p>
      <div className="guide-actions">
        {place && (
          <span className="guide-place">
            <Icon name="pin" size={13} /> {place}
          </span>
        )}
        <button className="guide-btn" onClick={onOpenMap}>
          <Icon name="map" size={14} /> Mapa
        </button>
        <button className="guide-btn" onClick={onOpenPlan}>
          <Icon name="clipboard" size={14} /> Celý plán
        </button>
      </div>
    </div>
  );
}
