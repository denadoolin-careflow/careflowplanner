import { describe, it, expect } from "vitest";
import { transitWindow, lengthLabel, practicalActions } from "./transit-guide";

describe("transit guide", () => {
  it("measures how long a transit stays within orb", () => {
    const on = new Date("2026-01-10T12:00:00Z");
    // planet moves 1°/day, natal at 0°, conjunction, currently at 0° → in orb ±3 days for 3° orb
    const lon = (_b: any, t: Date) => (t.getTime() - on.getTime()) / 86400000;
    const w = transitWindow("Mars", 0, 0, on, 3, lon);
    expect(w.days).toBe(6);
  });
  it("labels lengths in plain words", () => {
    expect(lengthLabel(6)).toBe("about 6 days");
    expect(lengthLabel(49)).toBe("about 7 weeks");
    expect(lengthLabel(120)).toBe("about 4 months");
  });
  it("includes the house area when known", () => {
    expect(practicalActions("Saturn", "square", 4).at(-1)).toContain("home, family");
  });
});
