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
import { useInboxRowStyle } from "@/lib/inbox-row-style";

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
  const [rowStyle] = useInboxRowStyle();
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

  const containerClass = cn(
    "group/inbox flex flex-col gap-3 transition-all duration-200",
    rowStyle === "soft" && cn(
      "rounded-[22px] border bg-card p-4 shadow-sm hover:shadow-md hover:border-border",
      selected
        ? "border-2 border-primary shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.45)]"
        : "border-border/60",
    ),
    rowStyle === "minimal" && cn(
      "rounded-md border-b border-border/40 bg-transparent px-1 py-2 hover:bg-muted/30",
      selected && "bg-primary/5 border-b-primary/40",
    ),
    rowStyle === "cozy" && cn(
      "rounded-2xl border bg-gradient-to-br from-primary/[0.06] via-card to-card p-4 shadow-[0_4px_20px_-12px_hsl(var(--primary)/0.35)] hover:from-primary/[0.1]",
      selected
        ? "border-primary/60 ring-2 ring-primary/30"
        : "border-primary/20",
    ),
  );
  return (
    <div ref={setNodeRef} style={style} className={containerClass}>
      <div className="flex items-start gap-3">
        {/* Symmetric left control column: drag dots + selection dot */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            {...listeners}
            {...attributes}
            aria-label="Reorder"
            title="Drag to reorder"
            className="grid h-5 w-4 cursor-grab place-items-center rounded text-muted-foreground/40 transition-opacity hover:text-muted-foreground/90 sm:opacity-60 sm:group-hover/inbox:opacity-100 active:cursor-grabbing"
            onPointerDown={() => haptics.tap?.()}
          >
            <div className="grid grid-cols-2 gap-[2px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
              ))}
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggle(task.id, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey }); }}
            aria-label={selected ? "Deselect" : "Select"}
            title={selected ? "Deselect" : "Select"}
            className={cn(
              "grid h-5 w-5 place-items-center rounded-full border bg-background transition-colors",
              selected
                ? "border-primary"
                : "border-border/70 text-muted-foreground/70 hover:border-foreground/40 sm:opacity-70 sm:group-hover/inbox:opacity-100",
              selectionMode && "opacity-100",
            )}
          >
            {selected ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <TaskRow task={task} variant="card" />
        </div>
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