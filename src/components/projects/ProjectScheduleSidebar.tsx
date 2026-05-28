import { useMemo, useState } from "react";
import { CalendarIcon, CalendarPlus, Clock, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tasks: Task[];
  projectName: string;
}

export function ProjectScheduleSidebar({ open, onOpenChange, tasks, projectName }: Props) {
  const { updateTask } = useStore();

  const { unscheduled, scheduled } = useMemo(() => {
    const active = tasks.filter(t => !t.done);
    return {
      unscheduled: active.filter(t => !t.dueDate),
      scheduled: active
        .filter(t => !!t.dueDate)
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
    };
  }, [tasks]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 p-5">
          <SheetTitle className="flex items-center gap-2 text-base">
            <CalendarPlus className="h-4 w-4 text-primary" /> Schedule tasks
          </SheetTitle>
          <SheetDescription className="text-xs">
            Drop tasks from <span className="font-medium text-foreground">{projectName}</span> onto your calendar by setting dates and times.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <Section
            title="Needs scheduling"
            count={unscheduled.length}
            empty="Everything in this project already has a date. ✨"
            tasks={unscheduled}
            updateTask={updateTask}
          />
          <Section
            title="On the schedule"
            count={scheduled.length}
            empty="No tasks scheduled yet."
            tasks={scheduled}
            updateTask={updateTask}
            showClear
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title, count, empty, tasks, updateTask, showClear,
}: {
  title: string;
  count: number;
  empty: string;
  tasks: Task[];
  updateTask: (id: string, p: Partial<Task>) => Promise<void>;
  showClear?: boolean;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{count}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground/80">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map(t => (
            <ScheduleRow key={t.id} task={t} updateTask={updateTask} showClear={showClear} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ScheduleRow({
  task, updateTask, showClear,
}: { task: Task; updateTask: (id: string, p: Partial<Task>) => Promise<void>; showClear?: boolean }) {
  const [open, setOpen] = useState(false);
  const date = task.dueDate ? parseISO(task.dueDate) : undefined;

  const setDate = async (d?: Date) => {
    const iso = d ? format(d, "yyyy-MM-dd") : undefined;
    await updateTask(task.id, { dueDate: iso });
    setOpen(false);
    if (iso) toast.success(`Scheduled for ${format(d!, "EEE, MMM d")}`);
  };

  const setTime = async (time: string) => {
    await updateTask(task.id, { startTime: time || undefined });
  };

  return (
    <li className="rounded-xl border border-border/60 bg-background/60 p-2.5 animate-fade-in">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{task.title}</div>
          {date && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              <span>{format(date, "EEE, MMM d")}</span>
              {task.startTime && (
                <>
                  <span>·</span>
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{task.startTime}</span>
                </>
              )}
            </div>
          )}
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <CalendarIcon className="h-3 w-3" /> {date ? "Reschedule" : "Schedule"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
      <div className={cn("mt-2 flex items-center gap-2", !date && "opacity-60 pointer-events-none")}>
        <Clock className="h-3 w-3 text-muted-foreground" />
        <Input
          type="time"
          value={task.startTime ?? ""}
          onChange={(e) => setTime(e.target.value)}
          className="h-7 max-w-[8rem] text-xs"
          disabled={!date}
        />
        {showClear && date && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 text-[11px] text-muted-foreground"
            onClick={() => updateTask(task.id, { dueDate: undefined, startTime: undefined })}
          >
            <X className="h-3 w-3" /> Unschedule
          </Button>
        )}
      </div>
    </li>
  );
}