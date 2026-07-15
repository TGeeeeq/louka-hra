// 3D terén Louky: jedna barevná mřížka dlaždic (vertex colors) + instancované
// stromy / keře / květiny / vysoká tráva. Vše deterministicky ze stejné MAP a
// šumu jako 2D verze — svět vypadá stejně, jen plasticky.
import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { MAP, MAP_H, MAP_W, TILE } from "../../world/tiles";
import type { Season } from "../../game/types";
import { TILE_COLORS } from "./palette";

// Stabilní šum na dlaždici (deterministický svět). Pozor: mezivýsledek XOR je
// nutné přetypovat >>> 0, jinak JS bitwise vrací signed int a šum je záporný.
function noise(x: number, y: number) {
  const hh = ((x * 374761393) ^ (y * 668265263)) >>> 0;
  return (((hh ^ (hh >>> 13)) >>> 0) % 1000) / 1000;
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
  fencePost: new THREE.BoxGeometry(0.12, 0.9, 0.12),
};
GEO.fencePost.translate(0, 0.45, 0);

/** Sezónní tón vegetace (lerp barvy materiálu). */
const SEASON_TINT: Record<Season, { color: string; amount: number }> = {
  jaro: { color: "#4fae4f", amount: 0.0 },
  leto: { color: "#3f9a3f", amount: 0.12 },
  podzim: { color: "#c07a2e", amount: 0.4 },
  zima: { color: "#cfdfe4", amount: 0.55 },
};

/**
 * Rozseje varianty z GLTF packu (Quaternius) přes InstancedMesh — jeden draw
 * call na (varianta × mesh). Varianty se mezi dlaždicemi střídají
 * deterministicky, výška se normalizuje na targetH.
 */
function ScatterGLTF({
  url,
  names,
  items,
  targetH,
  season,
  tintStrength = 1,
  castShadow = false,
}: {
  url: string;
  names: string[];
  items: Scatter[];
  targetH: number;
  season: Season;
  /** 0..1 násobič sezónního tónování (kmeny/skály netónovat). */
  tintStrength?: number;
  castShadow?: boolean;
}) {
  const { scene } = useGLTF(url);
  const group = useMemo(() => {
    const g = new THREE.Group();
    const tint = SEASON_TINT[season];
    const variants = names
      .map((n) => scene.getObjectByName(n))
      .filter(Boolean) as THREE.Object3D[];
    if (!variants.length) return g;

    // rozdělení dlaždic mezi varianty (deterministicky podle šumu položky)
    const buckets: Scatter[][] = variants.map(() => []);
    items.forEach((it) => buckets[Math.floor(it.tint * 9973) % variants.length].push(it));

    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    scene.updateWorldMatrix(true, true);
    variants.forEach((v, vi) => {
      const mine = buckets[vi];
      if (!mine.length) return;
      // Meshe varianty v lokálním prostoru varianty (packy mají varianty
      // rozestavěné vedle sebe — offsety je nutné odečíst a vycentrovat).
      const invRoot = new THREE.Matrix4().copy(v.matrixWorld).invert();
      const box = new THREE.Box3();
      const tmpBox = new THREE.Box3();
      const meshes: { mesh: THREE.Mesh; local: THREE.Matrix4 }[] = [];
      v.traverse((o: THREE.Object3D) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const local = new THREE.Matrix4().multiplyMatrices(invRoot, mesh.matrixWorld);
        mesh.geometry.computeBoundingBox();
        tmpBox.copy(mesh.geometry.boundingBox!).applyMatrix4(local);
        box.union(tmpBox);
        meshes.push({ mesh, local });
      });
      const h = box.max.y - box.min.y || 1;
      const s0 = targetH / h;
      const center = box.getCenter(new THREE.Vector3());
      const recenter = new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z);

      meshes.forEach(({ mesh, local }) => {
        const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        const mat = src.clone();
        if (tint.amount * tintStrength > 0 && mat.color)
          mat.color.lerp(new THREE.Color(tint.color), tint.amount * tintStrength);
        const pre = new THREE.Matrix4().multiplyMatrices(recenter, local);
        const im = new THREE.InstancedMesh(mesh.geometry, mat, mine.length);
        mine.forEach((it, i) => {
          q.setFromAxisAngle(up, it.r);
          const s = s0 * it.s;
          mtx.compose(new THREE.Vector3(it.x, 0, it.z), q, new THREE.Vector3(s, s, s));
          mtx.multiply(pre);
          im.setMatrixAt(i, mtx);
        });
        im.instanceMatrix.needsUpdate = true;
        im.castShadow = castShadow;
        g.add(im);
      });
    });
    return g;
  }, [scene, names, items, targetH, season, tintStrength, castShadow]);
  return <primitive object={group} />;
}

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

  // Vnitřek lesa prořídne — kraje (viditelné) zůstávají celé, uvnitř roste
  // jen ~třetina stromů. Šetří to miliony vertexů na slabých telefonech.
  const visibleTrees = useMemo(
    () =>
      trees.filter((t) => {
        const tx = Math.floor(t.x);
        const ty = Math.floor(t.z);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (MAP.get(Math.max(0, Math.min(MAP.w - 1, tx + dx)), Math.max(0, Math.min(MAP.h - 1, ty + dy))) !== TILE.FOREST)
              return true; // kraj lesa — vždy viditelný
        return noise(tx * 3 + 5, ty * 7 + 11) < 0.34; // vnitřek — jen vzorek
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trees],
  );
  // les: mix jehličnanů a listnáčů (deterministicky podle šumu dlaždice)
  const pines = useMemo(() => visibleTrees.filter((t) => t.tint < 0.62), [visibleTrees]);
  const leafy = useMemo(() => visibleTrees.filter((t) => t.tint >= 0.62), [visibleTrees]);

  // Ground závisí na sezóně; mapVersion změní klíč, ať se přegeneruje i podlaha.
  return (
    <group key={mapVersion}>
      <Ground season={season} />
      <ScatterGLTF url="/models/nature/Pine_Trees.glb" names={["PineTree_1", "PineTree_2", "PineTree_3", "PineTree_4", "PineTree_5"]} items={pines} targetH={2.7} season={season} tintStrength={0.7} castShadow />
      <ScatterGLTF url="/models/nature/Trees.glb" names={["NormalTree_1", "NormalTree_2", "NormalTree_3", "NormalTree_4", "NormalTree_5"]} items={leafy} targetH={2.3} season={season} castShadow />
      <ScatterGLTF url="/models/nature/Bushes.glb" names={["Bush", "Bush_Flowers", "Plant_1"]} items={bushes} targetH={0.55} season={season} />
      <ScatterGLTF url="/models/nature/Flowers.glb" names={["Flower_1_Clump", "Flower_2_Clump", "Flower_3_Clump", "Flower_4_Clump", "Flower_5_Clump"]} items={flowers} targetH={0.38} season={season} tintStrength={0.3} />
      <ScatterGLTF url="/models/nature/Grass.glb" names={["Grass_Large_Extruded", "Grass_Small"]} items={tall} targetH={0.42} season={season} />
      <Instanced items={fence} geometry={GEO.fencePost} color="#8a6a42" colorVar={0.1} />
    </group>
  );
}
