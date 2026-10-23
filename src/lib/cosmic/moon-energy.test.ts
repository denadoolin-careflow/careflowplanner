import { describe, expect, it } from "vitest";
import { MOON_SIGN_ENERGY, moonEnergyWord, phaseSegments } from "./moon-energy";

describe("moon energy", () => {
  it("has one word for each of the 12 signs", () => {
    expect(Object.keys(MOON_SIGN_ENERGY)).toHaveLength(12);
    expect(moonEnergyWord("Pisces")).toBe("Rest");
    expect(moonEnergyWord("Aries")).toBe("Start");
  });
  it("covers three cycles with contiguous phase runs in order", () => {
    const segs = phaseSegments(new Date(2026, 9, 23), 3);
    const total = segs.reduce((n, s) => n + s.days, 0);
    expect(total).toBe(89);
    const order = ["plan", "grow", "care", "letgo"];
    for (let i = 1; i < segs.length; i++) {
      expect(order.indexOf(segs[i].phase)).toBe((order.indexOf(segs[i - 1].phase) + 1) % 4);
    }
    expect(segs.filter(s => s.phase === "plan").length).toBeGreaterThanOrEqual(2);
  });
});
