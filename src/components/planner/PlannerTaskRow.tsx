import { useMemo } from "react";
import { Star, Clock, GripVertical, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { resolveTaskIcon } from "@/lib/task-icons";
import { openTaskEditor } from "@/lib/open-task-editor";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { haptics } from "@/lib/haptics";
import { format, parseISO } from "date-fns";

const AREA_TINTS: Record<string, string> = {
  Family: "bg-amber-400",
  Kids: "bg-amber-500",
  Caregiving: "bg-violet-400",
  Home: "bg-emerald-400",
  Meals: "bg-yellow-400",
  Appointments: "bg-violet-400",
  Personal: "bg-sky-400",
  "Creative Projects": "bg-fuchsia-400",
  Money: "bg-lime-500",
  "Holidays & Birthdays": "bg-rose-400",
};

export function PlannerTaskRow({ task, compact }: { task: Task; compact?: boolean }) {
  const { toggleTask, updateTask } = useStore();
  const ic = useMemo(() => resolveTaskIcon(task), [task]);
  const tint = AREA_TINTS[task.area] ?? "bg-muted-foreground/40";

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
    e.dataTransfer.effectAllowed = "copyMove";
    haptics.pickup();
  };
  const onDragEnd = () => {
    haptics.snap();
  };

  const due = task.dueDate ? format(parseISO(task.dueDate), "MMM d") : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => openTaskEditor(task.id)}
      className={cn(
        "group flex cursor-pointer items-start gap-2 rounded-lg border border-border/50 bg-card/70 px-2 py-1.5 text-[13px] transition-colors hover:border-primary/40 hover:bg-card",
        task.done && "opacity-60",
      )}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100" aria-hidden />
      <button
        onClick={(e) => { e.stopPropagation(); void toggleTask(task.id); }}
        aria-label={task.done ? "Mark not done" : "Mark done"}
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
          task.done ? "border-primary bg-primary" : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {task.done && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" aria-hidden />}
      </button>
      <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", tint)} aria-hidden />
      {ic.kind === "lucide" ? <ic.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden /> : <span className="mt-0.5 shrink-0 text-sm leading-none" aria-hidden>{ic.char}</span>}
      <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere] whitespace-normal break-words", compact && "line-clamp-1", task.done && "line-through")}>
        {task.title}
      </span>
      <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
        {task.recurrenceType && task.recurrenceType !== "none" && <Repeat className="h-3 w-3" aria-hidden />}
        {task.estMinutes && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 font-mono">
            <Clock className="h-2.5 w-2.5" />{task.estMinutes}m
          </span>
        )}
        {due && <span className="font-mono">{due}</span>}
        <button
          onClick={(e) => { e.stopPropagation(); void updateTask(task.id, { isTopThree: !task.isTopThree }); }}
          aria-label="Toggle star"
          className={cn("rounded p-0.5 hover:bg-muted", task.isTopThree ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500")}
        >
          <Star className={cn("h-3.5 w-3.5", task.isTopThree && "fill-current")} />
        </button>
      </div>
    </div>
  );
}