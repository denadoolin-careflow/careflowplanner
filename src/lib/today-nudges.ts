/**
 * Gentle in-app nudges for the Today page. Pure rules over the day's status,
 * with per-type on/off prefs and a dismissal that lasts until tomorrow.
 */
import { useCallback, useEffect, useState } from "react";

export type NudgeType = "dinner" | "cleaning" | "connection";

export interface TodayNudge {
  id: string;
  type: NudgeType;
  message: string;
  actionLabel: string;
}

export interface NudgePrefs {
  dinner: boolean;
  cleaning: boolean;
  connection: boolean;
  /** Hour of day (0-23) after which the dinner nudge may appear. */
  dinnerAfterHour: number;
  /** Hour of day after which the cleaning nudge may appear. */
  cleaningAfterHour: number;
  /** Days without contact before the connection nudge appears. */
  connectionAfterDays: number;
}

export const DEFAULT_NUDGE_PREFS: NudgePrefs = {
  dinner: true,
  cleaning: true,
  connection: true,
  dinnerAfterHour: 16,
  cleaningAfterHour: 19,
  connectionAfterDays: 7,
};

const PREFS_KEY = "careflow:today:nudge-prefs";
const DISMISS_KEY = "careflow:today:nudge-dismissed";
const EVENT = "careflow:today:nudges-changed";

export function readNudgePrefs(): NudgePrefs {
  if (typeof window === "undefined") return DEFAULT_NUDGE_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_NUDGE_PREFS, ...JSON.parse(raw) } : DEFAULT_NUDGE_PREFS;
  } catch { return DEFAULT_NUDGE_PREFS; }
}

export function writeNudgePrefs(p: NudgePrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* private mode */ }
}

function readDismissed(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" ? v : {};
  } catch { return {}; }
}

export function dismissNudge(id: string, dayIso: string) {
  const next = { ...readDismissed(), [id]: dayIso };
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* private mode */ }
}

export function isDismissed(id: string, dayIso: string): boolean {
  return readDismissed()[id] === dayIso;
}

export interface NudgeInput {
  hour: number;
  dayIso: string;
  hasDinner: boolean;
  openEssentials: number;
  /** People with no contact for longer than the threshold. */
  staleConnections: { id: string; name: string; days: number }[];
}

export function buildNudges(input: NudgeInput, prefs: NudgePrefs): TodayNudge[] {
  const out: TodayNudge[] = [];

  if (prefs.dinner && input.hour >= prefs.dinnerAfterHour && !input.hasDinner) {
    out.push({
      id: "dinner",
      type: "dinner",
      message: "No dinner planned yet — even leftovers count.",
      actionLabel: "Pick something",
    });
  }

  if (prefs.cleaning && input.hour >= prefs.cleaningAfterHour && input.openEssentials > 0) {
    out.push({
      id: "cleaning",
      type: "cleaning",
      message: `${input.openEssentials} essential${input.openEssentials === 1 ? "" : "s"} still open — one is plenty.`,
      actionLabel: "See the list",
    });
  }

  if (prefs.connection) {
    const stale = input.staleConnections
      .filter(p => p.days >= prefs.connectionAfterDays)
      .sort((a, b) => b.days - a.days)[0];
    if (stale) {
      out.push({
        id: `connection:${stale.id}`,
        type: "connection",
        message: `It's been ${stale.days} days since you reached ${stale.name}.`,
        actionLabel: "Check in",
      });
    }
  }

  return out.filter(n => !isDismissed(n.id, input.dayIso));
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
    writeNudgePrefs(next);
    setPrefs(next);
  }, []);

  return { prefs, update };
}

/** Re-render hook so dismissals refresh the strip. */
export function useNudgeTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick(t => t + 1);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return tick;
}
