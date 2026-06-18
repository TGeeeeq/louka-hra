import { useEffect, useRef, useState } from "react";
import type { AnimalDef } from "../../game/types";
import { AnimalSprite } from "../sprites/AnimalSprite";
import { PLAY_KIND, playKindFor } from "../../game/content/play";
import { sound } from "../../audio/sound";

// Lehká „ve světě" timing lišta dole přes obrazovku — zachyť okamžik ve správný
// čas (uhýbání/trkání/mazlení). 3 kola, ke každému se něco poučného řekne.
const ROUNDS = 3;

export function PlayBar({ animal, onDone, onClose }: { animal: AnimalDef; onDone: () => void; onClose: () => void }) {
  const kind = playKindFor(animal)!;
  const def = PLAY_KIND[kind];
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [pos, setPos] = useState(0);
  const [res, setRes] = useState<null | boolean>(null); // výsledek právě zahraného kola
  const dir = useRef(1);
  const posRef = useRef(0);
  const lock = useRef(false);

  const finished = round >= ROUNDS;

  // ukazatel se pohybuje sem a tam (pauza při zobrazení výsledku kola)
  useEffect(() => {
    if (finished || res !== null) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      let np = posRef.current + dir.current * def.speed * dt;
      if (np >= 1) { np = 1; dir.current = -1; }
      else if (np <= 0) { np = 0; dir.current = 1; }
      posRef.current = np;
      setPos(np);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [finished, res, round, def.speed]);

  const tap = () => {
    if (finished || res !== null || lock.current) return;
    lock.current = true;
    const ok = posRef.current >= def.zone[0] && posRef.current <= def.zone[1];
    setRes(ok);
    if (ok) { setHits((h) => h + 1); sound.animalHappy(animal.feedGroup); }
    else sound.animalPanic(animal.feedGroup);
    window.setTimeout(() => {
      setRes(null);
      posRef.current = 0;
      dir.current = 1;
      setPos(0);
      setRound((r) => r + 1);
      lock.current = false;
    }, 650);
  };

  // MEZERNÍK / Enter = ťuk (vedle tlačítka pro mobil)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); tap(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (finished) {
    const good = hits >= 2;
    return (
      <div className="play-bar">
        <div className="play-bar-inner">
          <div className="play-result">
            <AnimalSprite animal={animal} size={56} />
            <div>
              <b>{good ? "Krásně jste si pohráli! 🎉" : "Trochu nešikovně, ale legrace byla!"}</b>
              <p>{def.win(animal)}</p>
            </div>
          </div>
          <button className="big-btn" onClick={onDone}>Hotovo ✓</button>
        </div>
      </div>
    );
  }

  const zoneLeft = def.zone[0] * 100;
  const zoneWidth = (def.zone[1] - def.zone[0]) * 100;
  return (
    <div className="play-bar">
      <div className="play-bar-inner">
        <div className="play-head">
          <AnimalSprite animal={animal} size={48} />
          <div className="play-copy">
            <b>{def.title}</b>
            <p>{def.prompt}</p>
          </div>
          <button className="play-x" onClick={onClose} aria-label="Zavřít">×</button>
        </div>
        <div className={`play-track ${res === true ? "good" : ""} ${res === false ? "bad" : ""}`}>
          <div className="play-zone" style={{ left: `${zoneLeft}%`, width: `${zoneWidth}%` }} />
          <div className="play-marker" style={{ left: `${pos * 100}%` }} />
        </div>
        <div className="play-foot">
          <span className="play-rounds">Kolo {Math.min(round + 1, ROUNDS)}/{ROUNDS} · ✅ {hits}</span>
          <button className="big-btn play-tap" onClick={tap}>Teď!</button>
        </div>
        <small className="play-hint">{def.hint}</small>
      </div>
    </div>
  );
}
