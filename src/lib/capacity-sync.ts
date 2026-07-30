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