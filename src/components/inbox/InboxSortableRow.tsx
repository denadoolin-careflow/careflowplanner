import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { CheckSquare, Sparkles, Mic, Tag as TagIcon, Clock, CalendarPlus, MoreHorizontal } from "lucide-react";
import { TaskRow } from "@/components/cards/TaskRow";
import { WhenPopover, type DayPart } from "@/components/inbox/WhenPopover";
import { useStore } from "@/lib/store";
import { useTaskSelection } from "@/lib/task-selection";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { useInboxRowStyle } from "@/lib/inbox-row-style";
import { TaskQuickActions } from "@/components/tasks/TaskQuickActions";

interface Props {
  task: Task;
  autoDayPart: DayPart;
  compact?: boolean;
}

/**
 * Inbox row wrapper: selection checkbox on the left
 * + one-tap "When" reschedule popover on the right.
 */
export function InboxSortableRow({ task, autoDayPart, compact = false }: Props) {
  const { updateTask } = useStore() as any;
  const { isSelected, toggle } = useTaskSelection();
  const [rowStyle] = useInboxRowStyle();
  const sortableId = `inbox:${task.id}`;
  const { setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  const selected = isSelected(task.id);
  const [showMore, setShowMore] = useState(false);

  // Source backlink — derive from tags/markers so the row tells you where it came from.
  const tags = (task.tags ?? []).map((t) => t.toLowerCase());
  const source: { icon: typeof Sparkles; label: string } | null =
    tags.includes("voice") ? { icon: Mic, label: "voice" }
      : tags.includes("preset") || tags.includes("quick") ? { icon: Sparkles, label: "quick" }
      : tags.length ? { icon: TagIcon, label: tags[0] }
      : null;
  const ageLabel = (() => {
    if (!task.createdAt) return null;
    try { return formatDistanceToNow(new Date(task.createdAt), { addSuffix: true }); }
    catch { return null; }
  })();

  const dp = (task.dayPart as DayPart) ?? autoDayPart;
  const phase = dp === "Morning" ? "plan" : dp === "Afternoon" ? "grow" : "care";
  const timeLabel = task.startTime
    ? (() => { const [h, m] = task.startTime!.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}${h < 12 ? "a" : "p"}`; })()
    : task.dayPart ?? "Anytime";

  const containerClass = cn(
    "group/inbox flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm transition-all duration-200 hover:shadow-md",
    selected ? "border-primary ring-2 ring-primary/30" : "border-border/60",
  );
  void rowStyle;
  return (
    <div ref={setNodeRef} style={{ ...style, borderLeft: `4px solid hsl(var(--rhythm-${phase}-deep))` }} className={containerClass}>
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Selection indicator — only while selecting (via "Select all") */}
        {selected && (
          <div className="flex flex-col items-center pt-1">
            <button
              aria-label="Deselect"
              title="Deselect"
              onClick={() => { toggle(task.id); haptics.tap?.(); }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        )}


        {/* Time pill tinted by phase (Planner style) */}
        <span
          className="mt-2 w-[58px] shrink-0 rounded-full py-1 text-center font-serif text-[11px] leading-tight"
          style={{ background: `hsl(var(--rhythm-${phase}-tint))`, color: `hsl(var(--rhythm-${phase}-deep))` }}
        >
          {timeLabel}
        </span>
        <div className="min-w-0 flex-1">
          <TaskRow task={task} variant="ticktick" showHoverActions={false} tapAction="quickEdit" />
        </div>
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("application/x-careflow-task", task.id);
            e.dataTransfer.setData("text/plain", task.title);
            haptics.tap?.();
          }}
          title="Drag to schedule"
          aria-label="Drag to schedule"
          className="mt-1 hidden h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full text-muted-foreground/40 hover:bg-muted/50 active:cursor-grabbing sm:inline-flex"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
        </span>
        <button
          aria-label={showMore ? "Hide options" : "More options"}
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
          className="flex h-11 w-11 -mr-2 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {showMore && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
          {(source || ageLabel) && (
            <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground/80">
              {source && (
                <span className="inline-flex items-center gap-1">
                  <source.icon className="h-3 w-3" />
                  <span className="capitalize">{source.label}</span>
                </span>
              )}
              {ageLabel && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {ageLabel}
                </span>
              )}
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <WhenPopover
              value={{ date: task.dueDate, dayPart: (task.dayPart as DayPart) ?? autoDayPart }}
              autoDayPart={autoDayPart}
              onChange={async (v) => {
                await updateTask(task.id, { dueDate: v.date ?? undefined, dayPart: v.dayPart });
                haptics.snap?.();
                toast(v.date ? `Scheduled · ${v.dayPart}` : `Set time of day · ${v.dayPart}`, { description: task.title });
              }}
            />
            <TaskQuickActions task={task} />
          </div>
        </div>
      )}
    </div>

  );
}
