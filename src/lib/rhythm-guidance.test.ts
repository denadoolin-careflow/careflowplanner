import { describe, it, expect } from "vitest";
import { recommendedHours, missingGroceries } from "./rhythm-guidance";

describe("rhythm guidance", () => {
  it("menstrual phase lowers a 6h day to 3.5h", () => {
    expect(recommendedHours(6, "menstrual")).toBe(3.5);
  });
  it("no cycle keeps usual hours", () => {
    expect(recommendedHours(6, null)).toBe(6);
  });
  it("skips groceries already on the list", () => {
    const names = missingGroceries("menstrual", ["spinach"]).map(g => g.name);
    expect(names).not.toContain("Spinach");
    expect(names).toContain("Lentils");
  });
});
