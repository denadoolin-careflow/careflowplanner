import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Check, Clock, Sunrise, Sun, Moon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import type { DayPartKey } from "@/lib/planner/use-schedule-drop";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PARTS: { id: DayPartKey; label: string; icon: any }[] = [
  { id: "morning", label: "Morning", icon: Sunrise },
  { id: "afternoon", label: "Afternoon", icon: Sun },
  { id: "evening", label: "Evening", icon: Moon },
];

/**
 * Multi-select action bar for the weekly List/Table views: move a batch of
 * tasks to a day, a day part, or a specific start time (packed back-to-back).
 */
export function PlannerBulkBar({ ids, anchorDate, onClear, onScheduleMany }: {
  ids: string[];
  anchorDate: Date;
  onClear: () => void;
  onScheduleMany: (ids: string[], dateISO: string, opts?: { part?: DayPartKey; startTime?: string }) => void;
}) {
  const { toggleTask, state } = useStore() as any;
  const [date, setDate] = useState<Date>(anchorDate);
  const [time, setTime] = useState("");
  const [dayOpen, setDayOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const iso = format(date, "yyyy-MM-dd");

  if (ids.length === 0) return null;

  const complete = async () => {
    await Promise.all(ids.map(async id => {
      if (!state.tasks?.find((t: any) => t.id === id)?.done) await toggleTask(id);
    }));
    toast.success(`${ids.length} marked done`);
    onClear();
  };

  const run = (opts?: { part?: DayPartKey; startTime?: string }) => {
    onScheduleMany(ids, iso, opts);
    setDayOpen(false);
    setTimeOpen(false);
    onClear();
  };

  return (
    <div className="pointer-events-none sticky bottom-3 z-30 flex justify-center px-2">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/60 bg-card/95 px-2 py-1.5 shadow-[var(--shadow-cozy)] backdrop-blur-md scrollbar-none">
        <span className="shrink-0 px-2 text-xs font-medium tabular-nums text-muted-foreground">
          {ids.length} selected
        </span>
        <div className="h-5 w-px shrink-0 bg-border/60" />

        <Popover open={dayOpen} onOpenChange={setDayOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 shrink-0 gap-1.5 rounded-full">
              <CalendarDays className="h-3.5 w-3.5" /> {format(date, "MMM d")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-auto p-2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={d => { if (d) setDate(d); }}
              initialFocus
              className={cn("p-0 pointer-events-auto")}
            />
            <Button size="sm" className="mt-2 w-full rounded-full" onClick={() => run()}>
              Move {ids.length} here
            </Button>
          </PopoverContent>
        </Popover>

        {PARTS.map(p => (
          <Button
            key={p.id}
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 gap-1.5 rounded-full"
            onClick={() => run({ part: p.id })}
          >
            <p.icon className="h-3.5 w-3.5" /> {p.label}
          </Button>
        ))}

        <Popover open={timeOpen} onOpenChange={setTimeOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 shrink-0 gap-1.5 rounded-full">
              <Clock className="h-3.5 w-3.5" /> From time
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-52 space-y-2 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Pack back-to-back from
            </p>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Start time" />
            <Button size="sm" className="w-full rounded-full" disabled={!time} onClick={() => run({ startTime: time })}>
              Schedule {ids.length}
            </Button>
          </PopoverContent>
        </Popover>

        <Button size="sm" variant="ghost" className="h-8 shrink-0 gap-1.5 rounded-full" onClick={complete}>
          <Check className="h-3.5 w-3.5" /> Done
        </Button>
        <div className="h-5 w-px shrink-0 bg-border/60" />
        <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 rounded-full p-0" onClick={onClear} aria-label="Clear selection">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
