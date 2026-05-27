import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { InlineTaskComposer } from "@/components/tasks/InlineTaskComposer";
import { ListTodo } from "lucide-react";
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
  const isoSet = useMemo(() => new Set(days.map(d => d.toISOString().slice(0, 10))), [days]);
  const tasks = useMemo(
    () => state.tasks.filter(t => !t.parentTaskId && !t.done && t.dueDate && isoSet.has(t.dueDate))
                     .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
    [state.tasks, isoSet],
  );

  const defaultDate = days[0].toISOString().slice(0, 10);
  const heading = title ?? (days.length === 1 ? `Tasks · ${format(days[0], "MMM d")}` : `Tasks · ${format(days[0], "MMM d")} – ${format(days[days.length - 1], "MMM d")}`);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4">
      <header className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <ListTodo className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">{heading}</h3>
        <span className="text-[11px] text-muted-foreground">{tasks.length}</span>
      </header>
      <InlineTaskComposer defaults={{ dueDate: defaultDate }} placeholder="Add a task for this view…" />
      <div className="mt-2 space-y-1">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            No tasks scheduled for this {days.length === 1 ? "day" : "range"}.
          </div>
        ) : tasks.map(t => <SchedulableTaskRow key={t.id} task={t} />)}
      </div>
      {tasks.length > 0 && (
        <p className="mt-2 px-1 text-[10px] text-muted-foreground">
          Drag (or long-press on mobile) a task onto a time slot to schedule it.
        </p>
      )}
    </section>
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