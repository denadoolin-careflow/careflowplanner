import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { InlineTaskComposer } from "@/components/tasks/InlineTaskComposer";
import { TASK_DRAG_MIME } from "./UnscheduledTasksRail";
import { useLongPressDrag } from "@/lib/long-press-drag";
import { GripVertical, CheckCircle2, CircleDashed, ListTodo } from "lucide-react";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Tasks due (open) and completed on a given ISO date, with the same
 *  draggable/editable/hover behavior used in the other calendar panels. */
export function DayTasksPanel({ iso }: { iso: string }) {
  const { state } = useStore();

  const { due, completed } = useMemo(() => {
    const due: Task[] = [];
    const completed: Task[] = [];
    for (const t of state.tasks) {
      if (t.parentTaskId) continue;
      const completedOn = t.lastCompletedAt ? t.lastCompletedAt.slice(0, 10) : null;
      if (t.done && completedOn === iso) completed.push(t);
      else if (!t.done && t.dueDate === iso) due.push(t);
    }
    return { due, completed };
  }, [state.tasks, iso]);

  const total = due.length + completed.length;

  return (
    <section className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm">
      <header className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <ListTodo className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">Tasks for this day</h3>
        <span className="text-[11px] text-muted-foreground">{total}</span>
      </header>
      <InlineTaskComposer defaults={{ dueDate: iso }} placeholder="Add a task for this day…" />
      <div className="mt-3 space-y-4">
        {total === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            No tasks yet for this day.
          </div>
        )}
        <Group label="Due" tone="due" icon={CircleDashed} tasks={due} />
        <Group label="Completed" tone="done" icon={CheckCircle2} tasks={completed} />
      </div>
      {total > 0 && (
        <p className="mt-2 px-1 text-[10px] text-muted-foreground">
          Tap a task to edit. Drag (or long-press on mobile) to reschedule.
        </p>
      )}
    </section>
  );
}

const TONE: Record<"due" | "done", { chip: string; rail: string }> = {
  due:  { chip: "bg-priority-med/12 text-priority-med",   rail: "before:bg-priority-med/70" },
  done: { chip: "bg-emerald-500/12 text-emerald-700",     rail: "before:bg-emerald-500/60" },
};

function Group({
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
          {tasks.map(task => <DraggableTaskRow key={task.id} task={task} />)}
        </div>
      </div>
    </div>
  );
}

function DraggableTaskRow({ task }: { task: Task }) {
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
      className="group relative flex items-stretch gap-0 rounded-xl touch-none cursor-grab active:cursor-grabbing"
      title="Drag to reschedule"
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