import { useCallback, useEffect, useState } from "react";

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
  /** Avoid overlapping existing appointments/blocks. */
  respectAppointments: boolean;
  /** Never place a task earlier than "now" on today's date. */
  skipPastTimes: boolean;
  /** Ordering strategy. */
  order: "priority" | "duration";
}

export const DEFAULT_AUTO_SCHEDULE_PREFS: AutoSchedulePrefs = {
  dayStartH: 7,
  dayEndH: 21,
  defaultDuration: 30,
  bufferMin: 0,
  highEnergyH: 9,
  mediumEnergyH: 10,
  lowEnergyH: 15,
  respectAppointments: true,
  skipPastTimes: true,
  order: "priority",
};

const KEY = "careflow:planner:auto-schedule-prefs";

export function readAutoSchedulePrefs(): AutoSchedulePrefs {
  if (typeof window === "undefined") return DEFAULT_AUTO_SCHEDULE_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AUTO_SCHEDULE_PREFS;
    return { ...DEFAULT_AUTO_SCHEDULE_PREFS, ...(JSON.parse(raw) as Partial<AutoSchedulePrefs>) };
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
