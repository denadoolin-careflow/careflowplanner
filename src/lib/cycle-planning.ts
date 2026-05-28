/**
 * Cycle-aware planning helpers — pure functions.
 * Map tasks/appointments to a "weight" and decide how that weight fits a phase.
 */
import { addDays, format, parseISO, differenceInCalendarDays } from "date-fns";
import type { Task, Appointment } from "./types";
import type { CyclePhase, CycleSettings, PeriodLog } from "./cycle";
import { getPhaseInfo, predictNextPeriod } from "./cycle";

export type ItemWeight = "commitment" | "creative" | "admin" | "rest";
export type PhaseFit = "ideal" | "ok" | "discouraged";

const COMMITMENT_TAGS = ["meeting", "deadline", "appointment", "presentation", "interview", "event", "high-effort", "important"];
const CREATIVE_TAGS = ["creative", "brainstorm", "design", "writing", "launch", "new", "ideation"];
const ADMIN_TAGS = ["admin", "errand", "chore", "cleanup", "organize", "paperwork", "review"];
const REST_TAGS = ["rest", "self-care", "gentle", "recovery", "journal"];

function hasAny(tags: string[] | undefined, list: string[]) {
  if (!tags?.length) return false;
  const lower = tags.map((t) => t.toLowerCase());
  return list.some((k) => lower.includes(k));
}

export function classifyTaskWeight(t: Pick<Task, "tags" | "energy" | "priority" | "area" | "startTime" | "estMinutes" | "title">): ItemWeight {
  if (hasAny(t.tags, REST_TAGS)) return "rest";
  if (hasAny(t.tags, CREATIVE_TAGS)) return "creative";
  if (hasAny(t.tags, ADMIN_TAGS)) return "admin";
  if (hasAny(t.tags, COMMITMENT_TAGS)) return "commitment";
  if (t.area === "Appointments") return "commitment";
  if (t.energy === "high" || t.priority === "high") return "commitment";
  if (t.startTime && (t.estMinutes ?? 0) >= 45) return "commitment";
  return "admin";
}

export function classifyAppointmentWeight(_a: Appointment): ItemWeight {
  // Appointments are commitments by definition.
  return "commitment";
}

const FIT_MATRIX: Record<CyclePhase, Record<ItemWeight, PhaseFit>> = {
  menstrual:  { commitment: "discouraged", creative: "ok",        admin: "ok",         rest: "ideal" },
  follicular: { commitment: "ok",          creative: "ideal",     admin: "ok",         rest: "ok" },
  ovulatory:  { commitment: "ideal",       creative: "ok",        admin: "discouraged",rest: "discouraged" },
  luteal:     { commitment: "ok",          creative: "discouraged",admin: "ideal",     rest: "ok" },
};

export function phaseFit(phase: CyclePhase, weight: ItemWeight): PhaseFit {
  return FIT_MATRIX[phase][weight];
}

export function suggestBetterDate(
  currentISO: string,
  weight: ItemWeight,
  history: PeriodLog[],
  settings: CycleSettings,
  windowDays = 14,
): { iso: string; phase: CyclePhase; label: string } | null {
  const start = parseISO(currentISO);
  for (let i = 1; i <= windowDays; i++) {
    const d = addDays(start, i);
    const info = getPhaseInfo(d, history, settings);
    if (!info) return null;
    if (phaseFit(info.phase, weight) === "ideal") {
      return { iso: format(d, "yyyy-MM-dd"), phase: info.phase, label: info.label };
    }
  }
  // fallback: first "ok" day
  for (let i = 1; i <= windowDays; i++) {
    const d = addDays(start, i);
    const info = getPhaseInfo(d, history, settings);
    if (!info) return null;
    if (phaseFit(info.phase, weight) === "ok") {
      return { iso: format(d, "yyyy-MM-dd"), phase: info.phase, label: info.label };
    }
  }
  return null;
}

export function commitmentsInWindow(
  tasks: Task[],
  appts: Appointment[],
  startISO: string,
  endISO: string,
): Array<{ id: string; title: string; date: string; kind: "task" | "appt" }> {
  const inRange = (iso?: string) => !!iso && iso >= startISO && iso <= endISO;
  const out: Array<{ id: string; title: string; date: string; kind: "task" | "appt" }> = [];
  for (const t of tasks) {
    if (t.done || t.parentTaskId) continue;
    if (!inRange(t.dueDate)) continue;
    if (classifyTaskWeight(t) === "commitment") {
      out.push({ id: t.id, title: t.title, date: t.dueDate!, kind: "task" });
    }
  }
  for (const a of appts) {
    if (inRange(a.date)) out.push({ id: a.id, title: a.title, date: a.date, kind: "appt" });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Next predicted menstrual window [startISO, endISO]. */
export function nextMenstrualWindow(history: PeriodLog[], settings: CycleSettings, from: Date = new Date()): { startISO: string; endISO: string } | null {
  const next = predictNextPeriod(history, settings, from);
  if (!next) return null;
  const end = addDays(next, Math.max(1, settings.avgPeriodLength) - 1);
  return { startISO: format(next, "yyyy-MM-dd"), endISO: format(end, "yyyy-MM-dd") };
}

export function isPhaseEntryDay(date: Date, history: PeriodLog[], settings: CycleSettings): boolean {
  const today = getPhaseInfo(date, history, settings);
  const yest = getPhaseInfo(addDays(date, -1), history, settings);
  if (!today || !yest) return false;
  return today.phase !== yest.phase;
}

export function isPhasePreviewDay(date: Date, history: PeriodLog[], settings: CycleSettings): boolean {
  const today = getPhaseInfo(date, history, settings);
  const tomorrow = getPhaseInfo(addDays(date, 1), history, settings);
  if (!today || !tomorrow) return false;
  return today.phase !== tomorrow.phase;
}

export function daysIntoCurrentPhase(date: Date, history: PeriodLog[], settings: CycleSettings): number {
  const info = getPhaseInfo(date, history, settings);
  if (!info) return 0;
  let n = 1;
  for (let i = 1; i < 30; i++) {
    const prev = getPhaseInfo(addDays(date, -i), history, settings);
    if (!prev || prev.phase !== info.phase) break;
    n++;
  }
  return n;
}

export function tomorrowISO(date: Date = new Date()): string {
  return format(addDays(date, 1), "yyyy-MM-dd");
}

export { differenceInCalendarDays };