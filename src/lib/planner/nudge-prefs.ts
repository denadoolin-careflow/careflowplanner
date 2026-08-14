import { useCallback, useEffect, useState } from "react";

export type NudgeTone = "gentle" | "neutral" | "direct";
export type NudgeType = "overbooked" | "nobreak" | "conflicts" | "estimates" | "energy";

export interface NudgePrefs {
  tone: NudgeTone;
  /** Hide every nudge without losing the per-type choices. */
  quiet: boolean;
  enabled: Record<NudgeType, boolean>;
}

export const NUDGE_TYPES: { id: NudgeType; label: string; hint: string }[] = [
  { id: "overbooked", label: "Overbooked day", hint: "When the day is nearly full" },
  { id: "nobreak", label: "No breaks", hint: "Long stretches without a pause" },
  { id: "conflicts", label: "Overlaps", hint: "Items double-booked on the grid" },
  { id: "estimates", label: "Missing estimates", hint: "Tasks with no duration" },
  { id: "energy", label: "Energy mismatch", hint: "Demanding work in a low stretch" },
];

export const DEFAULT_NUDGE_PREFS: NudgePrefs = {
  tone: "gentle",
  quiet: false,
  enabled: { overbooked: true, nobreak: true, conflicts: true, estimates: true, energy: true },
};

const KEY = "careflow:planner:nudge-prefs";
const EVENT = "careflow:planner:nudge-prefs:change";

export function readNudgePrefs(): NudgePrefs {
  if (typeof window === "undefined") return DEFAULT_NUDGE_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_NUDGE_PREFS;
    const parsed = JSON.parse(raw) as Partial<NudgePrefs>;
    return {
      ...DEFAULT_NUDGE_PREFS,
      ...parsed,
      enabled: { ...DEFAULT_NUDGE_PREFS.enabled, ...(parsed.enabled ?? {}) },
    };
  } catch { return DEFAULT_NUDGE_PREFS; }
}

export function useNudgePrefs() {
  const [prefs, setPrefs] = useState<NudgePrefs>(readNudgePrefs);

  useEffect(() => {
    const sync = () => setPrefs(readNudgePrefs());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<NudgePrefs>) => {
    const next = { ...readNudgePrefs(), ...patch };
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
    setPrefs(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggleType = useCallback((type: NudgeType, on: boolean) => {
    const cur = readNudgePrefs();
    update({ enabled: { ...cur.enabled, [type]: on } });
  }, [update]);

  return { prefs, update, toggleType };
}
