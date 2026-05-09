import { useEffect, useState } from "react";

export interface PomodoroPrefs {
  sound: boolean;
  flash: boolean;
  toast: boolean;
}

const DEFAULTS: PomodoroPrefs = { sound: true, flash: true, toast: true };
const STORAGE_KEY = "careflow:pomodoro:prefs:v1";

function load(): PomodoroPrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PomodoroPrefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}

let state: PomodoroPrefs = load();
const listeners = new Set<(s: PomodoroPrefs) => void>();

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
}

export const pomodoroPrefs = {
  get(): PomodoroPrefs { return state; },
  set(patch: Partial<PomodoroPrefs>) {
    state = { ...state, ...patch };
    persist();
    listeners.forEach(l => l(state));
  },
};

export function usePomodoroPrefs(): PomodoroPrefs {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); return () => { listeners.delete(setS); }; }, []);
  return s;
}
