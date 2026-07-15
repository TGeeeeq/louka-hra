// Animovaná GLTF postava (hráč i NPC): klon sdíleného GLB, normalizace výšky,
// plynulé otáčení podle směru pohybu a přepínání Idle/Walk/Run animací.
// Jmenovka a bublina řeč zůstávají jako DOM (drei Html), stejně jako u kapslí.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { TS } from "../../world/tiles";
import type { PersonModelDef } from "./models";

const U = 1 / TS;

function pickClip(clips: THREE.AnimationClip[], prefer: string[], avoid: string[]): THREE.AnimationClip | null {
  for (const p of prefer) {
    const hit = clips.find((c) => {
      const n = c.name.toLowerCase();
      const core = n.split("|").pop() ?? n;
      return core === p.toLowerCase() || core === `${p.toLowerCase()}.001`
        ? true
        : core.includes(p.toLowerCase()) && !avoid.some((a) => core.includes(a.toLowerCase()));
    });
    if (hit) return hit;
  }
  return null;
}

export function PersonModel({
  def,
  getState,
  label,
  getBubble,
}: {
  def: PersonModelDef;
  getState: () => { x: number; y: number; moving: boolean };
  label?: string;
  getBubble?: () => string | null;
}) {
  const group = useRef<THREE.Group>(null!);
  const [bubble, setBubble] = useState<string | null>(null);
  const { scene, animations } = useGLTF(def.url);

  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((o: THREE.Object3D) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    return c;
  }, [scene]);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const h = box.max.y - box.min.y || 1;
    return def.height / h;
  }, [scene, def]);

  const mixer = useMemo(() => new THREE.AnimationMixer(clone), [clone]);
  const actions = useMemo(() => {
    const idle = pickClip(animations, ["Idle_Neutral", "Idle"], ["gun", "sword", "attack", "hold", "jump"]) ?? animations[0] ?? null;
    const walk = pickClip(animations, ["Walk"], ["gun", "attack", "back"]);
    const run = pickClip(animations, ["Run"], ["gun", "attack", "back", "left", "right"]);
    return {
      idle: idle ? mixer.clipAction(idle) : null,
      walk: walk ? mixer.clipAction(walk) : run ? mixer.clipAction(run) : null,
    };
  }, [animations, mixer]);

  const st = useRef({ current: null as "idle" | "walk" | null, px: 0, py: 0, yaw: Math.PI });

  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const g = group.current;
    if (!g) return;
    const s = getState();
    g.position.set(s.x * U, 0, s.y * U);

    // otáčení podle skutečného pohybu (model kouká na +Z)
    const dx = s.x - st.current.px;
    const dy = s.y - st.current.py;
    st.current.px = s.x;
    st.current.py = s.y;
    if (s.moving && (dx !== 0 || dy !== 0)) {
      const target = Math.atan2(dx, dy);
      let diff = target - st.current.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      st.current.yaw += diff * Math.min(1, dt * 12);
    }
    g.rotation.y = st.current.yaw;

    const want: "idle" | "walk" = s.moving ? "walk" : "idle";
    if (want !== st.current.current) {
      const next = actions[want] ?? actions.idle;
      const prev = st.current.current ? actions[st.current.current] : null;
      if (next) {
        next.reset().fadeIn(0.15).play();
        if (prev && prev !== next) prev.fadeOut(0.15);
        st.current.current = want;
      }
    }
    mixer.update(dt);

    if (getBubble) {
      const b = getBubble();
      if (b !== bubble) setBubble(b);
    }
  });

  return (
    <group ref={group}>
      <group scale={[scale, scale, scale]}>
        <primitive object={clone} />
      </group>
      {label && (
        <Html center distanceFactor={14} position={[0, def.height + 0.35, 0]} style={{ pointerEvents: "none" }}>
          <div className="npc3d-name">{label}</div>
        </Html>
      )}
      {bubble && (
        <Html center distanceFactor={12} position={[0, def.height + 0.75, 0]} style={{ pointerEvents: "none" }}>
          <div className="npc3d-bubble">{bubble}</div>
        </Html>
      )}
    </group>
  );
}
