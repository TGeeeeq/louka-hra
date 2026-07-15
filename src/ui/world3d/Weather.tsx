// Počasí a sezónní částice ve 3D: déšť, sníh, okvětní lístky (jaro), listí
// (podzim), pyl (léto). Jeden THREE.Points systém v boxu kolem hráče —
// částice padají, box se posouvá s hráčem, souřadnice se obalují (wrap).
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Season, Weather as WeatherType } from "../../game/types";
import type { WorldSim } from "../../world/sim";
import { TS } from "../../world/tiles";

const BOX = 26; // hrana boxu částic (jednotky = dlaždice)
const TOP = 14;

interface ParticleConf {
  count: number;
  color: string;
  size: number;
  fall: number; // rychlost pádu (jednotky/s)
  drift: number; // boční vlnění
  opacity: number;
}

function confFor(weather: WeatherType, season: Season): ParticleConf | null {
  if (weather === "destivo") return { count: 900, color: "#9db8d8", size: 0.07, fall: 16, drift: 0.4, opacity: 0.6 };
  if (weather === "snezeni") return { count: 500, color: "#ffffff", size: 0.11, fall: 1.6, drift: 1.2, opacity: 0.9 };
  if (season === "jaro") return { count: 90, color: "#f2b4d0", size: 0.1, fall: 0.5, drift: 1.4, opacity: 0.8 };
  if (season === "podzim") return { count: 120, color: "#cf7a2e", size: 0.12, fall: 0.9, drift: 1.6, opacity: 0.85 };
  if (season === "leto" && (weather === "slunecno" || weather === "vedro"))
    return { count: 60, color: "#f3e08a", size: 0.07, fall: -0.15, drift: 0.8, opacity: 0.55 };
  return null;
}

function Particles({ sim, conf }: { sim: WorldSim; conf: ParticleConf }) {
  const points = useRef<THREE.Points>(null!);
  const speeds = useMemo(() => Float32Array.from({ length: conf.count }, () => 0.7 + Math.random() * 0.6), [conf]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(conf.count * 3);
    for (let i = 0; i < conf.count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BOX;
      pos[i * 3 + 1] = Math.random() * TOP;
      pos[i * 3 + 2] = (Math.random() - 0.5) * BOX;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [conf]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const p = points.current;
    if (!p) return;
    const px = sim.player.x / TS;
    const pz = sim.player.y / TS;
    p.position.set(px, 0, pz); // box jede s hráčem, lokální souřadnice wrapují
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < conf.count; i++) {
      let y = pos.getY(i) - conf.fall * speeds[i] * dt;
      let x = pos.getX(i) + Math.sin(t * 0.9 + i) * conf.drift * dt;
      let z = pos.getZ(i);
      if (conf.fall > 0 && y < 0) { y = TOP; x = (Math.random() - 0.5) * BOX; z = (Math.random() - 0.5) * BOX; }
      else if (conf.fall < 0 && y > TOP) y = 0;
      if (x > BOX / 2) x -= BOX;
      else if (x < -BOX / 2) x += BOX;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial color={conf.color} size={conf.size} transparent opacity={conf.opacity} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export function Weather({ sim, weather, season }: { sim: WorldSim; weather: WeatherType; season: Season }) {
  const conf = confFor(weather, season);
  if (!conf) return null;
  // klíč vynutí novou geometrii při změně počasí/sezóny
  return <Particles key={`${weather}-${season}`} sim={sim} conf={conf} />;
}
