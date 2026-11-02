import { describe, expect, it } from "vitest";
import { isDeliberateSwipe, swipeAxisCancelled } from "./swipe-intent";

describe("isDeliberateSwipe", () => {
  it("ignores the accidental thumb-drag that used to flip the planner week", () => {
    // 80px sideways with a little downward drift: a typo while reaching to type.
    expect(isDeliberateSwipe(80, 25, 300)).toBe(false);
    // 45px sideways, 110px down: a page scroll that drifted sideways.
    expect(isDeliberateSwipe(45, 110, 300)).toBe(false);
    // Too short horizontally.
    expect(isDeliberateSwipe(60, 2, 150)).toBe(false);
    // A slow press-and-slide is not a flick.
    expect(isDeliberateSwipe(-150, 3, 900)).toBe(false);
  });

  it("accepts a long, flat, quick flick", () => {
    expect(isDeliberateSwipe(-150, 3, 200)).toBe(true);
    expect(isDeliberateSwipe(120, 0, 120)).toBe(true);
  });

  it("keeps the bottom bar stricter than the week strip", () => {
    const nav = { minPx: 110, ratio: 4, maxVertical: 25, maxMs: 600 };
    expect(isDeliberateSwipe(-160, 2, 90, nav)).toBe(true);
    expect(isDeliberateSwipe(-70, 18, 90, nav)).toBe(false);
    // A 673ms drag is held too long for the bar even though it is flat.
    expect(isDeliberateSwipe(-160, 2, 673, nav)).toBe(false);
  });

  it("lets the month grid tolerate a slightly steeper flick", () => {
    const month = { minPx: 110, ratio: 2.5, maxVertical: 60, maxMs: 700 };
    expect(isDeliberateSwipe(-150, 40, 300, month)).toBe(true);
    expect(isDeliberateSwipe(-120, 90, 300, month)).toBe(false);
  });
});

describe("swipeAxisCancelled", () => {
  it("locks out gestures that move vertically first", () => {
    expect(swipeAxisCancelled(10, 60)).toBe(true);
    expect(swipeAxisCancelled(0, 25)).toBe(true);
    expect(swipeAxisCancelled(120, 4)).toBe(false);
    expect(swipeAxisCancelled(30, 20)).toBe(false);
  });
});
