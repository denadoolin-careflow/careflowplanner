/**
 * Real-time task time tracking: a single running timer (persisted across
 * reloads and tabs) plus the logged segments it writes to the backend.
 * Each start/stop pair becomes one row in `task_time_entries`, so actual
 * time can be compared against a task's allocated `estMinutes`.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveTimer {
  taskId: string | null;
  title: string;
  /** epoch ms when the current running segment started; null when paused. */
  startedAt: number | null;
  /** seconds banked from earlier segments of this sitting. */
  accumulated: number;
  estMinutes?: number | null;
  activity?: string | null;
  area?: string | null;
}

export interface TimeEntry {
  id: string;
  task_id: string | null;
  task_title: string;
  day: string;
  started_at: string;
  ended_at: string | null;
  seconds: number;
  est_minutes: number | null;
  activity: string | null;
  area: string | null;
}

const KEY = "careflow:time-tracker:v1";
const EVT = "careflow:time-tracker";

const empty: ActiveTimer = { taskId: null, title: "", startedAt: null, accumulated: 0 };

function read(): ActiveTimer {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as ActiveTimer) } : { ...empty };
  } catch { return { ...empty }; }
}

let active: ActiveTimer = typeof localStorage === "undefined" ? { ...empty } : read();
const listeners = new Set<(t: ActiveTimer) => void>();

function write(next: ActiveTimer) {
  active = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  listeners.forEach(l => l(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    active = read();
    listeners.forEach(l => l(active));
  });
}

/** Seconds elapsed for a timer, including the live running segment. */
export function elapsedSeconds(t: ActiveTimer, now = Date.now()): number {
  return t.accumulated + (t.startedAt ? Math.max(0, Math.floor((now - t.startedAt) / 1000)) : 0);
}

const entryListeners = new Set<() => void>();
const notifyEntries = () => entryListeners.forEach(l => l());

async function logSegment(t: ActiveTimer, endedAt: number) {
  if (!t.startedAt) return;
  const seconds = Math.max(0, Math.floor((endedAt - t.startedAt) / 1000));
  if (seconds < 5) return; // ignore accidental taps
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const started = new Date(t.startedAt);
  try {
  await supabase.from("task_time_entries" as any).insert({
    user_id: user.id,
    task_id: t.taskId,
    task_title: t.title,
    day: `${started.getFullYear()}-${String(started.getMonth() + 1).padStart(2, "0")}-${String(started.getDate()).padStart(2, "0")}`,
    started_at: started.toISOString(),
    ended_at: new Date(endedAt).toISOString(),
    seconds,
    est_minutes: t.estMinutes ?? null,
    activity: t.activity ?? null,
    area: t.area ?? null,
  } as any);
  } catch { /* offline: keep the local timer state */ }
  notifyEntries();
}

export const timeTracker = {
  get(): ActiveTimer { return active; },

  async start(task: { id?: string | null; title: string; estMinutes?: number | null; activity?: string | null; area?: string | null }) {
    // Switching tasks closes out the current one first.
    if (active.startedAt) await logSegment(active, Date.now());
    write({
      taskId: task.id ?? null,
      title: task.title,
      startedAt: Date.now(),
      accumulated: active.taskId && active.taskId === (task.id ?? null) ? active.accumulated : 0,
      estMinutes: task.estMinutes ?? null,
      activity: task.activity ?? null,
      area: task.area ?? null,
    });
  },

  async pause() {
    if (!active.startedAt) return;
    const now = Date.now();
    const banked = active.accumulated + Math.floor((now - active.startedAt) / 1000);
    await logSegment(active, now);
    write({ ...active, startedAt: null, accumulated: banked });
  },

  resume() {
    if (active.startedAt || !active.title) return;
    write({ ...active, startedAt: Date.now() });
  },

  async stop() {
    if (active.startedAt) await logSegment(active, Date.now());
    write({ ...empty });
    notifyEntries();
  },
};

/** Live timer state; re-renders once a second while running. */
export function useActiveTimer() {
  const [t, setT] = useState<ActiveTimer>(active);
  const [, setTick] = useState(0);
  useEffect(() => {
    listeners.add(setT);
    return () => { listeners.delete(setT); };
  }, []);
  useEffect(() => {
    if (!t.startedAt) return;
    const id = window.setInterval(() => setTick(n => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [t.startedAt]);
  return { timer: t, elapsed: elapsedSeconds(t), running: !!t.startedAt };
}

/** Logged entries for the last `days` days (default today only when 1). */
export function useTimeEntries(days = 7) {
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const since = new Date();
      since.setDate(since.getDate() - (days - 1));
      const day = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
      try {
        const { data } = await supabase
          .from("task_time_entries" as any)
          .select("*")
          .gte("day", day)
          .order("started_at", { ascending: false });
        if (!alive) return;
        setRows((data ?? []) as unknown as TimeEntry[]);
      } catch {
        if (!alive) return;
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const relisten = () => { void load(); };
    entryListeners.add(relisten);
    return () => { alive = false; entryListeners.delete(relisten); };
  }, [days]);

  return { rows, loading };
}

/** Subscribe to active-timer changes (outside React). */
export function subscribeTimer(cb: (t: ActiveTimer) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Re-run a callback whenever a tracked segment is written. */
export function subscribeTimeEntries(cb: () => void): () => void {
  entryListeners.add(cb);
  return () => { entryListeners.delete(cb); };
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
