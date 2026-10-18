import { describe, it, expect } from "vitest";
import { dignityOf, lunations, skyStatus, separation } from "./sky";

describe("dignity", () => {
  it("classifies traditional dignities", () => {
    expect(dignityOf("Mars", "Aries")).toBe("domicile");
    expect(dignityOf("Sun", "Aries")).toBe("exaltation");
    expect(dignityOf("Venus", "Scorpio")).toBe("detriment");
    expect(dignityOf("Saturn", "Aries")).toBe("fall");
    expect(dignityOf("Jupiter", "Leo")).toBe("peregrine");
    expect(dignityOf("Uranus", "Leo")).toBeNull();
  });
});
describe("sky", () => {
  it("finds alternating new/full moons ~14.8 days apart", () => {
    const l = lunations(new Date("2026-01-01T00:00:00Z"), 4);
    expect(l).toHaveLength(4);
    expect(l[0].kind).not.toBe(l[1].kind);
    const gap = (l[1].date.getTime() - l[0].date.getTime()) / 86400000;
    expect(gap).toBeGreaterThan(13); expect(gap).toBeLessThan(16.5);
  });
  it("finds the Sun's next sign change within ~31 days", () => {
    const s = skyStatus("Sun", new Date("2026-01-01T00:00:00Z"));
    expect(s.nextIngress).not.toBeNull();
    expect((s.nextIngress!.date.getTime() - Date.parse("2026-01-01")) / 86400000).toBeLessThan(32);
  });
  it("separation wraps around 360", () => { expect(separation(350, 10)).toBe(20); });
});
