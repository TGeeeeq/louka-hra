import type { FeedGroup, Phase, Season, Weather } from "../game/types";
import { TS } from "./tiles";
import {
  ANIMAL_SPAWNS,
  GARDEN,
  INTERACTABLES,
  PLAYER_START,
  isBlocked,
  setConstructed,
  unstuckFromBuildings,
  type Bounds,
  type Interactable,
} from "./entities";
import { TUTORIAL_BUILDING_IDS } from "../game/content/tutorial";
import { findPath, nearestWalkable, type Pt } from "./pathfind";
import { NPC_LIFE } from "../game/content/npcLife";
import { reactionFor, idleLine, ESCAPE_HELP, ESCAPE_SHRUG } from "../game/content/npcReactions";
import { pick } from "../game/engine/util";
import { PERSON_BY_ID } from "../game/content/people";
import { consumeAction, input } from "./input";
import { sound } from "../audio/sound";

export type InteractTarget =
  | { kind: "building"; it: Interactable }
  | { kind: "animal"; animalId: string }
  | { kind: "npc"; npcId: string };

export type WorldEvent =
  | { type: "escape"; animalId: string; npcId: string | null; helped: boolean; line: string }
  | { type: "raid"; animalId: string }
  | { type: "caught"; animalId: string };

export interface SimProps {
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
  onInteract: (t: InteractTarget) => void;
  onEvent: (e: WorldEvent) => void;
}

export interface PlayerState {
  x: number;
  y: number;
  dir: "up" | "down" | "left" | "right";
  moving: boolean;
  anim: number;
  flip: boolean;
}

export interface Mob {
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
export interface NpcAgent {
  id: string;
  x: number;
  y: number;
  dir: "down" | "up" | "side";
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
};

// Malý kruhový-ish kolizní rámeček u nohou — průchozí mezery i přiblížení
// ke stavbám jsou plynulé (keře už nejsou solid). Pohyb je po osách
// oddělený výš (klouže podél zdí), takže rohy nezasekávají.
function canMoveTo(nx: number, ny: number) {
  const hw = 8;
  return (
    !isBlocked(nx - hw, ny) &&
    !isBlocked(nx + hw, ny) &&
    !isBlocked(nx - hw, ny - 8) &&
    !isBlocked(nx + hw, ny - 8) &&
    !isBlocked(nx, ny)
  );
}

export class WorldSim {
  player: PlayerState;
  mobs: Mob[];
  npcs: NpcAgent[];
  npcPhase: Phase;
  stepAcc = 0;
  escapeAcc = 0;
  lastPhase: Phase;
  nearest: InteractTarget | null = null;
  actionLabel: string | null = null;
  private builtPrev: string[];

