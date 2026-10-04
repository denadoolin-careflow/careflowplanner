import { useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlannerScheduleList } from "./PlannerScheduleList";
import { PlannerTimeline } from "./PlannerTimeline";

/** Opens the day's planned schedule in a side panel from any page. */
export function ScheduleSheetButton({ initialDate, label = "Schedule", iconOnly }: { initialDate?: Date; label?: string; iconOnly?: boolean }) {
  const [day, setDay] = useState<Date>(initialDate ?? new Date());
  const [view, setView] = useState<"grid" | "schedule">(() => (localStorage.getItem("careflow.scheduleSheet.view") as any) || "schedule");
  const pick = (v: "grid" | "schedule") => { setView(v); try { localStorage.setItem("careflow.scheduleSheet.view", v); } catch { /* ignore */ } };
  return (
    <Sheet onOpenChange={(o) => { if (o) setDay(initialDate ?? new Date()); }}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full" aria-label="Open planner schedule">
          <CalendarClock className="h-3.5 w-3.5" />{!iconOnly && <span className="text-xs">{label}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader><SheetTitle>Planner</SheetTitle></SheetHeader>
        <div className="mt-1 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Planner view">
          {(["grid", "schedule"] as const).map(v => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => pick(v)}
              className={"h-8 rounded-full text-xs font-medium capitalize transition " + (view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 py-2">
          <Button size="icon" variant="ghost" aria-label="Previous day" onClick={() => setDay(d => addDays(d, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <button className="text-sm font-medium" onClick={() => setDay(new Date())}>{format(day, "EEEE, MMM d")}</button>
          <Button size="icon" variant="ghost" aria-label="Next day" onClick={() => setDay(d => addDays(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === "grid" ? <div className="h-full min-h-[60vh]"><PlannerTimeline date={day} bare /></div> : <PlannerScheduleList date={day} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
