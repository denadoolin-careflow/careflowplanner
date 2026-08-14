/**
 * Read-only aggregation of planned time over the shared planner feed.
 * Powers the end-of-day/week/month "time review" wheel and bar graph.
 */
import { useMemo } from "react";
import { usePlannerFeed } from "@/lib/planner/feed";
import { useStore } from "@/lib/store";
import { KIND_LABEL, type KindKey } from "@/lib/calendar-colors";

export type GroupBy = "kind" | "area";

export interface AllocationSlice {
  key: string;
  label: string;
  color: string;
  plannedMin: number;
  doneMin: number;
}

export interface Allocation {
  slices: AllocationSlice[];
  totalPlannedMin: number;
  totalDoneMin: number;
  allDayCount: number;
  /** Share of the window's waking hours (16h/day) that is planned. */
  plannedShare: number;
}

const DEFAULT_MIN: Partial<Record<KindKey, number>> = { appt: 60, meal: 30, gcal: 60, care: 45 };
const SKIP: KindKey[] = ["bday", "hol", "cosmic"];

const toMin = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

export function useTimeAllocation(from: Date, days: number, groupBy: GroupBy): Allocation {
  const { items } = usePlannerFeed(from, days);
  const { state } = useStore() as any;

  const taskById = useMemo(() => {
    const m = new Map<string, any>();
    for (const t of state.tasks ?? []) m.set(t.id, t);
    return m;
  }, [state.tasks]);

  return useMemo(() => {
    const byKey = new Map<string, AllocationSlice>();
    let allDayCount = 0;

    for (const it of items) {
      if (SKIP.includes(it.kind)) continue;
      const task = it.sourceRef.type === "task" ? taskById.get(it.sourceRef.id) : null;

      const s = toMin(it.time);
      const e = toMin(it.endTime);
      let minutes = s !== null && e !== null && e > s ? e - s : 0;
      if (!minutes) minutes = task?.estMinutes ?? DEFAULT_MIN[it.kind] ?? 30;
      if (it.allDay && !task) { allDayCount += 1; if (it.kind !== "meal") continue; }

      const key = groupBy === "area"
        ? (task ? (task.area || "Unsorted") : KIND_LABEL[it.kind])
        : it.kind;
      const label = groupBy === "area" ? key : KIND_LABEL[it.kind];

      const slice = byKey.get(key) ?? { key, label, color: it.color, plannedMin: 0, doneMin: 0 };
      slice.plannedMin += minutes;
      if (it.done) slice.doneMin += minutes;
      byKey.set(key, slice);
    }

    const slices = [...byKey.values()].sort((a, b) => b.plannedMin - a.plannedMin);
    const totalPlannedMin = slices.reduce((s, x) => s + x.plannedMin, 0);
    const totalDoneMin = slices.reduce((s, x) => s + x.doneMin, 0);
    const capacity = days * 16 * 60;
    return {
      slices,
      totalPlannedMin,
      totalDoneMin,
      allDayCount,
      plannedShare: capacity ? Math.min(1, totalPlannedMin / capacity) : 0,
    };
  }, [items, taskById, groupBy, days]);
}

export const fmtHours = (min: number) => `${Math.round(min / 6) / 10}h`;
