import { useCallback, useEffect, useState } from "react";

export type TodayView = "rhythm" | "timeofday" | "plan" | "schedule";

export const TODAY_VIEW_LABELS: Record<TodayView, string> = {
  rhythm: "Rhythm",
  timeofday: "Time of day",
  plan: "Day plan",
  schedule: "Schedule",
};

const VIEW_KEY = "careflow:today-view:v1";
const COLLAPSED_KEY = "careflow:today-sidebar-collapsed:v1";
const HIDDEN_KEY = "careflow:today-sidebar-hidden:v1";
const PREFS_KEY = "careflow:today-prefs:v1";

const viewListeners = new Set<(v: TodayView) => void>();

function readView(): TodayView {
  if (typeof localStorage === "undefined") return "rhythm";
  const v = localStorage.getItem(VIEW_KEY);
  return v === "rhythm" || v === "timeofday" || v === "plan" || v === "schedule" ? v : "rhythm";
}

export function useTodayView(): [TodayView, (v: TodayView) => void] {
  const [v, setV] = useState<TodayView>(readView);
  useEffect(() => {
    const fn = (next: TodayView) => setV(next);
    viewListeners.add(fn);
    return () => { viewListeners.delete(fn); };
  }, []);
  const set = useCallback((next: TodayView) => {
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* */ }
    viewListeners.forEach(l => l(next));
  }, []);
  return [v, set];
}

function readSet(key: string): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch { return new Set(); }
}

function writeSet(key: string, s: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(s))); } catch { /* */ }
}

export function useCollapsedWidgets(): {
  collapsed: Set<string>;
  toggle: (id: string) => void;
} {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readSet(COLLAPSED_KEY));
  const toggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      writeSet(COLLAPSED_KEY, next);
      return next;
    });
  }, []);
  return { collapsed, toggle };
}

function readBool(key: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(key) === "1";
}

const hiddenListeners = new Set<(v: boolean) => void>();

export function useSidebarHidden(): [boolean, (v: boolean) => void] {
  const [hidden, setHidden] = useState<boolean>(() => readBool(HIDDEN_KEY));
  useEffect(() => {
    const fn = (next: boolean) => setHidden(next);
    hiddenListeners.add(fn);
    return () => { hiddenListeners.delete(fn); };
  }, []);
  const set = useCallback((v: boolean) => {
    setHidden(v);
    try { localStorage.setItem(HIDDEN_KEY, v ? "1" : "0"); } catch { /* */ }
    hiddenListeners.forEach(l => l(v));
  }, []);
  return [hidden, set];
}

export type TodayPrefs = {
  showCareyNudges: boolean;
  showQuickAdd: boolean;
};

const DEFAULT_PREFS: TodayPrefs = {
  showCareyNudges: true,
  showQuickAdd: true,
};

const prefsListeners = new Set<(p: TodayPrefs) => void>();

function readPrefs(): TodayPrefs {
  if (typeof localStorage === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

export function useTodayPrefs(): [TodayPrefs, (patch: Partial<TodayPrefs>) => void] {
  const [prefs, setPrefs] = useState<TodayPrefs>(readPrefs);
  useEffect(() => {
    const fn = (next: TodayPrefs) => setPrefs(next);
    prefsListeners.add(fn);
    return () => { prefsListeners.delete(fn); };
  }, []);
  const set = useCallback((patch: Partial<TodayPrefs>) => {
    const next = { ...readPrefs(), ...patch };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* */ }
    prefsListeners.forEach(l => l(next));
  }, []);
  return [prefs, set];
}