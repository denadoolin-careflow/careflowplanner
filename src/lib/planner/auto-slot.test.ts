import { describe, it, expect } from "vitest";
import { autoSlot } from "./auto-slot";

describe("autoSlot", () => {
  it("fills the first free gap after a busy block", () => {
    expect(autoSlot([{ id: "a", minutes: 30 }], [{ start: 480, end: 540 }])).toEqual([{ id: "a", startTime: "09:00" }]);
  });
  it("never starts before the current time, rounded to 15 minutes", () => {
    expect(autoSlot([{ id: "a", minutes: 30 }], [], { notBefore: 13 * 60 + 7 })).toEqual([{ id: "a", startTime: "13:15" }]);
  });
  it("skips tasks that no longer fit before the day ends", () => {
    expect(autoSlot([{ id: "a", minutes: 60 }], [], { notBefore: 19 * 60 + 30 })).toEqual([]);
  });
  it("places tasks back to back without overlapping", () => {
    expect(autoSlot([{ id: "a", minutes: 45 }, { id: "b", minutes: 15 }], [])).toEqual([
      { id: "a", startTime: "08:00" }, { id: "b", startTime: "08:45" },
    ]);
  });
});
