/**
 * Cross-device sync for the daily capacity check-in.
 * localStorage stays the instant source of truth; `daily_checkins` is the
 * shared store so capacity follows the user across devices.
 */
import { supabase } from "@/integrations/supabase/client";
import type { BurnoutLevel } from "./burnout-checkin";

export interface CapacityRow {
  level: BurnoutLevel | null;
  mvd: boolean;
  mvdTaskId: string | null;
  updatedAt: string;
}

export interface PlannerCapacityLog {
  iso: string;
  level: BurnoutLevel | null;
  plannedMin: number;
  completedMin: number;
  dayParts: Record<string, { planned: number; available: number }>;
}

const LEVELS: BurnoutLevel[] = ["spacious", "steady", "tender", "depleted"];
const isLevel = (v: unknown): v is BurnoutLevel => LEVELS.includes(v as BurnoutLevel);

export async function fetchCapacity(iso: string): Promise<CapacityRow | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("daily_checkins" as any)
      .select("capacity_level, capacity_mvd, capacity_mvd_task_id, updated_at")
      .eq("user_id", user.id)
      .eq("iso_date", iso)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as any;
    return {
      level: isLevel(row.capacity_level) ? row.capacity_level : null,
      mvd: !!row.capacity_mvd,
      mvdTaskId: row.capacity_mvd_task_id ?? null,
      updatedAt: row.updated_at ?? "",
    };
  } catch {
    return null;
  }
}

export async function pushCapacity(iso: string, entry: CapacityRow): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("daily_checkins" as any)
      .upsert({
        user_id: user.id,
        iso_date: iso,
        capacity_level: entry.level,
        capacity_mvd: entry.mvd,
        capacity_mvd_task_id: entry.mvdTaskId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,iso_date" });
  } catch {
    /* offline — localStorage already holds the value */
  }
}

/**
 * Record what the planner actually holds for a day (planned vs completed
 * minutes and the per-day-part load) so Capacity Insights can learn from it.
 */
export async function pushPlannerCapacity(
  iso: string,
  planned: number,
  completed: number,
  dayParts: Record<string, { planned: number; available: number }>,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("daily_checkins" as any)
      .upsert({
        user_id: user.id,
        iso_date: iso,
        capacity_planned_min: Math.round(planned),
        capacity_completed_min: Math.round(completed),
        capacity_day_parts: dayParts,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,iso_date" });
  } catch {
    /* offline — the planner still shows live numbers */
  }
}

/** Saved planner capacity for the last `days` days, newest first. */
export async function fetchPlannerCapacityHistory(days = 30): Promise<PlannerCapacityLog[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("daily_checkins" as any)
      .select("iso_date, capacity_level, capacity_planned_min, capacity_completed_min, capacity_day_parts")
      .eq("user_id", user.id)
      .gte("iso_date", from)
      .order("iso_date", { ascending: false });
    if (error || !data) return [];
    return (data as any[])
      .filter(r => r.capacity_planned_min !== null || r.capacity_completed_min !== null)
      .map(r => ({
        iso: r.iso_date as string,
        level: isLevel(r.capacity_level) ? r.capacity_level : null,
        plannedMin: r.capacity_planned_min ?? 0,
        completedMin: r.capacity_completed_min ?? 0,
        dayParts: (r.capacity_day_parts ?? {}) as PlannerCapacityLog["dayParts"],
      }));
  } catch {
    return [];
  }
}