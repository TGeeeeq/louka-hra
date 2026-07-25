import { describe, it, expect } from "vitest";
import { NPC_LIFE } from "../content/npcLife";
import { NPCS } from "../content/people";
import { isSolidTile } from "../../world/tiles";
import { AUTO_LAYOUT } from "./placement";
import { BUILDABLE_BY_ID } from "../content/buildables";
import type { Phase } from "../types";

// Hráč startuje tady (PLAYER_START v world/entities.ts).
const SPAWN = { tx: 45, ty: 33 };
// Domovská louka je elipsa (viz CLEARINGS v world/tiles.ts).
const MEADOW = { cx: 48, cy: 34, rx: 30, ry: 22 };
const PHASES: Phase[] = ["rano", "poledne", "vecer"];

function inMeadow(tx: number, ty: number): boolean {
  const dx = (tx - MEADOW.cx) / MEADOW.rx;
  const dy = (ty - MEADOW.cy) / MEADOW.ry;
  return dx * dx + dy * dy <= 1;
}

// Kolik dlaždic je vidět na obrazovce od středu (viewport ~1280x720 / TS 36
// → ~35x20 dlaždic). Držíme NPC v tomhle okruhu, aby na startu byli vidět.
const VISIBLE_RADIUS = 14;

describe("NPC stanoviště leží na velké domovské louce", () => {
  it("každý NPC má rozvrh pro všechny fáze dne", () => {
    for (const id of NPCS) {
      expect(NPC_LIFE[id], `NPC_LIFE chybí ${id}`).toBeDefined();
      for (const p of PHASES) expect(NPC_LIFE[id].schedule[p]).toBeDefined();
    }
  });

  it("žádné stanoviště nestojí na solidní dlaždici (les, voda)", () => {
    for (const id of NPCS)
      for (const p of PHASES) {
        const s = NPC_LIFE[id].schedule[p];
        expect(isSolidTile(s.tx, s.ty), `${id}/${p} na solidní dlaždici`).toBe(false);
      }
  });

  it("každé stanoviště je uvnitř domovské louky", () => {
    for (const id of NPCS)
      for (const p of PHASES) {
        const s = NPC_LIFE[id].schedule[p];
        expect(inMeadow(s.tx, s.ty), `${id}/${p} (${s.tx},${s.ty}) je mimo louku`).toBe(true);
      }
  });

  it("žádné stanoviště nestojí v půdorysu stavby z AUTO_LAYOUT", () => {
    for (const id of NPCS)
      for (const p of PHASES) {
        const s = NPC_LIFE[id].schedule[p];
        for (const b of AUTO_LAYOUT) {
          const d = BUILDABLE_BY_ID[b.defId];
          const inside =
            s.tx >= b.tx && s.tx < b.tx + d.fw && s.ty >= b.ty && s.ty < b.ty + d.fh;
          expect(inside, `${id}/${p} stojí v ${b.defId}`).toBe(false);
        }
      }
  });

  // Regrese: po přechodu na mapu 96x72 zůstaly souřadnice ze staré malé mapy,
  // takže NPC stáli desítky dlaždic daleko v lese a hráč je nikdy neviděl.
  it("ranní stanoviště jsou na dohled od spawnu", () => {
    for (const id of NPCS) {
      const s = NPC_LIFE[id].schedule.rano;
      const d = Math.max(Math.abs(s.tx - SPAWN.tx), Math.abs(s.ty - SPAWN.ty));
      expect(d, `${id} startuje ${d} dlaždic od hráče`).toBeLessThanOrEqual(VISIBLE_RADIUS);
    }
  });
});
