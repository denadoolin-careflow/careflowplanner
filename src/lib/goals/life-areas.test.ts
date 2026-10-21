import { describe, expect, it } from "vitest";
import { effectiveGoalProgress, goalTaskProgress, lifeAreaLabel } from "./life-areas";

describe("life area goals", () => {
  it("maps houses to life areas", () => {
    expect(lifeAreaLabel(4)).toBe("Home & family");
    expect(lifeAreaLabel(10)).toBe("Career & purpose");
    expect(lifeAreaLabel(13)).toBeNull();
  });
  it("computes progress from done tasks", () => {
    expect(goalTaskProgress([{ done: true }, { done: false }, { done: false }, { done: true }])).toBe(50);
    expect(goalTaskProgress([])).toBe(0);
  });
  it("uses manual progress unless auto is on and tasks exist", () => {
    expect(effectiveGoalProgress({ progress: 30, autoProgress: false }, [{ done: true }])).toBe(30);
    expect(effectiveGoalProgress({ progress: 30, autoProgress: true }, [{ done: true }])).toBe(100);
    expect(effectiveGoalProgress({ progress: 30, autoProgress: true }, [])).toBe(30);
  });
});
