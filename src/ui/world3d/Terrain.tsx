// 3D terén Louky: jedna barevná mřížka dlaždic (vertex colors) + instancované
// stromy / keře / květiny / vysoká tráva. Vše deterministicky ze stejné MAP a
// šumu jako 2D verze — svět vypadá stejně, jen plasticky.
import { useMemo } from "react";
import * as THREE from "three";
import { MAP, MAP_H, MAP_W, TILE } from "../../world/tiles";
import type { Season } from "../../game/types";
import { TILE_COLORS } from "./palette";

// Stabilní šum na dlaždici — stejný hash jako v tiles.ts (deterministický svět).
function noise(x: number, y: number) {
  const hh = ((x * 374761393) ^ (y * 668265263)) >>> 0;
  return ((hh ^ (hh >>> 13)) % 1000) / 1000;
}

/** Barevná podlaha: 1 quad na dlaždici, vertex colors, jediný draw call. */
function Ground({ season }: { season: Season }) {
  const geometry = useMemo(() => {
    const colors = TILE_COLORS[season];
    const pos: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    for (let ty = 0; ty < MAP_H; ty++)
      for (let tx = 0; tx < MAP_W; tx++) {
        const t = MAP.get(tx, ty);
        c.set(colors[t] ?? "#777");
        // jemná per-dlaždicová variace, ať plocha nepůsobí plasticky mrtvě
        const v = 1 + (noise(tx * 5 + 3, ty * 3 + 7) - 0.5) * 0.045;
        const r = Math.min(1, c.r * v);
        const g = Math.min(1, c.g * v);
        const b = Math.min(1, c.b * v);
        const y = t === TILE.WATER ? -0.12 : 0;
        // dva trojúhelníky quadu (x → východ, z → jih; 1 dlaždice = 1 jednotka)
        const x0 = tx, x1 = tx + 1, z0 = ty, z1 = ty + 1;
        pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
        for (let i = 0; i < 6; i++) col.push(r, g, b);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }, [season]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

interface Scatter {
  x: number;
  z: number;
  s: number; // měřítko
  r: number; // rotace
  tint: number; // 0..1 variace barvy
}

function collect(tile: number, jitter = 0.4): Scatter[] {
  const out: Scatter[] = [];
  for (let ty = 0; ty < MAP_H; ty++)
    for (let tx = 0; tx < MAP_W; tx++) {
      if (MAP.get(tx, ty) !== tile) continue;
      const n1 = noise(tx * 7 + 1, ty * 11 + 5);
      const n2 = noise(tx * 13 + 9, ty * 5 + 2);
      out.push({
        x: tx + 0.5 + (n1 - 0.5) * jitter,
        z: ty + 0.5 + (n2 - 0.5) * jitter,
        s: 0.75 + n1 * 0.5,
        r: n2 * Math.PI * 2,
        tint: n1,
      });
    }
  return out;
}

/** Instancovaný rozsev jednoho tvaru přes dlaždice daného typu. */
function Instanced({
  items,
  geometry,
  color,
  colorVar = 0.15,
  baseY = 0,
  castShadow = false,
}: {
  items: Scatter[];
  geometry: THREE.BufferGeometry;
  color: string;
  colorVar?: number;
  baseY?: number;
  castShadow?: boolean;
}) {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
    const m = new THREE.InstancedMesh(geometry, mat, items.length);
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const base = new THREE.Color(color);
    const c = new THREE.Color();
    items.forEach((it, i) => {
      q.setFromAxisAngle(up, it.r);
      mtx.compose(new THREE.Vector3(it.x, baseY, it.z), q, new THREE.Vector3(it.s, it.s, it.s));
      m.setMatrixAt(i, mtx);
      const v = 1 + (it.tint - 0.5) * colorVar * 2;
      c.setRGB(Math.min(1, base.r * v), Math.min(1, base.g * v), Math.min(1, base.b * v));
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = castShadow;
    return m;
  }, [items, geometry, color, colorVar, baseY, castShadow]);
  return <primitive object={mesh} />;
}

// Sdílené geometrie (vytvoří se jednou na modul)
const GEO = {
  trunk: new THREE.CylinderGeometry(0.09, 0.13, 0.7, 5),
  foliage: new THREE.ConeGeometry(0.55, 1.5, 6),
  foliageTop: new THREE.ConeGeometry(0.38, 1.0, 6),
  bush: new THREE.SphereGeometry(0.34, 6, 5),
  flower: new THREE.SphereGeometry(0.09, 5, 4),
  tall: new THREE.ConeGeometry(0.16, 0.5, 4),
  fencePost: new THREE.BoxGeometry(0.12, 0.9, 0.12),
};
GEO.trunk.translate(0, 0.35, 0);
GEO.foliage.translate(0, 1.3, 0);
GEO.foliageTop.translate(0, 2.1, 0);
GEO.bush.translate(0, 0.26, 0);
GEO.bush.scale(1, 0.75, 1);
GEO.flower.translate(0, 0.14, 0);
GEO.tall.translate(0, 0.25, 0);
GEO.fencePost.translate(0, 0.45, 0);

const FOLIAGE_COLOR: Record<Season, string> = {
  jaro: "#2f7d3f",
  leto: "#2a7038",
  podzim: "#8a6a24",
  zima: "#446a54",
};

/**
 * Kompletní terén. `mapVersion` vynutí přepočet, když se MAP změní za běhu
 * (otevření lesní brány přepisuje FENCE → PATH).
 */
export function Terrain({ season, mapVersion }: { season: Season; mapVersion: number }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trees = useMemo(() => collect(TILE.FOREST, 0.7), [mapVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bushes = useMemo(() => collect(TILE.BUSH), [mapVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const flowers = useMemo(() => collect(TILE.FLOWERS), [mapVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tall = useMemo(() => collect(TILE.TALL), [mapVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fence = useMemo(() => collect(TILE.FENCE, 0), [mapVersion]);

  // Ground závisí na sezóně; mapVersion změní klíč, ať se přegeneruje i podlaha.
  return (
    <group key={mapVersion}>
      <Ground season={season} />
      <Instanced items={trees} geometry={GEO.trunk} color="#6a4a2c" colorVar={0.1} />
      <Instanced items={trees} geometry={GEO.foliage} color={FOLIAGE_COLOR[season]} colorVar={0.2} castShadow />
      <Instanced items={trees} geometry={GEO.foliageTop} color={FOLIAGE_COLOR[season]} colorVar={0.25} />
      <Instanced items={bushes} geometry={GEO.bush} color={season === "zima" ? "#b9cdc6" : "#3f8c3c"} colorVar={0.2} />
      <Instanced items={flowers} geometry={GEO.flower} color={season === "podzim" ? "#c98a3a" : "#e884b0"} colorVar={0.5} />
      <Instanced items={tall} geometry={GEO.tall} color={FOLIAGE_COLOR[season]} colorVar={0.3} />
      <Instanced items={fence} geometry={GEO.fencePost} color="#8a6a42" colorVar={0.1} />
    </group>
  );
}
