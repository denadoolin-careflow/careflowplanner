import { describe, it, expect } from "vitest";
import { parseInline, phaseForTime } from "./today-phase-items";

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
});
