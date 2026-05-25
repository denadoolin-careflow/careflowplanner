import { useCallback, useEffect, useState } from "react";

export type TaskViewType = "list" | "grid" | "board" | "schedule" | "calendar" | "table" | "timeline";

export type VisibleFields = {
  tags: boolean;
  priority: boolean;
  dueDate: boolean;
  project: boolean;
  area: boolean;
  energy: boolean;
  estMinutes: boolean;
  icon: boolean;
  cover: boolean;
  checkbox: boolean;
  description: boolean;
  createdAt: boolean;
};

export const DEFAULT_VISIBLE: VisibleFields = {
  tags: true,
  priority: true,
  dueDate: true,
  project: true,
  area: true,
  energy: false,
  estMinutes: false,
  icon: true,
  cover: true,
  checkbox: true,
  description: true,
  createdAt: false,
};

export type ViewPrefs = {
  visible: VisibleFields;
};

const KEY = (v: TaskViewType) => `careflow:view:${v}`;

function load(view: TaskViewType): ViewPrefs {
  try {
    const raw = localStorage.getItem(KEY(view));
    if (!raw) return { visible: DEFAULT_VISIBLE };
    const parsed = JSON.parse(raw);
    return { visible: { ...DEFAULT_VISIBLE, ...(parsed?.visible ?? {}) } };
  } catch {
    return { visible: DEFAULT_VISIBLE };
  }
}

function save(view: TaskViewType, prefs: ViewPrefs) {
  try { localStorage.setItem(KEY(view), JSON.stringify(prefs)); } catch {}
}

const subs = new Map<TaskViewType, Set<(p: ViewPrefs) => void>>();

export function useViewPrefs(view: TaskViewType) {
  const [prefs, setPrefs] = useState<ViewPrefs>(() => load(view));

  useEffect(() => {
    setPrefs(load(view));
    let set = subs.get(view);
    if (!set) { set = new Set(); subs.set(view, set); }
    set.add(setPrefs);
    return () => { set!.delete(setPrefs); };
  }, [view]);

  const toggle = useCallback((field: keyof VisibleFields) => {
    setPrefs(prev => {
      const next = { ...prev, visible: { ...prev.visible, [field]: !prev.visible[field] } };
      save(view, next);
      subs.get(view)?.forEach(s => { if (s !== setPrefs) s(next); });
      return next;
    });
  }, [view]);

  const reset = useCallback(() => {
    const next = { visible: DEFAULT_VISIBLE };
    save(view, next);
    subs.get(view)?.forEach(s => s(next));
    setPrefs(next);
  }, [view]);

  return { visible: prefs.visible, toggle, reset };
}