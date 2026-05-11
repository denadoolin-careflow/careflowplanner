import { useState } from "react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function WeekNavigator({
  weekStart, onChange, className,
}: {
  weekStart: Date;
  onChange: (d: Date) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const end = addDays(weekStart, 6);
  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  const isCurrent = weekStart.toDateString() === today.toDateString();
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => onChange(addWeeks(weekStart, -1))} aria-label="Previous week">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 gap-1.5 rounded-full px-3 text-sm">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(weekStart, "MMM d")} – {format(end, weekStart.getMonth() === end.getMonth() ? "d" : "MMM d")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={weekStart}
            onSelect={(d) => { if (d) { onChange(startOfWeek(d, { weekStartsOn: 1 })); setOpen(false); } }}
            weekStartsOn={1}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => onChange(addWeeks(weekStart, 1))} aria-label="Next week">
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrent && (
        <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => onChange(today)}>
          This week
        </Button>
      )}
    </div>
  );
}