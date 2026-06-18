import type { AnimalDef, Species } from "../../game/types";
import { AnimalSprite } from "../sprites/AnimalSprite";
import { GROUP_LABEL } from "../labels";
import { PLAY_KIND, playKindFor } from "../../game/content/play";

const SPECIES_LABEL: Record<Species, string> = {
  osel: "osel",
  muflon: "muflon",
  krava: "kráva",
  prase: "prase",
  ovce: "ovce / beran",
  pes: "pes",
  kocka: "kočka",
  husa: "husa",
  kachna: "kachna",
  slepice: "slepice",
  holub: "holub",
  kralik: "králík",
};

export function AnimalCard({ animal, onClose, onPlay }: { animal: AnimalDef; onClose: () => void; onPlay?: () => void }) {
  const playKind = playKindFor(animal);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal animal-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Zavřít">×</button>
        <div className="animal-modal-top">
          <div className="animal-portrait">
            <AnimalSprite animal={animal} size={130} />
          </div>
          <div className="animal-headings">
            <h2>{animal.name}</h2>
            <span className="species-tag">{SPECIES_LABEL[animal.species]}</span>
            <span className="group-tag">{GROUP_LABEL[animal.feedGroup]}</span>
            {animal.special === "missing" && <span className="missing-tag">pohřešuje se 🕊️</span>}
          </div>
        </div>
        <p className="animal-personality">„{animal.personality}“</p>
        <div className="animal-fact">
          <span className="fact-badge">🎓 Víš, že…</span>
          <p>{animal.fact}</p>
        </div>
        {playKind && onPlay && (
          <div className="animal-actions">
            <button className="big-btn" onClick={onPlay}>{PLAY_KIND[playKind].cta}</button>
          </div>
        )}
      </div>
    </div>
  );
}
