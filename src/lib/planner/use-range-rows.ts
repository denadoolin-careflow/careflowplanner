/**
 * One row source for every weekly surface (List, Table, Board).
 *
 * The three views used to each build their own list out of the feed, which
 * meant a task could render twice (once where it is scheduled, once in an
 * overdue/anytime bucket) and each view carried its own mutation path. This
 * hook is the single place that:
 *
 *   - reads the planner feed for the range,
 *   - applies the shared week filters, tag-field filters and outline zoom,
 *   - de-duplicates task rows so one task = one row, and
 *   - exposes the shared mutations (toggle done, retitle, retime, resize).
 */
import { useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { usePlannerFeed, type PlannerFeedItem } from "./feed";
import { useWeekFilters, filterFeedItems } from "./week-filters";
import { useFieldFilter } from "./field-filters";
import { useOutlineFilter } from "./outline";

export interface RangeRows {
  /** Every row in the range, de-duplicated, date+time ordered. */
  rows: PlannerFeedItem[];
  /** Same rows keyed by ISO day. */
  byDay: Map<string, PlannerFeedItem[]>;
  /** Only the task-backed rows (bulk select, "select all"). */
  taskRows: PlannerFeedItem[];
  outline: ReturnType<typeof useOutlineFilter>;
  toggleDone: (item: PlannerFeedItem) => void;
  rename: (item: PlannerFeedItem, title: string) => void;
  setTime: (item: PlannerFeedItem, time: string | null) => void;
  setDuration: (item: PlannerFeedItem, minutes: number | null) => void;
}

const byTime = (a: PlannerFeedItem, b: PlannerFeedItem) =>
  a.date.localeCompare(b.date) || (a.time ?? "zz").localeCompare(b.time ?? "zz");

export function useRangeRows(from: Date, days: number): RangeRows {
  const { state, updateTask, updateAppointment } = useStore() as any;
  const { items } = usePlannerFeed(from, days);
  const { filters } = useWeekFilters();
  const fieldFilter = useFieldFilter(filters);
  const outline = useOutlineFilter(state.tasks ?? []);

  const rows = useMemo(() => {
    const filtered = filterFeedItems(items, filters)
      .filter(it => (it.sourceRef.type === "task" ? outline.allowed(it.sourceRef.id) : !outline.zoomRoot))
      .filter(it => fieldFilter(it));

    // One task = one row. When the same task somehow surfaces twice in a
    // range, keep the earliest scheduled occurrence.
    const seen = new Map<string, PlannerFeedItem>();
    const out: PlannerFeedItem[] = [];
    for (const it of filtered.slice().sort(byTime)) {
      if (it.sourceRef.type !== "task") { out.push(it); continue; }
      const key = `task:${it.sourceRef.id}`;
      if (seen.has(key)) continue;
      seen.set(key, it);
      out.push(it);
    }
    return out.sort(byTime);
  }, [items, filters, fieldFilter, outline]);

  const byDay = useMemo(() => {
    const map = new Map<string, PlannerFeedItem[]>();
    for (const it of rows) {
      const list = map.get(it.date);
      if (list) list.push(it);
      else map.set(it.date, [it]);
    }
    return map;
  }, [rows]);

  const taskRows = useMemo(() => rows.filter(r => r.sourceRef.type === "task"), [rows]);

  const toggleDone = useCallback((item: PlannerFeedItem) => {
    if (item.sourceRef.type !== "task") return;
    void updateTask(item.sourceRef.id, { done: !item.done });
  }, [updateTask]);

  const rename = useCallback((item: PlannerFeedItem, title: string) => {
    const next = title.trim();
    if (!next || next === item.title) return;
    if (item.sourceRef.type === "task") void updateTask(item.sourceRef.id, { title: next });
    else if (item.sourceRef.type === "appointment") void updateAppointment?.(item.sourceRef.id, { title: next });
  }, [updateTask, updateAppointment]);

  const setTime = useCallback((item: PlannerFeedItem, time: string | null) => {
    if (item.sourceRef.type === "task") void updateTask(item.sourceRef.id, { startTime: time ?? undefined });
    else if (item.sourceRef.type === "appointment") void updateAppointment?.(item.sourceRef.id, { time: time ?? undefined });
  }, [updateTask, updateAppointment]);

  const setDuration = useCallback((item: PlannerFeedItem, minutes: number | null) => {
    if (item.sourceRef.type !== "task") return;
    void updateTask(item.sourceRef.id, { estMinutes: minutes ?? undefined });
  }, [updateTask]);

  return { rows, byDay, taskRows, outline, toggleDone, rename, setTime, setDuration };
}

/** Convenience for surfaces that only need one day out of the range. */
export const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
