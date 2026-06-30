import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";

export type BurnoutLevel = "spacious" | "steady" | "tender" | "depleted";

export const BURNOUT_META: Record<BurnoutLevel, {
  label: string;
  hint: string;
  multiplier: number;
  tone: string; // hsl
  emoji: string;
}> = {
  spacious: { label: "Spacious",  hint: "Room to breathe — gentle stretch is okay.",   multiplier: 1.15, tone: "hsl(195 65% 55%)", emoji: "🌤️" },
  steady:   { label: "Steady",    hint: "Even keel. Keep the plan as planned.",        multiplier: 1.0,  tone: "hsl(140 45% 55%)", emoji: "🌿" },
  tender:   { label: "Tender",    hint: "Softer pace. Trim what doesn't need to ship.", multiplier: 0.7,  tone: "hsl(35 85% 60%)",  emoji: "🌸" },
  depleted: { label: "Depleted",  hint: "Minimum viable day — one thing only.",         multiplier: 0.4,  tone: "hsl(0 70% 60%)",   emoji: "🌑" },
};

export interface BurnoutEntry {
  level: BurnoutLevel | null;
  mvd: boolean;            // minimum-viable-day toggle
  mvdTaskId: string | null;
  updatedAt: string;       // iso
}

const PREFIX = "careflow:burnout-checkin:v1:";
const HISTORY_KEY = "careflow:burnout-history:v1";
const listeners = new Set<(iso: string, e: BurnoutEntry) => void>();

function dayKey(date: Date) { return PREFIX + format(date, "yyyy-MM-dd"); }

function readEntry(date: Date): BurnoutEntry {
  if (typeof localStorage === "undefined") return { level: null, mvd: false, mvdTaskId: null, updatedAt: "" };
  try {
    const raw = localStorage.getItem(dayKey(date));
    if (!raw) return { level: null, mvd: false, mvdTaskId: null, updatedAt: "" };
    const parsed = JSON.parse(raw);
    return {
      level: parsed.level ?? null,
      mvd: !!parsed.mvd,
      mvdTaskId: parsed.mvdTaskId ?? null,
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return { level: null, mvd: false, mvdTaskId: null, updatedAt: "" };
  }
}

function writeEntry(date: Date, entry: BurnoutEntry) {
  try { localStorage.setItem(dayKey(date), JSON.stringify(entry)); } catch { /* ignore */ }
  const iso = format(date, "yyyy-MM-dd");
  listeners.forEach(l => l(iso, entry));
}

export function useBurnoutCheckIn(date: Date) {
  const iso = format(date, "yyyy-MM-dd");
  const [entry, setEntry] = useState<BurnoutEntry>(() => readEntry(date));

  useEffect(() => { setEntry(readEntry(date)); }, [iso]);

  useEffect(() => {
    const fn = (k: string, e: BurnoutEntry) => { if (k === iso) setEntry(e); };
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, [iso]);

  const setLevel = useCallback((level: BurnoutLevel | null) => {
    const next: BurnoutEntry = {
      ...readEntry(date),
      level,
      updatedAt: new Date().toISOString(),
      // Auto-arm MVD when depleted
      mvd: level === "depleted" ? true : readEntry(date).mvd,
    };
    writeEntry(date, next);
  }, [iso]);

  const setMvd = useCallback((mvd: boolean) => {
    writeEntry(date, { ...readEntry(date), mvd, updatedAt: new Date().toISOString() });
  }, [iso]);

  const setMvdTaskId = useCallback((mvdTaskId: string | null) => {
    writeEntry(date, { ...readEntry(date), mvdTaskId, updatedAt: new Date().toISOString() });
  }, [iso]);

  const reset = useCallback(() => {
    const prev = readEntry(date);
    // archive snapshot
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({ date: iso, ...prev, archivedAt: new Date().toISOString() });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 60)));
    } catch { /* ignore */ }
    writeEntry(date, { level: null, mvd: false, mvdTaskId: null, updatedAt: new Date().toISOString() });
  }, [iso]);

  return { entry, setLevel, setMvd, setMvdTaskId, reset };
}

export function burnoutMultiplier(level: BurnoutLevel | null): number {
  return level ? BURNOUT_META[level].multiplier : 1;
}