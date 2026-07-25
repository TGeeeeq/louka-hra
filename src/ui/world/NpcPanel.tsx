import { useState } from "react";
import type { PersonDef } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";
import { personPhotoUrl } from "../photo";
import { Icon } from "../icons/Icon";

export function NpcPanel({
  person,
  taught,
  mood,
  onPlay,
  onClose,
}: {
  person: PersonDef;
  taught: boolean;
  mood?: string;
  onPlay: () => void;
  onClose: () => void;
}) {
  const tips = person.tips ?? [];
  const [ti, setTi] = useState(0);
  const tip = tips.length ? tips[ti % tips.length] : null;
  const photo = personPhotoUrl(person);

  return (
    <div className="npc-panel">
      <div className="npc-top">
        <div className="npc-portrait">
          {photo ? (
            <img className="npc-photo" src={photo} alt={person.name} width={92} height={92} />
          ) : (
            <PersonSprite person={person} size={92} />
          )}
        </div>
        <div>
          <h2>{person.name}</h2>
          <span className="npc-role">{person.role}</span>
          {person.domain && <span className="npc-domain">{person.domain}</span>}
        </div>
      </div>
      <p className="npc-line">„{mood ?? person.line}“</p>
      {tip && (
        <div className="npc-tip">
          <b>
            <Icon name="lightbulb" size={15} /> Rada:
          </b>{" "}
          {tip}
          {tips.length > 1 && (
            <button className="npc-tip-btn" onClick={() => setTi((t) => t + 1)}>
              další <Icon name="chevronRight" size={13} />
            </button>
          )}
        </div>
      )}
      {person.help && (
        <p className="npc-help">
          <Icon name="sparkle" size={15} /> {person.help}
        </p>
      )}
      <div className="mg-actions">
        <button className="big-btn" onClick={onPlay}>
          <Icon name="gamepad" size={18} /> {taught ? "Procvičit znovu" : "Pojď na to!"}
        </button>
        <button className="ghost-btn" onClick={onClose}>Možná později</button>
      </div>
    </div>
  );
}
