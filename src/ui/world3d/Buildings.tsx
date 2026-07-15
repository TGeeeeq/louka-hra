// Procedurální low-poly stavby (M1 placeholder úroveň — v M2 je nahradí GLTF).
// Rozměry v dlaždicích (1 dlaždice = 1 jednotka), pozice z INTERACTABLES.
import { useMemo } from "react";
import { INTERACTABLES, PADDOCKS, type Interactable } from "../../world/entities";
import { TUTORIAL_BUILDING_IDS } from "../../game/content/tutorial";
import type { FeedGroup } from "../../game/types";

const WOOD = "#8a6a42";
const WOOD_DARK = "#6a4e2e";
const ROOF = "#b85c3c";
const ROOF_DARK = "#96482e";
const WALL = "#e8dcc0";
const STONE = "#9a9a92";

/** Trojboký hranol jako sedlová střecha (cylinder se 3 segmenty, položený). */
function GableRoof({ w, d, y, color = ROOF }: { w: number; d: number; y: number; color?: string }) {
  return (
    <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]} castShadow>
      <cylinderGeometry args={[d * 0.62, d * 0.62, w * 1.08, 3, 1]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

function Box({ w, h, d, y, color, x = 0, z = 0, shadow = true }: { w: number; h: number; d: number; y: number; color: string; x?: number; z?: number; shadow?: boolean }) {
  return (
    <mesh position={[x, y, z]} castShadow={shadow}>
      <boxGeometry args={[w, h, d]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

/** Tělo stavby podle druhu. Skupina je vycentrovaná na střed půdorysu. */
function BuildingBody({ it }: { it: Interactable }) {
  const w = it.fw;
  const d = it.fh;
  switch (it.kind) {
    case "chalupa":
      return (
        <group>
          <Box w={w * 0.94} h={1.1} d={d * 0.9} y={0.55} color={WALL} />
          <GableRoof w={w * 0.94} d={d * 0.98} y={1.35} />
          <Box w={0.4} h={0.62} d={0.06} y={0.31} z={d * 0.45} color={WOOD_DARK} />
          <Box w={0.34} h={0.7} d={0.3} y={1.9} x={-w * 0.25} color={STONE} />
        </group>
      );
    case "stanek":
      return (
        <group>
          <Box w={w * 0.9} h={0.85} d={d * 0.7} y={0.42} color={WOOD} />
          <mesh position={[0, 1.15, d * 0.12]} rotation={[-0.25, 0, 0]} castShadow>
            <boxGeometry args={[w * 1.02, 0.07, d * 1.0]} />
            <meshLambertMaterial color="#e8a04a" />
          </mesh>
          <Box w={w * 0.9} h={0.1} d={0.32} y={0.62} z={d * 0.42} color={WOOD_DARK} />
        </group>
      );
    case "dilna":
      return (
        <group>
          <Box w={w * 0.92} h={0.95} d={d * 0.85} y={0.47} color={WOOD} />
          <GableRoof w={w * 0.92} d={d * 0.92} y={1.15} color={WOOD_DARK} />
          <Box w={0.38} h={0.55} d={0.06} y={0.27} z={d * 0.43} color="#4a3a26" />
        </group>
      );
    case "ohniste":
      return (
        <group>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <Box key={i} w={0.22} h={0.18} d={0.22} y={0.09} x={Math.cos(a) * 0.55} z={Math.sin(a) * 0.55} color={STONE} shadow={false} />;
          })}
          <mesh position={[0, 0.28, 0]}>
            <coneGeometry args={[0.26, 0.55, 6]} />
            <meshLambertMaterial color="#ff9a3a" emissive="#ff6a20" emissiveIntensity={0.8} />
          </mesh>
          <Box w={1.1} h={0.16} d={0.16} y={0.1} x={0.9} z={0.4} color={WOOD_DARK} />
        </group>
      );
    case "kurnik":
      return (
        <group>
          <Box w={w * 0.8} h={0.8} d={d * 0.8} y={0.6} color="#c98a4a" />
          <GableRoof w={w * 0.8} d={d * 0.9} y={1.25} color={ROOF_DARK} />
          <mesh position={[w * 0.1, 0.25, d * 0.5]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.36, 0.05, 0.9]} />
            <meshLambertMaterial color={WOOD_DARK} />
          </mesh>
        </group>
      );
    case "chlivek":
      return (
        <group>
          <Box w={w * 0.85} h={0.7} d={d * 0.8} y={0.35} color={WOOD_DARK} />
          <mesh position={[0, 0.82, 0]} rotation={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[w * 0.95, 0.08, d * 0.95]} />
            <meshLambertMaterial color={WOOD} />
          </mesh>
        </group>
      );
    case "pastvina":
      return (
        <group>
          {[[-w * 0.4, -d * 0.35], [w * 0.4, -d * 0.35], [-w * 0.4, d * 0.35], [w * 0.4, d * 0.35]].map(([x, z], i) => (
            <Box key={i} w={0.14} h={1.4} d={0.14} y={0.7} x={x} z={z} color={WOOD_DARK} />
          ))}
          <GableRoof w={w * 0.95} d={d * 0.95} y={1.5} color={WOOD} />
          <mesh position={[0, 0.42, 0]} castShadow>
            <sphereGeometry args={[0.55, 6, 5]} />
            <meshLambertMaterial color="#d8b860" />
          </mesh>
        </group>
      );
    case "buda":
      return (
        <group>
          <Box w={w * 0.6} h={0.6} d={d * 0.6} y={0.3} color={ROOF_DARK} />
          <GableRoof w={w * 0.6} d={d * 0.66} y={0.72} color={WOOD_DARK} />
          <mesh position={[0, 0.26, d * 0.31]}>
            <circleGeometry args={[0.18, 12]} />
            <meshBasicMaterial color="#241f1c" />
          </mesh>
        </group>
      );
    case "studna":
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.46, 0.6, 8]} />
            <meshLambertMaterial color={STONE} />
          </mesh>
          <Box w={0.08} h={1.1} d={0.08} y={0.55} x={-0.4} color={WOOD_DARK} />
          <Box w={0.08} h={1.1} d={0.08} y={0.55} x={0.4} color={WOOD_DARK} />
          <GableRoof w={1.0} d={0.9} y={1.15} color={ROOF} />
        </group>
      );
    case "cedule":
      return (
        <group>
          <Box w={0.09} h={0.9} d={0.09} y={0.45} color={WOOD_DARK} />
          <Box w={0.85} h={0.5} d={0.06} y={0.85} color={WOOD} />
        </group>
      );
    case "byliny":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 0.04, 8]} />
            <meshLambertMaterial color="#4f9c48" />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + 0.4;
            const cols = ["#f2d24a", "#e884b0", "#f7f2e7", "#c98af0"];
            return (
              <mesh key={i} position={[Math.cos(a) * 0.3, 0.16, Math.sin(a) * 0.3]}>
                <sphereGeometry args={[0.08, 5, 4]} />
                <meshLambertMaterial color={cols[i % cols.length]} />
              </mesh>
            );
          })}
        </group>
      );
    case "zahrada":
      return (
        <group>
          <Box w={w * 0.95} h={0.08} d={d * 0.95} y={0.04} color="#7a5a38" shadow={false} />
          {[-0.5, 0, 0.5].map((z, i) => (
            <Box key={i} w={w * 0.8} h={0.12} d={0.28} y={0.12} z={z * d * 0.7} color="#5f4429" shadow={false} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[((i % 3) - 1) * w * 0.28, 0.24, (Math.floor(i / 3) - 1) * d * 0.35]}>
              <coneGeometry args={[0.09, 0.2, 5]} />
              <meshLambertMaterial color="#3f8c3c" />
            </mesh>
          ))}
        </group>
      );
    case "brana":
      return (
        <group>
          <Box w={0.16} h={1.2} d={0.16} y={0.6} x={-0.5} color={WOOD_DARK} />
          <Box w={0.16} h={1.2} d={0.16} y={0.6} x={0.5} color={WOOD_DARK} />
          <Box w={1.1} h={0.12} d={0.1} y={1.05} color={WOOD} />
          <Box w={1.1} h={0.12} d={0.1} y={0.55} color={WOOD} />
        </group>
      );
    case "truhla":
      return (
        <group>
          <Box w={0.7} h={0.4} d={0.45} y={0.2} color={WOOD_DARK} />
          <Box w={0.72} h={0.14} d={0.47} y={0.45} color={WOOD} />
          <Box w={0.1} h={0.12} d={0.05} y={0.4} z={0.24} color="#e8c25a" />
        </group>
      );
    default:
      return <Box w={w * 0.9} h={0.9} d={d * 0.9} y={0.45} color={WALL} />;
  }
}

