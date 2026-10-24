import { describe, it, expect } from "vitest";
import { recommendWorkspace } from "./workspace-quiz";
import { suggestLinks } from "./connections";

describe("workspace quiz", () => {
  it("caps priority life areas at three and adds caregiving health", () => {
    const r = recommendWorkspace({ areas: [1, 2, 10], role: "caregiver" });
    expect(r.areas).toEqual([1, 2, 10]);
    expect(recommendWorkspace({ areas: [1], role: "caregiver" }).areas).toEqual([1, 6]);
  });
  it("busy season starts on the Planner and quiets nudges", () => {
    const r = recommendWorkspace({ season: "busy" });
    expect(r.startRoute).toBe("/planner");
    expect(r.todayPrefs.showCareyNudges).toBe(false);
  });
});

describe("link suggestions", () => {
  it("suggests same life area but never already-linked items", () => {
    const g = { type: "goal" as const, id: "g", title: "Rest more", lifeHouse: 12, href: "" };
    const a = { type: "project" as const, id: "a", title: "Retreat", lifeHouse: 12, href: "" };
    const b = { type: "task" as const, id: "b", title: "Nap", lifeHouse: 12, href: "" };
    expect(suggestLinks(g, [g, a, b], new Set(["task:b"])).map(x => x.id)).toEqual(["a"]);
  });
});
