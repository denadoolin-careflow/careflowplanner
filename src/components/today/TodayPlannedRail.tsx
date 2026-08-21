import { useMemo } from "react";
import { format } from "date-fns";
import { CalendarClock, GripVertical, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { usePlannerPointerDrag } from "@/lib/planner-touch-drag";
import { openTaskQuickEdit } from "@/lib/open-task-quick-edit";
import type { Task } from "@/lib/types";

/**
 * Tasks already planned for today, sitting right beside the inbox rail so you
 * can drag them to a new hour on the grid or tick them off in place.
 */
export function TodayPlannedRail({ date, className }: { date: Date; className?: string }) {
  const { state, updateTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const tasks = useMemo(() => {
    return state.tasks
      .filter(t => !t.parentTaskId && t.dueDate === iso && (!!(t as any).startTime || !!(t as any).dayPart))
      .sort((a, b) => ((a as any).startTime ?? "zz").localeCompare((b as any).startTime ?? "zz"));
  }, [state.tasks, iso]);

  if (tasks.length === 0) return null;

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card/60 p-2 backdrop-blur-sm", className)}>
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <CalendarClock className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11.5px] font-semibold tracking-tight">Planned today</span>
        <span className="rounded-full bg-primary/10 px-1.5 text-[10.5px] tabular-nums text-primary">{tasks.length}</span>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">Drag to a new time on the grid</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {tasks.map(task => (
          <PlannedChip key={task.id} task={task} onToggle={() => updateTask(task.id, { done: !task.done })} />
        ))}
      </div>
    </div>
  );
}

function PlannedChip({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const drag = usePlannerPointerDrag(
    () => ({ taskId: task.id, label: task.title }),
    { onClick: () => openTaskQuickEdit(task.id) },
  );
  const time = (task as any).startTime as string | undefined;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
        e.dataTransfer.setData("text/plain", task.title);
        e.dataTransfer.effectAllowed = "move";
        haptics.pickup?.();
      }}
      onPointerDown={drag.onPointerDown}
      className={cn(
        "group inline-flex max-w-[16rem] shrink-0 touch-none items-center gap-1.5 rounded-full border px-2.5 py-1.5",
        "cursor-grab text-left text-[12px] transition active:cursor-grabbing active:scale-[0.98]",
        task.done
          ? "border-border/50 bg-muted/40 text-muted-foreground line-through"
          : "border-primary/25 bg-primary/5 hover:border-primary/50",
      )}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); haptics.success?.(); }}
        aria-label={task.done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
        className={cn(
          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          task.done ? "border-transparent bg-primary" : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {task.done && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
      </button>
      {time && <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{time.slice(0, 5)}</span>}
      <span className="truncate">{task.title}</span>
      <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden />
    </div>
  );
}
