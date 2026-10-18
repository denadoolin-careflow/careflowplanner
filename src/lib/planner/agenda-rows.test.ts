import { describe, it, expect } from "vitest";
import { buildAgendaDay, parseTypedTime } from "./agenda-rows";

const base = { iso: "2026-10-18", today: "2026-10-18", appointments: [] as any[], meals: [] as any[] };

describe("agenda rows", () => {
  it("orders timed items by start and puts untimed tasks in Unscheduled", () => {
    const tasks: any[] = [
      { id: "a", title: "late", dueDate: "2026-10-18", startTime: "15:00" },
      { id: "b", title: "early", dueDate: "2026-10-18", startTime: "08:00" },
      { id: "c", title: "anytime", dueDate: "2026-10-18" },
    ];
    const d = buildAgendaDay({ ...base, tasks });
    expect(d.timed.map(r => r.task!.id)).toEqual(["b", "a"]);
    expect(d.unscheduled.map(r => r.task!.id)).toEqual(["c"]);
  });
  it("shows unfinished past tasks as overdue only on today", () => {
    const tasks: any[] = [{ id: "o", title: "old", dueDate: "2026-10-10" }, { id: "x", title: "done", dueDate: "2026-10-10", done: true }];
    expect(buildAgendaDay({ ...base, tasks }).overdue.map(t => t.id)).toEqual(["o"]);
    expect(buildAgendaDay({ ...base, iso: "2026-10-19", tasks }).overdue).toEqual([]);
  });
  it("sorts done items after open ones", () => {
    const tasks: any[] = [{ id: "d", title: "a", dueDate: "2026-10-18", done: true }, { id: "o", title: "b", dueDate: "2026-10-18" }];
    expect(buildAgendaDay({ ...base, tasks }).unscheduled.map(r => r.task!.id)).toEqual(["o", "d"]);
  });
  it("includes a recurring meal on later dates", () => {
    const meals: any[] = [{ id: "m", name: "Soup", slot: "Lunch", date: "2026-10-01", recurrenceRule: { freq: "daily", interval: 1 } }];
    expect(buildAgendaDay({ ...base, tasks: [], meals }).allDay.map(r => r.mealId)).toEqual(["m"]);
  });
  it("places medicine doses by time and habits all-day, filtered under Care", () => {
    const d = buildAgendaDay({ ...base, tasks: [], meds: [{ id: "p", name: "Tylenol", time: "09:00", taken: true }], habits: [{ id: "h", name: "Walk", done: false }], filter: "care" });
    expect(d.timed.map(r => [r.medId, r.done])).toEqual([["p", true]]);
    expect(d.allDay.map(r => r.habitId)).toEqual(["h"]);
    expect(buildAgendaDay({ ...base, tasks: [], habits: [{ id: "h", name: "Walk", done: false }], filter: "meals" }).allDay).toEqual([]);
  });
  it("reads a typed time", () => {
    expect(parseTypedTime("call mom 3pm")).toEqual({ title: "call mom", time: "15:00" });
    expect(parseTypedTime("buy 2 eggs")).toEqual({ title: "buy 2 eggs", time: null });
  });
});
