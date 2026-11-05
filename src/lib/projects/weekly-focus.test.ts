import { describe, expect, it } from "vitest";
import { pickWeeklyFocus, weeklyFocusPatches } from "./weekly-focus";
import { newTimesForPhase } from "@/components/dashboard/DayPhases";
import { patchForPhase } from "./phase";

const P = (id: string, extra: any = {}) => ({ id, name: id, ...extra }) as any;
const W = "2026-W45";

describe("weekly focus", () => {
  it("prefers the pick for this week over a favorite", () => {
    expect(pickWeeklyFocus([P("a", { isFavorite: true }), P("b", { details: { weeklyFocus: W } })], () => undefined, W)?.id).toBe("b");
  });
  it("ignores last week's pick and falls back to favorite", () => {
    expect(pickWeeklyFocus([P("a", { isFavorite: true }), P("b", { details: { weeklyFocus: "2026-W44" } })], () => undefined, W)?.id).toBe("a");
  });
  it("falls back to most recently touched", () => {
    const t: Record<string, string> = { a: "2026-01-01", b: "2026-03-01" };
    expect(pickWeeklyFocus([P("a"), P("b")], p => t[p.id], W)?.id).toBe("b");
  });
  it("setting focus clears it from other projects", () => {
    const patches = weeklyFocusPatches([P("a", { details: { weeklyFocus: W, energy: "Gentle" } }), P("b")], "b", W);
    expect(patches).toEqual([{ id: "a", details: { energy: "Gentle" } }, { id: "b", details: { weeklyFocus: W } }]);
  });
});

describe("drop rules", () => {
  it("dropping a task into Care moves it to 3pm keeping minutes and duration", () => {
    expect(newTimesForPhase("care", "09:30", "10:15")).toEqual({ start: "15:30", end: "16:15" });
  });
  it("dropping an untimed task into Let go starts it at 6pm", () => {
    expect(newTimesForPhase("letgo")).toEqual({ start: "18:00", end: undefined });
  });
  it("dropping a project into Grow sets it to building", () => {
    expect(patchForPhase("grow", "idea").stage).toBe("building");
  });
});
