import { describe, it, expect } from "vitest";
import { isSolidTile } from "../../world/tiles";
import { AUTO_LAYOUT } from "./placement";
import { BUILDABLE_BY_ID } from "../content/buildables";
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
