import { CalendarDays, ListChecks, Sunrise } from "lucide-react";
import { useEffect, useState } from "react";
import { ViewPills } from "@/components/layout/ViewPills";

export type CalView = "schedule" | "parts" | "agenda";

const STORAGE_KEY = "careflow:cal-view:v1";
const listeners = new Set<(v: CalView) => void>();

function read(): CalView {
  if (typeof localStorage === "undefined") return "parts";
  const v = localStorage.getItem(STORAGE_KEY);
  // "month" was a legacy option — coerce it so stored prefs stay valid.
  return v === "schedule" || v === "parts" || v === "agenda" ? v : "parts";
}

let current: CalView = read();

export function getCalView(): CalView { return current; }

export function setCalView(v: CalView) {
  current = v;
  try { localStorage.setItem(STORAGE_KEY, v); } catch { /* ignore */ }
  listeners.forEach(l => l(v));
}

/** Shared, persisted view selection used by Today + Week. */
export function useCalView(): [CalView, (v: CalView) => void] {
  const [v, setV] = useState<CalView>(current);
  useEffect(() => {
    listeners.add(setV);
    return () => { listeners.delete(setV); };
  }, []);
  return [v, setCalView];
}

export const CAL_VIEW_ITEMS = [
  { value: "schedule" as const, label: "Timeline", icon: CalendarDays },
  { value: "parts" as const, label: "Time of day", icon: Sunrise },
  { value: "agenda" as const, label: "Agenda", icon: ListChecks },
];

export function CalendarViewToggle({ value, onChange }: { value: CalView; onChange: (v: CalView) => void }) {
  return <ViewPills items={CAL_VIEW_ITEMS} value={value} onChange={onChange} ariaLabel="Calendar view" />;
}