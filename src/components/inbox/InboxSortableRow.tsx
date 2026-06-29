import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Circle, CheckSquare, Sparkles, Mic, Tag as TagIcon, Clock, CalendarPlus } from "lucide-react";
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

interface Props {
  task: Task;
  autoDayPart: DayPart;
}

/**
 * Inbox row wrapper: selection checkbox on the left
 * + one-tap "When" reschedule popover on the right.
 */
export function InboxSortableRow({ task, autoDayPart }: Props) {
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

  const containerClass = cn(
    "group/inbox flex flex-col gap-3 transition-all duration-200",
    rowStyle === "soft" && cn(
      "rounded-[22px] border bg-card p-3 shadow-sm hover:shadow-md hover:border-border sm:p-4",
      selected
        ? "border-2 border-primary shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.45)]"
        : "border-border/60",
    ),
    rowStyle === "minimal" && cn(
      "rounded-md border-b border-border/40 bg-transparent px-1 py-2 hover:bg-muted/30",
      selected && "bg-primary/5 border-b-primary/40",
    ),
    rowStyle === "cozy" && cn(
      "rounded-2xl border bg-gradient-to-br from-primary/[0.06] via-card to-card p-3 shadow-[0_4px_20px_-12px_hsl(var(--primary)/0.35)] hover:from-primary/[0.1] sm:p-4",
      selected
        ? "border-primary/60 ring-2 ring-primary/30"
        : "border-primary/20",
    ),
  );
  return (
    <div ref={setNodeRef} style={style} className={containerClass}>
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Selection indicator */}
        <div className="flex flex-col items-center pt-1">
          <button
            aria-label={selected ? "Deselect" : "Select"}
            title={selected ? "Deselect" : "Select"}
            onClick={() => {
              toggle(task.id);
              haptics.tap?.();
            }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-all",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-muted/50",
            )}
          >
            {selected ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <TaskRow task={task} variant="card" />
        </div>
        {/* Tiny native HTML5 drag handle to drop the task on schedule targets
            (e.g. Needs Scheduling card). Uses HTML5 drag so it doesn't fight
            with dnd-kit's pointer-based row sort. */}
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
          className="mt-1 hidden h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground/80 active:cursor-grabbing sm:inline-flex"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Meta row below the task: source + age (left), When picker (right) */}
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          rowStyle === "minimal"
            ? "pt-1"
            : "border-t border-border/40 pt-3",
        )}
      >
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
        <div className="ml-auto shrink-0">
          <WhenPopover
            value={{ date: task.dueDate, dayPart: (task.dayPart as DayPart) ?? autoDayPart }}
            autoDayPart={autoDayPart}
            onChange={async (v) => {
              await updateTask(task.id, {
                dueDate: v.date ?? undefined,
                dayPart: v.dayPart,
                // Keep the item in the inbox after scheduling so the user can
                // see it move into the "Scheduled for today" / dated sections
                // until they intentionally process it out.
              });
              haptics.snap?.();
              toast(v.date ? `Scheduled · ${v.dayPart}` : `Set time of day · ${v.dayPart}`, { description: task.title });
            }}
          />
        </div>
      </div>
    </div>
  );
}
