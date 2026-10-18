import { describe, it, expect } from "vitest";
import { describeTransit, timingLabel, describeSkyPlacement, describeIngress } from "./plain-language";

describe("plain language", () => {
  it("describes a square as stretching", () => {
    const d = describeTransit("Mars", "square", "Sun");
    expect(d.title).toBe("Mars is pushing on your Sun");
    expect(d.tone).toBe("Stretching");
  });
  it("labels timing", () => {
    expect(timingLabel(0.1, true)).toBe("Peaking now");
    expect(timingLabel(2, true)).toBe("Building");
    expect(timingLabel(2, false)).toBe("Easing");
  });
  it("explains retrograde", () => {
    expect(describeSkyPlacement("Mercury", "Virgo", true)).toContain("review time");
  });
  it("words ingress tomorrow", () => {
    const now = new Date(2026, 9, 18, 10);
    expect(describeIngress("Moon", "Leo", new Date(2026, 9, 19, 8), now)).toBe("Moon moves into Leo tomorrow");
  });
});
