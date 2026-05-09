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

let state: PomodoroSession = initial;
const listeners = new Set<(s: PomodoroSession) => void>();
let interval: number | null = null;
let onTickEvent: ((mode: PomodoroMode) => void) | null = null;

function emit() { listeners.forEach(l => l(state)); }
function set(next: Partial<PomodoroSession>) { state = { ...state, ...next }; emit(); }

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
  stop() { set({ ...initial }); },
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
