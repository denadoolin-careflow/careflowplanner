import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PomodoroHistoryRow {
  id: string;
  completed_at: string;
  template_id: string | null;
  template_label: string | null;
  task_id: string | null;
  task_title: string | null;
  focus_seconds: number;
  meal_name?: string | null;
}

export interface PomodoroAggregate {
  key: string;
  label: string;
  count: number;
  totalSeconds: number;
}

export interface PomodoroHistoryStats {
  total: number;
  totalSeconds: number;
  byTemplate: PomodoroAggregate[];
  byTask: PomodoroAggregate[];
}

/* ---------- live cache + listeners ---------- */
let cache: PomodoroHistoryRow[] = [];
const listeners = new Set<(rows: PomodoroHistoryRow[]) => void>();
let loaded = false;
let loading: Promise<void> | null = null;

async function fetchAll() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { cache = []; loaded = true; emit(); return; }
  const { data } = await supabase
    .from("pomodoro_sessions" as any)
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(500);
  cache = (data ?? []) as unknown as PomodoroHistoryRow[];
  loaded = true;
  emit();
}

function emit() { listeners.forEach(l => l(cache)); }
function ensureLoaded() {
  if (loaded || loading) return loading;
  loading = fetchAll().finally(() => { loading = null; });
  return loading;
}

/* ---------- public API ---------- */
export const pomodoroHistory = {
  /** Record one completed focus sprint. Safe to call without await. */
  async record(entry: {
    templateId?: string | null;
    templateLabel?: string | null;
    taskId?: string | null;
    taskTitle?: string | null;
    focusSeconds: number;
    mealName?: string | null;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const row = {
      user_id: user.id,
      template_id: entry.templateId ?? null,
      template_label: entry.templateLabel ?? null,
      task_id: entry.taskId ?? null,
      task_title: entry.taskTitle ?? null,
      focus_seconds: Math.round(entry.focusSeconds),
      meal_name: entry.mealName ?? null,
    };
    const { data } = await supabase
      .from("pomodoro_sessions" as any)
      .insert(row as any)
      .select()
      .single();
    if (data) {
      cache = [data as unknown as PomodoroHistoryRow, ...cache];
      emit();
    }
  },
  list(): PomodoroHistoryRow[] { return cache; },
};

/* ---------- React hook ---------- */
export function usePomodoroHistory(): { rows: PomodoroHistoryRow[]; stats: PomodoroHistoryStats; loaded: boolean } {
  const [rows, setRows] = useState(cache);
  const [isLoaded, setIsLoaded] = useState(loaded);
  useEffect(() => {
    listeners.add(setRows);
    void ensureLoaded()?.then(() => setIsLoaded(true));
    if (loaded) setIsLoaded(true);
    return () => { listeners.delete(setRows); };
  }, []);

  const stats = computeStats(rows);
  return { rows, stats, loaded: isLoaded };
}

function computeStats(rows: PomodoroHistoryRow[]): PomodoroHistoryStats {
  const byTemplate = new Map<string, PomodoroAggregate>();
  const byTask = new Map<string, PomodoroAggregate>();
  let totalSeconds = 0;

  for (const r of rows) {
    totalSeconds += r.focus_seconds;
    const tplKey = r.template_id ?? "__none__";
    const tplLabel = r.template_label ?? "Custom session";
    const tplAgg = byTemplate.get(tplKey) ?? { key: tplKey, label: tplLabel, count: 0, totalSeconds: 0 };
    tplAgg.count += 1;
    tplAgg.totalSeconds += r.focus_seconds;
    byTemplate.set(tplKey, tplAgg);

    const taskKey = r.task_id ?? `title:${r.task_title ?? "Freeform"}`;
    const taskLabel = r.task_title ?? "Freeform session";
    const taskAgg = byTask.get(taskKey) ?? { key: taskKey, label: taskLabel, count: 0, totalSeconds: 0 };
    taskAgg.count += 1;
    taskAgg.totalSeconds += r.focus_seconds;
    byTask.set(taskKey, taskAgg);
  }

  const sortByCount = (a: PomodoroAggregate, b: PomodoroAggregate) => b.count - a.count;

  return {
    total: rows.length,
    totalSeconds,
    byTemplate: [...byTemplate.values()].sort(sortByCount),
    byTask: [...byTask.values()].sort(sortByCount),
  };
}
