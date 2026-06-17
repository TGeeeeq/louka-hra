import { useEffect, useRef } from "react";
import type { Phase, Season } from "../../game/types";
import { MAP_H, MAP_W, TS } from "../../world/tiles";
import {
  ANIMAL_SPAWNS,
  INTERACTABLES,
  NPC_SPAWNS,
  PLAYER_START,
  isBlocked,
  type Interactable,
} from "../../world/entities";
import { PERSON_BY_ID } from "../../game/content/people";
import { drawBuilding, drawGround, getMinimapBase, roundRect } from "../../world/draw";
import { animalImg, personImg, preloadSprites, ready } from "../../world/spriteCache";
import { ANIMALS, ANIMAL_BY_ID, animalScale } from "../../game/content/animals";
import type { Facing } from "../sprites/PersonSprite";
import { PEOPLE } from "../../game/content/people";
import { consumeAction, input } from "../../world/input";
import { sound } from "../../audio/sound";

export type InteractTarget =
  | { kind: "building"; it: Interactable }
  | { kind: "animal"; animalId: string }
  | { kind: "npc"; npcId: string };

interface Props {
  season: Season;
  phase: Phase;
  paused: boolean;
  onInteract: (t: InteractTarget) => void;
}

interface Mob {
  id: string;
  x: number;
  y: number;
  hx: number;
  hy: number;
  radius: number;
  tx: number;
  ty: number;
  rest: number;
  flip: boolean;
  bob: number;
}

