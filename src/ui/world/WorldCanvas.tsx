import { useEffect, useRef, useState } from "react";
import type { FeedGroup, FoxStage, Phase, Placed, PlayerAppearance, Season, Weather } from "../../game/types";
import { MAP_H, MAP_W, TS, isSolidTile } from "../../world/tiles";
import { QUALITY, getQualityTier, onTierChange, perfFrame, perfSetDrawn } from "../../world/perf";
import {
  ANIMAL_SPAWNS,
  GARDEN,
  INTERACTABLES,
  PLAYER_START,
  isBlocked,
  setConstructed,
  setStructures,
  unstuckFromBuildings,
  type Bounds,
  type Interactable,
} from "../../world/entities";
import { TUTORIAL_BUILDING_IDS } from "../../game/content/tutorial";
import { COMPANION_ANIMAL_IDS } from "../../game/balance";
import { BUILDABLE_BY_ID } from "../../game/content/buildables";
import { canPlace, structureAt } from "../../game/build/placement";
import { findPath, nearestWalkable, type Pt } from "../../world/pathfind";
import { NPC_LIFE } from "../../game/content/npcLife";
import { reactionFor, idleLine, ESCAPE_HELP, ESCAPE_SHRUG } from "../../game/content/npcReactions";
import { pick } from "../../game/engine/util";
import { PERSON_BY_ID } from "../../game/content/people";
import { drawBlueprint, drawBuilding, drawGhost, drawGround, drawPaddocks, drawSunlight, drawVignette, drawWaterShimmer, getMinimapBase, roundRect } from "../../world/draw";
import { animalImg, personImg, personImgFor, preloadSprites, ready } from "../../world/spriteCache";
import { ANIMALS, ANIMAL_BY_ID, animalScale } from "../../game/content/animals";
import type { Facing } from "../sprites/PersonSprite";
import { PEOPLE } from "../../game/content/people";
import { consumeAction, input } from "../../world/input";
import { sound } from "../../audio/sound";

/** fw/fh podle defId — pro `canPlace`/`structureAt` (chybějící def = 1×1). */
const footprintOf = (defId: string) => {
  const d = BUILDABLE_BY_ID[defId];
  return { fw: d?.fw ?? 1, fh: d?.fh ?? 1 };
};

export type InteractTarget =
  | { kind: "building"; it: Interactable }
  | { kind: "animal"; animalId: string }
  | { kind: "npc"; npcId: string }
  | { kind: "wild"; id: string };

export type WorldEvent =
  | { type: "escape"; animalId: string; npcId: string | null; helped: boolean; line: string }
  | { type: "raid"; animalId: string }
  | { type: "caught"; animalId: string }
  | { type: "wildSpooked"; which: string }
  | { type: "wildSeen"; which: string };

/** Co se zrovna děje s divokými sousedy (odvozeno v App ze stavu hry). */
export interface WildActive {
  kaneCircle: boolean; // káně krouží nad drůbeží (bez úkrytu)
  kanePerch: boolean; // káně sedí na kůlu (s úkrytem) — dá se pozorovat
  jezekOut: boolean; // ježek šustí u zahrádky (podzimní večery)
  srnkaOut: boolean; // srnka stojí za úsvitu na kraji louky
}

interface Props {
  season: Season;
  phase: Phase;
  paused: boolean;
  welfare: Record<FeedGroup, number>;
  weather: Weather;
  money: number;
  /** Postavené stavby (tutoriál). Nepostavené se nekreslí / nejsou solidní. */
  built: string[];
  /** Nepostavené stavby, které má hráč právě postavit (svítící „plány"). */
  tutorialTargets: string[];
  /** Skupiny zvířat, jejichž výběh už stojí (nastěhovaly se). */
  settledGroups: FeedGroup[];
  /** Běží ještě úvodní tutoriál? (útěky vypnuty, čekající zvířata) */
  tutorial: boolean;
  /** Developerské turbo — rychlejší pohyb po mapě. */
  turbo?: boolean;
  /** Postup liščího příběhu — řídí, kdy a kde se liška ukazuje. */
  foxStage: FoxStage;
  /** Aktivní divocí sousedé (káně, ježek, srnka). */
  wildActive: WildActive;
  /** Příběhové objekty, které se zatím nemají ukazovat (stopy, miska, listí). */
  hiddenIds: string[];
  /** Podoba hráče (tvůrce postavy) — kreslí se na Canvas. */
  appearance: PlayerAppearance;
  /** Volně postavené stavby — zdroj pravdy o tom, co stojí na louce. */
  structures: Placed[];
  /** Stavební mód: `true` = zapnuto (HUD „🔨 Stavět"). */
  editMode: boolean;
  /** Katalogové `defId` právě vybrané v BuildPanelu k umístění, nebo `null`
   *  (pak se v edit módu klepnutím vybírá existující stavba k přesunu/zboření). */
  buildSelection: string | null;
  onPlaceStructure: (defId: string, tx: number, ty: number) => void;
  onDemolishStructure: (uid: string) => void;
  onMoveStructure: (uid: string, tx: number, ty: number) => void;
  onEditReject: () => void;
  onInteract: (t: InteractTarget) => void;
  onEvent: (e: WorldEvent) => void;
}

// Divoký soused ve světě — jednoduché chování: postává/popochází u svého
// místa, a když se hráč přižene moc rychle, uteče do lesa (ponaučení).
interface WildMob {
  id: string; // "liska" | "kane" | "jezek" | "srnka"
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
  mode: "idle" | "flee" | "gone";
  fleeTo: { x: number; y: number };
  skittish: boolean; // uteče před rychlým přiblížením
  interactable: boolean;
  eventOnFlee?: WorldEvent;
  eventOnce?: boolean; // event už odeslán
}

interface Mob {
  id: string;
  group: FeedGroup;
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
  bounds?: Bounds;
  escaped: boolean;
  raided: boolean;
  waiting: boolean; // tutoriál: postává u vjezdu, dokud nemá postavený výběh
}

// Živé NPC — chodí po rozvrhu mezi stanovišti a u nich „pracují".
interface NpcAgent {
  id: string;
  x: number;
  y: number;
  dir: Facing;
  flip: boolean;
  anim: number;
  moving: boolean;
  path: Pt[];
  work: string; // emoji činnosti při práci na stanovišti
  workBob: number;
  bubble: { text: string; until: number } | null; // promluva nad hlavou
  nextThink: number; // kdy příště vyhodnotit reakci (ms, performance.now)
  helping: string | null; // id zvířete, které právě honí zpět do výběhu
  repath: number; // s do dalšího přepočtu cesty k honěnému zvířeti
}

/** Snapne stanoviště dané fáze na nejbližší průchozí dlaždici. */
function standOf(id: string, phase: Phase) {
  const s = NPC_LIFE[id].schedule[phase];
  const w = nearestWalkable(s.tx, s.ty);
  return { tx: w.tx, ty: w.ty, work: s.work };
}

