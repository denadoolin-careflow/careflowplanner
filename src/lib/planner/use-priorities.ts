/**
 * Top Priorities for a planner period (day / week / month).
 * Rows live in `planner_priorities`, owner-scoped. A tiny module-level
 * cache + event bus keeps every mounted strip / card in sync instantly.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type PriorityScope = "day" | "week" | "month";
export const MAX_PRIORITIES = 3;

export interface PriorityRow {
  id: string;
  period_kind: PriorityScope;
  period_start: string;
  item_type: string;
  item_id: string;
  item_title: string;
  position: number;
}

export function periodStartFor(scope: PriorityScope, date: Date): string {
  const d =
    scope === "week" ? startOfWeek(date, { weekStartsOn: 1 })
      : scope === "month" ? startOfMonth(date)
        : date;
  return format(d, "yyyy-MM-dd");
}

export const SCOPE_LABEL: Record<PriorityScope, string> = {
  day: "Top 3 today",
  week: "Top 3 this week",
  month: "Top 3 this month",
};

const cache = new Map<string, PriorityRow[]>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const keyOf = (scope: PriorityScope, start: string) => `${scope}:${start}`;

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

async function refresh(scope: PriorityScope, start: string) {
  const user = await uid();
  if (!user) return;
  const { data } = await supabase
    .from("planner_priorities")
    .select("id, period_kind, period_start, item_type, item_id, item_title, position")
    .eq("user_id", user)
    .eq("period_kind", scope)
    .eq("period_start", start)
    .order("position", { ascending: true });
  cache.set(keyOf(scope, start), ((data ?? []) as any[]).map(r => ({ ...r, period_kind: r.period_kind as PriorityScope })));
  notify();
}

export function usePriorities(date: Date, scope: PriorityScope) {
  const start = useMemo(() => periodStartFor(scope, date), [scope, date]);
  const key = keyOf(scope, start);
  const [, setTick] = useState(0);

  useEffect(() => {
    const l = () => setTick(t => t + 1);
    listeners.add(l);
    void refresh(scope, start);
    return () => { listeners.delete(l); };
  }, [scope, start]);

  const items = cache.get(key) ?? [];

  const pin = useCallback(async (item: { type: string; id: string; title: string }) => {
    const user = await uid();
    if (!user) return false;
    const current = cache.get(key) ?? [];
    if (current.length >= MAX_PRIORITIES) return false;
    if (current.some(r => r.item_type === item.type && r.item_id === item.id)) return true;
    await supabase.from("planner_priorities").insert({
      user_id: user,
      period_kind: scope,
      period_start: start,
      item_type: item.type,
      item_id: item.id,
      item_title: item.title,
      position: current.length,
    });
    await refresh(scope, start);
    return true;
  }, [key, scope, start]);

  const unpin = useCallback(async (rowId: string) => {
    await supabase.from("planner_priorities").delete().eq("id", rowId);
    const next = (cache.get(key) ?? []).filter(r => r.id !== rowId);
    cache.set(key, next);
    notify();
    void refresh(scope, start);
  }, [key, scope, start]);

  const unpinItem = useCallback(async (type: string, id: string) => {
    const row = (cache.get(key) ?? []).find(r => r.item_type === type && r.item_id === id);
    if (row) await unpin(row.id);
  }, [key, unpin]);

  const isPinned = useCallback(
    (type: string, id: string) => (cache.get(key) ?? []).some(r => r.item_type === type && r.item_id === id),
    [key],
  );

  return { items, start, pin, unpin, unpinItem, isPinned, full: items.length >= MAX_PRIORITIES };
}

/** Pin/unpin from anywhere (e.g. card menus) without mounting the hook. */
export async function togglePriority(
  scope: PriorityScope,
  date: Date,
  item: { type: string; id: string; title: string },
) {
  const start = periodStartFor(scope, date);
  const user = await uid();
  if (!user) return;
  await refresh(scope, start);
  const rows = cache.get(keyOf(scope, start)) ?? [];
  const existing = rows.find(r => r.item_type === item.type && r.item_id === item.id);
  if (existing) await supabase.from("planner_priorities").delete().eq("id", existing.id);
  else if (rows.length < MAX_PRIORITIES) {
    await supabase.from("planner_priorities").insert({
      user_id: user, period_kind: scope, period_start: start,
      item_type: item.type, item_id: item.id, item_title: item.title, position: rows.length,
    });
  }
  await refresh(scope, start);
}
