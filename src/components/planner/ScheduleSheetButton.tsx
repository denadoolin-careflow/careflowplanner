import { useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlannerScheduleList } from "./PlannerScheduleList";

/** Opens the day's planned schedule in a side panel from any page. */
export function ScheduleSheetButton({ initialDate, label = "Schedule" }: { initialDate?: Date; label?: string }) {
  const [day, setDay] = useState<Date>(initialDate ?? new Date());
  return (
    <Sheet onOpenChange={(o) => { if (o) setDay(initialDate ?? new Date()); }}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full">
          <CalendarClock className="h-3.5 w-3.5" /><span className="text-xs">{label}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader><SheetTitle>Planned schedule</SheetTitle></SheetHeader>
        <div className="flex items-center justify-between gap-2 py-2">
          <Button size="icon" variant="ghost" aria-label="Previous day" onClick={() => setDay(d => addDays(d, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <button className="text-sm font-medium" onClick={() => setDay(new Date())}>{format(day, "EEEE, MMM d")}</button>
          <Button size="icon" variant="ghost" aria-label="Next day" onClick={() => setDay(d => addDays(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto"><PlannerScheduleList date={day} /></div>
      </SheetContent>
    </Sheet>
  );
}
