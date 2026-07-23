import { describe, it, expect } from "vitest";
import { MAP, isSolidTile } from "../../world/tiles";
import { AUTO_LAYOUT } from "./placement";
import { BUILDABLE_BY_ID } from "../content/buildables";
import { WORLD_FEATURES, openGate } from "../../world/entities";
describe("AUTO_LAYOUT fits the meadow", () => {
  it("no core building sits on a solid tile", () => {
    for (const p of AUTO_LAYOUT) {
      const d = BUILDABLE_BY_ID[p.defId];
      for (let dy = 0; dy < d.fh; dy++)
        for (let dx = 0; dx < d.fw; dx++)
          expect(isSolidTile(p.tx + dx, p.ty + dy)).toBe(false);
    }
  });
});

describe("WORLD_FEATURES on the 96x72 map", () => {
  it("every feature sits on a non-solid tile in bounds", () => {
    for (const f of WORLD_FEATURES) {
      expect(f.tx).toBeGreaterThanOrEqual(1);
      expect(f.ty).toBeGreaterThanOrEqual(1);
      expect(f.tx).toBeLessThan(95);
      expect(f.ty).toBeLessThan(71);
      expect(isSolidTile(f.tx, f.ty)).toBe(false);
    }
  });
});

// Jednoduchý flood-fill po nesolidních dlaždicích — hlídá, že satelity
// nejsou omylem odříznuté lesem (spec: locations-with-content).
function reaches(sx: number, sy: number, tx: number, ty: number): boolean {
  const seen = new Set<string>();
  const q: [number, number][] = [[sx, sy]];
  seen.add(`${sx},${sy}`);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === tx && y === ty) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= MAP.w || ny >= MAP.h || seen.has(k) || isSolidTile(nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}

describe("satellites reachable from spawn", () => {
  it("east herb meadow reachable once the forest gate is opened", () => {
    openGate(); // lesní brána jinak blokuje jediný koridor k louce
    expect(reaches(45, 33, 84, 20)).toBe(true);
  });
  it("south pond bank reachable", () => {
    // (16,58) je střed rybníka = voda (solidní dlaždice) — cíl je proto
    // bezprostřední břeh/cedule u vody, ne samotná hladina.
    expect(reaches(45, 33, 20, 55)).toBe(true);
  });
});