const SPEED = 165; // px/s
const INTERACT_RANGE = TS * 1.5;
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function WorldCanvas({ season, phase, paused, onInteract }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // měnící se props čteme přes ref, ať smyčku nemusíme restartovat
  const propsRef = useRef({ season, phase, paused, onInteract });
  propsRef.current = { season, phase, paused, onInteract };

  const player = useRef({ x: PLAYER_START.x, y: PLAYER_START.y, dir: "down", moving: false, anim: 0, flip: false });
  const mobs = useRef<Mob[]>([]);
  const cam = useRef({ x: 0, y: 0 });
  const stepAcc = useRef(0);

  // init mobů jednou
  if (mobs.current.length === 0) {
    mobs.current = ANIMAL_SPAWNS.map((s) => ({
      id: s.animalId,
      x: s.hx,
      y: s.hy,
      hx: s.hx,
      hy: s.hy,
      radius: s.radius,
      tx: s.hx,
      ty: s.hy,
      rest: Math.random() * 2,
      flip: false,
      bob: Math.random() * 6,
    }));
  }

  useEffect(() => {
    preloadSprites(ANIMALS.map((a) => a.id), PEOPLE.map((p) => p.id));

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let cssW = 800;
    let cssH = 600;

    const resize = () => {
      const wrap = wrapRef.current!;
      cssW = wrap.clientWidth;
      cssH = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current!);

    // klávesnice
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
      if ((e.code === "Space" || e.code === "Enter") && !propsRef.current.paused) {
        // action na keyup, ať se nedrží
        triggerAction();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let nearest: InteractTarget | null = null;

    const triggerAction = () => {
      if (nearest) {
        propsRef.current.onInteract(nearest);
        sound.interact();
      }
    };

    const canMoveTo = (nx: number, ny: number) => {
      const hw = 9;
      return (
        !isBlocked(nx - hw, ny) &&
        !isBlocked(nx + hw, ny) &&
        !isBlocked(nx - hw, ny - 6) &&
        !isBlocked(nx + hw, ny - 6)
      );
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const P = propsRef.current;
      const p = player.current;

      // --- update pohybu ---
      if (!P.paused) {
        let vx = 0;
        let vy = 0;
        if (input.left) vx -= 1;
        if (input.right) vx += 1;
        if (input.up) vy -= 1;
        if (input.down) vy += 1;
        const len = Math.hypot(vx, vy) || 1;
        vx /= len;
        vy /= len;
        const mv = SPEED * dt;
        if (vx !== 0) { const nx = p.x + vx * mv; if (canMoveTo(nx, p.y)) p.x = nx; }
        if (vy !== 0) { const ny = p.y + vy * mv; if (canMoveTo(p.x, ny)) p.y = ny; }
        p.moving = vx !== 0 || vy !== 0;
        if (vx < 0) p.flip = true;
        else if (vx > 0) p.flip = false;
        if (Math.abs(vy) > Math.abs(vx)) p.dir = vy > 0 ? "down" : "up";
        else if (vx !== 0) p.dir = vx > 0 ? "right" : "left";
        if (p.moving) {
          p.anim += dt * 10;
          stepAcc.current += dt;
          if (stepAcc.current > 0.3) { sound.step(); stepAcc.current = 0; }
        } else {
          p.anim = 0;
        }
        if (consumeAction()) triggerAction();
      } else {
        consumeAction();
        p.moving = false;
      }

      // --- mobové (procházejí se v zóně) ---
      for (const m of mobs.current) {
        m.rest -= dt;
        if (m.rest <= 0) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * m.radius;
          m.tx = m.hx + Math.cos(a) * r;
          m.ty = m.hy + Math.sin(a) * r;
          m.rest = 1.5 + Math.random() * 3.5;
        }
        const dx = m.tx - m.x;
        const dy = m.ty - m.y;
        const d = Math.hypot(dx, dy);
        if (d > 1.5) {
          const sp = 26 * dt;
          const nx = m.x + (dx / d) * sp;
          const ny = m.y + (dy / d) * sp;
          if (!isBlocked(nx, ny)) { m.x = nx; m.y = ny; m.flip = dx < 0; }
          else m.rest = 0;
          m.bob += dt * 8;
        }
      }

      // --- kamera ---
      const viewW = cssW;
      const viewH = cssH;
      const mapPixW = MAP_W * TS;
      const mapPixH = MAP_H * TS;
      let cx = p.x - viewW / 2;
      let cy = p.y - viewH / 2;
      cx = mapPixW <= viewW ? (mapPixW - viewW) / 2 : Math.max(0, Math.min(mapPixW - viewW, cx));
      cy = mapPixH <= viewH ? (mapPixH - viewH) / 2 : Math.max(0, Math.min(mapPixH - viewH, cy));
      cam.current.x += (cx - cam.current.x) * Math.min(1, dt * 8);
      cam.current.y += (cy - cam.current.y) * Math.min(1, dt * 8);
      const camX = cam.current.x;
      const camY = cam.current.y;

      // --- nejbližší cíl interakce ---
      nearest = null;
      let bestD = INTERACT_RANGE;
      for (const it of INTERACTABLES) {
        const ix = (it.tx + it.fw / 2) * TS;
        const iy = (it.ty + it.fh) * TS;
        const d = Math.hypot(ix - p.x, iy - p.y);
        if (d < bestD) { bestD = d; nearest = { kind: "building", it }; }
      }
      for (const m of mobs.current) {
        const d = Math.hypot(m.x - p.x, m.y - p.y);
        if (d < bestD) { bestD = d; nearest = { kind: "animal", animalId: m.id }; }
      }
      for (const npc of NPC_SPAWNS) {
        const d = Math.hypot(npc.x - p.x, npc.y - p.y);
        if (d < bestD) { bestD = d; nearest = { kind: "npc", npcId: npc.id }; }
      }

      // --- RENDER ---
      ctx.clearRect(0, 0, viewW, viewH);
      drawGround(ctx, camX, camY, viewW, viewH, P.season);

      // seznam objektů seřazený dle baseY
      type Item = { y: number; draw: () => void };
      const items: Item[] = [];

      for (const it of INTERACTABLES) {
        const baseY = (it.ty + it.fh) * TS;
        const near = nearest?.kind === "building" && nearest.it.id === it.id;
        items.push({ y: baseY, draw: () => drawBuilding(ctx, it, camX, camY, near, now) });
      }
      for (const m of mobs.current) {
        const near = nearest?.kind === "animal" && nearest.animalId === m.id;
        items.push({
          y: m.y,
          draw: () => drawMob(ctx, m, camX, camY, near, now),
        });
      }
      for (const npc of NPC_SPAWNS) {
        const near = nearest?.kind === "npc" && nearest.npcId === npc.id;
        items.push({ y: npc.y, draw: () => drawNpc(ctx, npc, camX, camY, near, now) });
      }
      items.push({
        y: player.current.y,
        draw: () => drawPlayer(ctx, player.current, camX, camY),
      });

      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.draw();

      // tint dle fáze/období
      drawTint(ctx, viewW, viewH, P.phase, P.season);

      // mini-mapa
      drawMinimap(ctx, viewW, p.x, p.y, nearest);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="world-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="world-canvas" />
    </div>
  );
}

// --- kreslicí pomocníci -----------------------------------------------------
function drawMob(
  ctx: CanvasRenderingContext2D,
  m: Mob,
  camX: number,
  camY: number,
  near: boolean,
  time: number,
) {
  const img = animalImg(m.id);
  const sx = m.x - camX;
  const sy = m.y - camY;
  const a = ANIMAL_BY_ID[m.id];
  const size = TS * 0.95 * (a ? animalScale(a) : 1);
  const bob = Math.sin(m.bob) * 1.5;
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(sx, sy, size * 0.3, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (near) {
    ctx.save();
    ctx.shadowColor = "rgba(240,232,146,0.95)";
    ctx.shadowBlur = 16;
  }
  if (ready(img)) {
    ctx.save();
    ctx.translate(sx, sy - size * 0.52 + bob);
    if (m.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = "#cdb188";
    ctx.beginPath();
    ctx.arc(sx, sy - size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (near) ctx.restore();
  if (near) {
    const b = Math.sin(time * 0.006) * 3;
    ctx.font = `20px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("💬", sx, sy - size - 4 + b);
  }
}

function drawNpc(
  ctx: CanvasRenderingContext2D,
  npc: { id: string; x: number; y: number },
  camX: number,
  camY: number,
  near: boolean,
  time: number,
) {
  const img = personImg(npc.id, "down", 0);
  const sx = npc.x - camX;
  const sy = npc.y - camY;
  const size = TS * 1.7;
  const bob = Math.sin(time * 0.003 + npc.x * 0.1) * 1.6;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(sx, sy, size * 0.24, size * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  if (near) {
    ctx.save();
    ctx.shadowColor = "rgba(240,232,146,0.95)";
    ctx.shadowBlur = 16;
  }
  if (ready(img)) {
    ctx.save();
    ctx.translate(sx, sy - size * 0.52 + bob);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  if (near) ctx.restore();
  // jmenovka
  const name = PERSON_BY_ID[npc.id]?.name ?? "";
  ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  const tw = ctx.measureText(name).width;
  const ny = sy - size + 4;
  ctx.fillStyle = near ? "rgba(184,92,60,0.95)" : "rgba(45,90,61,0.9)";
  roundRect(ctx, sx - tw / 2 - 6, ny - 11, tw + 12, 16, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(name, sx, ny - 3);
  if (near) {
    const b = Math.sin(time * 0.006) * 3;
    ctx.font = `20px ${EMOJI_FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("💬", sx, ny - 18 + b);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number; dir: string; moving: boolean; anim: number },
  camX: number,
  camY: number,
) {
  const spriteDir: Facing = p.dir === "up" ? "up" : p.dir === "left" || p.dir === "right" ? "side" : "down";
  const flip = p.dir === "left";
  const frame: 0 | 1 = p.moving ? ((Math.floor(performance.now() / 170) % 2) as 0 | 1) : 0;
  const img = personImg("ty", spriteDir, frame);
  const sx = p.x - camX;
  const sy = p.y - camY;
  const size = TS * 1.7;
  const bob = p.moving ? Math.abs(Math.sin(performance.now() * 0.013)) * 3 : Math.sin(performance.now() * 0.002) * 1;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(sx, sy, size * 0.24, size * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  if (ready(img)) {
    ctx.save();
    ctx.translate(sx, sy - size * 0.52 - bob);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

function drawTint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  phase: Phase,
  season: Season,
) {
  let color = "";
  if (phase === "vecer") color = "rgba(40,30,80,0.22)";
  else if (phase === "rano") color = "rgba(255,200,120,0.08)";
  if (season === "zima") color = phase === "vecer" ? "rgba(40,40,90,0.24)" : "rgba(180,205,225,0.14)";
  if (!color) return;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  px: number,
  py: number,
  nearest: InteractTarget | null,
) {
  const base = getMinimapBase();
  const mw = Math.min(150, viewW * 0.26);
  const mh = (mw * base.height) / base.width;
  const x = viewW - mw - 12;
  const y = 64;
  ctx.save();
  ctx.fillStyle = "rgba(26,31,28,0.55)";
  roundRect(ctx, x - 5, y - 5, mw + 10, mh + 10, 10);
  ctx.fill();
  roundRect(ctx, x, y, mw, mh, 6);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0, base.width, base.height, x, y, mw, mh);
  ctx.imageSmoothingEnabled = true;
  const tx = mw / base.width;
  const ty = mh / base.height;
  for (const it of INTERACTABLES) {
    const cx = x + (it.tx + it.fw / 2) * tx;
    const cy = y + (it.ty + it.fh / 2) * ty;
    const isNear = nearest?.kind === "building" && nearest.it.id === it.id;
    ctx.fillStyle =
      it.kind === "chalupa" ? "#f0e892" : it.kind === "stanek" ? "#e8a04a" : it.kind === "byliny" ? "#8fe08a" : "#f7f2e7";
    ctx.beginPath();
    ctx.arc(cx, cy, isNear ? 3.4 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const pxm = x + (px / TS) * tx;
  const pym = y + (py / TS) * ty;
  ctx.fillStyle = "#ff5a4a";
  ctx.beginPath();
  ctx.arc(pxm, pym, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}
