import { parseISO } from "date-fns";
import type { Appointment, Meal, Task } from "@/lib/types";
import { expandRecurrence, expandAppointments } from "@/lib/recurrence";

export type AgendaKind = "task" | "appt" | "meal";
export type AgendaFilter = "all" | "tasks" | "events" | "meals";

export interface AgendaRow {
  key: string;
  kind: AgendaKind;
  title: string;
  /** minutes from midnight; null = all-day / unscheduled */
  start: number | null;
  end: number | null;
  done: boolean;
  task?: Task;
  appt?: Appointment;
  mealId?: string;
}

export interface AgendaDay {
  overdue: Task[];
  allDay: AgendaRow[];
  timed: AgendaRow[];
  unscheduled: AgendaRow[];
}

export function hmToMin(hm?: string | null): number | null {
  if (!hm || !/^\d{1,2}:\d{2}/.test(hm)) return null;
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

const byOpenThen = (a: AgendaRow, b: AgendaRow) =>
  Number(a.done) - Number(b.done) || (a.start ?? 0) - (b.start ?? 0) || a.title.localeCompare(b.title);

export function matchesFilter(kind: AgendaKind, f: AgendaFilter) {
  return f === "all" || (f === "tasks" && kind === "task") || (f === "events" && kind === "appt") || (f === "meals" && kind === "meal");
}

/** Build one day's agenda: overdue (only on today) → all-day → timed → unscheduled. Done items sort after open ones. */
export function buildAgendaDay(input: {
  iso: string; today: string; tasks: Task[]; appointments: Appointment[]; meals: Meal[];
  mealDone?: Record<string, boolean>; blockStart?: Map<string, string>; filter?: AgendaFilter;
}): AgendaDay {
  const { iso, today, tasks, appointments, meals, mealDone = {}, blockStart, filter = "all" } = input;
  const rows: AgendaRow[] = [];
  const top = tasks.filter(t => !t.parentTaskId);
  for (const t of top.filter(t => t.dueDate === iso)) {
    const s = hmToMin(blockStart?.get(t.id) ?? t.startTime);
    const e = hmToMin(t.endTime) ?? (s != null && t.durationMinutes ? s + t.durationMinutes : null);
    rows.push({ key: `t:${t.id}`, kind: "task", title: t.title, start: s, end: e, done: !!t.done, task: t });
  }
  const day = parseISO(iso);
  for (const a of expandAppointments(appointments, day, day)) {
    if (a.date !== iso) continue;
    rows.push({ key: `a:${a.id}:${iso}`, kind: "appt", title: a.title, start: a.allDay ? null : hmToMin(a.time), end: hmToMin(a.endTime), done: false, appt: a });
  }
  for (const m of meals) {
    if (!m.date) continue;
    const on = m.recurrenceRule ? expandRecurrence(m.date, m.recurrenceRule, day, day).includes(iso) : m.date === iso;
    if (on) rows.push({ key: `m:${m.id}`, kind: "meal", title: `${m.slot}: ${m.name}`, start: null, end: null, done: !!mealDone[m.id], mealId: m.id });
  }
  const shown = rows.filter(r => matchesFilter(r.kind, filter));
  const overdue = iso === today && matchesFilter("task", filter)
    ? top.filter(t => !t.done && t.dueDate && t.dueDate < today).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    : [];
  return {
    overdue,
    allDay: shown.filter(r => r.start == null && r.kind !== "task").sort(byOpenThen),
    timed: shown.filter(r => r.start != null).sort((a, b) => a.start! - b.start! || Number(a.done) - Number(b.done)),
    unscheduled: shown.filter(r => r.start == null && r.kind === "task").sort(byOpenThen),
  };
}

export function label12(min: number): string {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  const s = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${s}` : `${h12}:${String(m).padStart(2, "0")}${s}`;
}

/** Parse a trailing time like "3pm", "3:30 pm", "15:00" from typed text. */
export function parseTypedTime(text: string): { title: string; time: string | null } {
  const re = /\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\s*$/i;
  const m = text.match(re);
  if (!m || (!m[3] && !m[2])) return { title: text.trim(), time: null };
  let h = Number(m[1]); const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap?.startsWith("p") && h < 12) h += 12;
  if (ap?.startsWith("a") && h === 12) h = 0;
  if (h > 23 || min > 59) return { title: text.trim(), time: null };
  return { title: text.slice(0, m.index).trim(), time: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` };
}
