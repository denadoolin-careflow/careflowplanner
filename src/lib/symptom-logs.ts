/**
 * Symptom + capacity logging. One row per observation, optionally attached to
 * a care recipient — no recipient means it is your own.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SymptomLog {
  id: string;
  logged_at: string;
  symptom: string;
  severity: number;      // 1..5
  capacity: number | null; // 1..5
  note: string | null;
  recipient_id: string | null;
}

export interface SymptomDraft {
  symptom: string;
  severity: number;
  capacity?: number | null;
  note?: string | null;
  recipient_id?: string | null;
  logged_at?: string;
}

function map(r: any): SymptomLog {
  return {
    id: r.id,
    logged_at: r.logged_at,
    symptom: r.symptom,
    severity: Number(r.severity) || 1,
    capacity: r.capacity ?? null,
    note: r.note ?? null,
    recipient_id: r.recipient_id ?? null,
  };
}

/** Logs from the last `days` days, newest first. */
export function useSymptomLogs(days = 14) {
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data } = await supabase.from("symptom_logs")
      .select("*").gte("logged_at", since).order("logged_at", { ascending: false });
    setLogs((data ?? []).map(map));
    setLoading(false);
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (draft: SymptomDraft) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("symptom_logs").insert({
      user_id: user.id,
      symptom: draft.symptom,
      severity: draft.severity,
      capacity: draft.capacity ?? null,
      note: draft.note ?? null,
      recipient_id: draft.recipient_id ?? null,
      ...(draft.logged_at ? { logged_at: draft.logged_at } : {}),
    } as any);
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setLogs(l => l.filter(x => x.id !== id));
    await supabase.from("symptom_logs").delete().eq("id", id);
  }, []);

  return { logs, loading, add, remove, reload: load };
}

/** Daily averages for a sparkline — oldest → newest, `null` where nothing logged. */
export function dailySeries(
  logs: SymptomLog[],
  field: "severity" | "capacity",
  days = 14,
): { date: string; value: number | null }[] {
  const out: { date: string; value: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const day = logs.filter(l => l.logged_at.slice(0, 10) === d && l[field] != null);
    out.push({
      date: d,
      value: day.length ? day.reduce((n, l) => n + (l[field] as number), 0) / day.length : null,
    });
  }
  return out;
}
