import { describe, expect, it } from "vitest";
import { phaseSignAdvice } from "./moon-energy";
describe("phaseSignAdvice", () => {
  it("combines phase and sign", () => {
    expect(phaseSignAdvice("care", "Pisces")).toBe("Care in Pisces (Rest): tend to people, home and yourself, and rest, dream and leave room for gentleness.");
    expect(phaseSignAdvice("plan", "Aries")).toContain("Plan in Aries (Start): set one clear intention");
  });
});