  constructor(props: SimProps) {
    this.player = { x: PLAYER_START.x, y: PLAYER_START.y, dir: "down", moving: false, anim: 0, flip: false };

    // init mobů — zvířata bez postaveného výběhu čekají u vjezdu
    this.mobs = ANIMAL_SPAWNS.map((s) => {
      const waiting = !props.settledGroups.includes(s.group);
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

    // init NPC — postavíme je rovnou na stanoviště aktuální fáze
    this.npcs = Object.keys(NPC_LIFE).map((id) => {
      const s = standOf(id, props.phase);
      return {
        id,
        x: (s.tx + 0.5) * TS,
        y: (s.ty + 0.5) * TS,
        dir: "down" as const,
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
    this.npcPhase = props.phase;
    this.lastPhase = props.phase;

    this.builtPrev = props.built;
    setConstructed(props.built);
  }

  /** Call when props.built changes: setConstructed + unstuckFromBuildings for newly added ids (may move player). */
  setBuilt(built: string[]): void {
    setConstructed(built);
    const added = built.filter((id) => !this.builtPrev.includes(id));
    this.builtPrev = built;
    if (added.length) {
      const spot = unstuckFromBuildings(this.player.x, this.player.y, added);
      if (spot) {
        this.player.x = spot.x;
        this.player.y = spot.y;
      }
    }
  }

  /** The A-button/space action: catch escaped animal if nearest is an escaped mob (fires "caught" event + sound.interact), else forward `nearest` to props.onInteract + sound.interact. */
  triggerAction(props: SimProps): void {
    if (!this.nearest) return;
    // chytání uprchlíka — zažene zpět do výběhu
    if (this.nearest.kind === "animal") {
      const id = this.nearest.animalId;
      const m = this.mobs.find((mm) => mm.id === id);
      if (m && m.escaped) {
        m.escaped = false;
        m.raided = false;
        m.tx = m.hx;
        m.ty = m.hy;
        m.rest = 0;
        props.onEvent({ type: "caught", animalId: m.id });
        sound.interact();
        return;
      }
    }
    props.onInteract(this.nearest);
    sound.interact();
  }

  update(dt: number, now: number, props: SimProps): void {
    const p = this.player;

    // --- update pohybu ---
    if (!props.paused) {
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
        this.stepAcc += dt;
        if (this.stepAcc > 0.3) { sound.step(); this.stepAcc = 0; }
      } else {
        p.anim = 0;
      }
      if (consumeAction()) this.triggerAction(props);
    } else {
      consumeAction();
      p.moving = false;
    }

    // --- událost útěku: občas jedno zvíře vyrazí z výběhu do zahrádky ---
    this.escapeAcc += dt;
    if (!props.paused && !props.tutorial && this.escapeAcc > 14) {
      this.escapeAcc = 0;
      if (!this.mobs.some((m) => m.escaped) && Math.random() < 0.18) {
        const cands = this.mobs.filter((m) => m.bounds);
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
          for (const a of this.npcs) {
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
          props.onEvent({ type: "escape", animalId: m.id, npcId, helped, line });
        }
      }
    }
    // přes noc se uprchlíci sami vrátí
    if (props.phase === "rano" && this.lastPhase !== "rano") {
      for (const m of this.mobs) if (m.escaped) { m.escaped = false; m.raided = false; m.tx = m.hx; m.ty = m.hy; }
    }
    this.lastPhase = props.phase;

    // --- mobové (pasou se ve výběhu; uprchlík míří do zahrádky) ---
    if (!props.paused) {
      for (const m of this.mobs) {
        // nastěhování: jakmile jeho výběh stojí, přestane čekat a míří domů
        if (m.waiting && props.settledGroups.includes(m.group)) {
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
          props.onEvent({ type: "raid", animalId: m.id });
        }
      }
    }

    // --- NPC: žijí podle rozvrhu, pomáhají s útěky a reagují na svět ---
    if (!props.paused) {
      // při změně fáze přejdou na nové stanoviště (kromě těch, co honí zvíře)
      if (props.phase !== this.npcPhase) {
        for (const a of this.npcs) {
          if (a.helping) continue;
          const s = standOf(a.id, props.phase);
          a.path = findPath(Math.floor(a.x / TS), Math.floor(a.y / TS), s.tx, s.ty);
          a.work = s.work;
        }
        this.npcPhase = props.phase;
      }
      const routeToStation = (a: NpcAgent) => {
        const s = standOf(a.id, props.phase);
        a.path = findPath(Math.floor(a.x / TS), Math.floor(a.y / TS), s.tx, s.ty);
        a.work = s.work;
      };
      for (const a of this.npcs) {
        const life = NPC_LIFE[a.id];

        // honění uprchlíka zpět do výběhu
        if (a.helping) {
          const m = this.mobs.find((mm) => mm.id === a.helping);
          if (!m || !m.escaped) {
            a.helping = null; // chyceno (hráčem i NPC) → zpět na stanoviště
            routeToStation(a);
          } else if (Math.hypot(a.x - m.x, a.y - m.y) < TS * 0.9) {
            m.escaped = false; m.raided = false; m.tx = m.hx; m.ty = m.hy; m.rest = 0;
            props.onEvent({ type: "caught", animalId: m.id });
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
          const snap = { welfare: props.welfare, weather: props.weather, season: props.season, phase: props.phase, money: props.money };
          const r = reactionFor(a.id, snap);
          if (r) a.bubble = { text: r.ambient, until: now + 4500 };
          else if (Math.random() < 0.4) a.bubble = { text: idleLine(a.id, Math.random()), until: now + 3500 };
          a.nextThink = now + 7000 + Math.random() * 7000;
        }
        if (a.bubble && now > a.bubble.until) a.bubble = null;
      }
    }

    // stav stavby: postavená (nebo negatovaná) / svítící plán / skrytá
    const buildStateOf = (it: Interactable) => {
      const gated = TUTORIAL_BUILDING_IDS.includes(it.id);
      const isBuilt = !gated || props.built.includes(it.id);
      return { isBuilt, isTarget: !isBuilt && props.tutorialTargets.includes(it.id) };
    };

    // --- nejbližší cíl interakce ---
    let nearest: InteractTarget | null = null;
    let bestD = INTERACT_RANGE;
    for (const it of INTERACTABLES) {
      const bs = buildStateOf(it);
      if (!bs.isBuilt && !bs.isTarget) continue; // skrytý plán se nedá zaměřit
      const ix = (it.tx + it.fw / 2) * TS;
      const iy = (it.ty + it.fh) * TS;
      const d = Math.hypot(ix - p.x, iy - p.y);
      if (d < bestD) { bestD = d; nearest = { kind: "building", it }; }
    }
    for (const m of this.mobs) {
      if (m.waiting) continue; // čekající zvířata jen dekorace, nezaměřovat
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < bestD) { bestD = d; nearest = { kind: "animal", animalId: m.id }; }
    }
    for (const a of this.npcs) {
      const d = Math.hypot(a.x - p.x, a.y - p.y);
      if (d < bestD) { bestD = d; nearest = { kind: "npc", npcId: a.id }; }
    }
    // V tutoriálu má aktuální „plán" přednost před NPC/zvířaty (NPC často stojí
    // u staveb) — aby šlo vždy postavit, když jsi u plánu.
    if (props.tutorial) {
      let td = INTERACT_RANGE;
      let ti: Interactable | null = null;
      for (const it of INTERACTABLES) {
        if (!props.tutorialTargets.includes(it.id)) continue;
        const ix = (it.tx + it.fw / 2) * TS;
        const iy = (it.ty + it.fh) * TS;
        const d = Math.hypot(ix - p.x, iy - p.y);
        if (d < td) { td = d; ti = it; }
      }
      if (ti) nearest = { kind: "building", it: ti };
    }
    this.nearest = nearest;

    // popisek akce nejbližšího cíle (kontextová nápověda)
    let actionLabel: string | null = null;
    if (nearest && !props.paused) {
      if (nearest.kind === "npc") actionLabel = "Promluvit — " + (PERSON_BY_ID[nearest.npcId]?.name ?? "");
      else if (nearest.kind === "animal") {
        const id = nearest.animalId;
        const m = this.mobs.find((mm) => mm.id === id);
        actionLabel = m?.escaped ? "Zahnat zpátky do výběhu" : "Pohladit / info";
      } else {
        const bs = buildStateOf(nearest.it);
        if (!bs.isBuilt) {
          actionLabel = "Postavit — " + nearest.it.label;
        } else {
          const k = nearest.it.kind;
          actionLabel = BUILDING_VERB[k] ?? nearest.it.label;
          if (k === "pastvina") actionLabel = props.season === "jaro" || props.season === "leto" ? "Vyhnat na pastvu" : "Rozdělat seno";
          else if (k === "chalupa" && props.phase === "vecer") actionLabel = "Zavřít a jít spát";
        }
      }
    }
    this.actionLabel = actionLabel;
  }
}
