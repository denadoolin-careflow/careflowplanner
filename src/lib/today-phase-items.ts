import type { Task, Appointment } from "@/lib/types";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { parseTaskInput } from "@/lib/nlp-task";

export const PHASE_ORDER: RhythmPhase[] = ["plan", "grow", "care", "letgo"];

/** Time-of-day windows for each phase on Today. */
export function phaseForTime(time?: string): RhythmPhase | null {
  if (!time) return null;
  const h = Number(time.split(":")[0]);
  if (Number.isNaN(h)) return null;
  if (h < 12) return "plan";
  if (h < 15) return "grow";
  if (h < 18) return "care";
  return "letgo";
}

/** Phase whose window the clock is currently in. */
export function currentPhase(d = new Date()): RhythmPhase {
  return phaseForTime(`${d.getHours()}:00`)!;
}

const GARDEN_TO_PHASE: Record<string, RhythmPhase> = { Plan: "plan", Grow: "grow", Care: "care", "Let go": "letgo" };
const PHASE_KEY = "careflow:today-phase-pins:v1";

export function readPhasePins(): Record<string, RhythmPhase> {
  try { return JSON.parse(localStorage.getItem(PHASE_KEY) || "{}"); } catch { return {}; }
}
export function pinPhase(id: string, phase: RhythmPhase) {
  const p = readPhasePins(); p[id] = phase;
  try { localStorage.setItem(PHASE_KEY, JSON.stringify(p)); } catch { /* */ }
}

export function phaseOfTodayTask(t: Task, pins: Record<string, RhythmPhase> = {}): RhythmPhase {
  if (pins[t.id]) return pins[t.id];
  const byTime = phaseForTime(t.startTime);
  if (byTime) return byTime;
  const g = t.garden?.phase && GARDEN_TO_PHASE[t.garden.phase];
  if (g) return g;
  if (t.area === "Caregiving" || t.area === "Home") return "care";
  if (t.dayPart === "Evening" || t.dayPart === "Late Night") return "letgo";
  return "plan";
}

export function phaseOfAppointment(a: Appointment, pins: Record<string, RhythmPhase> = {}): RhythmPhase {
  return pins[a.id] ?? phaseForTime(a.time) ?? "plan";
}

const APPT_WORDS = /\b(appt|appointment|meeting|meet|visit|dr\.?|doctor|dentist|therapy|session|interview|lunch with|dinner with|coffee with|call with|class|practice|game)\b/i;

export type InlineKind = "task" | "appointment";

export interface InlineParse {
  kind: InlineKind;
  title: string;
  date: string;
  time?: string;
  chips: string[];
}

/** Natural-language parse for the inline phase add line. */
export function parseInline(raw: string, fallbackDate: string, force?: InlineKind): InlineParse {
  const p = parseTaskInput(raw);
  const auto: InlineKind = p.time && APPT_WORDS.test(raw) ? "appointment" : "task";
  const kind = force ?? auto;
  const chips = p.chips.filter(c => c.kind === "date" || c.kind === "time").map(c => c.label);
  return { kind, title: p.title || raw.trim(), date: p.dueDate ?? fallbackDate, time: p.time, chips };
}

const APPT_DONE_KEY = "careflow:today-appt-done:v1";
export function readApptDone(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(APPT_DONE_KEY) || "[]")); } catch { return new Set(); }
}
export function toggleApptDone(id: string, date: string): Set<string> {
  const s = readApptDone(); const k = `${id}@${date}`;
  s.has(k) ? s.delete(k) : s.add(k);
  try { localStorage.setItem(APPT_DONE_KEY, JSON.stringify([...s])); } catch { /* */ }
  return s;
}

/** Human time window for each phase (matches phaseForTime). */
export const PHASE_WINDOW: Record<RhythmPhase, string> = {
  plan: "until noon", grow: "noon – 3pm", care: "3pm – 6pm", letgo: "after 6pm",
};

/** One-line summary for a collapsed phase band, e.g. "2 tasks · 1 event · 1 done". */
export function phaseSummary(
  phase: RhythmPhase, tasks: Task[], appts: Appointment[], date: string, pins: Record<string, RhythmPhase> = {},
): string {
  const ts = tasks.filter(t => t.dueDate === date && !t.parentTaskId && phaseOfTodayTask(t, pins) === phase);
  const as = appts.filter(a => a.date === date && phaseOfAppointment(a, pins) === phase);
  const open = ts.filter(t => !t.done).length;
  const done = ts.length - open;
  const parts: string[] = [];
  if (open) parts.push(`${open} ${open === 1 ? "task" : "tasks"}`);
  if (as.length) parts.push(`${as.length} ${as.length === 1 ? "event" : "events"}`);
  if (done) parts.push(`${done} done`);
  return parts.length ? parts.join(" · ") : "Nothing planned yet";
}

/** Drop a manual phase pin so the item follows its start time again. */
export function unpinPhase(id: string) {
  const p = readPhasePins(); delete p[id];
  try { localStorage.setItem(PHASE_KEY, JSON.stringify(p)); } catch { /* */ }
}
