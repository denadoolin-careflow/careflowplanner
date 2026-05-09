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
  /** Per-session focus length (sec). Defaults to FOCUS_SECONDS. */
  focusSeconds: number;
  /** Per-session break length (sec). Defaults to BREAK_SECONDS. */
  breakSeconds: number;
  /** Optional template id, e.g. "cleaning". */
  templateId?: string | null;
  /** Friendly template label shown in UI. */
  templateLabel?: string | null;
}

const initial: PomodoroSession = {
  taskId: null,
  taskTitle: "",
  mode: "focus",
  remaining: FOCUS_SECONDS,
  running: false,
  completed: 0,
  startedAt: null,
  focusSeconds: FOCUS_SECONDS,
  breakSeconds: BREAK_SECONDS,
  templateId: null,
  templateLabel: null,
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
          remaining = base.breakSeconds;
        } else {
          mode = "focus";
          remaining = base.focusSeconds;
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
        set({ mode: "break", remaining: state.breakSeconds, completed });
        onTickEvent?.("focus");
      } else {
        set({ mode: "focus", remaining: state.focusSeconds, running: false });
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
  startForTask(
    task: Pick<Task, "id" | "title">,
    opts?: { focusSeconds?: number; breakSeconds?: number; templateId?: string; templateLabel?: string },
  ) {
    ensureLoop();
    const focusSeconds = opts?.focusSeconds ?? FOCUS_SECONDS;
    const breakSeconds = opts?.breakSeconds ?? BREAK_SECONDS;
    if (state.taskId === task.id) {
      // If template/durations changed, reset cycle to the new focus length.
      if (opts && (focusSeconds !== state.focusSeconds || breakSeconds !== state.breakSeconds)) {
        set({
          mode: "focus",
          remaining: focusSeconds,
          running: true,
          startedAt: Date.now(),
          focusSeconds,
          breakSeconds,
          templateId: opts.templateId ?? null,
          templateLabel: opts.templateLabel ?? null,
        });
      } else {
        set({ running: true, startedAt: Date.now() });
      }
    } else {
      set({
        taskId: task.id,
        taskTitle: task.title,
        mode: "focus",
        remaining: focusSeconds,
        running: true,
        completed: 0,
        startedAt: Date.now(),
        focusSeconds,
        breakSeconds,
        templateId: opts?.templateId ?? null,
        templateLabel: opts?.templateLabel ?? null,
      });
    }
  },
  /** Quick-start a generic session (no task) with a template. */
  startTemplate(opts: { label: string; focusSeconds: number; breakSeconds: number; templateId: string }) {
    pomodoro.startForTask(
      { id: `tpl:${opts.templateId}:${Date.now()}`, title: opts.label },
      { focusSeconds: opts.focusSeconds, breakSeconds: opts.breakSeconds, templateId: opts.templateId, templateLabel: opts.label },
    );
  },
  pause() { set({ running: false }); },
  resume() { ensureLoop(); set({ running: true }); },
  toggle() { state.running ? pomodoro.pause() : pomodoro.resume(); },
  reset() {
    const total = state.mode === "focus" ? state.focusSeconds : state.breakSeconds;
    set({ remaining: total, running: false });
  },
  switchMode() {
    const next: PomodoroMode = state.mode === "focus" ? "break" : "focus";
    set({ mode: next, remaining: next === "focus" ? state.focusSeconds : state.breakSeconds, running: false });
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

export function pomoTotal(mode: PomodoroMode, session?: PomodoroSession) {
  const s = session ?? state;
  return mode === "focus" ? s.focusSeconds : s.breakSeconds;
}

/* ---------------- Templates ---------------- */
export interface PomodoroTemplate {
  id: string;
  label: string;
  description: string;
  focusSeconds: number;
  breakSeconds: number;
  /** lucide icon name resolved by the consumer */
  icon: "Sparkles" | "BookOpen" | "Home" | "Brain" | "Heart" | "Coffee";
}

export const POMODORO_TEMPLATES: PomodoroTemplate[] = [
  { id: "cleaning", label: "Cleaning sprint", description: "15 on · 5 off", focusSeconds: 15 * 60, breakSeconds: 5 * 60, icon: "Sparkles" },
  { id: "homework", label: "Homework help",   description: "20 on · 5 off", focusSeconds: 20 * 60, breakSeconds: 5 * 60, icon: "BookOpen" },
  { id: "reset",    label: "Home reset",      description: "10 on · 3 off", focusSeconds: 10 * 60, breakSeconds: 3 * 60, icon: "Home" },
  { id: "deep",     label: "Deep focus",      description: "50 on · 10 off",focusSeconds: 50 * 60, breakSeconds: 10 * 60, icon: "Brain" },
  { id: "selfcare", label: "Soft self-care",  description: "5 on · 5 off",  focusSeconds: 5 * 60,  breakSeconds: 5 * 60,  icon: "Heart" },
  { id: "classic",  label: "Classic 25",      description: "25 on · 5 off", focusSeconds: 25 * 60, breakSeconds: 5 * 60,  icon: "Coffee" },
];
