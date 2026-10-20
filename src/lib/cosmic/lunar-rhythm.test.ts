import { describe, expect, it } from "vitest";
import { cosmicDateFromParam, cosmicDateLinks, monthRhythmMoments } from "./lunar-rhythm";

describe("connected lunar rhythm", () => {
  it("maps principal lunations to Plan, Grow, Care and Let go in order", () => {
    const moments = monthRhythmMoments(new Date(2026, 9, 1));
    expect(moments.map(m => m.phase)).toEqual(["letgo", "plan", "grow", "care"]);
    expect(moments.find(m => m.phase === "plan")?.date.getDate()).toBe(10);
  });
  it("keeps both full moons in a month instead of choosing only one", () => {
    const moments = monthRhythmMoments(new Date(2026, 4, 1));
    expect(moments.filter(m => m.phase === "care")).toHaveLength(2);
  });
  it("preserves the selected date across all five destinations", () => {
    expect(cosmicDateLinks(new Date(2026, 9, 20))).toEqual({
      tarot: "/cosmic-flow/tarot?date=2026-10-20", sky: "/cosmic-flow/sky?date=2026-10-20",
      moon: "/cosmic-flow/moon?date=2026-10-20", lunations: "/cosmic-flow/sky?date=2026-10-20&tab=lunations",
      planner: "/planner/2026-10-20?range=month",
    });
  });
  it("rejects impossible calendar dates", () => {
    expect(Number.isFinite(cosmicDateFromParam("2026-02-31").getTime())).toBe(true);
    expect(cosmicDateFromParam("2026-02-31").getMonth()).not.toBe(1);
  });
});