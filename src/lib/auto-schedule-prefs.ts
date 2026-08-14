import { useCallback, useEffect, useState } from "react";

/** A protected stretch of the day the assistant never schedules into. */
export interface NoScheduleWindow {
  id: string;
  label: string;
  /** Minutes from midnight. */
  startMin: number;
  endMin: number;
}

/** Preferred window for a person's tasks, so related care work clusters. */
export interface PersonRule {
  id: string;
  /** Matches a task tag (case-insensitive). */
  name: string;
  /** Optional preferred window, in hours. */
  startH: number | null;
  endH: number | null;
  /** Keep this person's tasks adjacent to each other. */
  group: boolean;
}

export interface AutoSchedulePrefs {
  /** Day window, in hours (0-24). */
  dayStartH: number;
  dayEndH: number;
  /** Duration used when a task has no estimate. */
  defaultDuration: number;
  /** Gap left between placed tasks. */
  bufferMin: number;
  /** Preferred start hour per energy level. */
  highEnergyH: number;
  mediumEnergyH: number;
  lowEnergyH: number;
  /** Preferred end hour per energy level (band, not just a start). */
  highEnergyEndH: number;
  mediumEnergyEndH: number;
  lowEnergyEndH: number;
  /** Avoid overlapping existing appointments/blocks. */
  respectAppointments: boolean;
  /** Never place a task earlier than "now" on today's date. */
  skipPastTimes: boolean;
  /** Ordering strategy. */
  order: "priority" | "duration";
  /** Protected windows the assistant never places into. */
  noScheduleWindows: NoScheduleWindow[];
  /** Per-person clustering / windows. */
  personRules: PersonRule[];
}

export const DEFAULT_AUTO_SCHEDULE_PREFS: AutoSchedulePrefs = {
  dayStartH: 7,
  dayEndH: 21,
  defaultDuration: 30,
  bufferMin: 0,
  highEnergyH: 9,
  mediumEnergyH: 10,
  lowEnergyH: 15,
  highEnergyEndH: 12,
  mediumEnergyEndH: 17,
  lowEnergyEndH: 21,
  respectAppointments: true,
  skipPastTimes: true,
  order: "priority",
  noScheduleWindows: [],
  personRules: [],
};

const KEY = "careflow:planner:auto-schedule-prefs";

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const minToHm = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.max(0, m) % 60).padStart(2, "0")}`;

export function hmToMin(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function readAutoSchedulePrefs(): AutoSchedulePrefs {
  if (typeof window === "undefined") return DEFAULT_AUTO_SCHEDULE_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AUTO_SCHEDULE_PREFS;
    const parsed = JSON.parse(raw) as Partial<AutoSchedulePrefs>;
    return {
      ...DEFAULT_AUTO_SCHEDULE_PREFS,
      ...parsed,
      noScheduleWindows: Array.isArray(parsed.noScheduleWindows) ? parsed.noScheduleWindows : [],
      personRules: Array.isArray(parsed.personRules) ? parsed.personRules : [],
    };
  } catch { return DEFAULT_AUTO_SCHEDULE_PREFS; }
}

export function useAutoSchedulePrefs() {
  const [prefs, setPrefs] = useState<AutoSchedulePrefs>(readAutoSchedulePrefs);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setPrefs(readAutoSchedulePrefs()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<AutoSchedulePrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_AUTO_SCHEDULE_PREFS);
    try { window.localStorage.removeItem(KEY); } catch { /* noop */ }
  }, []);

  return { prefs, update, reset };
}