const SPEED = 165; // px/s
const INTERACT_RANGE = TS * 1.5;
// Čekací zóna zvířat u vjezdu (tutoriál) — než dostaví svůj výběh.
const WAIT_CENTER = { x: 24.5 * TS, y: 22.5 * TS };
const WAIT_RADIUS = TS * 1.9;
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const BUILDING_VERB: Record<string, string> = {
  kurnik: "Drůbež (krmení / vejce)",
  chlivek: "Nakrmit prasata",
  pastvina: "Stádo",
  buda: "Nakrmit mazlíčky",
  studna: "Napojit zvířata",
  ohniste: "Oheň / vaření",
  dilna: "Výroba",
  stanek: "Obchod",
  chalupa: "Domov",
  cedule: "Nápověda",
  byliny: "Sbírat byliny",
  brana: "Lesní brána",
  truhla: "Otevřít truhlu",
  zahrada: "Zahrádka",
  stopy: "Prozkoumat stopy",
  krmne_misto: "Nechat lišce misku",
  listi: "Hromada listí",
  seniste: "Seniště (kosit / sušit / obracet)",
};

export function WorldCanvas({ season, phase, paused, welfare, weather, money, built, tutorialTargets, settledGroups, tutorial, turbo, foxStage, wildActive, hiddenIds, appearance, structures, editMode, buildSelection, onPlaceStructure, onDemolishStructure, onMoveStructure, onEditReject, onInteract, onEvent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // měnící se props čteme přes ref, ať smyčku nemusíme restartovat
  const propsRef = useRef({ season, phase, paused, welfare, weather, money, built, tutorialTargets, settledGroups, tutorial, turbo, foxStage, wildActive, hiddenIds, appearance, structures, editMode, buildSelection, onPlaceStructure, onDemolishStructure, onMoveStructure, onEditReject, onInteract, onEvent });
  propsRef.current = { season, phase, paused, welfare, weather, money, built, tutorialTargets, settledGroups, tutorial, turbo, foxStage, wildActive, hiddenIds, appearance, structures, editMode, buildSelection, onPlaceStructure, onDemolishStructure, onMoveStructure, onEditReject, onInteract, onEvent };

  // Vybraná existující stavba v edit módu (bez buildSelection) — místní React
  // stav, protože řídí DOM lištu Přesunout/Zbořit/Zrušit pod canvasem.
  const [selected, setSelected] = useState<Placed | null>(null);
  // Právě probíhá přesun vybrané stavby (po kliknutí na „↔️ Přesunout")?
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  movingRef.current = moving;
  const selectedRef = useRef<Placed | null>(null);
  selectedRef.current = selected;

  // Opuštění stavebního módu / přepnutí vybraného katalogového itemu zruší
  // rozdělanou akci nad existující stavbou.
  useEffect(() => {
    if (!editMode || buildSelection) { setSelected(null); setMoving(false); }
  }, [editMode, buildSelection]);

  // Kolize staveb podle toho, co už stojí (blueprint je průchozí). Když hráč
  // dostavěl stavbu „zevnitř" plánu nebo těsně u jejího boku, vysuneme ho ven
  // před ni, ať nezůstane zaseknutý ani schovaný za novou stavbou.
  const builtPrev = useRef<string[]>(built);
  const structuresPrev = useRef<Placed[]>(structures);
  useEffect(() => {
    setStructures(structures); // 1) přegeneruj INTERACTABLES (čte je vše ostatní)
    setConstructed(built); // 2) přepočet solidních dlaždic z nových pozic
    const added = built.filter((id) => !builtPrev.current.includes(id));
    const prevByUid = new Map(structuresPrev.current.map((p) => [p.uid, p]));
    const changed = structures
      .filter((p) => {
        const prev = prevByUid.get(p.uid);
        return !prev || prev.tx !== p.tx || prev.ty !== p.ty;
      })
      .map((p) => (BUILDABLE_BY_ID[p.defId]?.unique ? p.defId : p.uid));
    builtPrev.current = built;
    structuresPrev.current = structures;
    const toUnstick = [...added, ...changed]; // stavba se mohla přesunout na hráče
    if (toUnstick.length) {
      const spot = unstuckFromBuildings(player.current.x, player.current.y, toUnstick);
      if (spot) { player.current.x = spot.x; player.current.y = spot.y; }
    }
  }, [built, structures]);

  const player = useRef({ x: PLAYER_START.x, y: PLAYER_START.y, dir: "down", moving: false, anim: 0, flip: false });
  const mobs = useRef<Mob[]>([]);
  const npcs = useRef<NpcAgent[]>([]);
  // Divocí sousedé — přestaví se, kdykoli se změní podmínky (fáze, příběh).
  const wilds = useRef<WildMob[]>([]);
  const wildKey = useRef("");
  const npcPhase = useRef<Phase>(phase);
  const cam = useRef({ x: 0, y: 0 });
  // Stavební mód: náhled dlaždice pod prstem (nová stavba i přesun vybrané) —
  // jen ref, bez re-renderu (kreslí se každý snímek v `loop`).
  const buildGhost = useRef<{ it: Interactable; tx: number; ty: number; valid: boolean } | null>(null);
  const stepAcc = useRef(0);
  const escapeAcc = useRef(0);
  const lastPhase = useRef<Phase>(phase);
  const topInset = useRef(56); // výška horní HUD lišty — pod ni sázíme mini-mapu

  // init mobů jednou — zvířata bez postaveného výběhu čekají u vjezdu
  if (mobs.current.length === 0) {
    mobs.current = ANIMAL_SPAWNS.map((s) => {
      // Companions (pes + kočka) obcházejí bránu podle výběhu — jsou tu od
      // začátku, nikdy nečekají u vjezdu.
      const waiting = !COMPANION_ANIMAL_IDS.includes(s.animalId) && !settledGroups.includes(s.group);
      const x = waiting ? WAIT_CENTER.x + (Math.random() - 0.5) * WAIT_RADIUS * 2 : s.hx;
      const y = waiting ? WAIT_CENTER.y + (Math.random() - 0.5) * WAIT_RADIUS * 2 : s.hy;
      return {
        id: s.animalId,
        group: s.group,
        x,
        y,
        hx: s.hx,
        hy: s.hy,
        radius: s.radius,
        tx: x,
        ty: y,
        rest: Math.random() * 2,
        flip: false,
        bob: Math.random() * 6,
        bounds: s.bounds,
        escaped: false,
        raided: false,
        waiting,
      };
    });
  }

  // init NPC jednou — postavíme je rovnou na stanoviště aktuální fáze
  if (npcs.current.length === 0) {
    npcs.current = Object.keys(NPC_LIFE).map((id) => {
      const s = standOf(id, phase);
      return {
        id,
        x: (s.tx + 0.5) * TS,
        y: (s.ty + 0.5) * TS,
        dir: "down" as Facing,
        flip: false,
        anim: 0,
        moving: false,
        path: [] as Pt[],
        work: s.work,
        workBob: Math.random() * 6,
        bubble: null,
        nextThink: 2000 + Math.random() * 6000,
        helping: null,
        repath: 0,
      };
    });
    npcPhase.current = phase;
  }

  useEffect(() => {
    preloadSprites([...ANIMALS.map((a) => a.id), "liska", "kane", "jezek", "srnka"], PEOPLE.map((p) => p.id));
    // Přednačti hráče v jeho zvolené podobě (výchozí hodnota při startu stačí).
    for (const d of ["down", "up", "side"] as Facing[]) {
      personImgFor(appearance, d, 0);
      personImgFor(appearance, d, 1);
    }

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
      const dpr = Math.min(window.devicePixelRatio || 1, QUALITY[getQualityTier()].dprCap);
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
    // po přepnutí kvality v dev panelu hned přepočítat DPR
    const unsubTier = onTierChange(() => resize());

    // sleduj výšku horní HUD lišty (na mobilu na výšku se zalamuje a je vyšší)
    const hudTop = document.querySelector(".hud-top") as HTMLElement | null;
    const measureHud = () => { topInset.current = hudTop ? Math.ceil(hudTop.getBoundingClientRect().height) : 56; };
    measureHud();
    const hudRo = hudTop ? new ResizeObserver(measureHud) : null;
    if (hudTop && hudRo) hudRo.observe(hudTop);

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
      if (propsRef.current.editMode) return; // v edit módu se nestaví/neinteraguje
      if (!nearest) return;
      // chytání uprchlíka — zažene zpět do výběhu
      if (nearest.kind === "animal") {
        const id = nearest.animalId;
        const m = mobs.current.find((mm) => mm.id === id);
        if (m && m.escaped) {
          m.escaped = false;
          m.raided = false;
          m.tx = m.hx;
          m.ty = m.hy;
          m.rest = 0;
          propsRef.current.onEvent({ type: "caught", animalId: m.id });
          sound.interact();
          return;
        }
      }
      propsRef.current.onInteract(nearest);
      sound.interact();
    };

    // Převod z obrazovky do world souřadnic (ctx transform je 1:1 v CSS px).
    const toWorld = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { wx: e.clientX - r.left + cam.current.x, wy: e.clientY - r.top + cam.current.y };
    };
    // Náhled půdorysu pod prstem — nová stavba z BuildPanelu. Validita
    // (zelená/červená) přesně kopíruje reducer PLACE_STRUCTURE.
    const computeNewGhost = (e: PointerEvent, defId: string) => {
      const def = BUILDABLE_BY_ID[defId];
      const { wx, wy } = toWorld(e);
      const fw = def?.fw ?? 1;
      const fh = def?.fh ?? 1;
      const tx = Math.round(wx / TS - fw / 2); // střed půdorysu pod prstem
      const ty = Math.round(wy / TS - fh / 2);
      const structures = propsRef.current.structures;
      const alreadyUnique = !!def?.unique && structures.some((s) => s.defId === defId);
      const valid = !alreadyUnique && canPlace({ structures, isSolid: isSolidTile, def: { fw, fh }, tx, ty, footprintOf }).ok;
      const it: Interactable = { id: "__ghost", kind: def?.kind ?? "cedule", label: def?.label ?? "", tx, ty, fw, fh, solid: def?.solid ?? true };
      return { it, tx, ty, valid };
    };
    // Náhled přesunu vybrané stavby — stejné, ale bez ní samotné v seznamu
    // (aby nekolidovala sama se sebou), přesně jako reducer MOVE_STRUCTURE.
    const computeMoveGhost = (e: PointerEvent, inst: Placed) => {
      const def = BUILDABLE_BY_ID[inst.defId];
      const { wx, wy } = toWorld(e);
      const fw = def?.fw ?? 1;
      const fh = def?.fh ?? 1;
      const tx = Math.round(wx / TS - fw / 2);
      const ty = Math.round(wy / TS - fh / 2);
      const others = propsRef.current.structures.filter((s) => s.uid !== inst.uid);
      const valid = canPlace({ structures: others, isSolid: isSolidTile, def: { fw, fh }, tx, ty, footprintOf }).ok;
      const it: Interactable = { id: "__ghost", kind: def?.kind ?? "cedule", label: def?.label ?? "", tx, ty, fw, fh, solid: def?.solid ?? true };
      return { it, tx, ty, valid };
    };

    // klik/ťuk přímo do světa = interakce s nejbližším cílem; ve stavebním
    // módu = umístit novou stavbu (BuildPanel vybrán) nebo vybrat/přesunout
    // existující (viz DOM lišta Přesunout/Zbořit pod canvasem).
    const onCanvasPointer = (e: PointerEvent) => {
      e.preventDefault();
      const P = propsRef.current;
      if (P.editMode) {
        if (P.buildSelection) {
          buildGhost.current = computeNewGhost(e, P.buildSelection);
          canvas.setPointerCapture(e.pointerId);
          return;
        }
        if (movingRef.current && selectedRef.current) {
          buildGhost.current = computeMoveGhost(e, selectedRef.current);
          canvas.setPointerCapture(e.pointerId);
          return;
        }
        const { wx, wy } = toWorld(e);
        const hit = structureAt(P.structures, Math.floor(wx / TS), Math.floor(wy / TS), footprintOf);
        setSelected(hit);
        return;
      }
      if (!propsRef.current.paused) triggerAction();
    };
    const onCanvasMove = (e: PointerEvent) => {
      const P = propsRef.current;
      if (!P.editMode) return;
      if (P.buildSelection) { e.preventDefault(); buildGhost.current = computeNewGhost(e, P.buildSelection); return; }
      if (movingRef.current && selectedRef.current) { e.preventDefault(); buildGhost.current = computeMoveGhost(e, selectedRef.current); }
    };
    const onCanvasUp = () => {
      const P = propsRef.current;
      const g = buildGhost.current;
      if (!g) return;
      if (P.editMode && P.buildSelection) {
        if (g.valid) P.onPlaceStructure(P.buildSelection, g.tx, g.ty);
        else P.onEditReject();
      } else if (P.editMode && movingRef.current && selectedRef.current) {
        if (g.valid) P.onMoveStructure(selectedRef.current.uid, g.tx, g.ty);
        else P.onEditReject();
        setMoving(false);
        setSelected(null);
      }
      buildGhost.current = null;
    };
    canvas.addEventListener("pointerdown", onCanvasPointer);
    canvas.addEventListener("pointermove", onCanvasMove);
    canvas.addEventListener("pointerup", onCanvasUp);
    canvas.addEventListener("pointercancel", onCanvasUp);

    // Malý kruhový-ish kolizní rámeček u nohou — průchozí mezery i přiblížení
    // ke stavbám jsou plynulé (keře už nejsou solid). Pohyb je po osách
    // oddělený výš (klouže podél zdí), takže rohy nezasekávají.
    const canMoveTo = (nx: number, ny: number) => {
      const hw = 8;
      return (
        !isBlocked(nx - hw, ny) &&
        !isBlocked(nx + hw, ny) &&
        !isBlocked(nx - hw, ny - 8) &&
        !isBlocked(nx + hw, ny - 8) &&
        !isBlocked(nx, ny)
      );
    };

    // sezónní částice (sníh / listí / okvětní lístky / pyl)
    type Particle = { x: number; y: number; rot: number; rv: number; sz: number };
    let particles: Particle[] = [];
    let pSeason = "";
    const seedParticles = (s: Season, w: number, h: number) => {
      const n = s === "leto" ? 26 : 44;
      particles = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, rot: Math.random() * 6, rv: (Math.random() - 0.5) * 2.5, sz: 2 + Math.random() * 1.6 }));
      pSeason = s;
    };
    const drawParticles = (s: Season, w: number, h: number, dt: number, now: number) => {
      if (pSeason !== s || !particles.length) seedParticles(s, w, h);
      const col = s === "zima" ? "#ffffff" : s === "podzim" ? "#cf7a2e" : s === "jaro" ? "#f2b4d0" : "#f3e08a";
      ctx.fillStyle = col;
      for (const pt of particles) {
        if (s === "zima") { pt.x += Math.sin(now * 0.001 + pt.rot) * 0.4 + 6 * dt; pt.y += 24 * dt; }
        else if (s === "podzim") { pt.x += Math.sin(now * 0.0013 + pt.rot) * 0.9 + 10 * dt; pt.y += 30 * dt; pt.rot += pt.rv * dt; }
        else if (s === "jaro") { pt.x += Math.sin(now * 0.001 + pt.rot) * 0.8 + 14 * dt; pt.y += 18 * dt; }
        else { pt.x += Math.sin(now * 0.0008 + pt.rot) * 0.5 + 5 * dt; pt.y -= 7 * dt; }
        if (pt.y > h + 10) { pt.y = -10; pt.x = Math.random() * w; }
        else if (pt.y < -10) { pt.y = h + 10; pt.x = Math.random() * w; }
        if (pt.x > w + 10) pt.x = -10;
        else if (pt.x < -10) pt.x = w + 10;
        if (s === "podzim") {
          ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot); ctx.globalAlpha = 0.85;
          ctx.fillRect(-pt.sz, -pt.sz * 0.6, pt.sz * 2, pt.sz * 1.2); ctx.restore();
        } else {
          ctx.globalAlpha = s === "leto" ? 0.7 : 0.85;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.sz, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    // Znovupoužívaný seznam objektů k vykreslení (seřazený dle baseY) — alokován
    // jednou pro celý běh efektu, aby nevznikalo GC tlaku každý snímek.
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];

    const loop = (now: number) => {
      perfFrame(now);
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
        const mv = SPEED * (P.turbo ? 2.7 : 1) * dt;
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

      // --- událost útěku: občas jedno zvíře vyrazí z výběhu do zahrádky ---
      escapeAcc.current += dt;
      if (!P.paused && !P.tutorial && escapeAcc.current > 14) {
        escapeAcc.current = 0;
        if (!mobs.current.some((m) => m.escaped) && Math.random() < 0.18) {
          const cands = mobs.current.filter((m) => m.bounds);
          const m = cands[Math.floor(Math.random() * cands.length)];
          if (m) {
            m.escaped = true;
            m.raided = false;
            m.tx = GARDEN.x;
            m.ty = GARDEN.y;
            m.rest = 3;
            // najdi nejbližší volné NPC — ale pomůže jen tak v půlce případů
            let nearestNpc: NpcAgent | null = null;
            let hd = Infinity;
            for (const a of npcs.current) {
              if (a.helping) continue;
              const d = Math.hypot(a.x - m.x, a.y - m.y);
              if (d < hd) { hd = d; nearestNpc = a; }
            }
            const helped = !!nearestNpc && Math.random() < 0.5;
            const npcId = nearestNpc?.id ?? null;
            let line = "";
            if (nearestNpc && helped) {
              nearestNpc.helping = m.id;
              nearestNpc.path = [];
              nearestNpc.repath = 0;
              line = pick(ESCAPE_HELP[nearestNpc.id] ?? ["Já ho zaženu! 🏃"]);
              nearestNpc.bubble = { text: line, until: now + 3000 };
            } else if (nearestNpc) {
              line = pick(ESCAPE_SHRUG[nearestNpc.id] ?? ["To nestíhám, musíš tam ty!"]);
              nearestNpc.bubble = { text: line, until: now + 3500 };
            }
            propsRef.current.onEvent({ type: "escape", animalId: m.id, npcId, helped, line });
          }
        }
      }
      // přes noc se uprchlíci sami vrátí
      if (P.phase === "rano" && lastPhase.current !== "rano") {
        for (const m of mobs.current) if (m.escaped) { m.escaped = false; m.raided = false; m.tx = m.hx; m.ty = m.hy; }
      }
      lastPhase.current = P.phase;

      // --- mobové (pasou se ve výběhu; uprchlík míří do zahrádky) ---
      if (!P.paused) {
        for (const m of mobs.current) {
          // nastěhování: jakmile jeho výběh stojí, přestane čekat a míří domů
          if (m.waiting && P.settledGroups.includes(m.group)) {
            m.waiting = false;
            m.tx = m.hx;
            m.ty = m.hy;
            m.rest = 0;
          }
          m.rest -= dt;
          if (m.rest <= 0) {
            if (m.waiting) {
              const a = Math.random() * Math.PI * 2;
              const r = Math.random() * WAIT_RADIUS;
              m.tx = WAIT_CENTER.x + Math.cos(a) * r;
              m.ty = WAIT_CENTER.y + Math.sin(a) * r;
              m.rest = 1.2 + Math.random() * 3;
            } else if (m.escaped) {
              m.tx = GARDEN.x;
              m.ty = GARDEN.y;
              m.rest = 2;
            } else if (m.bounds) {
              m.tx = m.bounds.x0 + Math.random() * (m.bounds.x1 - m.bounds.x0);
              m.ty = m.bounds.y0 + Math.random() * (m.bounds.y1 - m.bounds.y0);
              m.rest = 1.5 + Math.random() * 3.5;
            } else {
              const a = Math.random() * Math.PI * 2;
              const r = Math.random() * m.radius;
              m.tx = m.hx + Math.cos(a) * r;
              m.ty = m.hy + Math.sin(a) * r;
              m.rest = 1.5 + Math.random() * 3.5;
            }
          }
          const dx = m.tx - m.x;
          const dy = m.ty - m.y;
          const d = Math.hypot(dx, dy);
          if (d > 1.5) {
            const sp = (m.escaped ? 44 : 26) * dt;
            let nx = m.x + (dx / d) * sp;
            let ny = m.y + (dy / d) * sp;
            if (!m.escaped && !m.waiting && m.bounds) {
              nx = Math.max(m.bounds.x0, Math.min(m.bounds.x1, nx));
              ny = Math.max(m.bounds.y0, Math.min(m.bounds.y1, ny));
            }
            if (!isBlocked(nx, ny)) { m.x = nx; m.y = ny; m.flip = dx < 0; }
            else m.rest = 0;
            m.bob += dt * 8;
          }
          if (m.escaped && !m.raided && Math.hypot(m.x - GARDEN.x, m.y - GARDEN.y) < TS) {
            m.raided = true;
            propsRef.current.onEvent({ type: "raid", animalId: m.id });
          }
        }
      }

      // --- divocí sousedé: liška, káně, ježek, srnka -----------------------
      if (!P.paused) {
        // přestavět seznam, když se změní podmínky (fáze / postup příběhu)
        const key = `${P.phase}|${P.foxStage}|${P.wildActive.kanePerch}|${P.wildActive.jezekOut}|${P.wildActive.srnkaOut}|${P.tutorial}`;
        if (key !== wildKey.current) {
          wildKey.current = key;
          const list: WildMob[] = [];
          const mk = (id: string, htx: number, hty: number, radius: number, opts: Partial<WildMob>): WildMob => ({
            id,
            x: (htx + 0.5) * TS,
            y: (hty + 0.5) * TS,
            hx: (htx + 0.5) * TS,
            hy: (hty + 0.5) * TS,
            radius: radius * TS,
            tx: (htx + 0.5) * TS,
            ty: (hty + 0.5) * TS,
            rest: 1,
            flip: false,
            bob: Math.random() * 6,
            mode: "idle",
            fleeTo: { x: 2.5 * TS, y: 26 * TS },
            skittish: false,
            interactable: true,
            ...opts,
          });
          if (!P.tutorial) {
            // liška: večer číhá u kraje lesa (dokud není kamarádka), ráno
            // jako kamarádka cupitá u pěšiny a dá se pohladit
            if (P.phase === "vecer" && (P.foxStage === "pozorovani" || P.foxStage === "krmeni" || P.foxStage === "duvera")) {
              list.push(mk("liska", 6.5, 23.5, 1.4, {
                skittish: true,
                eventOnFlee: { type: "wildSpooked", which: "liska" },
              }));
            } else if (P.phase === "rano" && P.foxStage === "kamarad") {
              list.push(mk("liska", 22.5, 21.5, 2, {}));
            }
            // srnka: za úsvitu na východním kraji louky; před hráčem prchá,
            // ale i letmé setkání se počítá (wildSeen)
            if (P.wildActive.srnkaOut) {
              list.push(mk("srnka", 50.5, 17.5, 1.6, {
                skittish: true,
                fleeTo: { x: 62.5 * TS, y: 8.5 * TS },
                interactable: false,
                eventOnFlee: { type: "wildSeen", which: "srnka" },
              }));
            }
            // ježek: podzimní večery u zahrádky (když má domek)
            if (P.wildActive.jezekOut) list.push(mk("jezek", 34.5, 14.8, 1.1, {}));
            // káně: s úkrytem sedí na kůlu u drůbežího výběhu
            if (P.wildActive.kanePerch && P.phase === "poledne") list.push(mk("kane", 17.5, 10.2, 0.2, {}));
          }
          wilds.current = list;
        }
        for (const wm of wilds.current) {
          if (wm.mode === "gone") continue;
          const pd = Math.hypot(p.x - wm.x, p.y - wm.y);
          // plaché zvíře: rychlé přiblížení = útěk do lesa (+ ponaučení)
          if (wm.mode === "idle" && wm.skittish && pd < TS * 2.4 && p.moving) {
            wm.mode = "flee";
            wm.tx = wm.fleeTo.x;
            wm.ty = wm.fleeTo.y;
            if (wm.eventOnFlee && !wm.eventOnce) {
              wm.eventOnce = true;
              propsRef.current.onEvent(wm.eventOnFlee);
            }
          }
          // srnka: i klidné setkání zblízka se počítá jako „potkání"
          if (wm.id === "srnka" && wm.mode === "idle" && pd < TS * 4 && !wm.eventOnce) {
            wm.eventOnce = true;
            propsRef.current.onEvent({ type: "wildSeen", which: "srnka" });
          }
          wm.rest -= dt;
          if (wm.rest <= 0 && wm.mode === "idle") {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * wm.radius;
            wm.tx = wm.hx + Math.cos(a) * r;
            wm.ty = wm.hy + Math.sin(a) * r;
            wm.rest = 1.5 + Math.random() * 3;
          }
          const dx = wm.tx - wm.x;
          const dy = wm.ty - wm.y;
          const d = Math.hypot(dx, dy);
          if (d > 1.5) {
            const sp = (wm.mode === "flee" ? 120 : 20) * dt;
            const nx = wm.x + (dx / d) * sp;
            const ny = wm.y + (dy / d) * sp;
            if (wm.mode === "flee" || !isBlocked(nx, ny)) { wm.x = nx; wm.y = ny; wm.flip = dx < 0; }
            wm.bob += dt * 8;
          } else if (wm.mode === "flee") {
            wm.mode = "gone";
          }
        }
      }

      // --- NPC: žijí podle rozvrhu, pomáhají s útěky a reagují na svět ---
      if (!P.paused) {
        // při změně fáze přejdou na nové stanoviště (kromě těch, co honí zvíře)
        if (P.phase !== npcPhase.current) {
          for (const a of npcs.current) {
            if (a.helping) continue;
            const s = standOf(a.id, P.phase);
            a.path = findPath(Math.floor(a.x / TS), Math.floor(a.y / TS), s.tx, s.ty);
            a.work = s.work;
          }
          npcPhase.current = P.phase;
        }
        const routeToStation = (a: NpcAgent) => {
          const s = standOf(a.id, P.phase);
          a.path = findPath(Math.floor(a.x / TS), Math.floor(a.y / TS), s.tx, s.ty);
          a.work = s.work;
        };
        for (const a of npcs.current) {
          const life = NPC_LIFE[a.id];

          // honění uprchlíka zpět do výběhu
          if (a.helping) {
            const m = mobs.current.find((mm) => mm.id === a.helping);
            if (!m || !m.escaped) {
              a.helping = null; // chyceno (hráčem i NPC) → zpět na stanoviště
              routeToStation(a);
            } else if (Math.hypot(a.x - m.x, a.y - m.y) < TS * 0.9) {
              m.escaped = false; m.raided = false; m.tx = m.hx; m.ty = m.hy; m.rest = 0;
              propsRef.current.onEvent({ type: "caught", animalId: m.id });
              a.helping = null;
              a.bubble = { text: "Mám tě! 🐾", until: now + 2500 };
              routeToStation(a);
            } else {
              a.repath -= dt;
              if (a.repath <= 0 || a.path.length === 0) {
                a.path = findPath(Math.floor(a.x / TS), Math.floor(a.y / TS), Math.floor(m.x / TS), Math.floor(m.y / TS));
                a.repath = 0.6;
              }
            }
          }

          // pohyb po cestě / práce na stanovišti
          if (a.path.length) {
            const w = a.path[0];
            const dx = w.x - a.x;
            const dy = w.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            const sp = life.speed * dt;
            if (d <= sp) { a.x = w.x; a.y = w.y; a.path.shift(); }
            else { a.x += (dx / d) * sp; a.y += (dy / d) * sp; }
            a.moving = true;
            if (Math.abs(dx) > Math.abs(dy)) { a.dir = "side"; a.flip = dx < 0; }
            else { a.dir = dy > 0 ? "down" : "up"; }
            a.anim += dt * 8;
          } else {
            a.moving = false;
            a.dir = "down";
            a.workBob += dt * 4;
          }

          // „mozek": občas promluví podle stavu světa (jen v klidu, ne při honění)
          if (!a.moving && !a.helping && now > a.nextThink) {
            const snap = { welfare: P.welfare, weather: P.weather, season: P.season, phase: P.phase, money: P.money };
            const r = reactionFor(a.id, snap);
            if (r) a.bubble = { text: r.ambient, until: now + 4500 };
            else if (Math.random() < 0.4) a.bubble = { text: idleLine(a.id, Math.random()), until: now + 3500 };
            a.nextThink = now + 7000 + Math.random() * 7000;
          }
          if (a.bubble && now > a.bubble.until) a.bubble = null;
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

      // stav stavby: postavená (nebo negatovaná) / svítící plán / skrytá
      const buildStateOf = (it: Interactable) => {
        const gated = TUTORIAL_BUILDING_IDS.includes(it.id);
        const isBuilt = !gated || P.built.includes(it.id);
        return { isBuilt, isTarget: !isBuilt && P.tutorialTargets.includes(it.id) };
      };

      // --- nejbližší cíl interakce ---
      nearest = null;
      let bestD = INTERACT_RANGE;
      for (const it of INTERACTABLES) {
        if (P.hiddenIds.includes(it.id)) continue; // příběhem zatím skryté
        const bs = buildStateOf(it);
        if (!bs.isBuilt && !bs.isTarget) continue; // skrytý plán se nedá zaměřit
        const ix = (it.tx + it.fw / 2) * TS;
        const iy = (it.ty + it.fh) * TS;
        const d = Math.hypot(ix - p.x, iy - p.y);
        if (d < bestD) { bestD = d; nearest = { kind: "building", it }; }
      }
      for (const wm of wilds.current) {
        if (wm.mode !== "idle" || !wm.interactable) continue;
        const d = Math.hypot(wm.x - p.x, wm.y - p.y);
        if (d < bestD) { bestD = d; nearest = { kind: "wild", id: wm.id }; }
      }
      for (const m of mobs.current) {
        if (m.waiting) continue; // čekající zvířata jen dekorace, nezaměřovat
        const d = Math.hypot(m.x - p.x, m.y - p.y);
        if (d < bestD) { bestD = d; nearest = { kind: "animal", animalId: m.id }; }
      }
      for (const a of npcs.current) {
        const d = Math.hypot(a.x - p.x, a.y - p.y);
        if (d < bestD) { bestD = d; nearest = { kind: "npc", npcId: a.id }; }
      }
      // V tutoriálu má aktuální „plán" přednost před NPC/zvířaty (NPC často stojí
      // u staveb) — aby šlo vždy postavit, když jsi u plánu.
      if (P.tutorial) {
        let td = INTERACT_RANGE;
        let ti: Interactable | null = null;
        for (const it of INTERACTABLES) {
          if (!P.tutorialTargets.includes(it.id)) continue;
          const ix = (it.tx + it.fw / 2) * TS;
          const iy = (it.ty + it.fh) * TS;
          const d = Math.hypot(ix - p.x, iy - p.y);
          if (d < td) { td = d; ti = it; }
        }
        if (ti) nearest = { kind: "building", it: ti };
      }

      // popisek akce nejbližšího cíle (kontextová nápověda)
      let actionLabel: string | null = null;
      if (nearest && !P.paused) {
        if (nearest.kind === "npc") actionLabel = "Promluvit — " + (PERSON_BY_ID[nearest.npcId]?.name ?? "");
        else if (nearest.kind === "wild") {
          actionLabel =
            nearest.id === "liska"
              ? P.foxStage === "kamarad" ? "Pohladit lišku 🦊" : "Pozorovat lišku (potichu!)"
              : nearest.id === "kane" ? "Pozorovat káně"
              : nearest.id === "jezek" ? "Pozdravit ježka"
              : "Pozorovat";
        }
        else if (nearest.kind === "animal") {
          const id = nearest.animalId;
          const m = mobs.current.find((mm) => mm.id === id);
          actionLabel = m?.escaped ? "Zahnat zpátky do výběhu" : "Pohladit / info";
        } else {
          const bs = buildStateOf(nearest.it);
          if (!bs.isBuilt) {
            actionLabel = "Postavit — " + nearest.it.label;
          } else {
            const k = nearest.it.kind;
            actionLabel = BUILDING_VERB[k] ?? nearest.it.label;
            if (k === "pastvina") actionLabel = P.season === "jaro" || P.season === "leto" ? "Vyhnat na pastvu" : "Rozdělat seno";
            else if (k === "chalupa" && P.phase === "vecer") actionLabel = "Zavřít a jít spát";
          }
        }
      }

      // --- RENDER ---
      ctx.clearRect(0, 0, viewW, viewH);
      drawGround(ctx, camX, camY, viewW, viewH, P.season);
      drawPaddocks(ctx, camX, camY, P.settledGroups);

      // seznam objektů seřazený dle baseY — pole je znovupoužité (viz deklarace
      // před `loop`), pouze se vyprázdní, aby nevznikala alokace každý snímek.
      // Off-screen culling: konzervativní okraje kolem viewportu (ve world
      // souřadnicích), aby se nic viditelně neobjevovalo/nemizelo u okrajů
      // obrazovky — stíny, glow efekty a vysoké sprity (budovy/stromy) sahají
      // dost mimo svůj „bod" (baseY), proto je okraj nahoru výrazně větší.
      const CULL_H = 3 * TS;
      const CULL_DOWN = 3 * TS;
      const CULL_UP = 6 * TS;
      const viewLeft = camX - CULL_H;
      const viewRight = camX + viewW + CULL_H;
      const viewTop = camY - CULL_UP;
      const viewBottom = camY + viewH + CULL_DOWN;
      // bod (např. zvíře/NPC) je maličký ve srovnání s okraji výše, takže stačí
      // porovnat samotnou pozici s takto rozšířeným obdélníkem viewportu
      const pointInView = (x: number, y: number) =>
        x >= viewLeft && x <= viewRight && y >= viewTop && y <= viewBottom;

      items.length = 0;

      for (const it of INTERACTABLES) {
        if (P.hiddenIds.includes(it.id)) continue; // příběhem zatím skryté
        const bs = buildStateOf(it);
        if (!bs.isBuilt && !bs.isTarget) continue; // skrytý plán se nekreslí (zelená louka)
        // budova/plán zabírá obdélník (tx,ty)-(tx+fw,ty+fh) v tile souřadnicích —
        // testujeme celý obdélník proti rozšířenému viewportu, ne jen baseY bod
        const bx0 = it.tx * TS;
        const by0 = it.ty * TS;
        const bx1 = (it.tx + it.fw) * TS;
        const baseY = (it.ty + it.fh) * TS;
        if (bx1 < viewLeft || bx0 > viewRight || baseY < viewTop || by0 > viewBottom) continue;
        const near = nearest?.kind === "building" && nearest.it.id === it.id;
        if (bs.isBuilt) items.push({ y: baseY, draw: () => drawBuilding(ctx, it, camX, camY, near, now) });
        else items.push({ y: baseY, draw: () => drawBlueprint(ctx, it, camX, camY, near, now) });
      }
      for (const m of mobs.current) {
        if (!pointInView(m.x, m.y)) continue;
        const near = nearest?.kind === "animal" && nearest.animalId === m.id;
        items.push({
          y: m.y,
          draw: () => drawMob(ctx, m, camX, camY, near, now),
        });
      }
      for (const wm of wilds.current) {
        if (wm.mode === "gone") continue;
        if (!pointInView(wm.x, wm.y)) continue;
        const near = nearest?.kind === "wild" && nearest.id === wm.id;
        items.push({ y: wm.y, draw: () => drawWild(ctx, wm, camX, camY, near, now) });
      }
      for (const a of npcs.current) {
        if (!pointInView(a.x, a.y)) continue;
        const near = nearest?.kind === "npc" && nearest.npcId === a.id;
        items.push({ y: a.y, draw: () => drawNpc(ctx, a, camX, camY, near, now) });
      }
      // hráč se nikdy neculluje — je vždy uprostřed viditelné oblasti (kamera ho sleduje)
      items.push({
        y: player.current.y,
        draw: () => drawPlayer(ctx, player.current, camX, camY, propsRef.current.appearance),
      });

      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.draw();
      perfSetDrawn(items.length);

      // stavební mód: náhled nové stavby (BuildPanel) / zvýraznění vybrané
      // existující stavby / náhled jejího přesunu.
      if (P.editMode) {
        if (P.buildSelection) {
          const g = buildGhost.current;
          if (g) drawGhost(ctx, g.it, g.tx, g.ty, camX, camY, g.valid, now);
        } else if (selectedRef.current && movingRef.current) {
          const g = buildGhost.current;
          if (g) drawGhost(ctx, g.it, g.tx, g.ty, camX, camY, g.valid, now);
        } else if (selectedRef.current) {
          const sel = selectedRef.current;
          const f = footprintOf(sel.defId);
          const hx = sel.tx * TS - camX, hy = sel.ty * TS - camY, hw = f.fw * TS, hh = f.fh * TS;
          ctx.save();
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = "rgba(240,232,146,0.9)";
          const wob = 2 + Math.sin(now * 0.005) * 1.5;
          roundRect(ctx, hx - wob, hy - wob, hw + wob * 2, hh + wob * 2, 8);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = `18px ${EMOJI_FONT}`;
          ctx.textAlign = "center";
          ctx.fillText("👆", hx + hw / 2, hy - 6);
          ctx.restore();
        }
      }

      // káně krouží nad drůbežím výběhem (jen stín a silueta — nikdy neútočí)
      if (P.wildActive.kaneCircle && P.phase === "poledne") drawKaneCircle(ctx, camX, camY, now);

      drawWaterShimmer(ctx, camX, camY, viewW, viewH, now);
      // sluneční světlo (sjednocuje směr osvětlení) → tint fáze/období
      drawSunlight(ctx, viewW, viewH, P.phase, P.season);
      drawTint(ctx, viewW, viewH, P.phase, P.season);
      // sezónní částice + vinětace
      drawParticles(P.season, viewW, viewH, dt, now);
      drawVignette(ctx, viewW, viewH);
      // kontextová akční nápověda
      if (actionLabel) drawActionChip(ctx, viewW, viewH, actionLabel);
      // mini-mapa (pod horní HUD lištou — na mobilu na výšku ji nepřekryje)
      drawMinimap(ctx, viewW, topInset.current, p.x, p.y, nearest, P.built, P.tutorialTargets, P.hiddenIds);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      hudRo?.disconnect();
      unsubTier();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onCanvasPointer);
      canvas.removeEventListener("pointermove", onCanvasMove);
      canvas.removeEventListener("pointerup", onCanvasUp);
      canvas.removeEventListener("pointercancel", onCanvasUp);
    };
  }, []);

  return (
    <div className="world-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="world-canvas" />
      {editMode && selected && (
        <div className="build-select-bar">
          {!moving ? (
            <>
              <span className="build-select-label">{BUILDABLE_BY_ID[selected.defId]?.label ?? selected.defId}</span>
              <button className="build-select-btn move" onClick={() => setMoving(true)}>↔️ Přesunout</button>
              <button
                className="build-select-btn demolish"
                onClick={() => { onDemolishStructure(selected.uid); setSelected(null); }}
              >
                🗑️ Zbořit
              </button>
              <button className="build-select-btn cancel" onClick={() => setSelected(null)} aria-label="Zrušit výběr">✕</button>
            </>
          ) : (
            <>
              <span className="build-select-label">Klepni na louku, kam ji přesunout</span>
              <button className="build-select-btn cancel" onClick={() => setMoving(false)}>✕ Zrušit</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- kreslicí pomocníci -----------------------------------------------------

// Měkký stín se vyrenderuje JEDNOU do offscreen blobu (radiální gradient) a pak
// se jen levně vykresluje přes drawImage. Dřív se gradient tvořil pro každý
// sprite každý frame (~desítky alokací/frame) → GC jank → občasné cuknutí i
// přeskočení zvuku. Tohle to odstraní.
let shadowBlob: HTMLCanvasElement | null = null;
function getShadowBlob(): HTMLCanvasElement {
  if (shadowBlob) return shadowBlob;
  const S = 64;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const c = cv.getContext("2d")!;
  const g = c.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(0,0,0,0.5)");
  g.addColorStop(0.7, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  shadowBlob = cv;
  return cv;
}

// Směrový měkký stín pod spritem: blob posunutý dolů-vpravo (světlo z L-H rohu,
// stejný směr jako u budov/stromů), plochá ellipse (ry ≈ rx*0.32). Posun je
// ~6-8 % skutečné velikosti sprite (ne pevný počet px), takže sedí jak
// drobným zvířatům, tak postavám. `lift` 0..1 = odlepení od země (vyšší bob →
// menší, světlejší a víc posunutý stín — dál od těla ve směru světla, stejně
// jako vržený stín skutečného nadzemního objektu).
function softShadow(ctx: CanvasRenderingContext2D, sx: number, sy: number, size: number, rx: number, lift: number) {
  const k = 1 - lift * 0.28;
  const r = rx * k;
  const off = size * 0.07 * (1 + lift * 0.7);
  const cx = sx + off;
  const cy = sy + off * 0.42;
  ctx.save();
  ctx.globalAlpha = 0.62 * (1 - lift * 0.4);
  ctx.drawImage(getShadowBlob(), cx - r, cy - r * 0.32, r * 2, r * 0.64);
  ctx.restore();
}

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
  const bobN = Math.sin(m.bob); // -1..1
  const bob = bobN * 1.5;
  softShadow(ctx, sx, sy, size, size * 0.34, Math.max(0, bobN));
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
  if (m.escaped) {
    const b = Math.sin(time * 0.013) * 4;
    ctx.font = `22px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("❗", sx, sy - size - 2 + b);
  } else if (near) {
    const b = Math.sin(time * 0.006) * 3;
    ctx.font = `20px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("💬", sx, sy - size - 4 + b);
  }
}

// Divoký soused — kreslí se jako zvíře; plachý navíc dostane ikonku „ticho".
function drawWild(
  ctx: CanvasRenderingContext2D,
  wm: WildMob,
  camX: number,
  camY: number,
  near: boolean,
  time: number,
) {
  const img = animalImg(wm.id);
  const sx = wm.x - camX;
  const sy = wm.y - camY;
  const scale = wm.id === "srnka" ? 1.35 : wm.id === "jezek" ? 0.45 : wm.id === "kane" ? 0.8 : 1.0;
  const size = TS * 0.95 * scale;
  const bobN = Math.sin(wm.bob);
  softShadow(ctx, sx, sy, size, size * 0.34, Math.max(0, bobN));
  if (near) {
    ctx.save();
    ctx.shadowColor = "rgba(240,232,146,0.95)";
    ctx.shadowBlur = 16;
  }
  if (ready(img)) {
    ctx.save();
    ctx.translate(sx, sy - size * 0.52 + bobN * 1.5);
    if (wm.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  if (near) ctx.restore();
  if (near) {
    const b = Math.sin(time * 0.006) * 3;
    ctx.font = `20px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(wm.skittish ? "🤫" : "💬", sx, sy - size - 4 + b);
  }
}

// Kroužící káně nad drůbežím výběhem: stín na zemi + silueta nad ním.
function drawKaneCircle(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number) {
  const cx = 14 * TS - camX;
  const cy = 12 * TS - camY;
  const a = time * 0.0009;
  const r = TS * 2.6;
  const bx = cx + Math.cos(a) * r;
  const by = cy + Math.sin(a) * r * 0.6;
  // stín klouže po zemi
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#1a1f1c";
  ctx.beginPath();
  ctx.ellipse(bx, by + 14, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // silueta s roztaženými křídly (mírně nad zemí, nezávislá na Y-sortu)
  ctx.save();
  ctx.translate(bx, by - TS * 1.6);
  ctx.rotate(Math.cos(a) * 0.15);
  ctx.fillStyle = "#4a3a28";
  ctx.beginPath();
  const flap = Math.sin(time * 0.004) * 3;
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-16, -6 - flap, -26, -2 - flap);
  ctx.quadraticCurveTo(-14, 2, -4, 4);
  ctx.quadraticCurveTo(0, 8, 4, 4);
  ctx.quadraticCurveTo(14, 2, 26, -2 - flap);
  ctx.quadraticCurveTo(16, -6 - flap, 0, 0);
  ctx.fill();
  ctx.restore();
}

// 3-fázový cyklus chůze: kontakt → průchod → kontakt (zrcadlově) → průchod…
// Stejná "rychlost kroku" jako dřív (jeden krok animační fáze pořád trvá
// stejně dlouho) — jen teď má i mezikrok. Na tieru s walkFrames=2 (slabší
// zařízení) se sníží na starou 2-snímkovou alternaci (jen kontaktní pózy).
const WALK_PATTERN: readonly (0 | 1 | 2)[] = [0, 1, 2, 1];

function walkFrame(animPhase: number, walkFrames: 2 | 3): 0 | 1 | 2 {
  if (walkFrames === 2) return (Math.floor(animPhase) % 2) as 0 | 1;
  return WALK_PATTERN[Math.floor(animPhase) % 4];
}

function drawNpc(
  ctx: CanvasRenderingContext2D,
  a: NpcAgent,
  camX: number,
  camY: number,
  near: boolean,
  time: number,
) {
  const frame: 0 | 1 | 2 = a.moving ? walkFrame(a.anim, QUALITY[getQualityTier()].walkFrames) : 0;
  const img = personImg(a.id, a.dir, frame);
  const sx = a.x - camX;
  const sy = a.y - camY;
  const size = TS * 1.7;
  const flip = a.dir === "side" && a.flip;
  const bobN = a.moving ? Math.abs(Math.sin(time * 0.012)) : Math.abs(Math.sin(a.workBob)); // 0..1
  const bob = a.moving ? bobN * 3 : Math.sin(a.workBob) * 1.6;
  softShadow(ctx, sx, sy, size, size * 0.26, bobN);
  if (near) {
    ctx.save();
    ctx.shadowColor = "rgba(240,232,146,0.95)";
    ctx.shadowBlur = 16;
  }
  if (ready(img)) {
    ctx.save();
    ctx.translate(sx, sy - size * 0.52 - bob);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  if (near) ctx.restore();
  // jmenovka
  const name = PERSON_BY_ID[a.id]?.name ?? "";
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
  // promluva nad hlavou (reakce na svět / small-talk), když nejsi přímo u něj
  if (a.bubble && !near) {
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bw = ctx.measureText(a.bubble.text).width + 16;
    const by = ny - 24;
    ctx.fillStyle = "rgba(247,242,231,0.96)";
    roundRect(ctx, sx - bw / 2, by - 11, bw, 20, 9);
    ctx.fill();
    ctx.fillStyle = "#2a2420";
    ctx.fillText(a.bubble.text, sx, by);
  }
  // ikonka: 💬 když jsi blízko (lze promluvit), jinak emoji činnosti při práci
  const icon = near ? "💬" : !a.bubble && !a.moving && a.work ? a.work : null;
  if (icon) {
    const b = Math.sin(time * 0.006) * 3;
    ctx.font = `20px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(icon, sx, ny - 18 + b);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number; dir: string; moving: boolean; anim: number },
  camX: number,
  camY: number,
  appearance: PlayerAppearance,
) {
  const spriteDir: Facing = p.dir === "up" ? "up" : p.dir === "left" || p.dir === "right" ? "side" : "down";
  const flip = p.dir === "left";
  const frame: 0 | 1 | 2 = p.moving ? walkFrame(performance.now() / 170, QUALITY[getQualityTier()].walkFrames) : 0;
  const img = personImgFor(appearance, spriteDir, frame);
  const sx = p.x - camX;
  const sy = p.y - camY;
  const size = TS * 1.7;
  const bobN = p.moving ? Math.abs(Math.sin(performance.now() * 0.013)) : 0; // 0..1 (jen při chůzi)
  const bob = p.moving ? bobN * 3 : Math.sin(performance.now() * 0.002) * 1;
  softShadow(ctx, sx, sy, size, size * 0.26, bobN);
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

function drawActionChip(ctx: CanvasRenderingContext2D, vw: number, vh: number, label: string) {
  const kw = 22;
  const padX = 12;
  const gap = 8;
  ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const tw = ctx.measureText(label).width;
  const cw = padX + kw + gap + tw + padX;
  const x = vw / 2 - cw / 2;
  const y = vh - 96;
  ctx.fillStyle = "rgba(26,31,28,0.82)";
  roundRect(ctx, x, y - 17, cw, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#f0e892";
  roundRect(ctx, x + padX, y - 9, kw, 18, 5);
  ctx.fill();
  ctx.fillStyle = "#1f3d2a";
  ctx.textAlign = "center";
  ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("A", x + padX + kw / 2, y + 1);
  ctx.fillStyle = "#f7f2e7";
  ctx.textAlign = "left";
  ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(label, x + padX + kw + gap, y);
  ctx.textAlign = "center";
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  topInset: number,
  px: number,
  py: number,
  nearest: InteractTarget | null,
  built: string[],
  tutorialTargets: string[],
  hiddenIds: string[],
) {
  const base = getMinimapBase();
  const mw = Math.min(160, Math.max(viewW * 0.3, 116));
  const mh = (mw * base.height) / base.width;
  const x = viewW - mw - 12;
  const y = topInset + 12; // vždy pod horní lištou (i když se na mobilu zalomí)
  ctx.save();
  ctx.fillStyle = "rgba(26,31,28,0.62)";
  roundRect(ctx, x - 5, y - 5, mw + 10, mh + 10, 10);
  ctx.fill();
  // popisek „Mapa"
  ctx.fillStyle = "rgba(247,242,231,0.9)";
  ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("MAPA", x, y - 7);
  roundRect(ctx, x, y, mw, mh, 6);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0, base.width, base.height, x, y, mw, mh);
  ctx.imageSmoothingEnabled = true;
  const tx = mw / base.width;
  const ty = mh / base.height;
  for (const it of INTERACTABLES) {
    if (hiddenIds.includes(it.id)) continue; // příběhem zatím skryté
    const gated = TUTORIAL_BUILDING_IDS.includes(it.id);
    const isTarget = !built.includes(it.id) && tutorialTargets.includes(it.id);
    if (gated && !built.includes(it.id) && !isTarget) continue; // skrytý plán
    const cx = x + (it.tx + it.fw / 2) * tx;
    const cy = y + (it.ty + it.fh / 2) * ty;
    const isNear = nearest?.kind === "building" && nearest.it.id === it.id;
    ctx.fillStyle = isTarget
      ? "#ffcf4a"
      : it.kind === "chalupa" ? "#f0e892" : it.kind === "stanek" ? "#e8a04a" : it.kind === "byliny" ? "#8fe08a" : "#f7f2e7";
    ctx.beginPath();
    ctx.arc(cx, cy, isTarget || isNear ? 3.4 : 2, 0, Math.PI * 2);
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
