import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceItem {
  id: string;
  title: string;
  category: string | null;
  interval_months: number | null;
  next_due: string | null;
  last_done: string | null;
  notes: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

function computeNextDue(intervalMonths: number | null | undefined, from?: string): string | null {
  if (!intervalMonths) return null;
  const base = from ? new Date(from) : new Date();
  base.setMonth(base.getMonth() + Number(intervalMonths));
  return base.toISOString().slice(0, 10);
}

export function useHomeMaintenance() {
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const { data } = await supabase
      .from("home_maintenance")
      .select("*")
      .eq("user_id", uid)
      .order("next_due", { nullsFirst: false });
    setItems((data ?? []) as MaintenanceItem[]);
    setLoading(false);
  }, [uid]);

  useEffect(() => { if (uid) void load(); }, [uid, load]);

  const add = useCallback(async (
    patch: Partial<Pick<MaintenanceItem, "title" | "category" | "interval_months" | "next_due" | "notes">>,
  ) => {
    if (!uid || !patch.title) return;
    const nextDue = patch.next_due ?? computeNextDue(patch.interval_months ?? null);
    const { error } = await supabase.from("home_maintenance").insert({
      user_id: uid,
      title: patch.title,
      category: patch.category ?? null,
      interval_months: patch.interval_months ?? null,
      next_due: nextDue,
      notes: patch.notes ?? null,
    });
    if (!error) await load();
    return error;
  }, [uid, load]);

  const update = useCallback(async (id: string, patch: Partial<MaintenanceItem>) => {
    await supabase.from("home_maintenance").update(patch).eq("id", id);
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("home_maintenance").delete().eq("id", id);
    await load();
  }, [load]);

  const markDone = useCallback(async (item: MaintenanceItem) => {
    const now = today();
    const next = computeNextDue(item.interval_months, now);
    await supabase.from("home_maintenance").update({ last_done: now, next_due: next }).eq("id", item.id);
    await load();
  }, [load]);

  return { uid, items, loading, load, add, update, remove, markDone };
}

export type MaintenanceBucket = "overdue" | "due_soon" | "upcoming" | "unscheduled";

export function bucketOf(item: MaintenanceItem, refDate = new Date()): MaintenanceBucket {
  if (!item.next_due) return "unscheduled";
  const due = new Date(item.next_due + "T00:00:00");
  const diffDays = Math.round((due.getTime() - refDate.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "due_soon";
  return "upcoming";
}

export const BUCKET_LABEL: Record<MaintenanceBucket, string> = {
  overdue: "Overdue",
  due_soon: "Due soon (next 30 days)",
  upcoming: "Upcoming",
  unscheduled: "No schedule",
};