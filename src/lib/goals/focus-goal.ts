import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/** One focus goal per day, synced per account (daily_focus_goals). */
const EVT = "careflow:focus-goal";
const cache = new Map<string, string | null>();

export function focusDateKey(date: Date): string { return format(date, "yyyy-MM-dd"); }

async function load(key: string) {
  const { data } = await supabase.from("daily_focus_goals").select("goal_id").eq("focus_date", key).maybeSingle();
  cache.set(key, (data?.goal_id as string | null) ?? null);
  window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
}

export async function setFocusGoal(date: Date, goalId: string | null) {
  const key = focusDateKey(date);
  cache.set(key, goalId);
  window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("daily_focus_goals").upsert(
    { user_id: auth.user.id, focus_date: key, goal_id: goalId, updated_at: new Date().toISOString() },
    { onConflict: "user_id,focus_date" },
  );
}

export function useFocusGoal(date: Date) {
  const key = focusDateKey(date);
  const [goalId, setId] = useState<string | null>(cache.get(key) ?? null);
  useEffect(() => {
    setId(cache.get(key) ?? null);
    if (!cache.has(key)) void load(key);
    const h = (e: Event) => { if ((e as CustomEvent).detail === key) setId(cache.get(key) ?? null); };
    window.addEventListener(EVT, h);
    const ch = supabase.channel(`focus-goal-${key}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_focus_goals" }, () => void load(key))
      .subscribe();
    return () => { window.removeEventListener(EVT, h); void supabase.removeChannel(ch); };
  }, [key]);
  const set = useCallback((id: string | null) => setFocusGoal(date, id), [date]);
  return [goalId, set] as const;
}
