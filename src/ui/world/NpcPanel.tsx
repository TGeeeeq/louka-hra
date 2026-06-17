import { useState } from "react";
import type { PersonDef } from "../../game/content/people";
import { PersonSprite } from "../sprites/PersonSprite";

export function NpcPanel({
  person,
  taught,
  onPlay,
  onClose,
}: {
  person: PersonDef;
  taught: boolean;
  onPlay: () => void;
  onClose: () => void;
}) {
  const tips = person.tips ?? [];
  const [ti, setTi] = useState(0);
  const tip = tips.length ? tips[ti % tips.length] : null;

  return (
    <div className="npc-panel">
      <div className="npc-top">
        <div className="npc-portrait"><PersonSprite person={person} size={92} /></div>
        <div>
          <h2>{person.name}</h2>
          <span className="npc-role">{person.role}</span>
          {person.domain && <span className="npc-domain">{person.domain}</span>}
        </div>
      </div>
      <p className="npc-line">„{person.line}“</p>
      {tip && (
        <div className="npc-tip">
          <b>💡 Rada:</b> {tip}
          {tips.length > 1 && (
            <button className="npc-tip-btn" onClick={() => setTi((t) => t + 1)}>další ›</button>
          )}
        </div>
      )}
      {person.help && <p className="npc-help">✨ {person.help}</p>}
      <div className="mg-actions">
        <button className="big-btn" onClick={onPlay}>{taught ? "Procvičit znovu 🎮" : "Pojď na to! 🎮"}</button>
        <button className="ghost-btn" onClick={onClose}>Možná později</button>
      </div>
    </div>
  );
}
