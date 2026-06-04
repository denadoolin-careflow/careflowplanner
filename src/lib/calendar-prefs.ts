import { useCallback, useEffect, useState } from "react";

export type CalendarView = "day" | "week" | "month" | "year";
export type CalendarLayout = "grid" | "schedule" | "kanban" | "plan";
export type CalendarKind = "task" | "appt" | "care" | "meal" | "bday" | "hol" | "gcal" | "season";

const ALL_KINDS: CalendarKind[] = ["task", "appt", "care", "meal", "bday", "hol", "gcal", "season"];
const K = "careflow:calendar:prefs:v1";

export interface CalendarPrefs {
  view: CalendarView;
  layout: CalendarLayout;
  filters: CalendarKind[];
}

const DEFAULT_PREFS: CalendarPrefs = {
  view: "month",
  layout: "grid",
  filters: ALL_KINDS,
};

function read(): CalendarPrefs {
  if (typeof localStorage === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(K);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<CalendarPrefs>;
    return {
      view: (p.view ?? DEFAULT_PREFS.view) as CalendarView,
      layout: (p.layout ?? DEFAULT_PREFS.layout) as CalendarLayout,
      filters: Array.isArray(p.filters) && p.filters.length > 0
        ? (p.filters.filter(f => ALL_KINDS.includes(f as CalendarKind)) as CalendarKind[])
        : DEFAULT_PREFS.filters,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Persisted calendar prefs (view, layout, filters) shared across devices via localStorage. */
export function useCalendarPrefs() {
  const [prefs, setPrefs] = useState<CalendarPrefs>(() => read());

  useEffect(() => {
    try { localStorage.setItem(K, JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs]);

  const setView = useCallback((v: CalendarView) => setPrefs(p => ({ ...p, view: v })), []);
  const setLayout = useCallback((l: CalendarLayout) => setPrefs(p => ({ ...p, layout: l })), []);
  const setFilters = useCallback((next: Set<CalendarKind> | CalendarKind[]) => {
    const arr = Array.isArray(next) ? next : Array.from(next);
    setPrefs(p => ({ ...p, filters: arr }));
  }, []);
  const toggleFilter = useCallback((k: CalendarKind) => {
    setPrefs(p => {
      const set = new Set(p.filters);
      set.has(k) ? set.delete(k) : set.add(k);
      return { ...p, filters: Array.from(set) };
    });
  }, []);
  const resetFilters = useCallback(() => setPrefs(p => ({ ...p, filters: ALL_KINDS })), []);

  return { prefs, setView, setLayout, setFilters, toggleFilter, resetFilters, ALL_KINDS };
}