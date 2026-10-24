import { describe, expect, it } from "vitest";
import { compostGoal, restoreGoal, isComposted, mergeLegacyGoalDetails, GOAL_PHASES } from "./cycle";

describe("cyclical goals", () => {
  it("keeps Plan, Grow, Care, Let go in order", () => {
    expect(GOAL_PHASES).toEqual(["plan", "grow", "care", "letgo"]);
  });
  it("composts reversibly without deleting goal details", () => {
    const original = { why: "More time with family", nextStep: "Plan a walk", milestones: [{ id: "m1", label: "Walk", done: true }] };
    const archived = { ...original, ...compostGoal("Not this season", "2026-10-24T22:23:00Z") };
    expect(isComposted(archived)).toBe(true);
    expect(archived.compostReason).toBe("Not this season");
    const restored = { ...archived, ...restoreGoal() };
    expect(isComposted(restored)).toBe(false);
    expect(restored.milestones).toEqual(original.milestones);
    expect(restored.nextStep).toBe("Plan a walk");
  });
  it("imports legacy extras without overwriting synced choices", () => {
    expect(mergeLegacyGoalDetails({ why: "Old why", nextStep: "First move" }, { why: "Saved why", phase: "care" })).toEqual({ why: "Saved why", nextStep: "First move", phase: "care" });
  });
});