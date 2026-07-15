// 3D svět Louky — React Three Fiber renderer nad sdílenou simulací (world/sim).
// Nahrazuje 2D WorldCanvas: stejné props, stejná herní logika, nový pohled.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { FeedGroup, Phase, Season, Weather as WeatherType } from "../../game/types";
import { WorldSim, type InteractTarget, type SimProps, type WorldEvent } from "../../world/sim";
import { TS } from "../../world/tiles";
import { input } from "../../world/input";
import { getMinimapBase } from "../../world/draw";
import { INTERACTABLES } from "../../world/entities";
import { TUTORIAL_BUILDING_IDS } from "../../game/content/tutorial";
import { Terrain } from "./Terrain";
import { Buildings } from "./Buildings";
import { Actors } from "./Actors";
import { CameraRig } from "./CameraRig";
import { Weather } from "./Weather";
import { atmosphereFor } from "./palette";

export type { InteractTarget, WorldEvent };

interface Props {
  season: Season;
  phase: Phase;
  paused: boolean;
  welfare: Record<FeedGroup, number>;
  weather: WeatherType;
  money: number;
  built: string[];
  tutorialTargets: string[];
  settledGroups: FeedGroup[];
  tutorial: boolean;
  /** Otevřená lesní brána mění MAP za běhu → přegenerovat terén. */
  gateOpen: boolean;
  onInteract: (t: InteractTarget) => void;
  onEvent: (e: WorldEvent) => void;
}

/** Jeden tick simulace na frame (dt zastropované jako v 2D verzi). */
function SimTicker({ sim, getProps }: { sim: WorldSim; getProps: () => SimProps }) {
  useFrame((_, rawDt) => {
    sim.update(Math.min(0.05, rawDt), performance.now(), getProps());
  });
  return null;
}

