import { describe, it, expect } from "vitest";
import { computeHouses, houseOf } from "./houses";

const h = computeHouses(new Date("1990-04-15T12:30:00Z"), 39.77, -86.16, "whole-sign")!;

describe("whole-sign houses", () => {
  it("puts every cusp on a 0° sign boundary", () => {
    for (const c of h.cusps) expect(c % 30).toBe(0);
  });
  it("house 1 starts at 0° of the rising sign", () => {
    expect(h.cusps[0]).toBe(Math.floor(h.ascendant / 30) * 30);
  });
  it("29° of the rising sign is house 1, 0° of the next sign is house 2", () => {
    expect(houseOf(h.cusps[0] + 29.9, h)).toBe(1);
    expect(houseOf((h.cusps[0] + 30) % 360, h)).toBe(2);
  });
});
