// Aktéři 3D světa: hráč, NPC a zvířata. M1 = placeholder low-poly tvary
// obarvené z herních palet (v M2 je nahradí GLTF modely). Pozice čteme každý
// frame přímo ze simulace (sim mutuje objekty mimo React).
import { Suspense, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { WorldSim, Mob, NpcAgent } from "../../world/sim";
import { TS } from "../../world/tiles";
import { ANIMAL_BY_ID, animalScale } from "../../game/content/animals";
import { PERSON_BY_ID } from "../../game/content/people";
import type { Species } from "../../game/types";
import { AnimalModel } from "./AnimalModel";
import { modelForAnimal } from "./models";

const U = 1 / TS; // world px → 3D jednotky (1 dlaždice = 1)

// Proporce těla podle druhu: [délka, výška, šířka] těla + poloměr hlavy.
const SPECIES_SHAPE: Record<Species, { body: [number, number, number]; head: number; headY: number }> = {
  krava: { body: [0.9, 0.5, 0.45], head: 0.19, headY: 0.55 },
  osel: { body: [0.8, 0.45, 0.38], head: 0.17, headY: 0.55 },
  muflon: { body: [0.7, 0.42, 0.36], head: 0.16, headY: 0.5 },
  prase: { body: [0.72, 0.4, 0.4], head: 0.17, headY: 0.35 },
  ovce: { body: [0.62, 0.42, 0.4], head: 0.14, headY: 0.42 },
  pes: { body: [0.55, 0.32, 0.26], head: 0.14, headY: 0.38 },
  kocka: { body: [0.45, 0.24, 0.2], head: 0.12, headY: 0.3 },
  kralik: { body: [0.32, 0.22, 0.2], head: 0.11, headY: 0.26 },
  husa: { body: [0.42, 0.3, 0.26], head: 0.1, headY: 0.5 },
  kachna: { body: [0.38, 0.24, 0.24], head: 0.09, headY: 0.36 },
  slepice: { body: [0.32, 0.26, 0.22], head: 0.09, headY: 0.36 },
  holub: { body: [0.26, 0.18, 0.16], head: 0.07, headY: 0.26 },
};

function AnimalMesh({ mob }: { mob: Mob }) {
  const group = useRef<THREE.Group>(null!);
  const alertRef = useRef<THREE.Mesh>(null!);
  const a = ANIMAL_BY_ID[mob.id];
  const shape = SPECIES_SHAPE[a?.species ?? "ovce"];
  const s = a ? animalScale(a) : 1;
  const missing = a?.special === "missing";

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.set(mob.x * U, Math.max(0, Math.sin(mob.bob)) * 0.05, mob.y * U);
    g.rotation.y = mob.flip ? Math.PI : 0;
    if (alertRef.current) alertRef.current.visible = mob.escaped;
  });

  const bodyColor = missing ? "#9a9a92" : a?.palette.body ?? "#cdb188";
  const headColor = missing ? "#8a8a82" : a?.palette.detail ?? a?.palette.bodyDark ?? bodyColor;
  const [bl, bh, bw] = shape.body;

  return (
    <group ref={group} scale={[s, s, s]}>
      {/* tělo */}
      <mesh position={[0, bh * 0.75, 0]} scale={[bl, bh, bw]} castShadow>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshLambertMaterial color={bodyColor} transparent={missing} opacity={missing ? 0.55 : 1} />
      </mesh>
      {/* hlava (vepředu ve směru +x) */}
      <mesh position={[bl * 0.52, shape.headY, 0]} castShadow>
        <sphereGeometry args={[shape.head, 7, 6]} />
        <meshLambertMaterial color={headColor} transparent={missing} opacity={missing ? 0.55 : 1} />
      </mesh>
      {/* bříško/akcent */}
      {a?.palette.belly && !missing && (
        <mesh position={[0, bh * 0.55, 0]} scale={[bl * 0.8, bh * 0.7, bw * 1.04]}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshLambertMaterial color={a.palette.belly} />
        </mesh>
      )}
      {/* vykřičník uprchlíka */}
      <mesh ref={alertRef} position={[0, bh + 0.6, 0]} visible={false}>
        <coneGeometry args={[0.09, 0.3, 5]} />
        <meshBasicMaterial color="#ff4a3a" />
      </mesh>
    </group>
  );
}

