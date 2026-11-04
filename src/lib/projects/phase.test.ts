import { describe, it, expect } from "vitest";
import { projectPhase, patchForPhase } from "./phase";
import { phaseForTime } from "@/lib/today-phase-items";

describe("project stage → phase", () => {
  it("idea is Plan", () => expect(projectPhase({ stage: "idea", status: "active" })).toBe("plan"));
  it("planning and building are Grow", () => {
    expect(projectPhase({ stage: "planning", status: "active" })).toBe("grow");
    expect(projectPhase({ stage: "building", status: "active" })).toBe("grow");
  });
  it("launching and maintaining are Care", () => {
    expect(projectPhase({ stage: "launching", status: "active" })).toBe("care");
    expect(projectPhase({ stage: "maintaining", status: "active" })).toBe("care");
  });
  it("waiting, blocked or paused are Let go", () => {
    expect(projectPhase({ stage: "building", health: "waiting", status: "active" })).toBe("letgo");
    expect(projectPhase({ stage: "building", health: "blocked", status: "active" })).toBe("letgo");
    expect(projectPhase({ stage: "launching", status: "paused" })).toBe("letgo");
  });
  it("dropping into a phase sets a matching stage", () => {
    expect(patchForPhase("plan").stage).toBe("idea");
    expect(patchForPhase("grow").stage).toBe("building");
    expect(patchForPhase("care").stage).toBe("launching");
    expect(patchForPhase("letgo").health).toBe("waiting");
  });
});

describe("start time → day phase", () => {
  it("moves items by time", () => {
    expect(phaseForTime("09:30")).toBe("plan");
    expect(phaseForTime("12:30")).toBe("grow");
    expect(phaseForTime("16:00")).toBe("care");
    expect(phaseForTime("19:00")).toBe("letgo");
  });
});
