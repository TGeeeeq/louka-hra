import { describe, it, expect } from "vitest";
import { isSolidTile } from "../../world/tiles";
import { AUTO_LAYOUT } from "./placement";
import { BUILDABLE_BY_ID } from "../content/buildables";
import { WORLD_FEATURES } from "../../world/entities";
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
