/**
 * Date-keyed routine step completions, backed by `routine_completions`.
 * Lets the planner check routine steps off on past days. Today still flows
 * through `routines.toggleItem` so the live `done` flags stay in sync.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Key = string; // `${routineId}|${itemId}|${date}`
let done = new Set<Key>();
const loadedDates = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const key = (routineId: string, itemId: string, date: string) => `${routineId}|${itemId}|${date}`;

async function loadDates(dates: string[]) {
  const missing = dates.filter(d => !loadedDates.has(d));
  if (!missing.length) return;
  missing.forEach(d => loadedDates.add(d));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("routine_completions" as any)
    .select("routine_id,item_id,completed_on")
    .eq("user_id", user.id)
    .in("completed_on", missing);
  const next = new Set(done);
  for (const r of (data ?? []) as any[]) next.add(key(r.routine_id, r.item_id, r.completed_on));
  done = next;
  emit();
}

export function isStepDoneOn(routineId: string, itemId: string, date: string) {
  return done.has(key(routineId, itemId, date));
}

export async function setStepDoneOn(routineId: string, itemId: string, date: string, value: boolean) {
  const k = key(routineId, itemId, date);
  const next = new Set(done);
  if (value) next.add(k); else next.delete(k);
  done = next;
  emit();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (value) {
    await supabase.from("routine_completions" as any).upsert(
      { user_id: user.id, routine_id: routineId, item_id: itemId, completed_on: date } as any,
      { onConflict: "user_id,routine_id,item_id,completed_on" } as any,
    );
  } else {
    await supabase.from("routine_completions" as any).delete()
      .eq("user_id", user.id).eq("routine_id", routineId).eq("item_id", itemId).eq("completed_on", date);
  }
}

/** Subscribe to completions for the given dates; re-renders on change. */
export function useRoutineHistory(dates: string[]) {
  const [, setTick] = useState(0);
  const sig = dates.join(",");
  useEffect(() => {
    const l = () => setTick(t => t + 1);
    listeners.add(l);
    void loadDates(sig ? sig.split(",") : []);
    return () => { listeners.delete(l); };
  }, [sig]);
}
