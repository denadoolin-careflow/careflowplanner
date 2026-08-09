import { useEffect, useState } from "react";

export type PlannerView = "day" | "3day" | "week" | "month" | "year";
/** Per-range mode pills (Week: grid/board · Month: calendar/overview). */
export type PlannerWeekMode = "grid" | "board";
export type PlannerMonthMode = "calendar" | "overview";
export type PlannerSort = "manual" | "priority" | "due" | "duration" | "category" | "recent";

const VIEW_KEY = "careflow:planner:view";
const SORT_KEY = "careflow:planner:sort";
const TAGS_KEY = "careflow:planner:tag-filter";
const FOCUS_TASK_KEY = "careflow:planner:focus-task";
const PANELS_KEY = "careflow:planner:panels";
const WEEK_MODE_KEY = "careflow:planner:week-mode";
const WEEK_HEADER_KEY = "careflow:planner:week-header";
const MONTH_MODE_KEY = "careflow:planner:month-mode";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

function useLS<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === key) setVal(read(key, fallback)); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, fallback]);
  const setter = (v: T) => { setVal(v); write(key, v); };
  return [val, setter];
}

export const usePlannerView = () => useLS<PlannerView>(VIEW_KEY, "day");
export const usePlannerSort = () => useLS<PlannerSort>(SORT_KEY, "manual");
export const usePlannerTagFilter = () => useLS<string[]>(TAGS_KEY, []);
export const usePlannerFocusTaskId = () => useLS<string | null>(FOCUS_TASK_KEY, null);
export const usePlannerWeekMode = () => useLS<PlannerWeekMode>(WEEK_MODE_KEY, "grid");
/** Week column headers: full cosmic insight vs. compact date+weather. */
export type PlannerWeekHeaderMode = "insight" | "compact";
export const usePlannerWeekHeaderMode = () => useLS<PlannerWeekHeaderMode>(WEEK_HEADER_KEY, "insight");
export const usePlannerMonthMode = () => useLS<PlannerMonthMode>(MONTH_MODE_KEY, "calendar");

export type PlannerPanelId = "task" | "focus" | "context";
export type PlannerPanelPrefs = Record<PlannerView, Record<PlannerPanelId, boolean>>;

/** Panel visibility is remembered per range so switching views never silently overrides a choice. */
export const DEFAULT_PLANNER_PANELS: PlannerPanelPrefs = {
  day: { task: true, focus: true, context: true },
  "3day": { task: false, focus: false, context: true },
  week: { task: false, focus: false, context: false },
  month: { task: false, focus: false, context: false },
  year: { task: false, focus: false, context: false },
};

export function usePlannerPanels(): [PlannerPanelPrefs, (view: PlannerView, panel: PlannerPanelId, on: boolean) => void] {
  const [prefs, setPrefs] = useLS<PlannerPanelPrefs>(PANELS_KEY, DEFAULT_PLANNER_PANELS);
  const merged: PlannerPanelPrefs = {
    day: { ...DEFAULT_PLANNER_PANELS.day, ...(prefs?.day ?? {}) },
    "3day": { ...DEFAULT_PLANNER_PANELS["3day"], ...(prefs?.["3day"] ?? {}) },
    week: { ...DEFAULT_PLANNER_PANELS.week, ...(prefs?.week ?? {}) },
    month: { ...DEFAULT_PLANNER_PANELS.month, ...(prefs?.month ?? {}) },
    year: { ...DEFAULT_PLANNER_PANELS.year, ...(prefs?.year ?? {}) },
  };
  const set = (view: PlannerView, panel: PlannerPanelId, on: boolean) =>
    setPrefs({ ...merged, [view]: { ...merged[view], [panel]: on } });
  return [merged, set];
}
