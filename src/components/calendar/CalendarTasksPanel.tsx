import { useMemo } from "react";
import { useStore, todayISO } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { InlineTaskComposer } from "@/components/tasks/InlineTaskComposer";
import { ListTodo, AlertCircle, Sun, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { TASK_DRAG_MIME } from "./UnscheduledTasksRail";
import { useLongPressDrag } from "@/lib/long-press-drag";
import { GripVertical } from "lucide-react";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  days: Date[];
  title?: string;
}

export function CalendarTasksPanel({ days, title }: Props) {
  const { state } = useStore();
  const today = todayISO();
  const isoSet = useMemo(() => new Set(days.map(d => d.toISOString().slice(0, 10))), [days]);
  const { overdue, todayTasks, upcoming } = useMemo(() => {
    const all = state.tasks.filter(t => !t.parentTaskId && !t.done && t.dueDate);
    const inRange = (t: Task) => isoSet.has(t.dueDate!);
    const overdue = all
      .filter(t => t.dueDate! < today)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    const todayTasks = all
      .filter(t => t.dueDate === today && (isoSet.has(today) || days.length === 1));
    const upcoming = all
      .filter(t => t.dueDate! > today && inRange(t))
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    return { overdue, todayTasks, upcoming };
  }, [state.tasks, isoSet, today, days.length]);

  const total = overdue.length + todayTasks.length + upcoming.length;
  const defaultDate = days[0].toISOString().slice(0, 10);
  const heading = title ?? (days.length === 1 ? `Tasks · ${format(days[0], "MMM d")}` : `Tasks · ${format(days[0], "MMM d")} – ${format(days[days.length - 1], "MMM d")}`);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm sm:p-4">
      <header className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <ListTodo className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">{heading}</h3>
        <span className="text-[11px] text-muted-foreground">{total}</span>
      </header>
      <InlineTaskComposer defaults={{ dueDate: defaultDate }} placeholder="Add a task for this view…" />
      <div className="mt-3 space-y-4">
        {total === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            No tasks scheduled for this {days.length === 1 ? "day" : "range"}.
          </div>
        ) : (
          <>
            <TaskGroup
              label="Overdue"
              tone="overdue"
              icon={AlertCircle}
              tasks={overdue}
            />
            <TaskGroup
              label="Today"
              tone="today"
              icon={Sun}
              tasks={todayTasks}
            />
            <TaskGroup
              label="Upcoming"
              tone="upcoming"
              icon={CalendarClock}
              tasks={upcoming}
            />
          </>
        )}
      </div>
      {total > 0 && (
        <p className="mt-2 px-1 text-[10px] text-muted-foreground">
          Drag (or long-press on mobile) a task onto a time slot to schedule it.
        </p>
      )}
    </section>
  );
}

/* Section header + colored left rail, calibrated to the atmosphere palette. */
const TONE: Record<"overdue" | "today" | "upcoming", { dot: string; chip: string; text: string; rail: string }> = {
  overdue:  { dot: "bg-priority-high",   chip: "bg-priority-high/12 text-priority-high",   text: "text-priority-high",   rail: "before:bg-priority-high/70" },
  today:    { dot: "bg-priority-med",    chip: "bg-priority-med/12 text-priority-med",    text: "text-priority-med",    rail: "before:bg-priority-med/70" },
  upcoming: { dot: "bg-priority-low",    chip: "bg-priority-low/12 text-priority-low",    text: "text-priority-low",    rail: "before:bg-priority-low/60" },
};

function TaskGroup({
  label, tone, icon: Icon, tasks,
}: { label: string; tone: keyof typeof TONE; icon: React.ComponentType<{ className?: string }>; tasks: Task[] }) {
  if (!tasks.length) return null;
  const t = TONE[tone];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-1">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]", t.chip)}>
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{tasks.length}</span>
      </div>
      <div className={cn("relative space-y-1 rounded-xl", "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full", t.rail)}>
        <div className="space-y-1 pl-2">
          {tasks.map(task => <SchedulableTaskRow key={task.id} task={task} />)}
        </div>
      </div>
    </div>
  );
}

/** Wraps a TaskRow so it can be dragged onto TimeGrid / DayParts / Agenda views.
 *  Uses HTML5 drag on desktop and long-press-drag (with haptics) on touch. */
function SchedulableTaskRow({ task }: { task: Task }) {
  const drag = useLongPressDrag(
    () => ({ type: "task", id: task.id, label: task.title }),
  );
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
        e.dataTransfer.setData("text/plain", task.title);
        e.dataTransfer.effectAllowed = "move";
      }}
      onPointerDown={drag.onPointerDown}
      className={cn(
        "group relative flex items-stretch gap-0 rounded-xl",
        "touch-none cursor-grab active:cursor-grabbing",
      )}
      title="Drag onto a time slot to schedule"
    >
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-60">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <TaskRow task={task} dense />
      </div>
    </div>
  );
}