/**
 * Movement logging for WellFlow. Private to the signed-in user and purely
 * descriptive — it reports what you logged, never prescribes exercise.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "./types";

export const ACTIVITIES = [
  { key: "walk", label: "Walk" },
  { key: "strength", label: "Strength" },
  { key: "cardio", label: "Cardio" },
  { key: "yoga", label: "Yoga / stretch" },
  { key: "cycling", label: "Cycling" },
  { key: "swim", label: "Swim" },
  { key: "other", label: "Other" },
] as const;

export const INTENSITIES = [
  { key: "easy", label: "Easy" },
  { key: "moderate", label: "Moderate" },
  { key: "hard", label: "Hard" },
] as const;

export interface MovementLog {
  id: string;
  date: string;
  logged_at: string;
  activity: string;
  minutes: number;
  intensity: string;
  note: string | null;
}

const map = (r: any): MovementLog => ({
  id: r.id,
  date: r.date,
  logged_at: r.logged_at,
  activity: r.activity ?? "walk",
  minutes: Number(r.minutes) || 0,
  intensity: r.intensity ?? "easy",
  note: r.note ?? null,
});

export const activityLabel = (key: string) =>
  ACTIVITIES.find(a => a.key === key)?.label ?? "Movement";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());

export async function logMovement(input: {
  activity: string;
  minutes: number;
  intensity?: string;
  date?: string;
  time?: string | null;
  note?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in");
  const date = input.date ?? todayISO();
  const logged_at = input.time ? new Date(`${date}T${input.time}:00`).toISOString() : new Date().toISOString();
  const { error } = await supabase.from("wellflow_movement_logs").insert({
    user_id: user.id,
    date,
    logged_at,
    activity: input.activity,
    minutes: Math.min(Math.max(Math.round(input.minutes) || 0, 0), 1440),
    intensity: input.intensity ?? "easy",
    note: input.note?.trim() || null,
  } as any);
  if (error) throw error;
  emit();
}

export async function updateMovement(id: string, patch: Partial<MovementLog>) {
  const row: Record<string, unknown> = {};
  if (patch.activity !== undefined) row.activity = patch.activity;
  if (patch.minutes !== undefined) row.minutes = Math.max(0, Math.round(patch.minutes));
  if (patch.intensity !== undefined) row.intensity = patch.intensity;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.date !== undefined) row.date = patch.date;
  const { error } = await supabase.from("wellflow_movement_logs").update(row as any).eq("id", id);
  if (error) throw error;
  emit();
}

export async function deleteMovement(id: string) {
  await supabase.from("wellflow_movement_logs").delete().eq("id", id);
  emit();
}

/** Movement logs from the last `days` days, newest first. */
export function useMovement(days = 60) {
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const { data } = await supabase.from("wellflow_movement_logs")
      .select("*").gte("date", since).order("logged_at", { ascending: false }).limit(500);
    setLogs((data ?? []).map(map));
    setLoading(false);
  }, [days]);

  useEffect(() => { setLoading(true); void load(); }, [load]);
  useEffect(() => {
    const cb = () => void load();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, [load]);

  return { logs, loading, reload: load };
}

/* --------------------------------------------------------------- summary */

export interface MovementWeek {
  daysMoved: number;
  targetDays: number;
  minutes: number;
  sessions: number;
  streak: number;
  /** Last 7 dates oldest → newest with whether you moved. */
  strip: { date: string; moved: boolean; minutes: number }[];
}

const dayISO = (offset: number) => {
  const d = new Date(`${todayISO()}T12:00:00`);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};

export function summarizeWeek(logs: MovementLog[], targetDays = 3): MovementWeek {
  const byDay = new Map<string, number>();
  for (const l of logs) byDay.set(l.date, (byDay.get(l.date) ?? 0) + l.minutes);

  const strip = Array.from({ length: 7 }, (_, i) => {
    const date = dayISO(6 - i);
    const minutes = byDay.get(date) ?? 0;
    return { date, moved: minutes > 0, minutes };
  });

  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const date = dayISO(i);
    if ((byDay.get(date) ?? 0) > 0) streak++;
    else if (i > 0 || (byDay.get(dayISO(0)) ?? 0) === 0) break;
  }

  const week = logs.filter(l => l.date >= dayISO(6));
  return {
    daysMoved: strip.filter(s => s.moved).length,
    targetDays,
    minutes: week.reduce((s, l) => s + l.minutes, 0),
    sessions: week.length,
    streak,
    strip,
  };
}

export function useMovementWeek(targetDays = 3) {
  const { logs, loading } = useMovement(60);
  const week = useMemo(() => summarizeWeek(logs, targetDays), [logs, targetDays]);
  return { logs, week, loading };
}

/* ------------------------------------------------- movement vs. energy */

export interface MovementEnergy {
  movedDays: number;
  stillDays: number;
  movedEnergy: number | null;
  stillEnergy: number | null;
}

/** Compare your own energy check-ins on days you logged movement and days you didn't. */
export async function fetchMovementEnergy(days = 60): Promise<MovementEnergy> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const [{ data: moves }, { data: checks }] = await Promise.all([
    supabase.from("wellflow_movement_logs").select("date,minutes").gte("date", since),
    supabase.from("wellness_checkins").select("date,energy").gte("date", since),
  ]);

  const moved = new Set((moves ?? []).filter((m: any) => Number(m.minutes) > 0).map((m: any) => m.date));
  const a: number[] = [];
  const b: number[] = [];
  for (const c of (checks ?? []) as any[]) {
    const e = Number(c.energy);
    if (!Number.isFinite(e) || e <= 0) continue;
    (moved.has(c.date) ? a : b).push(e);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return { movedDays: a.length, stillDays: b.length, movedEnergy: avg(a), stillEnergy: avg(b) };
}

export function useMovementEnergy(days = 60) {
  const [data, setData] = useState<MovementEnergy | null>(null);
  useEffect(() => {
    let cancel = false;
    void fetchMovementEnergy(days).then(d => { if (!cancel) setData(d); });
    return () => { cancel = true; };
  }, [days]);
  return data;
}

/** Did the user already log movement on this date? Used to keep nudges quiet. */
export async function hasMovementOn(date: string): Promise<boolean> {
  const { data } = await supabase.from("wellflow_movement_logs")
    .select("id").eq("date", date).limit(1);
  return (data ?? []).length > 0;
}