function PersonMesh({
  skin,
  shirt,
  hair,
  getState,
  label,
  getBubble,
}: {
  skin: string;
  shirt: string;
  hair: string;
  getState: () => { x: number; y: number; moving: boolean; anim: number; flip: boolean };
  label?: string;
  getBubble?: () => string | null;
}) {
  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const [bubble, setBubble] = useState<string | null>(null);

  useFrame(({ clock }) => {
    const st = getState();
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const bob = st.moving ? Math.abs(Math.sin(t * 8)) * 0.08 : Math.sin(t * 2) * 0.015;
    g.position.set(st.x * U, bob, st.y * U);
    if (body.current) {
      body.current.rotation.y = st.flip ? Math.PI : 0;
      body.current.rotation.z = st.moving ? Math.sin(t * 8) * 0.07 : 0;
    }
    if (getBubble) {
      const b = getBubble();
      if (b !== bubble) setBubble(b);
    }
  });

  return (
    <group ref={group}>
      <group ref={body}>
        {/* nohy */}
        <mesh position={[0, 0.22, 0.09]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.44, 6]} />
          <meshLambertMaterial color="#4a3a2c" />
        </mesh>
        <mesh position={[0, 0.22, -0.09]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.44, 6]} />
          <meshLambertMaterial color="#4a3a2c" />
        </mesh>
        {/* trup */}
        <mesh position={[0, 0.66, 0]} castShadow>
          <capsuleGeometry args={[0.19, 0.4, 4, 8]} />
          <meshLambertMaterial color={shirt} />
        </mesh>
        {/* hlava */}
        <mesh position={[0, 1.12, 0]} castShadow>
          <sphereGeometry args={[0.17, 8, 7]} />
          <meshLambertMaterial color={skin} />
        </mesh>
        {/* vlasy */}
        <mesh position={[0, 1.22, 0]}>
          <sphereGeometry args={[0.155, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshLambertMaterial color={hair} />
        </mesh>
      </group>
      {label && (
        <Html center distanceFactor={14} position={[0, 1.65, 0]} style={{ pointerEvents: "none" }}>
          <div className="npc3d-name">{label}</div>
        </Html>
      )}
      {bubble && (
        <Html center distanceFactor={12} position={[0, 2.0, 0]} style={{ pointerEvents: "none" }}>
          <div className="npc3d-bubble">{bubble}</div>
        </Html>
      )}
    </group>
  );
}

/** Zvýrazňovací kroužek pod nejbližším cílem interakce. */
function HighlightRing({ sim }: { sim: WorldSim }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const n = sim.nearest;
    if (!n) { m.visible = false; return; }
    m.visible = true;
    let x = 0, z = 0, r = 0.6;
    if (n.kind === "building") {
      x = n.it.tx + n.it.fw / 2;
      z = n.it.ty + n.it.fh / 2;
      r = Math.max(n.it.fw, n.it.fh) * 0.62;
    } else if (n.kind === "animal") {
      const mob = sim.mobs.find((mm) => mm.id === n.animalId);
      if (!mob) { m.visible = false; return; }
      x = mob.x * U; z = mob.y * U; r = 0.55;
    } else {
      const npc = sim.npcs.find((a) => a.id === n.npcId);
      if (!npc) { m.visible = false; return; }
      x = npc.x * U; z = npc.y * U; r = 0.45;
    }
    m.position.set(x, 0.03, z);
    const pulse = 1 + Math.sin(clock.elapsedTime * 5) * 0.06;
    m.scale.set(r * pulse, 1, r * pulse);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.82, 1, 24]} />
      <meshBasicMaterial color="#f0e892" transparent opacity={0.85} />
    </mesh>
  );
}

export function Actors({ sim }: { sim: WorldSim }) {
  const ty = PERSON_BY_ID["ty"];
  return (
    <group>
      {sim.mobs.map((m) => {
        const a = ANIMAL_BY_ID[m.id];
        const def = a ? modelForAnimal(m.id, a.species) : null;
        return def ? (
          <Suspense key={m.id} fallback={<AnimalMesh mob={m} />}>
            <AnimalModel mob={m} def={def} />
          </Suspense>
        ) : (
          <AnimalMesh key={m.id} mob={m} />
        );
      })}
      {sim.npcs.map((npc: NpcAgent) => {
        const p = PERSON_BY_ID[npc.id];
        return (
          <PersonMesh
            key={npc.id}
            skin={p.skin}
            shirt={p.shirt}
            hair={p.hair}
            label={p.name}
            getState={() => ({ x: npc.x, y: npc.y, moving: npc.moving, anim: npc.anim, flip: npc.dir === "side" && npc.flip })}
            getBubble={() => npc.bubble?.text ?? null}
          />
        );
      })}
      <PersonMesh
        skin={ty.skin}
        shirt={ty.shirt}
        hair={ty.hair}
        getState={() => ({ x: sim.player.x, y: sim.player.y, moving: sim.player.moving, anim: sim.player.anim, flip: sim.player.dir === "left" })}
      />
      <HighlightRing sim={sim} />
    </group>
  );
}
