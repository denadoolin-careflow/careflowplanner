import { describe, expect, it } from "vitest";
import { phaseBookedOpen } from "./schedule-time";

describe("phaseBookedOpen", () => {
  it("Grow (noon–3pm) with a 12:30–2pm event is 1h30 booked, 1h30 open", () => {
    expect(phaseBookedOpen("grow", [{ time: "12:30", end: "14:00", kind: "appt" }])).toEqual({ booked: 90, open: 90 });
  });
  it("untimed tasks don't count as booked time", () => {
    expect(phaseBookedOpen("care", [{ kind: "task" }])).toEqual({ booked: 0, open: 180 });
  });
  it("an event without an end time counts as one hour", () => {
    expect(phaseBookedOpen("plan", [{ time: "09:00", kind: "appt" }])).toEqual({ booked: 60, open: 300 });
  });
});
