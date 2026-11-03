import { describe, expect, it } from "vitest";
import { dayMoon } from "./day-moon";

describe("dayMoon", () => {
  it("reads a known full moon (Oct 17 2024) as Full Moon, a turning point", () => {
    const m = dayMoon(new Date(2024, 9, 17));
    expect(m.label).toBe("Full Moon");
    expect(m.turning).toBe(true);
  });
  it("reads a known new moon (Oct 2 2024) as New Moon", () => {
    expect(dayMoon(new Date(2024, 9, 2)).label).toBe("New Moon");
  });
  it("gives the same answer at any time of that day", () => {
    expect(dayMoon(new Date(2024, 9, 17, 1))).toEqual(dayMoon(new Date(2024, 9, 17, 23)));
  });
});
