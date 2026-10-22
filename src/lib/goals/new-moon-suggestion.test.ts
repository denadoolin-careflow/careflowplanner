import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { activeNewMoon, houseForLongitude, ideaFor, HOUSE_IDEAS } from "./new-moon-suggestion";
import { monthRhythmMoments } from "@/lib/cosmic/lunar-rhythm";

const nm = monthRhythmMoments(new Date(2026, 9, 1)).find(m => m.phase === "plan")!.date;

describe("new-moon goal suggestion", () => {
  it("uses the sign's natural house without a chart", () => {
    expect(houseForLongitude(5)).toBe(1);
    expect(houseForLongitude(95)).toBe(4);
    expect(houseForLongitude(355)).toBe(12);
  });
  it("uses the natal house when cusps exist", () => {
    const cusps = { cusps: Array.from({ length: 12 }, (_, i) => (90 + i * 30) % 360) } as any;
    expect(houseForLongitude(95, cusps)).toBe(1);
  });
  it("shows from the new moon through two days after", () => {
    expect(activeNewMoon(nm)).not.toBeNull();
    expect(activeNewMoon(addDays(nm, 2))).not.toBeNull();
    expect(activeNewMoon(addDays(nm, 3))).toBeNull();
  });
  it("swap cycles through the area's ideas", () => {
    expect(ideaFor(4, 0)).toEqual(HOUSE_IDEAS[4][0]);
    expect(ideaFor(4, 1)).toEqual(HOUSE_IDEAS[4][1]);
    expect(ideaFor(4, 2)).toEqual(HOUSE_IDEAS[4][0]);
  });
});
