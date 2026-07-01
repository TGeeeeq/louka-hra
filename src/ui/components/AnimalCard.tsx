import { useState } from "react";
import type { AnimalDef, Species } from "../../game/types";
import { AnimalSprite } from "../sprites/AnimalSprite";
import { GROUP_LABEL } from "../labels";
import { PLAY_KIND, playKindFor } from "../../game/content/play";
import { photoUrl } from "../photo";

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
  liska: "liška — divoká sousedka",
  kane: "káně lesní — divoký soused",
  jezek: "ježek — divoký soused",
  srnka: "srnka — divoká sousedka",
};

export function AnimalCard({ animal, onClose, onPlay }: { animal: AnimalDef; onClose: () => void; onPlay?: () => void }) {
  const playKind = playKindFor(animal);
  const photo = photoUrl(animal);
  const [photoOk, setPhotoOk] = useState(true);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal animal-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Zavřít">×</button>
        <div className="animal-modal-top">
          <div className="animal-portrait">
            <AnimalSprite animal={animal} size={130} />
          </div>
          {photo && photoOk && (
            <figure className="animal-photo">
              <img
                src={photo}
                alt={`${animal.name} — skutečná fotka`}
                loading="lazy"
                decoding="async"
                onError={() => setPhotoOk(false)}
              />
              <figcaption className="photo-credit">foto: azyl Nech mě růst · nechmerust.org</figcaption>
            </figure>
          )}
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
