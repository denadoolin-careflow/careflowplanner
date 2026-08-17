/**
 * Bridges the planner's live capacity numbers into the stored daily record so
 * Capacity Insights can learn from real planning, not just manual energy logs.
 */
import { useEffect, useRef, useState } from "react";
import {
  pushPlannerCapacity,
  fetchPlannerCapacityHistory,
  type PlannerCapacityLog,
} from "./capacity-sync";

export type { PlannerCapacityLog };

/** Debounced write of the day's planned/completed minutes + day-part load. */
export function usePlannerCapacityLogger(
  iso: string,
  planned: number,
  completed: number,
  dayParts: Record<string, { planned: number; available: number }>,
  enabled = true,
) {
  const lastRef = useRef<string>("");
  useEffect(() => {
    if (!enabled) return;
    const sig = `${iso}|${Math.round(planned)}|${Math.round(completed)}|${JSON.stringify(dayParts)}`;
    if (sig === lastRef.current) return;
    const t = window.setTimeout(() => {
      lastRef.current = sig;
      void pushPlannerCapacity(iso, planned, completed, dayParts);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [iso, planned, completed, dayParts, enabled]);
}

/** Saved planner capacity days, for insight panels. */
export function usePlannerCapacityHistory(days = 30) {
  const [rows, setRows] = useState<PlannerCapacityLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchPlannerCapacityHistory(days).then(r => {
      if (!alive) return;
      setRows(r);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [days]);
  return { rows, loading };
}

export interface PlannerCapacitySummary {
  days: number;
  avgPlannedMin: number;
  avgCompletedMin: number;
  followThroughPct: number;
  heaviestPart: string | null;
  bestLevel: string | null;
}

export function summarizePlannerCapacity(rows: PlannerCapacityLog[]): PlannerCapacitySummary {
  if (!rows.length) {
    return { days: 0, avgPlannedMin: 0, avgCompletedMin: 0, followThroughPct: 0, heaviestPart: null, bestLevel: null };
  }
  const planned = rows.reduce((s, r) => s + r.plannedMin, 0);
  const completed = rows.reduce((s, r) => s + r.completedMin, 0);

  const partLoad: Record<string, { planned: number; available: number }> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.dayParts ?? {})) {
      const cur = partLoad[k] ?? { planned: 0, available: 0 };
      cur.planned += v?.planned ?? 0;
      cur.available += v?.available ?? 0;
      partLoad[k] = cur;
    }
  }
  const heaviestPart = Object.entries(partLoad)
    .filter(([, v]) => v.available > 0)
    .sort((a, b) => (b[1].planned / b[1].available) - (a[1].planned / a[1].available))[0]?.[0] ?? null;

  const byLevel: Record<string, { done: number; n: number }> = {};
  for (const r of rows) {
    if (!r.level) continue;
    const cur = byLevel[r.level] ?? { done: 0, n: 0 };
    cur.done += r.completedMin;
    cur.n += 1;
    byLevel[r.level] = cur;
  }
  const bestLevel = Object.entries(byLevel)
    .sort((a, b) => (b[1].done / b[1].n) - (a[1].done / a[1].n))[0]?.[0] ?? null;

  return {
    days: rows.length,
    avgPlannedMin: Math.round(planned / rows.length),
    avgCompletedMin: Math.round(completed / rows.length),
    followThroughPct: planned > 0 ? Math.round((completed / planned) * 100) : 0,
    heaviestPart,
    bestLevel,
  };
}
