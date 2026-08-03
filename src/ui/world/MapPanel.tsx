import { useEffect, useRef, useState } from "react";
import { useGame } from "../store";
import { Icon } from "../icons/Icon";
import { Modal } from "../components/Modal";
import { MAP_H, MAP_W, TS } from "../../world/tiles";
import { getMinimapBase, roundRect } from "../../world/draw";
import { INTERACTABLES, PADDOCKS } from "../../world/entities";
import { liveMarkers, type Alert } from "../../world/markers";
import { TUTORIAL_BUILDING_IDS } from "../../game/content/tutorial";
import { dayPlan, type Objective } from "../../game/content/objectives";
import type { Waypoint } from "./WorldCanvas";
import { sound } from "../../audio/sound";

// ---------------------------------------------------------------------------
// Velká mapa Louky. Mini-mapa v rohu je jen orientační tečka — tady je vidět,
// co kde je: pojmenované stavby, výběhy, lokality, lidi, akutní body (utečené
// zvíře pulzuje červeně) a aktuální krok denního plánu (zlatě).
//
// Ovládání: tahem se posouvá, +/− (a kolečkem) přibližuje, ťuknutí na místo ho
// vybere — zapíchne se ukazatel, který pak svítí i ve světě, a mapa se na to
// místo posune.
// ---------------------------------------------------------------------------

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const KIND_EMOJI: Record<string, string> = {
  chalupa: "🏡",
  stanek: "🏪",
  dilna: "🛠️",
  ohniste: "🔥",
  kurnik: "🐔",
  chlivek: "🐖",
  pastvina: "🐄",
  buda: "🐕",
  studna: "⛲",
  zahrada: "🥕",
  byliny: "🌿",
  brana: "🚧",
  truhla: "🎁",
  cedule: "📜",
  stopy: "🐾",
  krmne_misto: "🍲",
  listi: "🍂",
  seniste: "🌾",
};

/** Cedule jsou většinou dekorace — na mapě chceme jen ty tři pojmenované. */
const KEEP_SIGNS = new Set(["cedule", "cedule_herb", "cedule_pond"]);

/** Pojmenované kouty mapy — hráč potřebuje vědět, že „tam někde je rybník". */
const REGIONS: { label: string; tx: number; ty: number }[] = [
  { label: "Domovská louka", tx: 48, ty: 15 },
  { label: "Bylinková louka", tx: 84, ty: 13 },
  { label: "Rybník a seniště", tx: 16, ty: 51 },
  { label: "Hluboký les", tx: 10, ty: 8 },
  { label: "Kraj lesa (liška)", tx: 22, ty: 48 },
];

const MIN_SCALE = 5;
const MAX_SCALE = 20;

interface Place {
  id: string;
  label: string;
  /** Střed místa v dlaždicích. */
  tx: number;
  ty: number;
  emoji: string;
  /** Je tam právě teď něco potřeba? */
  todo: boolean;
}

function placesFor(built: string[], hiddenIds: string[], plan: { steps: Objective[] }): Place[] {
  const todoIds = new Set<string>();
  for (const s of plan.steps) {
    if (s.done || s.locked) continue;
    if (s.target) todoIds.add(s.target);
    for (const t of s.targets ?? []) todoIds.add(t);
  }
  const out: Place[] = [];
  for (const it of INTERACTABLES) {
    if (hiddenIds.includes(it.id)) continue;
    if (it.kind === "cedule" && !KEEP_SIGNS.has(it.id)) continue; // plot/deko
    if (TUTORIAL_BUILDING_IDS.includes(it.id) && !built.includes(it.id)) continue; // ještě nestojí
    out.push({
      id: it.id,
      label: it.label,
      tx: it.tx + it.fw / 2,
      ty: it.ty + it.fh / 2,
      emoji: KIND_EMOJI[it.kind] ?? "•",
      todo: todoIds.has(it.id),
    });
  }
  // Body s prací dopředu — kreslí se první, takže si uhájí popisek i kroužek.
  return out.sort((a, b) => Number(b.todo) - Number(a.todo));
}

