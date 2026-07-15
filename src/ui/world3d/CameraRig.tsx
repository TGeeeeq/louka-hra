// Sledovací kamera: nad a za hráčem (~48°), plynulý dojezd, zoom kolečkem
// i pinchem. Sever mapy je „nahoře" — kamera kouká od jihu, stejně jako 2D.
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldSim } from "../../world/sim";
import { TS } from "../../world/tiles";

const PITCH = (48 * Math.PI) / 180;
const MIN_DIST = 6;
const MAX_DIST = 24;

export function CameraRig({ sim }: { sim: WorldSim }) {
  const { camera, gl } = useThree();
  const dist = useRef(13);
  const target = useRef(new THREE.Vector3());

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dist.current = Math.max(MIN_DIST, Math.min(MAX_DIST, dist.current + e.deltaY * 0.012));
    };
    // pinch zoom (dva prsty)
    let pinch = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2)
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinch) return;
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      dist.current = Math.max(MIN_DIST, Math.min(MAX_DIST, dist.current * (pinch / d)));
      pinch = d;
    };
    const onTouchEnd = () => { pinch = 0; };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const px = sim.player.x / TS;
    const pz = sim.player.y / TS;
    target.current.lerp(new THREE.Vector3(px, 0, pz), Math.min(1, dt * 6));
    const d = dist.current;
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(
      target.current.x,
      target.current.y + Math.sin(PITCH) * d,
      target.current.z + Math.cos(PITCH) * d,
    );
    cam.lookAt(target.current.x, target.current.y + 0.6, target.current.z);
  });

  return null;
}
