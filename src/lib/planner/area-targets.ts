/**
 * Locally persisted weekly hour targets per capacity group, so the capacity
 * view can show over/under deltas without any backend round-trip.
 */
import { useCallback, useEffect, useState } from "react";
import type { GroupBy } from "@/lib/planner/time-allocation";

const KEY = "careflow:planner:capacity-targets";
const EVT = "careflow:planner:capacity-targets-change";

/** { [groupBy]: { [sliceKey]: weeklyHours } } */
export type TargetMap = Partial<Record<GroupBy, Record<string, number>>>;

const read = (): TargetMap => {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as TargetMap; } catch { return {}; }
};

export function useAreaTargets(): {
  targets: TargetMap;
  targetFor: (group: GroupBy, key: string) => number | null;
  setTarget: (group: GroupBy, key: string, weeklyHours: number | null) => void;
} {
  const [targets, setTargets] = useState<TargetMap>(read);

  useEffect(() => {
    const sync = () => setTargets(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setTarget = useCallback((group: GroupBy, key: string, weeklyHours: number | null) => {
    const next = read();
    const bucket = { ...(next[group] ?? {}) };
    if (weeklyHours === null || !Number.isFinite(weeklyHours) || weeklyHours <= 0) delete bucket[key];
    else bucket[key] = weeklyHours;
    next[group] = bucket;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setTargets(next);
    window.dispatchEvent(new Event(EVT));
  }, []);

  const targetFor = useCallback(
    (group: GroupBy, key: string) => targets[group]?.[key] ?? null,
    [targets],
  );

  return { targets, targetFor, setTarget };
}

/** Scale a weekly target to the window being viewed. */
export const targetMinutesForWindow = (weeklyHours: number, days: number) =>
  (weeklyHours * 60 * days) / 7;
