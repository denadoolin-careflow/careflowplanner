import { useEffect, useState } from "react";
import { POMODORO_TEMPLATES as BUILTIN, type PomodoroTemplate } from "./pomodoro-store";

export type TemplateIcon = PomodoroTemplate["icon"];
export const TEMPLATE_ICONS: TemplateIcon[] = [
  "Sparkles", "BookOpen", "Home", "Brain", "Heart", "Coffee",
];

export interface CustomTemplate extends PomodoroTemplate {
  /** True if this entry is a built-in (id matches a built-in). */
  builtin?: boolean;
}

const STORAGE_KEY = "careflow:pomodoro:templates:v1";

interface Stored {
  /** Per-id overrides for built-in templates (label/desc/durations/icon). */
  overrides: Record<string, Partial<Omit<PomodoroTemplate, "id">>>;
  /** Fully user-defined templates. */
  custom: PomodoroTemplate[];
  /** Built-in ids the user has hidden. */
  hidden: string[];
}

const EMPTY: Stored = { overrides: {}, custom: [], hidden: [] };

function load(): Stored {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      overrides: parsed.overrides ?? {},
      custom: parsed.custom ?? [],
      hidden: parsed.hidden ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

let store: Stored = load();
const listeners = new Set<(t: CustomTemplate[]) => void>();

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* noop */ }
}

function describe(focusSeconds: number, breakSeconds: number) {
  const f = Math.round(focusSeconds / 60);
  const b = Math.round(breakSeconds / 60);
  return `${f} on · ${b} off`;
}

function compute(): CustomTemplate[] {
  const builtins = BUILTIN
    .filter(t => !store.hidden.includes(t.id))
    .map<CustomTemplate>(t => {
      const o = store.overrides[t.id];
      const merged: PomodoroTemplate = o ? { ...t, ...o } : t;
      // keep description in sync if user changed durations but not description
      if (o && (o.focusSeconds || o.breakSeconds) && !o.description) {
        merged.description = describe(merged.focusSeconds, merged.breakSeconds);
      }
      return { ...merged, builtin: true };
    });
  const customs = store.custom.map<CustomTemplate>(t => ({
    ...t,
    description: t.description || describe(t.focusSeconds, t.breakSeconds),
    builtin: false,
  }));
  return [...builtins, ...customs];
}

let cache: CustomTemplate[] = compute();

function refresh() {
  cache = compute();
  listeners.forEach(l => l(cache));
}

export const pomodoroTemplates = {
  /** Effective list (builtins + overrides + customs, hidden removed). */
  list(): CustomTemplate[] { return cache; },
  /** Find by id in the effective list. */
  find(id: string): CustomTemplate | undefined {
    return cache.find(t => t.id === id);
  },
  /** Update a built-in or custom template. */
  update(id: string, patch: Partial<Omit<PomodoroTemplate, "id">>) {
    const isBuiltin = BUILTIN.some(t => t.id === id);
    if (isBuiltin) {
      store.overrides[id] = { ...(store.overrides[id] ?? {}), ...patch };
    } else {
      store.custom = store.custom.map(t => t.id === id ? { ...t, ...patch } : t);
    }
    persist(); refresh();
  },
  /** Add a fresh custom template; returns the created id. */
  add(t: Omit<PomodoroTemplate, "id"> & { id?: string }): string {
    const id = t.id ?? `custom-${Date.now().toString(36)}`;
    store.custom = [...store.custom, { ...t, id }];
    persist(); refresh();
    return id;
  },
  /** Remove a custom template, or hide a built-in. */
  remove(id: string) {
    const isBuiltin = BUILTIN.some(t => t.id === id);
    if (isBuiltin) {
      if (!store.hidden.includes(id)) store.hidden = [...store.hidden, id];
      delete store.overrides[id];
    } else {
      store.custom = store.custom.filter(t => t.id !== id);
    }
    persist(); refresh();
  },
  /** Reset built-in to factory or unhide it. */
  reset(id: string) {
    delete store.overrides[id];
    store.hidden = store.hidden.filter(h => h !== id);
    persist(); refresh();
  },
};

export function usePomodoroTemplatesList(): CustomTemplate[] {
  const [s, setS] = useState(cache);
  useEffect(() => { listeners.add(setS); return () => { listeners.delete(setS); }; }, []);
  return s;
}
