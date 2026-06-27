import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckSquare, Square, Sparkles, Mic, Tag as TagIcon, Clock } from "lucide-react";
import { TaskRow } from "@/components/cards/TaskRow";
import { WhenPopover, type DayPart } from "@/components/inbox/WhenPopover";
import { useStore } from "@/lib/store";
import { useTaskSelection } from "@/lib/task-selection";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface Props {
  task: Task;
  autoDayPart: DayPart;
}

/**
 * Inbox row wrapper: drag handle (sortable) + selection checkbox (in select mode)
 * + one-tap "When" reschedule popover on the right.
 */
export function InboxSortableRow({ task, autoDayPart }: Props) {
  const { updateTask } = useStore() as any;
  const { selectionMode, isSelected, toggle } = useTaskSelection();
  const sortableId = `inbox:${task.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/inbox flex flex-col gap-1.5 rounded-xl px-0.5 py-1 mb-2 last:mb-0 transition-colors",
        selected && "bg-primary/5",
      )}
    >
      <div className="flex items-stretch gap-1">
        {/* Drag handle (sortable) */}
        <button
          {...listeners}
          {...attributes}
          aria-label="Reorder"
          title="Drag to reorder"
          className="mt-2 grid h-6 w-4 shrink-0 cursor-grab place-items-center rounded text-muted-foreground/40 transition-opacity hover:text-muted-foreground sm:opacity-60 sm:group-hover/inbox:opacity-100 active:cursor-grabbing"
          onPointerDown={() => haptics.tap?.()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Selection toggle — always available, next to the drag handle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggle(task.id, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey }); }}
          aria-label={selected ? "Deselect" : "Select"}
          title={selected ? "Deselect" : "Select"}
          className={cn(
            "mt-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ring-1 transition-colors",
            selected
              ? "bg-primary/15 text-primary ring-primary/40 opacity-100"
              : "bg-background/60 text-muted-foreground/70 ring-border/60 hover:text-foreground sm:opacity-60 sm:group-hover/inbox:opacity-100",
            selectionMode && "opacity-100",
          )}
        >
          {selected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <TaskRow task={task} />
        </div>
      </div>

      {/* Meta row below the task: source + age (left), When picker (right) */}
      <div className="ml-12 mr-1 flex items-center justify-between gap-2">
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