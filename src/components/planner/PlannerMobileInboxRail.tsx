import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Inbox, Rows3, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { usePlannerPointerDrag } from "@/lib/planner-touch-drag";
import { openTaskEditor } from "@/lib/open-task-editor";
import { resolveTaskIcon } from "@/lib/task-icons";
import type { Task } from "@/lib/types";

function RailChip({ task }: { task: Task }) {
  const ic = useMemo(() => resolveTaskIcon(task), [task]);
  const pointer = usePlannerPointerDrag(
    () => ({ taskId: task.id, label: task.title }),
    { onClick: () => openTaskEditor(task.id) },
  );
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => { e.dataTransfer.setData(TASK_DRAG_MIME, task.id); e.dataTransfer.effectAllowed = "copyMove"; haptics.pickup(); }}
      {...pointer}
      aria-label={`${task.title} — hold to drag onto the timeline`}
      className="flex max-w-[190px] shrink-0 touch-none items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1.5 text-[11.5px] shadow-sm active:scale-[0.98]"
    >
      {ic && ic.kind === "lucide" ? <ic.Icon className="h-3.5 w-3.5 shrink-0" />
        : ic && ic.kind === "emoji" ? <span className="shrink-0">{ic.char}</span> : null}
      <span className="min-w-0 truncate font-medium">{task.title}</span>
      {task.estMinutes ? <span className="shrink-0 text-[10px] text-muted-foreground">{task.estMinutes}m</span> : null}
    </button>
  );
}

/**
 * Mobile-only horizontal rail of unscheduled tasks, parked directly above the
 * timeline grid so a task can be long-pressed and dropped onto a time slot.
 */
export function PlannerMobileInboxRail({ className }: { className?: string }) {
  const { state } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [stacked, setStacked] = useState(false);

  const unscheduled = useMemo(
    () => state.tasks.filter(t =>
      !t.done && !t.parentTaskId && t.status !== "parked" &&
      !t.startTime && (t.inbox === true || !t.dueDate)
    ).slice(0, 30),
    [state.tasks],
  );

  if (!unscheduled.length) return null;

  return (
    <div className={cn("rounded-xl border border-border/60 bg-muted/30 px-2 py-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Inbox · {unscheduled.length}
        </span>
        <button
          type="button"
          onClick={() => setStacked(s => !s)}
          aria-pressed={stacked}
          aria-label={stacked ? "Show inbox as a row" : "Show inbox as a list"}
          className="ml-auto rounded-full p-1 text-muted-foreground"
        >
          {stacked ? <Columns3 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Show inbox tasks" : "Hide inbox tasks"}
          className="rounded-full p-1 text-muted-foreground"
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
      {!collapsed && (
        <div
          className={cn(
            "mt-1.5 gap-1.5 overscroll-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            stacked
              ? "flex max-h-40 flex-col overflow-y-auto"
              : "flex snap-x snap-mandatory overflow-x-auto",
          )}
        >
          {unscheduled.map(t => <RailChip key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}