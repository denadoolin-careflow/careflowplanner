/**
 * Quick filters shared by every weekly planner view (Schedule, Board, List,
 * Table). State is persisted to localStorage and broadcast to all subscribers
 * so switching views never loses the narrowing you set up.
 */
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import type { Area, Energy, Priority } from "@/lib/types";
import type { PlannerFeedItem } from "./feed";

export type WeekDueRange = "any" | "today" | "overdue" | "unscheduled" | "scheduled";

export interface WeekFilterState {
  search: string;
  areas: Area[];
  priorities: Priority[];
  energies: Energy[];
  dueRange: WeekDueRange;
  /** Tag names (lowercase-insensitive match) an item must carry. */
  tags: string[];
  /** Hide items that are already done. */
  hideDone: boolean;
}

export const EMPTY_WEEK_FILTERS: WeekFilterState = {
  search: "",
  areas: [],
  priorities: [],
  energies: [],
  dueRange: "any",
  tags: [],
  hideDone: false,
};

const KEY = "careflow:planner:week-filters";

function read(): WeekFilterState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_WEEK_FILTERS;
    return { ...EMPTY_WEEK_FILTERS, ...(JSON.parse(raw) as Partial<WeekFilterState>) };
  } catch {
    return EMPTY_WEEK_FILTERS;
  }
}

const subs = new Set<(s: WeekFilterState) => void>();

function publish(next: WeekFilterState) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  subs.forEach(fn => fn(next));
}

export function useWeekFilters() {
  const [filters, setFilters] = useState<WeekFilterState>(read);

  useEffect(() => {
    subs.add(setFilters);
    return () => { subs.delete(setFilters); };
  }, []);

  const patch = useCallback((p: Partial<WeekFilterState>) => {
    publish({ ...read(), ...p });
  }, []);

  const toggleIn = useCallback(<K extends "areas" | "priorities" | "energies" | "tags">(key: K, value: WeekFilterState[K][number]) => {
    const cur = read();
    const list = cur[key] as string[];
    const next = list.includes(value as string) ? list.filter(v => v !== value) : [...list, value as string];
    publish({ ...cur, [key]: next } as WeekFilterState);
  }, []);

  const reset = useCallback(() => publish(EMPTY_WEEK_FILTERS), []);

  return { filters, patch, toggleIn, reset, activeCount: countActive(filters) };
}

export function countActive(f: WeekFilterState): number {
  return (
    (f.search.trim() ? 1 : 0) +
    f.areas.length + f.priorities.length + f.energies.length + f.tags.length +
    (f.dueRange !== "any" ? 1 : 0) +
    (f.hideDone ? 1 : 0)
  );
}

/** Narrow a planner feed. Non-task items pass attribute filters they can't answer. */
export function filterFeedItems(items: PlannerFeedItem[], f: WeekFilterState): PlannerFeedItem[] {
  const q = f.search.trim().toLowerCase();
  const todayISO = format(new Date(), "yyyy-MM-dd");
  const hasAttrFilter = f.areas.length > 0 || f.priorities.length > 0 || f.energies.length > 0;
  const wantTags = f.tags.map(t => t.toLowerCase());

  return items.filter(it => {
    if (f.hideDone && it.done) return false;
    if (q && !it.title.toLowerCase().includes(q)) return false;

    if (hasAttrFilter) {
      // Attribute filters only make sense for tasks — everything else drops out
      // so the view shows exactly the slice you asked for.
      if (it.sourceRef.type !== "task") return false;
      if (f.areas.length && (!it.area || !f.areas.includes(it.area))) return false;
      if (f.priorities.length && (!it.priority || !f.priorities.includes(it.priority))) return false;
      if (f.energies.length && (!it.energy || !f.energies.includes(it.energy))) return false;
    }

    if (wantTags.length) {
      const own = ((it as { tags?: string[] | null }).tags ?? []).map(t => String(t).toLowerCase());
      if (!wantTags.every(t => own.includes(t))) return false;
    }

    switch (f.dueRange) {
      case "today": return it.date === todayISO;
      case "overdue": return it.date < todayISO && !it.done;
      case "unscheduled": return it.allDay || !it.time;
      case "scheduled": return !it.allDay && !!it.time;
      default: return true;
    }
  });
}

/** Task-level predicate — used by the Schedule grid, which renders raw tasks. */
export function matchesTaskFilter(
  t: { title: string; done?: boolean; area?: Area; priority?: Priority; energy?: Energy; startTime?: string | null; dueDate?: string; tags?: string[] | null },
  f: WeekFilterState,
): boolean {
  const q = f.search.trim().toLowerCase();
  if (f.hideDone && t.done) return false;
  if (q && !t.title.toLowerCase().includes(q)) return false;
  if (f.areas.length && (!t.area || !f.areas.includes(t.area))) return false;
  if (f.priorities.length && (!t.priority || !f.priorities.includes(t.priority))) return false;
  if (f.energies.length && (!t.energy || !f.energies.includes(t.energy))) return false;
  if (f.tags.length) {
    const own = (t.tags ?? []).map(x => String(x).toLowerCase());
    if (!f.tags.every(x => own.includes(x.toLowerCase()))) return false;
  }
  const todayISO = format(new Date(), "yyyy-MM-dd");
  switch (f.dueRange) {
    case "today": return t.dueDate === todayISO;
    case "overdue": return !!t.dueDate && t.dueDate < todayISO && !t.done;
    case "unscheduled": return !t.startTime;
    case "scheduled": return !!t.startTime;
    default: return true;
  }
}