/** Sloučí bylinky do jednoho popisku na lokalitu, ať mapa není samé „Bylinky". */
function labelOf(p: Place, prev: Place | null): string {
  if (p.emoji !== "🌿" || !prev || prev.emoji !== "🌿") return p.label;
  return Math.hypot(p.tx - prev.tx, p.ty - prev.ty) < 6 ? "" : p.label;
}

export function MapPanel({
  onClose,
  waypoint,
  onWaypoint,
  alerts,
  hiddenIds,
}: {
  onClose: () => void;
  waypoint: Waypoint | null;
  onWaypoint: (w: Waypoint | null) => void;
  alerts: Alert[];
  hiddenIds: string[];
}) {
  const { state } = useGame();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState<Place | null>(null);
  const [scale, setScale] = useState(11);
  // Střed výřezu v dlaždicích — při otevření na hráči („mapa se mi posunula").
  const view = useRef({
    cx: liveMarkers.player.x / TS || MAP_W / 2,
    cy: liveMarkers.player.y / TS || MAP_H / 2,
  });
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const plan = dayPlan(state);
  const places = placesFor(state.built, hiddenIds, plan);
  const placesRef = useRef(places);
  placesRef.current = places;
  const waypointRef = useRef(waypoint);
  waypointRef.current = waypoint;

  const centerOn = (tx: number, ty: number) => {
    view.current.cx = tx;
    view.current.cy = ty;
  };

  const centerOnPlayer = () => centerOn(liveMarkers.player.x / TS, liveMarkers.player.y / TS);

  const centerOnTask = () => {
    const first = alerts[0];
    if (first) {
      const m = liveMarkers.escapes.find((e) => e.id === first.markerId);
      if (m) { centerOn(m.x / TS, m.y / TS); return; }
    }
    const t = plan.next?.target ?? plan.next?.targets?.[0];
    const p = t ? placesRef.current.find((q) => q.id === t) : undefined;
    if (p) centerOn(p.tx, p.ty);
  };

  // --- kreslení -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let cssW = 300;
    let cssH = 200;

    const resize = () => {
      cssW = wrap.clientWidth;
      cssH = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = (now: number) => {
      const s = scaleRef.current;
      // Výřez se drží uvnitř mapy (a když se celá vejde, vycentruje se).
      const halfW = cssW / (2 * s);
      const halfH = cssH / (2 * s);
      view.current.cx = MAP_W <= halfW * 2 ? MAP_W / 2 : Math.max(halfW, Math.min(MAP_W - halfW, view.current.cx));
      view.current.cy = MAP_H <= halfH * 2 ? MAP_H / 2 : Math.max(halfH, Math.min(MAP_H - halfH, view.current.cy));
      const ox = cssW / 2 - view.current.cx * s;
      const oy = cssH / 2 - view.current.cy * s;
      const X = (tx: number) => ox + tx * s;
      const Y = (ty: number) => oy + ty * s;

      ctx.clearRect(0, 0, cssW, cssH);
      // terén (1 px na dlaždici, natažený na měřítko — bez rozmazání)
      const base = getMinimapBase();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(base, 0, 0, base.width, base.height, ox, oy, MAP_W * s, MAP_H * s);
      ctx.imageSmoothingEnabled = true;

      // výběhy — plocha + jméno (tohle na mini-mapě vůbec nebylo vidět)
      for (const pad of PADDOCKS) {
        ctx.save();
        ctx.fillStyle = "rgba(240,232,146,0.16)";
        ctx.strokeStyle = "rgba(120,96,52,0.6)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.fillRect(X(pad.tx), Y(pad.ty), pad.w * s, pad.h * s);
        ctx.strokeRect(X(pad.tx), Y(pad.ty), pad.w * s, pad.h * s);
        ctx.setLineDash([]);
        if (s >= 8) {
          ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = "rgba(31,45,32,0.72)";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(pad.label, X(pad.tx) + 4, Y(pad.ty) + 3);
        }
        ctx.restore();
      }

      // jména lokalit
      ctx.save();
      ctx.font = '700 13px "Fraunces", Georgia, serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const r of REGIONS) {
        const tx = X(r.tx);
        const ty = Y(r.ty);
        if (tx < -80 || tx > cssW + 80 || ty < -20 || ty > cssH + 20) continue;
        ctx.fillStyle = "rgba(20,28,22,0.55)";
        ctx.fillText(r.label, tx + 1, ty + 1);
        ctx.fillStyle = "rgba(247,242,231,0.92)";
        ctx.fillText(r.label, tx, ty);
      }
      ctx.restore();

      // místa — popisky, které by se překryly, se vynechají (ikonka zůstane).
      // Body s prací kreslíme první, takže si popisek uhájí ony.
      let prev: Place | null = null;
      const taken: { x0: number; y0: number; x1: number; y1: number }[] = [];
      const free = (x0: number, y0: number, x1: number, y1: number) =>
        !taken.some((t) => x0 < t.x1 && x1 > t.x0 && y0 < t.y1 && y1 > t.y0);
      for (const p of placesRef.current) {
        const px = X(p.tx);
        const py = Y(p.ty);
        const label = labelOf(p, prev);
        prev = p;
        if (px < -60 || px > cssW + 60 || py < -40 || py > cssH + 40) continue;
        const r = p.todo ? 11 : 9;
        if (p.todo) {
          const t = (now % 1200) / 1200;
          ctx.save();
          ctx.globalAlpha = 0.8 * (1 - t);
          ctx.strokeStyle = "rgba(240,208,110,0.95)";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(px, py, r + t * 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = p.todo ? "rgba(255,244,205,0.97)" : "rgba(247,242,231,0.92)";
        ctx.fill();
        ctx.lineWidth = p.todo ? 2.2 : 1.2;
        ctx.strokeStyle = p.todo ? "#b8863c" : "rgba(45,90,61,0.7)";
        ctx.stroke();
        ctx.font = `${Math.round(r * 1.3)}px ${EMOJI_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, px, py + 1);
        if (label && s >= 9) {
          ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
          ctx.textBaseline = "top";
          const w = ctx.measureText(label).width + 10;
          const lx = px - w / 2;
          const ly = py + r + 3;
          if (free(lx, ly, lx + w, ly + 16)) {
            taken.push({ x0: lx, y0: ly, x1: lx + w, y1: ly + 16 });
            ctx.fillStyle = "rgba(26,31,28,0.78)";
            roundRect(ctx, lx, ly, w, 16, 8);
            ctx.fill();
            ctx.fillStyle = "#f7f2e7";
            ctx.fillText(label, px, ly + 3);
          }
        }
      }

      // lidé (živě, jak chodí po rozvrhu)
      if (s >= 9)
        for (const n of liveMarkers.npcs) {
          const px = X(n.x / TS);
          const py = Y(n.y / TS);
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = "#8fb26a";
          ctx.fill();
          ctx.strokeStyle = "#2d5a3d";
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = "rgba(247,242,231,0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(n.label, px, py - 6);
        }

      // AKUTNÍ: utečené zvíře — velký pulzující červený bod se jménem
      for (const e of liveMarkers.escapes) {
        const px = X(e.x / TS);
        const py = Y(e.y / TS);
        const t = (now % 900) / 900;
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - t);
        ctx.strokeStyle = "rgba(232,120,90,0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, 8 + t * 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#e8785a";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Jmenovka na červeném podkladu — ať je čitelná i přes popisky míst.
        ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const nameW = ctx.measureText(e.label).width + 16;
        ctx.fillStyle = "rgba(164,66,44,0.95)";
        roundRect(ctx, px - nameW / 2, py - 30, nameW, 17, 8);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(e.label, px, py - 21);
      }

      // zapíchnutý ukazatel
      const wp = waypointRef.current;
      if (wp) {
        const px = X(wp.tx + 0.5);
        const py = Y(wp.ty + 0.5);
        const bob = Math.sin(now * 0.005) * 2;
        ctx.font = `20px ${EMOJI_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("📍", px, py - 2 + bob);
      }

      // hráč
      const px = X(liveMarkers.player.x / TS);
      const py = Y(liveMarkers.player.y / TS);
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#3f9bcd";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#fff";
      ctx.fillText("TY", px, py + 8);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // --- posouvání a výběr místa -------------------------------------------
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      view.current.cx -= dx / scaleRef.current;
      view.current.cy -= dy / scaleRef.current;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved > 8) return; // to bylo posouvání, ne výběr
      const r = canvas.getBoundingClientRect();
      const s = scaleRef.current;
      const ox = r.width / 2 - view.current.cx * s;
      const oy = r.height / 2 - view.current.cy * s;
      const tx = (e.clientX - r.left - ox) / s;
      const ty = (e.clientY - r.top - oy) / s;
      // nejbližší místo v dosahu prstu
      let best: Place | null = null;
      let bestD = Math.max(1.6, 22 / s); // v dlaždicích
      for (const p of placesRef.current) {
        const d = Math.hypot(p.tx - tx, p.ty - ty);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) {
        sound.select();
        setSel(best);
        onWaypoint({ tx: Math.round(best.tx - 0.5), ty: Math.round(best.ty), label: best.label });
        centerOn(best.tx, best.ty); // mapa se posune na vybrané místo
      } else {
        setSel(null);
        onWaypoint({ tx: Math.floor(tx), ty: Math.floor(ty), label: "Zapíchnutý bod" });
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((v) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, v * (e.deltaY < 0 ? 1.15 : 0.87))));
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", () => { dragging = false; });
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomBy = (k: number) =>
    setScale((v) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(v * k * 10) / 10)));

  return (
    <Modal title="Mapa Louky" icon="map" onClose={onClose} className="map-modal">
      <div className="map-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="map-canvas" />
        <div className="map-tools">
          <button className="icon-btn" title="Přiblížit" onClick={() => zoomBy(1.25)}>
            <Icon name="plus" size={18} />
          </button>
          <button className="icon-btn" title="Oddálit" onClick={() => zoomBy(0.8)}>
            <Icon name="minus" size={18} />
          </button>
          <button className="icon-btn" title="Vycentrovat na mě" onClick={centerOnPlayer}>
            <Icon name="target" size={18} />
          </button>
          <button className="icon-btn" title="Ukázat, kde je práce" onClick={centerOnTask}>
            <Icon name="clipboard" size={18} />
          </button>
        </div>
        {alerts.length > 0 && (
          <div className="map-alert">
            <b>❗ {alerts[0].label}</b>
            <span>Červený pulzující bod na mapě — dojdi k němu a zmáčkni akci.</span>
          </div>
        )}
      </div>

      <div className="map-foot">
        {sel ? (
          <p className="map-sel">
            <Icon name="pin" size={15} /> <b>{sel.label}</b> — ukazatel svítí i ve světě, šipka u kraje
            obrazovky ti drží směr.{" "}
            <button className="link-btn" onClick={() => { setSel(null); onWaypoint(null); }}>
              zrušit
            </button>
          </p>
        ) : (
          <p className="map-sel muted">
            Ťukni na místo na mapě — zapíchne se ukazatel a ve světě uvidíš, kudy k němu jít. Tahem mapu
            posuneš, kolečkem nebo +/− přibližuješ.
          </p>
        )}
        <ul className="map-legend">
          <li><i className="lg lg-you" /> ty</li>
          <li><i className="lg lg-todo" /> tady je teď práce</li>
          <li><i className="lg lg-urgent" /> akutně (utečené zvíře)</li>
          <li><i className="lg lg-npc" /> lidi z týmu</li>
        </ul>
      </div>
    </Modal>
  );
}
