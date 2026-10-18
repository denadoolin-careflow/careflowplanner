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

import { rulerFor, pickRulerTask } from "./rhythm-guidance";
describe("day ruler focus", () => {
  it("Wednesday is Mercury and picks the email task", () => {
    const wed = new Date(2026, 9, 21);
    expect(rulerFor(wed).planet).toBe("Mercury");
    const t = pickRulerTask(wed, [{ id: "1", title: "Fold towels" }, { id: "2", title: "Email the clinic" }]);
    expect(t?.id).toBe("2");
  });
  it("returns null when nothing matches", () => {
    expect(pickRulerTask(new Date(2026, 9, 21), [{ id: "1", title: "Zzz" }])).toBeNull();
  });
});
