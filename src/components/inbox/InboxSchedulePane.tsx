import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { cn } from "@/lib/utils";

/**
 * Thin wrapper around the planner day timeline for use inside the Inbox.
 * Inbox rows can be dragged (mouse) or long-pressed (touch) onto this grid
 * to schedule them — all handled by PlannerTimeline itself.
 */
export function InboxSchedulePane({
  date, onDateChange, className,
}: {
  date: Date;
  onDateChange: (d: Date) => void;
  className?: string;
}) {
  const today = startOfDay(new Date());
  return (
    <div className={cn("flex min-h-0 flex-col rounded-[24px] border border-border/50 bg-card/60 backdrop-blur-md", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5">
        <div className="inline-flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold leading-tight text-foreground">
              {isSameDay(date, today) ? "Today" : format(date, "EEEE")}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{format(date, "MMM d")}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Previous day"
            onClick={() => onDateChange(addDays(date, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isSameDay(date, today) && (
            <Button variant="ghost" size="sm" className="h-8 rounded-full px-2.5 text-[12px]"
              onClick={() => onDateChange(today)}>
              Today
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Next day"
            onClick={() => onDateChange(addDays(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="px-3 pt-2 text-[11.5px] text-muted-foreground">
        Drag an inbox item here — or press and hold on touch — to drop it into a time.
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <PlannerTimeline date={date} bare />
      </div>
    </div>
  );
}