/** Slunce sleduje hráče — stínová kamera pokrývá jen okolí, stíny zůstanou ostré. */
function Sun({ sim, color, intensity }: { sim: WorldSim; color: string; intensity: number }) {
  const ref = useRef<any>(null);
  useFrame(() => {
    const l = ref.current;
    if (!l) return;
    const px = sim.player.x / TS;
    const pz = sim.player.y / TS;
    l.position.set(px - 8, 14, pz + 4); // světlo zleva-shora (jako 2D stíny)
    l.target.position.set(px, 0, pz);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={ref}
      color={color}
      intensity={intensity}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-left={-18}
      shadow-camera-right={18}
      shadow-camera-top={18}
      shadow-camera-bottom={-18}
      shadow-camera-far={50}
      shadow-bias={-0.0005}
    />
  );
}

/** Kontextová nápověda akce (A / mezerník) — DOM overlay čtený ze simulace. */
function ActionChip({ sim }: { sim: WorldSim }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let raf = 0;
    let last: string | null = null;
    const tick = () => {
      if (sim.actionLabel !== last) { last = sim.actionLabel; setLabel(last); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sim]);
  if (!label) return null;
  return (
    <div className="action-chip3d">
      <span className="key">A</span>
      {label}
    </div>
  );
}

/** Mini-mapa — stejný podklad jako 2D verze (getMinimapBase), overlay canvas. */
function Minimap({ sim, built, tutorialTargets }: { sim: WorldSim; built: string[]; tutorialTargets: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [top, setTop] = useState(68);

  useEffect(() => {
    const hud = document.querySelector(".hud-top") as HTMLElement | null;
    const measure = () => setTop((hud ? Math.ceil(hud.getBoundingClientRect().height) : 56) + 12);
    measure();
    const ro = hud ? new ResizeObserver(measure) : null;
    if (hud && ro) ro.observe(hud);
    return () => ro?.disconnect();
  }, []);

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    let lastDraw = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - lastDraw < 120) return; // ~8 fps stačí
      lastDraw = now;
      const base = getMinimapBase();
      const mw = cv.width;
      const mh = cv.height;
      ctx.clearRect(0, 0, mw, mh);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(base, 0, 0, base.width, base.height, 0, 0, mw, mh);
      ctx.imageSmoothingEnabled = true;
      const sx = mw / base.width;
      const sy = mh / base.height;
      for (const it of INTERACTABLES) {
        const gated = TUTORIAL_BUILDING_IDS.includes(it.id);
        const isTarget = !built.includes(it.id) && tutorialTargets.includes(it.id);
        if (gated && !built.includes(it.id) && !isTarget) continue;
        ctx.fillStyle = isTarget
          ? "#ffcf4a"
          : it.kind === "chalupa" ? "#f0e892" : it.kind === "stanek" ? "#e8a04a" : it.kind === "byliny" ? "#8fe08a" : "#f7f2e7";
        ctx.beginPath();
        ctx.arc((it.tx + it.fw / 2) * sx, (it.ty + it.fh / 2) * sy, isTarget ? 3.2 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ff5a4a";
      ctx.beginPath();
      ctx.arc((sim.player.x / TS) * sx, (sim.player.y / TS) * sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [sim, built, tutorialTargets]);

  return (
    <div className="minimap3d" style={{ top }}>
      <div className="minimap3d-label">MAPA</div>
      <canvas ref={canvasRef} width={150} height={108} />
    </div>
  );
}

export function World3D(props: Props) {
  const propsRef = useRef(props);
  propsRef.current = props;

  // SimProps čteme vždy čerstvé přes ref — smyčka se nerestartuje.
  const getSimProps = useMemo(
    () => (): SimProps => {
      const p = propsRef.current;
      return {
        season: p.season, phase: p.phase, paused: p.paused,
        welfare: p.welfare, weather: p.weather, money: p.money,
        built: p.built, tutorialTargets: p.tutorialTargets,
        settledGroups: p.settledGroups, tutorial: p.tutorial,
        onInteract: p.onInteract, onEvent: p.onEvent,
      };
    },
    [],
  );

  const simRef = useRef<WorldSim | null>(null);
  if (!simRef.current) simRef.current = new WorldSim(getSimProps());
  const sim = simRef.current;

  // dev-only: přístup k simulaci z konzole / testů
  if (import.meta.env.DEV) (window as unknown as { __sim: WorldSim }).__sim = sim;

  useEffect(() => { sim.setBuilt(props.built); }, [sim, props.built]);

  // klávesnice — stejné mapování jako 2D verze
  useEffect(() => {
    const keymap: Record<string, keyof typeof input> = {
      ArrowUp: "up", KeyW: "up",
      ArrowDown: "down", KeyS: "down",
      ArrowLeft: "left", KeyA: "left",
      ArrowRight: "right", KeyD: "right",
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (keymap[e.code]) { input[keymap[e.code]] = true; e.preventDefault(); }
      if (e.code === "Space" || e.code === "Enter") e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (keymap[e.code]) { input[keymap[e.code]] = false; e.preventDefault(); }
      if ((e.code === "Space" || e.code === "Enter") && !propsRef.current.paused)
        sim.triggerAction(getSimProps());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [sim, getSimProps]);

  const atm = atmosphereFor(props.phase, props.season, props.weather);
  const mapVersion = props.gateOpen ? 1 : 0;

  return (
    <div className="world-wrap">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 48, near: 0.5, far: 90 }}
        onPointerDown={() => { if (!propsRef.current.paused) sim.triggerAction(getSimProps()); }}
      >
        <color attach="background" args={[atm.sky]} />
        <fog attach="fog" args={[atm.fog, atm.fogNear, atm.fogFar]} />
        <ambientLight color={atm.ambient} intensity={atm.ambientIntensity} />
        <Sun sim={sim} color={atm.sunColor} intensity={atm.sunIntensity} />
        <Terrain season={props.season} mapVersion={mapVersion} />
        <Buildings built={props.built} tutorialTargets={props.tutorialTargets} settledGroups={props.settledGroups} />
        <Weather sim={sim} weather={props.weather} season={props.season} />
        <Actors sim={sim} />
        <CameraRig sim={sim} />
        <SimTicker sim={sim} getProps={getSimProps} />
      </Canvas>
      <ActionChip sim={sim} />
      <Minimap sim={sim} built={props.built} tutorialTargets={props.tutorialTargets} />
    </div>
  );
}
