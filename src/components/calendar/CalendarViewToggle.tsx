import { CalendarDays, ListChecks, Sunrise, Grid3x3 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type CalView = "schedule" | "parts" | "agenda" | "month";

const STORAGE_KEY = "careflow:cal-view:v1";
const listeners = new Set<(v: CalView) => void>();

function read(): CalView {
  if (typeof localStorage === "undefined") return "parts";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "schedule" || v === "parts" || v === "agenda" || v === "month" ? v : "parts";
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

export function CalendarViewToggle({ value, onChange }: { value: CalView; onChange: (v: CalView) => void }) {
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-0.5 text-xs">
      <button
        onClick={() => onChange("schedule")}
        className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 transition-colors",
          value === "schedule" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <CalendarDays className="h-3.5 w-3.5" /> Schedule
      </button>
      <button
        onClick={() => onChange("parts")}
        className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 transition-colors",
          value === "parts" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Sunrise className="h-3.5 w-3.5" /> Time of day
      </button>
      <button
        onClick={() => onChange("agenda")}
        className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 transition-colors",
          value === "agenda" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <ListChecks className="h-3.5 w-3.5" /> Agenda
      </button>
      <button
        onClick={() => onChange("month")}
        className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 transition-colors",
          value === "month" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Grid3x3 className="h-3.5 w-3.5" /> Month
      </button>
    </div>
  );
}