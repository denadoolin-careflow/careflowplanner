/**
 * Bridge between the Pomodoro session and the real-time task tracker so a
 * focus block and its tracked time are one thing, not two timers.
 * Focus periods accrue tracked time; breaks do not.
 */
import { useEffect, useState } from "react";
import { pomodoro, subscribePomodoro, type PomodoroSession } from "@/lib/pomodoro-store";
import { timeTracker, subscribeTimer, type ActiveTimer } from "@/lib/time-tracking";

export interface PomodoroSyncPrefs {
  /** Focus sessions drive the time tracker. */
  trackFocus: boolean;
  /** Starting the tracker also starts a matching pomodoro. */
  startPomodoroWithTracker: boolean;
}

const KEY = "careflow:pomodoro-tracking:v1";
const DEFAULTS: PomodoroSyncPrefs = { trackFocus: true, startPomodoroWithTracker: true };
const prefListeners = new Set<(p: PomodoroSyncPrefs) => void>();

function read(): PomodoroSyncPrefs {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PomodoroSyncPrefs>) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

let prefs = read();

export function setPomodoroSyncPrefs(patch: Partial<PomodoroSyncPrefs>) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* noop */ }
  prefListeners.forEach(l => l(prefs));
}

export function usePomodoroSyncPrefs(): [PomodoroSyncPrefs, (p: Partial<PomodoroSyncPrefs>) => void] {
  const [p, setP] = useState(prefs);
  useEffect(() => { prefListeners.add(setP); return () => { prefListeners.delete(setP); }; }, []);
  return [p, setPomodoroSyncPrefs];
}

let started = false;
/** Guard so each side's reaction doesn't bounce back into the other. */
let syncing = false;

const withGuard = async (fn: () => void | Promise<void>) => {
  if (syncing) return;
  syncing = true;
  try { await fn(); } finally { syncing = false; }
};

function onPomodoro(s: PomodoroSession) {
  if (!prefs.trackFocus) return;
  const t = timeTracker.get();
  void withGuard(async () => {
    const focusing = !!s.taskId && s.mode === "focus" && s.running;
    if (focusing) {
      if (t.taskId !== s.taskId) {
        await timeTracker.start({ id: s.taskId, title: s.taskTitle || "Focus session" });
      } else if (!t.startedAt) {
        timeTracker.resume();
      }
      return;
    }
    // Break, pause or stop — bank whatever ran.
    if (t.startedAt && (!s.taskId || t.taskId === s.taskId)) await timeTracker.pause();
  });
}

function onTimer(t: ActiveTimer) {
  if (!prefs.startPomodoroWithTracker) return;
  const s = pomodoro.get();
  void withGuard(() => {
    if (t.startedAt && t.taskId) {
      if (s.taskId !== t.taskId || !s.running || s.mode !== "focus") {
        pomodoro.startForTask({ id: t.taskId, title: t.title } as any);
      }
      return;
    }
    if (!t.startedAt && s.running && s.mode === "focus" && s.taskId === t.taskId) pomodoro.pause();
  });
}

/** Mount once in the app shell. */
export function initPomodoroTracking() {
  if (started || typeof window === "undefined") return;
  started = true;
  subscribePomodoro(onPomodoro);
  subscribeTimer(onTimer);
  onPomodoro(pomodoro.get());
}
