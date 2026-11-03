import { describe, it, expect } from "vitest";
import { snapTo15, minToHHMM, ageGroupOf } from "./task-schedule";

describe("schedule snapping", () => {
  it("snaps to the nearest 15 minutes", () => {
    expect(snapTo15(9 * 60 + 7)).toBe(9 * 60);
    expect(snapTo15(9 * 60 + 8)).toBe(9 * 60 + 15);
    expect(minToHHMM(14 * 60 + 52)).toBe("14:45");
  });
});

describe("inbox age groups", () => {
  const now = new Date(2026, 10, 3, 12);
  it("groups by creation age", () => {
    expect(ageGroupOf(new Date(2026, 10, 3, 8).toISOString(), now)).toBe("today");
    expect(ageGroupOf(new Date(2026, 9, 30).toISOString(), now)).toBe("week");
    expect(ageGroupOf(new Date(2026, 9, 20).toISOString(), now)).toBe("older");
  });
});
