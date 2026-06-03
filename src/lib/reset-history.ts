import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ResetHistoryRow {
  id: string;
  checklist_id: string | null;
  item_id: string | null;
  title: string;
  kind: string | null;
  est_minutes: number | null;
  duration_seconds: number | null;
  completed_at: string;
}

export async function logResetCompletion(input: {
  checklist_id: string | null;
  item_id: string | null;
  title: string;
  kind?: string | null;
  est_minutes?: number | null;
  duration_seconds?: number | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("reset_history").insert({
    user_id: u.user.id,
    checklist_id: input.checklist_id,
    item_id: input.item_id,
    title: input.title,
    kind: input.kind ?? null,
    est_minutes: input.est_minutes ?? null,
    duration_seconds: input.duration_seconds ?? null,
  });
}

export function useResetHistory(days = 7) {
  const [rows, setRows] = useState<ResetHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("reset_history")
      .select("*")
      .gte("completed_at", since)
      .order("completed_at", { ascending: false })
      .limit(200);
    setRows((data as ResetHistoryRow[]) ?? []);
    setLoading(false);
  }, [days]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { rows, loading, refresh };
}