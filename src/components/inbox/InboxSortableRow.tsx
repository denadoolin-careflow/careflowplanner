import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { CheckSquare, Sparkles, Mic, Tag as TagIcon, Clock, MoreHorizontal, Check, CalendarDays, BarChart3 } from "lucide-react";
import { QuickTaskSheet } from "@/components/tasks/QuickTaskSheet";
import { AREA_ICONS } from "@/lib/area-icons";
import { format, isToday, isTomorrow } from "date-fns";
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

  const { toggleTask } = useStore() as any;
  const [quickOpen, setQuickOpen] = useState(false);
  const [doneFlash, setDoneFlash] = useState(false);
  const AreaIcon = task.area ? (AREA_ICONS as any)[task.area] : null;
  const dueText = (() => {
    if (!task.dueDate) return null;
    const d = new Date(task.dueDate + "T00:00:00");
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEE, MMM d");
  })();
  const prio = task.priority;
  const prioStyle = prio === "high"
    ? { background: "hsl(var(--rhythm-letgo-tint))", color: "hsl(var(--rhythm-letgo-deep))" }
    : prio === "medium"
    ? { background: "hsl(var(--rhythm-grow-tint))", color: "hsl(var(--rhythm-grow-deep))" }
    : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" };
  const done = task.done || doneFlash;

  const containerClass = cn(
    "group/inbox flex min-w-0 flex-col rounded-2xl border bg-card px-3 py-2.5 shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_6px_16px_-12px_hsl(var(--foreground)/0.18)] transition-all duration-200",
    selected ? "border-primary ring-2 ring-primary/30" : "border-border/50",
    done && "opacity-60",
  );
  void rowStyle;
  return (
    <div ref={setNodeRef} style={{ ...style, borderLeft: `4px solid hsl(var(--rhythm-${phase}-deep))` }} className={containerClass}>
      <div className="flex min-w-0 items-start gap-2.5">
        {selected ? (
          <button
            aria-label="Deselect"
            onClick={() => { toggle(task.id); haptics.tap?.(); }}
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckSquare className="h-3.5 w-3.5" /></span>
          </button>
        ) : (
          <button
            aria-label={task.done ? "Mark not done" : "Mark done"}
            onClick={async () => { haptics.snap?.(); if (!task.done) setDoneFlash(true); await toggleTask(task.id); setTimeout(() => setDoneFlash(false), 900); }}
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <span
              className={cn("flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-colors", done ? "border-transparent text-primary-foreground" : "")}
              style={done ? { background: `hsl(var(--rhythm-${phase}-deep))` } : { borderColor: `hsl(var(--rhythm-${phase}-deep) / 0.55)` }}
            >
              {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <QuickTaskSheet
            task={task}
            open={quickOpen}
            onOpenChange={setQuickOpen}
            anchor={
              <button
                type="button"
                onClick={() => setQuickOpen(true)}
                className={cn(
                  "block w-full min-w-0 whitespace-normal text-left text-[15px] font-semibold leading-snug text-foreground [overflow-wrap:break-word] [hyphens:auto]",
                  done && "line-through decoration-muted-foreground/60",
                )}
              >
                {task.title}
              </button>
            }
          />
          {task.area && (
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] text-muted-foreground">
              {AreaIcon && <AreaIcon className="h-3.5 w-3.5 shrink-0" />}
              <span className="min-w-0 [overflow-wrap:break-word]">{task.area}</span>
            </p>
          )}
        </div>
        <button
          aria-label={showMore ? "Hide options" : "More options"}
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
          className={cn(
            "-mr-2 -mt-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
            showMore && "text-primary",
          )}
        >
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", showMore ? "bg-primary/10" : "group-hover/inbox:bg-muted/60")}>
            <MoreHorizontal className="h-4 w-4" />
          </span>
        </button>
      </div>

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 border-t border-border/40 pl-[34px] pt-2 text-[11.5px] font-medium">
        {dueText ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "hsl(var(--rhythm-plan-tint))", color: "hsl(var(--rhythm-plan-deep))" }}>
            <CalendarDays className="h-3 w-3" /> {dueText}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "hsl(var(--rhythm-care-tint))", color: "hsl(var(--rhythm-care-deep))" }}>
            <CalendarDays className="h-3 w-3" /> Needs a date
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> {timeLabel}
        </span>
        {prio && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={prioStyle}>
            <BarChart3 className="h-3 w-3" /> {prio[0].toUpperCase() + prio.slice(1)}
          </span>
        )}
      </div>

      {showMore && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
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
