import { describe, it, expect } from "vitest";
import { parseInline, phaseForTime, phaseSummary } from "./today-phase-items";

describe("today phase items", () => {
  it("timed appointment words become an appointment", () => {
    expect(parseInline("Dentist appointment 3pm", "2026-10-29").kind).toBe("appointment");
  });
  it("plain items become tasks on the fallback date", () => {
    const p = parseInline("Buy milk", "2026-10-29");
    expect(p.kind).toBe("task");
    expect(p.date).toBe("2026-10-29");
  });
  it("time windows map to phases", () => {
    expect(phaseForTime("09:00")).toBe("plan");
    expect(phaseForTime("13:00")).toBe("grow");
    expect(phaseForTime("16:00")).toBe("care");
    expect(phaseForTime("19:30")).toBe("letgo");
  });
  it("collapsed band summary counts only that phase's items for the day", () => {
    const tasks = [
      { id: "a", title: "A", dueDate: "2026-11-01", startTime: "09:00", done: false },
      { id: "b", title: "B", dueDate: "2026-11-01", startTime: "10:00", done: true },
      { id: "c", title: "C", dueDate: "2026-11-01", startTime: "16:00", done: false },
      { id: "d", title: "D", dueDate: "2026-11-02", startTime: "09:00", done: false },
    ] as never[];
    const appts = [{ id: "x", title: "Dr", date: "2026-11-01", time: "08:30" }] as never[];
    expect(phaseSummary("plan", tasks, appts, "2026-11-01")).toBe("1 task · 1 event · 1 done");
    expect(phaseSummary("letgo", tasks, appts, "2026-11-01")).toBe("Nothing planned yet");
  });
});
