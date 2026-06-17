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
  return (
    <div className="npc-panel">
      <div className="npc-top">
        <div className="npc-portrait"><PersonSprite person={person} size={92} /></div>
        <div>
          <h2>{person.name}</h2>
          <span className="npc-role">{person.role}</span>
        </div>
      </div>
      <p className="npc-line">„{person.line}“</p>
      {person.help && <p className="npc-help">✨ {person.help}</p>}
      <div className="mg-actions">
        <button className="big-btn" onClick={onPlay}>{taught ? "Zahrát si znovu 🎮" : "Pojď na to! 🎮"}</button>
        <button className="ghost-btn" onClick={onClose}>Možná později</button>
      </div>
    </div>
  );
}
