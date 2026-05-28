/** Local prefs for cycle-aware planning (kept client-side; no DB migration). */
const KEY = "careflow:cycle-prefs";

export interface CyclePlanningPrefs {
  warnOnSchedule: boolean;
  notifyOnPhaseChange: boolean;
  burnoutThreshold: number; // commitments in next menstrual window
  warnScope: "appointments" | "all";
}

export const DEFAULT_CYCLE_PREFS: CyclePlanningPrefs = {
  warnOnSchedule: true,
  notifyOnPhaseChange: true,
  burnoutThreshold: 2,
  warnScope: "all",
};

export function getCyclePrefs(): CyclePlanningPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CYCLE_PREFS;
    return { ...DEFAULT_CYCLE_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_CYCLE_PREFS; }
}

export function setCyclePrefs(patch: Partial<CyclePlanningPrefs>) {
  const next = { ...getCyclePrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event("careflow:cycle-prefs"));
}

export function onCyclePrefsChange(cb: () => void) {
  const h = () => cb();
  window.addEventListener("careflow:cycle-prefs", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("careflow:cycle-prefs", h);
    window.removeEventListener("storage", h);
  };
}

/** Event fired by the store after a task/appointment is created or rescheduled. */
export interface ScheduleEventDetail {
  kind: "task" | "appointment";
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  /** Hints used by classifyTaskWeight */
  tags?: string[];
  area?: string;
  energy?: "low" | "medium" | "high";
  priority?: "low" | "medium" | "high";
  startTime?: string;
  estMinutes?: number;
}

export function emitScheduleEvent(detail: ScheduleEventDetail) {
  try { window.dispatchEvent(new CustomEvent("careflow:schedule-event", { detail })); } catch {}
}