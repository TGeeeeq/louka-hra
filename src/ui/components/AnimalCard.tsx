import { useState } from "react";
import type { AnimalDef, Species } from "../../game/types";
import { AnimalSprite } from "../sprites/AnimalSprite";
import { GROUP_LABEL } from "../labels";
import { PLAY_KIND, playKindFor } from "../../game/content/play";
import { photoUrl } from "../photo";
import { useGame } from "../store";
import { MOOD_EMOJI, MOOD_LABEL, MOOD_TONE, bondTier } from "../../game/content/characters";
import { Icon, type IconName } from "../icons/Icon";
import { EmojiIcon } from "../icons/emojiMap";
import { useTween } from "../hud/useTween";
import { Modal } from "./Modal";

/** Malý ukazatel potřeby (kopíruje styl HUD StatBar). */
function NeedBar({ icon, label, value, tone }: { icon: IconName; label: string; value: number; tone: string }) {
  const shown = useTween(value);
  return (
    <div className="need-bar" title={`${label}: ${Math.round(value)} %`}>
      <span className="need-ico"><Icon name={icon} size={15} /></span>
      <div className="need-track"><div className={`mini-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, shown))}%` }} /></div>
      <span className="need-label">{label}</span>
    </div>
  );
}

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
  const { state } = useGame();
  const st = state.animals[animal.id]; // jen postavy s charakterem; ostatní undefined
  const playKind = playKindFor(animal);
  const photo = photoUrl(animal);
  const [photoOk, setPhotoOk] = useState(true);
  return (
    <Modal title={animal.name} onClose={onClose} className="animal-modal">
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
            {animal.special === "missing" && (
              <span className="missing-tag">
                pohřešuje se <Icon name="feather" size={13} />
              </span>
            )}
          </div>
        </div>
        {st && (
          <div className="animal-mood">
            <span className={`zone-mood ${MOOD_TONE[st.mood]}`}>
              <EmojiIcon emoji={MOOD_EMOJI[st.mood]} size={16} /> {MOOD_LABEL[st.mood]}
            </span>
            <span className="bond-tier">
              <Icon name="heart" size={15} className="ic-heart" /> {bondTier(st.bond)}
            </span>
          </div>
        )}
        {st && (
          <div className="need-bars">
            <NeedBar icon="heart" label="Přátelství" value={st.bond} tone="bond" />
            <NeedBar icon="friends" label="Společnost" value={st.social} tone="social" />
            <NeedBar icon="home" label="Pohodlí" value={st.comfort} tone="comfort" />
          </div>
        )}
        <p className="animal-personality">„{animal.personality}“</p>
        <div className="animal-fact">
          <span className="fact-badge">
            <Icon name="cap" size={14} /> Víš, že…
          </span>
          <p>{animal.fact}</p>
        </div>
        {playKind && onPlay && (
          <div className="animal-actions">
            <button className="big-btn" onClick={onPlay}>{PLAY_KIND[playKind].cta}</button>
          </div>
        )}
    </Modal>
  );
}
