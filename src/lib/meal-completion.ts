import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { localCareDate } from "./bedside-plan";
import { toast } from "sonner";

const DONE_KEY = "careflow:meals-done:v1";
const DONE_EVENT = "careflow:meals-done-change";

function readDone(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(DONE_KEY) || "{}"); } catch { return {}; }
}

function writeDone(value: Record<string, boolean>) {
  try { localStorage.setItem(DONE_KEY, JSON.stringify(value)); } catch { /* no-op */ }
  window.dispatchEvent(new Event(DONE_EVENT));
}

export function useMealCompletion(dateISO = localCareDate()) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const sync = () => {
      void supabase.from("meal_completion_logs").select("meal_id,done").eq("scheduled_date", dateISO).then(({ data, error }) => {
        if (!active || error) return;
        setDone(Object.fromEntries((data ?? []).map(row => [row.meal_id, row.done])));
      });
    };
    sync();
    const interval = setInterval(sync, 30_000);
    const onStorage = (event: StorageEvent) => { if (event.key === DONE_KEY) sync(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DONE_EVENT, sync);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DONE_EVENT, sync);
    };
  }, [dateISO]);

  const toggle = async (id: string) => {
    const next = !done[id];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("meal_completion_logs").upsert({ user_id: user.id, meal_id: id, scheduled_date: dateISO, done: next, updated_at: new Date().toISOString() });
    if (error) { toast.error("Couldn't save meal check-off"); return; }
    setDone(previous => ({ ...previous, [id]: next }));
    writeDone({ ...readDone(), [id]: next });
  };

  return { done, toggle };
}