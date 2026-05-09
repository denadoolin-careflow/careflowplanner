import { useEffect, useState } from "react";
import type { Area } from "./types";
import { POMODORO_TEMPLATES } from "./pomodoro-store";

const STORAGE_KEY = "careflow:pomodoro:defaults:v1";

/** Built-in suggestions; users can override via Settings. */
const SEED: Partial<Record<Area, string>> = {
  Home: "cleaning",
  Kids: "homework",
  Caregiving: "reset",
  "Creative Projects": "deep",
  Personal: "selfcare",
};

export type AreaTemplateMap = Partial<Record<Area, string>>;

function load(): AreaTemplateMap {
  if (typeof localStorage === "undefined") return { ...SEED };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...SEED };
    return { ...SEED, ...(JSON.parse(raw) as AreaTemplateMap) };
  } catch {
    return { ...SEED };
  }
}

let state: AreaTemplateMap = load();
const listeners = new Set<(s: AreaTemplateMap) => void>();

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
}
function emit() { listeners.forEach(l => l(state)); }

export const pomodoroDefaults = {
  get(): AreaTemplateMap { return state; },
  set(area: Area, templateId: string | null) {
    const next = { ...state };
    if (!templateId) delete next[area];
    else next[area] = templateId;
    state = next;
    persist();
    emit();
  },
  /** Resolve template options for a task area, or undefined if none mapped. */
  resolve(area?: Area) {
    if (!area) return undefined;
    const id = state[area];
    if (!id) return undefined;
    const tpl = POMODORO_TEMPLATES.find(t => t.id === id);
    if (!tpl) return undefined;
    return {
      focusSeconds: tpl.focusSeconds,
      breakSeconds: tpl.breakSeconds,
      templateId: tpl.id,
      templateLabel: tpl.label,
    };
  },
};

export function usePomodoroDefaults(): AreaTemplateMap {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); return () => { listeners.delete(setS); }; }, []);
  return s;
}
