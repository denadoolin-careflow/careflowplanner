import { useMemo } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { CalendarRange, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { useStore } from "@/lib/store";

function DateField({
  label, value, onChange, min, max,
}: { label: string; value?: string; onChange: (iso?: string) => void; min?: string; max?: string }) {
  const date = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 w-full justify-start gap-2 text-xs", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">
            <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">{label}</span>
            <span className="text-sm font-medium">
              {date ? format(date, "MMM d, yyyy") : "Pick a date"}
            </span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : undefined)}
          disabled={(d) => {
            if (min && format(d, "yyyy-MM-dd") < min) return true;
            if (max && format(d, "yyyy-MM-dd") > max) return true;
            return false;
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => onChange(undefined)}>
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TimelineCard({ project, doneCount, totalCount }: { project: Project; doneCount: number; totalCount: number }) {
  const { updateProject } = useStore();
  const end = project.endDate ?? project.deadline;

  const { duration, elapsedPct, daysLeft, status } = useMemo(() => {
    if (!project.startDate || !end) return { duration: null, elapsedPct: 0, daysLeft: null, status: null as null | string };
    const start = parseISO(project.startDate);
    const finish = parseISO(end);
    const total = Math.max(1, differenceInCalendarDays(finish, start));
    const elapsed = differenceInCalendarDays(new Date(), start);
    const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
    const left = differenceInCalendarDays(finish, new Date());
    return {
      duration: total,
      elapsedPct: pct,
      daysLeft: left,
      status: left < 0 ? "Past finish" : left === 0 ? "Finish today" : `${left} day${left === 1 ? "" : "s"} left`,
    };
  }, [project.startDate, end]);

  const taskPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4 animate-fade-in">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5 text-primary" /> Timeline
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <DateField
          label="Start"
          value={project.startDate}
          max={end}
          onChange={(d) => updateProject(project.id, { startDate: d })}
        />
        <DateField
          label="Finish"
          value={end}
          min={project.startDate}
          onChange={(d) => updateProject(project.id, { endDate: d, deadline: d })}
        />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Time elapsed{duration != null ? ` · ${duration} day${duration === 1 ? "" : "s"}` : ""}</span>
            <span className="tabular-nums">{status ?? "Set dates to track"}</span>
          </div>
          <Progress value={duration ? elapsedPct : 0} className="h-1.5" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Tasks complete</span>
            <span className="tabular-nums">{doneCount}/{totalCount}</span>
          </div>
          <Progress value={taskPct} className="h-1.5" />
        </div>
      </div>
    </section>
  );
}