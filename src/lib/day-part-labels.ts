import { useEffect, useState } from "react";

export interface DayPartLabels {
  morning: string;
  afternoon: string;
  evening: string;
}

export const DEFAULT_DAY_PART_LABELS: DayPartLabels = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const KEY = "careflow:day-part-labels:v1";
const listeners = new Set<(l: DayPartLabels) => void>();

function read(): DayPartLabels {
  if (typeof localStorage === "undefined") return { ...DEFAULT_DAY_PART_LABELS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_DAY_PART_LABELS };
    return { ...DEFAULT_DAY_PART_LABELS, ...(JSON.parse(raw) as Partial<DayPartLabels>) };
  } catch { return { ...DEFAULT_DAY_PART_LABELS }; }
}

let current: DayPartLabels = read();

export function getDayPartLabels(): DayPartLabels { return current; }

export function setDayPartLabels(patch: Partial<DayPartLabels>) {
  const merged: DayPartLabels = {
    morning: (patch.morning ?? current.morning).trim() || DEFAULT_DAY_PART_LABELS.morning,
    afternoon: (patch.afternoon ?? current.afternoon).trim() || DEFAULT_DAY_PART_LABELS.afternoon,
    evening: (patch.evening ?? current.evening).trim() || DEFAULT_DAY_PART_LABELS.evening,
  };
  current = merged;
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  listeners.forEach(l => l(current));
}

export function useDayPartLabels(): [DayPartLabels, (p: Partial<DayPartLabels>) => void] {
  const [l, setL] = useState<DayPartLabels>(current);
  useEffect(() => {
    listeners.add(setL);
    return () => { listeners.delete(setL); };
  }, []);
  return [l, setDayPartLabels];
}