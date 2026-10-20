import { describe, expect, it } from "vitest";
import { readPhaseIntentions, writePhaseIntentions } from "./monthly-phase-intentions";
import { newMoonReminderFor } from "@/lib/moon-reminders";

describe("monthly rhythm intentions", () => {
  it("saves all four phase intentions without replacing other properties", () => {
    const unrelated = { id: "project", name: "Project", type: "project" as const, value: "existing-project" };
    const intentions = { plan: "Choose one priority", grow: "Walk daily", care: "Call family", letgo: "Drop overtime" };
    const properties = writePhaseIntentions([unrelated], intentions);
    expect(readPhaseIntentions(properties)).toEqual(intentions);
    expect(properties[0]).toEqual(unrelated);
  });
  it("replaces a phase intention rather than accumulating old entries", () => {
    const initial = { plan: "Old plan", grow: "Grow", care: "Care", letgo: "Rest" };
    const next = writePhaseIntentions(writePhaseIntentions([], initial), { ...initial, plan: "New plan" });
    expect(next).toHaveLength(4);
    expect(readPhaseIntentions(next).plan).toBe("New plan");
  });
  it("links the October new moon reminder to that exact Planner day", () => {
    expect(newMoonReminderFor(new Date(2026, 9, 10, 12))?.planner).toBe("/planner/2026-10-10?range=month");
    expect(newMoonReminderFor(new Date(2026, 9, 11, 12))).toBeNull();
  });
});