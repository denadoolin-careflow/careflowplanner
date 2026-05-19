import { CalendarDays, ListChecks, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalView = "schedule" | "agenda" | "moon";

export function CalendarViewToggle({ value, onChange }: { value: CalView; onChange: (v: CalView) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-0.5 text-xs">
      <button
        onClick={() => onChange("schedule")}
        className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors",
          value === "schedule" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <CalendarDays className="h-3.5 w-3.5" /> Schedule
      </button>
      <button
        onClick={() => onChange("agenda")}
        className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors",
          value === "agenda" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <ListChecks className="h-3.5 w-3.5" /> Agenda
      </button>
      <button
        onClick={() => onChange("moon")}
        className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors",
          value === "moon" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Moon className="h-3.5 w-3.5" /> Moon
      </button>
    </div>
  );
}