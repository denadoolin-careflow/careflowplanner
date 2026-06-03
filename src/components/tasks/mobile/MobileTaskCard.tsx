import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { TagChip } from "@/components/tags/TagChip";
import {
  SwipeableList, SwipeableListItem, LeadingActions, TrailingActions,
  SwipeAction, Type as SwipeType,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import { Check, Pencil, Trash2 } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { playCompletionChime } from "@/lib/completion-sound";
import { toast } from "sonner";

const DOTS: Record<Task["priority"], number> = { low: 0, medium: 1, high: 2 };

function dueLabel(d?: string) {
  if (!d) return null;
  try {
    const dt = parseISO(d);
    if (isToday(dt)) return "Today";
    if (isTomorrow(dt)) return "Tomorrow";
    return format(dt, "MMM d");
  } catch { return null; }
}

/** Simplified mobile task card — checkbox, title, meta. Tap → /tasks/:id */
export function MobileTaskCard({ task }: { task: Task }) {
  const { toggleTask, deleteTask, updateTask, addTask, state } = useStore();
  const navigate = useNavigate();
  const proj = task.projectId ? state.projects?.find(p => p.id === task.projectId) : undefined;
  const dl = dueLabel(task.dueDate);
  const dueClass = (() => {
    if (!task.dueDate) return "text-muted-foreground";
    try {
      const dt = parseISO(task.dueDate);
      if (dt.getTime() < Date.now() - 1000*60*60*24 && !isToday(dt)) return "text-rose-500";
      return "text-amber-600";
    } catch { return "text-muted-foreground"; }
  })();

  const handleComplete = async () => {
    const wasDone = task.done;
    const prevLastCompletedAt = task.lastCompletedAt;
    haptics.success();
    if (!wasDone) playCompletionChime();
    await toggleTask(task.id);
    toast(wasDone ? "Reopened" : "Completed", {
      description: task.title,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          haptics.tap();
          void updateTask(task.id, { done: wasDone, lastCompletedAt: prevLastCompletedAt });
        },
      },
    });
  };

  const handleDelete = async () => {
    const snapshot: Partial<Task> = {
      title: task.title, notes: task.notes, dueDate: task.dueDate,
      startTime: task.startTime, priority: task.priority, area: task.area,
      tags: task.tags, energy: task.energy, estMinutes: task.estMinutes,
      projectId: task.projectId, parentTaskId: task.parentTaskId,
      inbox: task.inbox, status: task.status,
    };
    haptics.delete();
    await deleteTask(task.id);
    toast("Deleted", {
      description: task.title,
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          haptics.tap();
          void addTask({ title: task.title, ...snapshot } as any);
        },
      },
    });
  };

  const card = (
    <button
      type="button"
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="cf-card w-full text-left p-4 active:scale-[0.995] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div onClick={(e) => { e.stopPropagation(); void toggleTask(task.id); }} className="pt-0.5">
          <Checkbox checked={task.done} className="h-5 w-5 rounded-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[15px] leading-snug", task.done && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
            {proj ? (
              <span className="text-muted-foreground">{proj.name}</span>
            ) : (
              <span className="text-muted-foreground">{task.area}</span>
            )}
            {dl && <><span className="text-muted-foreground/50">·</span><span className={cn("font-medium", dueClass)}>{dl}</span></>}
            {DOTS[task.priority] > 0 && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: DOTS[task.priority] }).map((_, i) => (
                  <span key={i} className={cn("h-1.5 w-1.5 rounded-full", task.priority === "high" ? "bg-rose-500" : "bg-amber-500")} />
                ))}
              </span>
            )}
            {(task.tags ?? []).slice(0, 2).map(t => (
              <TagChip key={t} name={t} subtle size="sm" />
            ))}
          </div>
        </div>
      </div>
    </button>
  );

  const leading = (
    <LeadingActions>
      <SwipeAction onClick={handleComplete}>
        <div className="flex h-full w-full items-center gap-2 rounded-l-[22px] bg-primary px-5 text-sm font-medium text-primary-foreground">
          <Check className="h-4 w-4" /> {task.done ? "Reopen" : "Complete"}
        </div>
      </SwipeAction>
    </LeadingActions>
  );

  const trailing = (
    <TrailingActions>
      <SwipeAction onClick={() => { haptics.tap(); navigate(`/tasks/${task.id}`); }}>
        <div className="flex h-full w-full items-center justify-end gap-2 bg-secondary px-5 text-sm font-medium text-secondary-foreground">
          <Pencil className="h-4 w-4" /> Edit
        </div>
      </SwipeAction>
      <SwipeAction destructive onClick={handleDelete}>
        <div className="flex h-full w-full items-center justify-end gap-2 rounded-r-[22px] bg-destructive px-5 text-sm font-medium text-destructive-foreground">
          <Trash2 className="h-4 w-4" /> Delete
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  return (
    <SwipeableList type={SwipeType.IOS} fullSwipe={false} threshold={0.25} className="!bg-transparent">
      <SwipeableListItem
        leadingActions={leading}
        trailingActions={trailing}
        onSwipeStart={() => haptics.swipe()}
        className="overflow-hidden rounded-[22px]"
      >
        {card}
      </SwipeableListItem>
    </SwipeableList>
  );
}