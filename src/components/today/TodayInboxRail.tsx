import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Inbox, GripVertical, ArrowRight, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { usePlannerPointerDrag } from "@/lib/planner-touch-drag";
import { openTaskQuickEdit } from "@/lib/open-task-quick-edit";
import type { Task } from "@/lib/types";

/**
 * Compact rail of unscheduled + overdue tasks that sits right above the
 * Today time grid. Drag a chip onto the grid to schedule it; tap to quick-edit.
 */
export function TodayInboxRail({ date, className }: { date: Date; className?: string }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const tasks = useMemo(() => {
    const out: { task: Task; overdue: boolean }[] = [];
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId) continue;
      if ((t as any).startTime && t.dueDate === iso) continue; // already placed on the grid
      if (!t.dueDate) out.push({ task: t, overdue: false });
      else if (t.dueDate < iso) out.push({ task: t, overdue: true });
      else if (t.dueDate === iso) out.push({ task: t, overdue: false });
    }
    return out
      .sort((a, b) => Number(b.overdue) - Number(a.overdue))
      .slice(0, 30);
  }, [state.tasks, iso]);

  if (tasks.length === 0) return null;

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card/60 p-2 backdrop-blur-sm", className)}>
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <Inbox className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11.5px] font-semibold tracking-tight">Inbox</span>
        <span className="rounded-full bg-primary/10 px-1.5 text-[10.5px] tabular-nums text-primary">{tasks.length}</span>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">Drag onto the grid to schedule</span>
        <Link
          to="/inbox"
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {tasks.map(({ task, overdue }) => (
          <RailChip key={task.id} task={task} overdue={overdue} />
        ))}
      </div>
    </div>
  );
}

function RailChip({ task, overdue }: { task: Task; overdue: boolean }) {
  const drag = usePlannerPointerDrag(
    () => ({ taskId: task.id, label: task.title }),
    { onClick: () => openTaskQuickEdit(task.id) },
  );

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
        e.dataTransfer.setData("text/plain", task.title);
        e.dataTransfer.effectAllowed = "move";
        haptics.pickup?.();
      }}
      onPointerDown={drag.onPointerDown}
      title="Drag onto the grid · tap to edit"
      aria-label={`${task.title} — drag onto the grid to schedule, or tap to edit`}
      className={cn(
        "group inline-flex max-w-[15rem] shrink-0 touch-none items-center gap-1.5 rounded-full border px-2.5 py-1.5",
        "cursor-grab text-left text-[12px] transition active:cursor-grabbing active:scale-[0.98]",
        overdue
          ? "border-priority-high/30 bg-priority-high/10 text-priority-high"
          : "border-border/60 bg-background/70 hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      {overdue
        ? <AlertCircle className="h-3 w-3 shrink-0" />
        : <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
      <span className="truncate">{task.title}</span>
    </button>
  );
}
