import { useEffect, useState } from "react";
import type { Task } from "./types";

export type PomodoroMode = "focus" | "break";
export const FOCUS_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;

export interface PomodoroSession {
  taskId: string | null;
  taskTitle: string;
  mode: PomodoroMode;
  remaining: number;
  running: boolean;
  completed: number;
  startedAt: number | null;
}

const initial: PomodoroSession = {
  taskId: null,
  taskTitle: "",
  mode: "focus",
  remaining: FOCUS_SECONDS,
  running: false,
  completed: 0,
  startedAt: null,
};

const STORAGE_KEY = "careflow:pomodoro:v1";

/** Load + fast-forward any persisted session to account for time spent away. */
function hydrate(): PomodoroSession {
  if (typeof localStorage === "undefined") return { ...initial };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...initial };
    const saved = JSON.parse(raw) as Partial<PomodoroSession> & { savedAt?: number };
    const base: PomodoroSession = { ...initial, ...saved };
    // No active task → nothing to restore.
    if (!base.taskId) return { ...initial };

    if (base.running && saved.savedAt) {
      let elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);
      let mode = base.mode;
      let remaining = base.remaining;
      let completed = base.completed;
      let running = true;

      // Walk through any session boundaries that elapsed while away.
      while (elapsed >= remaining) {
        elapsed -= remaining;
        if (mode === "focus") {
          completed += 1;
          mode = "break";
          remaining = BREAK_SECONDS;
        } else {
          mode = "focus";
          remaining = FOCUS_SECONDS;
          running = false; // breaks end paused, matching live behavior
          elapsed = 0;
          break;
        }
      }
      remaining -= elapsed;
      return { ...base, mode, remaining, completed, running };
    }
    return base;
  } catch {
    return { ...initial };
  }
}

let state: PomodoroSession = hydrate();
const listeners = new Set<(s: PomodoroSession) => void>();
let interval: number | null = null;
let onTickEvent: ((mode: PomodoroMode) => void) | null = null;

function persist() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch { /* noop */ }
}

function emit() { listeners.forEach(l => l(state)); }
function set(next: Partial<PomodoroSession>) { state = { ...state, ...next }; persist(); emit(); }

function ensureLoop() {
  if (interval !== null) return;
  interval = window.setInterval(() => {
    if (!state.running) return;
    if (state.remaining <= 1) {
      // session boundary
      if (state.mode === "focus") {
        const completed = state.completed + 1;
        set({ mode: "break", remaining: BREAK_SECONDS, completed });
        onTickEvent?.("focus");
      } else {
        set({ mode: "focus", remaining: FOCUS_SECONDS, running: false });
        onTickEvent?.("break");
      }
    } else {
      set({ remaining: state.remaining - 1 });
    }
  }, 1000);
}

// If we hydrated into a running state, resume the tick loop immediately.
if (typeof window !== "undefined" && state.taskId && state.running) {
  ensureLoop();
}

// Cross-tab sync: if another tab updates the session, mirror it here.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const saved = JSON.parse(e.newValue) as PomodoroSession;
      state = { ...initial, ...saved };
      if (state.running) ensureLoop();
      emit();
    } catch { /* noop */ }
  });
}

export const pomodoro = {
  get(): PomodoroSession { return state; },
  startForTask(task: Pick<Task, "id" | "title">) {
    ensureLoop();
    if (state.taskId === task.id) {
      set({ running: true, startedAt: Date.now() });
    } else {
      set({
        taskId: task.id,
        taskTitle: task.title,
        mode: "focus",
        remaining: FOCUS_SECONDS,
        running: true,
        completed: 0,
        startedAt: Date.now(),
      });
    }
  },
  pause() { set({ running: false }); },
  resume() { ensureLoop(); set({ running: true }); },
  toggle() { state.running ? pomodoro.pause() : pomodoro.resume(); },
  reset() {
    const total = state.mode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
    set({ remaining: total, running: false });
  },
  switchMode() {
    const next: PomodoroMode = state.mode === "focus" ? "break" : "focus";
    set({ mode: next, remaining: next === "focus" ? FOCUS_SECONDS : BREAK_SECONDS, running: false });
  },
  stop() {
    state = { ...initial };
    if (typeof localStorage !== "undefined") {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    }
    emit();
  },
  setOnSessionEnd(fn: ((mode: PomodoroMode) => void) | null) { onTickEvent = fn; },
};

export function usePomodoro(): PomodoroSession {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); return () => { listeners.delete(setS); }; }, []);
  return s;
}

export function formatPomoTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export function pomoTotal(mode: PomodoroMode) {
  return mode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
}
