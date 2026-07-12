import { useEffect, useState } from "react";

export type PlannerView = "day" | "3day" | "week" | "month";
export type PlannerSort = "manual" | "priority" | "due" | "duration" | "category" | "recent";

const VIEW_KEY = "careflow:planner:view";
const SORT_KEY = "careflow:planner:sort";
const TAGS_KEY = "careflow:planner:tag-filter";
const FOCUS_TASK_KEY = "careflow:planner:focus-task";

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
