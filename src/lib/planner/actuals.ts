/**
 * Actual tracked time (from `task_time_entries`) shaped for the planner:
 * per task, per day, and per capacity group so planned vs actual can be
 * compared anywhere the planned numbers already show up.
 */
import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { subscribeTimeEntries, type TimeEntry } from "@/lib/time-tracking";
import { resolveActivity, readZoneTag } from "@/lib/task-tracking";
import type { GroupBy } from "@/lib/planner/time-allocation";

const UNTRACKED = "__untracked__";

export interface Actuals {
  rows: TimeEntry[];
  /** taskId -> tracked seconds in the window. */
  byTask: Map<string, number>;
  /** yyyy-MM-dd -> tracked seconds. */
  byDay: Map<string, number>;
  totalSeconds: number;
  loading: boolean;
}

const emptyActuals: Actuals = {
  rows: [], byTask: new Map(), byDay: new Map(), totalSeconds: 0, loading: true,
};

/** Tracked entries for a [from, from+days) window. */
export function useActuals(from: Date, days: number): Actuals {
  const fromISO = format(from, "yyyy-MM-dd");
  const toISO = format(addDays(from, Math.max(1, days) - 1), "yyyy-MM-dd");
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("task_time_entries" as any)
          .select("*")
          .gte("day", fromISO)
          .lte("day", toISO)
          .order("started_at", { ascending: false });
        if (!alive) return;
        setRows((data ?? []) as unknown as TimeEntry[]);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const unsub = subscribeTimeEntries(() => { void load(); });
    return () => { alive = false; unsub(); };
  }, [fromISO, toISO]);

  return useMemo(() => {
    const byTask = new Map<string, number>();
    const byDay = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
      const secs = r.seconds ?? 0;
      total += secs;
      if (r.task_id) byTask.set(r.task_id, (byTask.get(r.task_id) ?? 0) + secs);
      byDay.set(r.day, (byDay.get(r.day) ?? 0) + secs);
    }
    return { rows, byTask, byDay, totalSeconds: total, loading };
  }, [rows, loading]);
}

/** Tracked minutes per capacity group key, matching `useTimeAllocation` keys. */
export function useActualGroups(from: Date, days: number, groupBy: GroupBy): {
  byKey: Map<string, number>;
  totalMin: number;
  actuals: Actuals;
} {
  const actuals = useActuals(from, days);
  const { state } = useStore() as any;

  return useMemo(() => {
    const taskById = new Map<string, any>((state.tasks ?? []).map((t: any) => [t.id, t]));
    const recipientById = new Map<string, string>((state.recipients ?? []).map((r: any) => [r.id, r.name]));
    const byKey = new Map<string, number>();
    let totalMin = 0;

    for (const r of actuals.rows) {
      const min = (r.seconds ?? 0) / 60;
      if (min <= 0) continue;
      totalMin += min;
      const task = r.task_id ? taskById.get(r.task_id) : null;

      let key: string;
      if (groupBy === "area") {
        key = task?.area || r.area || "Unsorted";
      } else if (groupBy === "activity") {
        const act = resolveActivity(task) ?? (r.activity ? { id: r.activity } as any : null);
        key = act?.id ?? UNTRACKED;
      } else if (groupBy === "person") {
        const name = task?.recipientId ? recipientById.get(task.recipientId) : undefined;
        key = name ?? UNTRACKED;
      } else if (groupBy === "zone") {
        key = readZoneTag(task?.tags) ?? UNTRACKED;
      } else {
        key = "task";
      }
      byKey.set(key, (byKey.get(key) ?? 0) + min);
    }

    return { byKey, totalMin, actuals };
  }, [actuals, groupBy, state.tasks, state.recipients]);
}

/** Compact "1h10 / 45m" style comparison copy. */
export function fmtMinutesShort(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h${String(rest).padStart(2, "0")}` : `${h}h`;
}

export { UNTRACKED as ACTUALS_UNTRACKED_KEY, emptyActuals };
