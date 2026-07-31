import type { Fact } from "../../game/types";
import { Icon } from "../icons/Icon";

// Naučné faktum přímo ve výsledku minihry. Dřív se výsledek hlásil dvakrát
// (panel + toast/dialog), teď je panel jediné místo, kde se hráč dozví, co se stalo.
export function MgFact({ fact }: { fact?: Fact }) {
  if (!fact) return null;
  return (
    <div className="mg-fact">
      <span className="fact-badge">
        <Icon name="cap" size={14} /> {fact.title}
      </span>
      <p>{fact.text}</p>
    </div>
  );
}
