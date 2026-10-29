import { describe, expect, it } from "vitest";
import { isSeasonReviewWindow, phaseFor, readSection, seasonFor, upsertSection } from "./horizons";

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h);

describe("five-horizon phases", () => {
  it("Sunday is Let go, Monday is Plan, Wednesday is Grow, Friday is Care", () => {
    expect(phaseFor("week", d(2026, 11, 1))).toBe("letgo");
    expect(phaseFor("week", d(2026, 11, 2))).toBe("plan");
    expect(phaseFor("week", d(2026, 11, 4))).toBe("grow");
    expect(phaseFor("week", d(2026, 11, 6))).toBe("care");
  });
  it("day phases follow time of day", () => {
    expect(phaseFor("day", d(2026, 1, 1, 8))).toBe("plan");
    expect(phaseFor("day", d(2026, 1, 1, 21))).toBe("letgo");
  });
  it("seasons start on the solstices and equinoxes", () => {
    expect(seasonFor(d(2026, 3, 19)).season).toBe("winter");
    expect(seasonFor(d(2026, 3, 20)).season).toBe("spring");
    expect(seasonFor(d(2026, 10, 29)).season).toBe("autumn");
    expect(seasonFor(d(2026, 1, 5)).key).toBe("2025-winter");
  });
  it("year phase: winter Plan, autumn Let go", () => {
    expect(phaseFor("year", d(2026, 1, 10))).toBe("plan");
    expect(phaseFor("year", d(2026, 10, 29))).toBe("letgo");
  });
  it("season review window: last two weeks or first week", () => {
    expect(isSeasonReviewWindow(d(2026, 12, 15))).toBe(true);
    expect(isSeasonReviewWindow(d(2026, 9, 25))).toBe(true);
    expect(isSeasonReviewWindow(d(2026, 10, 29))).toBe(false);
  });
  it("upserts a section without touching others", () => {
    const b = upsertSection("intro\n\n## Other\nkeep", "## Plan · X", "hello");
    const b2 = upsertSection(b, "## Plan · X", "bye");
    expect(readSection(b2, "## Plan · X")).toBe("bye");
    expect(readSection(b2, "## Other")).toBe("keep");
  });
});
