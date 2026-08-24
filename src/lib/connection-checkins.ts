/**
 * Check-in history: a timestamped log of who you reached and when, written when
 * a "People to reach" task is completed.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PersonKind } from "@/lib/people-directory";

export interface ConnectionCheckin {
  id: string;
  personId: string;
  personKind: PersonKind;
  personName?: string;
  taskId?: string;
  note?: string;
  checkedInAt: string;
}

const EVENT = "careflow:connection-checkins-changed";

function fromRow(r: any): ConnectionCheckin {
  return {
    id: r.id,
    personId: r.person_id,
    personKind: (r.person_kind ?? "recipient") as PersonKind,
    personName: r.person_name ?? undefined,
    taskId: r.task_id ?? undefined,
    note: r.note ?? undefined,
    checkedInAt: r.checked_in_at,
  };
}

export async function listCheckins(limit = 40): Promise<ConnectionCheckin[]> {
  const { data, error } = await (supabase as any)
    .from("connection_checkins").select("*")
    .order("checked_in_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function recordCheckin(input: {
  personId: string; personKind: PersonKind; personName?: string; taskId?: string; note?: string;
}): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return;
  const { error } = await (supabase as any).from("connection_checkins").insert({
    user_id: uid,
    person_id: input.personId,
    person_kind: input.personKind,
    person_name: input.personName ?? null,
    task_id: input.taskId ?? null,
    note: input.note ?? null,
  });
  if (error) throw error;
  try { window.dispatchEvent(new CustomEvent(EVENT)); } catch { /* noop */ }
}

export function useCheckins(limit = 40) {
  const [rows, setRows] = useState<ConnectionCheckin[]>([]);

  const reload = useCallback(() => {
    listCheckins(limit).then(setRows).catch(() => setRows([]));
  }, [limit]);

  useEffect(() => {
    reload();
    const on = () => reload();
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [reload]);

  return { checkins: rows, reload };
}

/** Most recent check-in timestamp per person id. */
export function lastReachedMap(rows: ConnectionCheckin[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) if (!out[r.personId]) out[r.personId] = r.checkedInAt;
  return out;
}

/** Whole days since a timestamp, or null when never. */
export function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}
