import { describe, expect, it } from "vitest";
import { legacyMedicineReminders, localCareDate, parseDoseTimes } from "./bedside-plan";
import type { Task } from "./types";
import type { Medication } from "./medications";

describe("bedside planning", () => {
  it("accepts daily dose times and rejects impossible clock times", () => {
    expect(parseDoseTimes("8:00, 20:00, 08:00")).toEqual(["08:00", "20:00"]);
    expect(parseDoseTimes("25:00")).toEqual([]);
    expect(parseDoseTimes("08:60")).toEqual([]);
  });
  it("uses the local calendar day", () => {
    expect(localCareDate(new Date(2026, 9, 17, 23, 50))).toBe("2026-10-17");
  });
  it("stopping medicine only removes that person's open duplicate reminders", () => {
    const med = { name: "Test medicine", dose: "Prescribed amount", recipient_id: "person-a", times: ["08:00"] } as Medication;
    const task = { id: "matching", title: "Give Alex Test medicine (Prescribed amount)", recipientId: "person-a", recurrenceType: "daily", startTime: "08:00", done: false } as Task;
    expect(legacyMedicineReminders([task, { ...task, id: "other", recipientId: "person-b" }, { ...task, id: "history", done: true }], med, "Alex").map(t => t.id)).toEqual(["matching"]);
  });
});