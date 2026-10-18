import { describe, it, expect } from "vitest";
import { rhythmPhaseForMoon, RHYTHM_LABEL, todayFavors } from "./rhythm-phase";
import { ATMOSPHERES, SEASONS } from "@/lib/atmospheres";

describe("rhythm phase", () => {
  it("maps moon phases to Plan → Grow → Care → Let go", () => {
    expect(rhythmPhaseForMoon("new")).toBe("plan");
    expect(rhythmPhaseForMoon("waxing-gibbous")).toBe("grow");
    expect(rhythmPhaseForMoon("full")).toBe("care");
    expect(rhythmPhaseForMoon("waning-crescent")).toBe("letgo");
  });
  it("names the fourth phase Let go", () => { expect(RHYTHM_LABEL.letgo).toBe("Let go"); });
  it("adds cycle guidance when a cycle phase is known", () => {
    expect(todayFavors("plan", "Menstrual")).toContain("soft");
  });
});

describe("atmospheres", () => {
  it("every atmosphere has a palette and belongs to a season", () => {
    const inSeason = new Set(SEASONS.flatMap(s => s.atmospheres));
    for (const a of ATMOSPHERES) {
      expect(a.palette.length).toBeGreaterThanOrEqual(4);
      expect(inSeason.has(a.id)).toBe(true);
    }
  });
  it("each season gets its two new themes", () => {
    const of = (id: string) => SEASONS.find(s => s.id === id)!.atmospheres;
    expect(of("fall")).toEqual(expect.arrayContaining(["apple-orchard", "pumpkin-patch"]));
    expect(of("winter")).toEqual(expect.arrayContaining(["christmas-time", "cocoa-quilts"]));
    expect(of("spring")).toEqual(expect.arrayContaining(["tulip-garden", "rain-garden"]));
    expect(of("summer")).toEqual(expect.arrayContaining(["lemon-grove", "firefly-nights"]));
  });
});
