// Animované GLTF zvíře: sdílený GLB (Quaternius) → SkeletonUtils klon na
// jedince, normalizace velikosti podle druhu, jemné přebarvení podle palety
// jedince a stavový přepínač animací (Idle / Walk / Eating) podle simulace.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Mob } from "../../world/sim";
import { TS } from "../../world/tiles";
import { ANIMAL_BY_ID, animalScale } from "../../game/content/animals";
import type { AnimalModelDef } from "./models";

const U = 1 / TS;

/** Najde klip podle preferencí (substring, case-insensitive). */
function findClip(clips: THREE.AnimationClip[], prefer: string[], avoid: string[] = []): THREE.AnimationClip | null {
  for (const p of prefer) {
    const hit = clips.find(
      (c) => c.name.toLowerCase().includes(p.toLowerCase()) && !avoid.some((a) => c.name.toLowerCase().includes(a.toLowerCase())),
    );
    if (hit) return hit;
  }
  return null;
}

export function AnimalModel({ mob, def }: { mob: Mob; def: AnimalModelDef }) {
  const group = useRef<THREE.Group>(null!);
  const alertRef = useRef<THREE.Mesh>(null!);
  const { scene, animations } = useGLTF(def.url);
  const a = ANIMAL_BY_ID[mob.id];
  const missing = a?.special === "missing";

  // vlastní klon (skinned mesh nejde sdílet) + přebarvení podle jedince
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    const tintColor = a?.palette.body ? new THREE.Color(a.palette.body) : null;
    c.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const wasArray = Array.isArray(mesh.material);
      const mats = wasArray ? (mesh.material as THREE.Material[]) : [mesh.material as THREE.Material];
      const cloned = mats.map((m) => {
        const mm = (m as THREE.MeshStandardMaterial).clone();
        if (tintColor && def.tint > 0) mm.color.lerp(tintColor, def.tint);
        if (missing) { mm.transparent = true; mm.opacity = 0.55; }
        return mm;
      });
      mesh.material = wasArray ? cloned : cloned[0];
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // normalizace velikosti: výška modelu → baseHeight × velikost jedince
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const h = box.max.y - box.min.y || 1;
    return (def.baseHeight * (a ? animalScale(a) : 1)) / h;
  }, [scene, def, a]);

  const mixer = useMemo(() => new THREE.AnimationMixer(clone), [clone]);
  const actions = useMemo(() => {
    const idle = findClip(animations, ["Idle"], ["HitReact"]) ?? animations[0] ?? null;
    const walk = findClip(animations, ["Walk", "Gallop"], ["Slow", "Jump"]);
    const eat = findClip(animations, ["Eating", "Eat"]);
    return {
      idle: idle ? mixer.clipAction(idle) : null,
      walk: walk ? mixer.clipAction(walk) : null,
      eat: eat ? mixer.clipAction(eat) : null,
    };
  }, [animations, mixer]);

  const state = useRef<{ current: "idle" | "walk" | "eat" | null; px: number; py: number }>({ current: null, px: mob.x, py: mob.y });

  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);

  const hasClips = animations.length > 0;

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const g = group.current;
    if (!g) return;
    // modely bez rigu (AI generované, zatím neriggnuté) aspoň hopsají jako dřív
    const bobY = hasClips ? 0 : Math.max(0, Math.sin(mob.bob)) * 0.06;
    g.position.set(mob.x * U, bobY, mob.y * U);
    g.rotation.y = def.yaw + (mob.flip ? Math.PI : 0);
    if (!hasClips) g.rotation.z = Math.sin(mob.bob) * 0.04;
    if (alertRef.current) alertRef.current.visible = mob.escaped;

    // stav: pohyb → walk; klid s dlouhým odpočinkem → eat; jinak idle
    const st = state.current;
    const sp = Math.hypot(mob.x - st.px, mob.y - st.py) / Math.max(dt, 1e-4);
    st.px = mob.x;
    st.py = mob.y;
    const want: "idle" | "walk" | "eat" = sp > 4 ? "walk" : mob.rest > 1.6 && actions.eat ? "eat" : "idle";
    if (want !== st.current) {
      const next = actions[want] ?? actions.idle;
      const prev = st.current ? actions[st.current] : null;
      if (next) {
        next.reset().fadeIn(0.25).play();
        if (prev && prev !== next) prev.fadeOut(0.25);
        st.current = want;
      }
    }
    mixer.update(dt);
  });

  return (
    <group ref={group} scale={[scale, scale, scale]}>
      <primitive object={clone} />
      {/* vykřičník uprchlíka — mimo scale-nezávislou pozici nad hlavou */}
      <mesh ref={alertRef} position={[0, (def.baseHeight * 1.6) / scale, 0]} visible={false}>
        <coneGeometry args={[0.09 / scale, 0.3 / scale, 5]} />
        <meshBasicMaterial color="#ff4a3a" />
      </mesh>
    </group>
  );
}