/** Průsvitný zelený „plán" stavby (tutoriálový cíl). */
function Blueprint({ it }: { it: Interactable }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[it.fw * 0.9, 1, it.fh * 0.9]} />
        <meshBasicMaterial color="#5fe08a" transparent opacity={0.22} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[it.fw * 0.9, 1, it.fh * 0.9]} />
        <meshBasicMaterial color="#8fffb0" wireframe />
      </mesh>
    </group>
  );
}

/** Plot výběhu: sloupky + dvě lati po obvodu obdélníku. */
function PaddockFence({ tx, ty, w, h }: { tx: number; ty: number; w: number; h: number }) {
  const parts = useMemo(() => {
    const posts: [number, number][] = [];
    for (let x = 0; x <= w; x += 1.5) { posts.push([tx + x, ty]); posts.push([tx + x, ty + h]); }
    for (let z = 1.5; z < h; z += 1.5) { posts.push([tx, ty + z]); posts.push([tx + w, ty + z]); }
    return posts;
  }, [tx, ty, w, h]);
  return (
    <group>
      {parts.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]}>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshLambertMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      {[0.22, 0.46].map((y, i) => (
        <group key={i}>
          <Box w={w} h={0.06} d={0.06} x={tx + w / 2} y={y} z={ty} color={WOOD} shadow={false} />
          <Box w={w} h={0.06} d={0.06} x={tx + w / 2} y={y} z={ty + h} color={WOOD} shadow={false} />
          <Box w={0.06} h={0.06} d={h} x={tx} y={y} z={ty + h / 2} color={WOOD} shadow={false} />
          <Box w={0.06} h={0.06} d={h} x={tx + w} y={y} z={ty + h / 2} color={WOOD} shadow={false} />
        </group>
      ))}
    </group>
  );
}

export function Buildings({
  built,
  tutorialTargets,
  settledGroups,
}: {
  built: string[];
  tutorialTargets: string[];
  settledGroups: FeedGroup[];
}) {
  return (
    <group>
      {INTERACTABLES.map((it) => {
        const gated = TUTORIAL_BUILDING_IDS.includes(it.id);
        const isBuilt = !gated || built.includes(it.id);
        const isTarget = !isBuilt && tutorialTargets.includes(it.id);
        if (!isBuilt && !isTarget) return null; // skrytý plán = zelená louka
        return (
          <group key={it.id} position={[it.tx + it.fw / 2, 0, it.ty + it.fh / 2]}>
            {isBuilt ? <BuildingBody it={it} /> : <Blueprint it={it} />}
          </group>
        );
      })}
      {PADDOCKS.filter((p) => settledGroups.includes(p.group)).map((p) => (
        <PaddockFence key={p.group} tx={p.tx} ty={p.ty} w={p.w} h={p.h} />
      ))}
    </group>
  );
}
