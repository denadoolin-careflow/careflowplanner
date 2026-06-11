/**
 * Per-day-part self-reported energy (low/medium/high), backed by localStorage.
 * Keyed by ISO date + day part so we can track patterns (morning/afternoon/evening).
 */
import { useEffect, useState } from "react";

export type Energy = "low" | "medium" | "high";
export type DayPart = "morning" | "afternoon" | "evening";

const KEY = "careflow:energy-by-part";
const EVENT = "careflow:energy-by-part:change";

type Store = Record<string, Partial<Record<DayPart, Energy>>>;

function readAll(): Store {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
function writeAll(s: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT));
}

export function getEnergyForPart(dateISO: string, part: DayPart): Energy | null {
  return readAll()[dateISO]?.[part] ?? null;
}
export function setEnergyForPart(dateISO: string, part: DayPart, e: Energy) {
  const s = readAll();
  s[dateISO] = { ...(s[dateISO] ?? {}), [part]: e };
  writeAll(s);
}

export function useDayPartEnergy(dateISO: string): [
  Partial<Record<DayPart, Energy>>,
  (part: DayPart, e: Energy) => void,
] {
  const [val, setVal] = useState<Partial<Record<DayPart, Energy>>>(() => readAll()[dateISO] ?? {});
  useEffect(() => {
    const sync = () => setVal(readAll()[dateISO] ?? {});
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [dateISO]);
  return [
    val,
    (part, e) => { setEnergyForPart(dateISO, part, e); setVal(v => ({ ...v, [part]: e })); },
  ];
}

export const ENERGY_COLOR: Record<Energy, { bg: string; text: string; border: string; dot: string }> = {
  low:    { bg: "bg-rose-500/15",    text: "text-rose-600 dark:text-rose-300",     border: "border-rose-500/40",   dot: "bg-rose-500" },
  medium: { bg: "bg-amber-500/15",   text: "text-amber-600 dark:text-amber-300",   border: "border-amber-500/40",  dot: "bg-amber-500" },
  high:   { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-300", border: "border-emerald-500/40", dot: "bg-emerald-500" },
};

export const ENERGY_LABEL: Record<Energy, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const DAY_PARTS: DayPart[] = ["morning", "afternoon", "evening"];

export function currentDayPart(d = new Date()): DayPart {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}