import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Trash2, GripVertical, ChevronRight, Sparkle,
  Pencil, Snowflake, Star, FolderInput,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { PomodoroTimer } from "@/components/tasks/PomodoroTimer";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import { pickAffirmation } from "@/lib/affirmations";
import { Input } from "@/components/ui/input";
import { QuickTaskSheet } from "@/components/tasks/QuickTaskSheet";
import { TaskHoverActions } from "@/components/tasks/TaskHoverActions";
import { haptics } from "@/lib/haptics";
import { useTaskSelection } from "@/lib/task-selection";
import { Progress } from "@/components/ui/progress";
import { resolveTaskIcon } from "@/lib/task-icons";
import { TagChip } from "@/components/tags/TagChip";
import { playCompletionChime } from "@/lib/completion-sound";
import { CompletionBurst } from "@/components/cards/CompletionBurst";
import { useCompletionVisual } from "@/lib/completion-visual";
import { SmartDueChip } from "@/components/tasks/SmartDueChip";
import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import {
  SwipeableList, SwipeableListItem, LeadingActions, TrailingActions,
  SwipeAction, Type as SwipeType,
} from "react-swipeable-list";

const PRIORITY_DOTS: Record<Task["priority"], number> = { low: 1, medium: 2, high: 3 };

type PriorityStyle = {
  bar: string;       // left vertical accent bar
  badgeBg: string;   // right badge background
  badgeBorder: string;
  badgeText: string;
  dotOn: string;     // lit dot color
  dotOff: string;    // unlit dot color
  glow: string;      // optional outer glow utility
  label: string;
};

const PRIORITY_STYLES: Record<Task["priority"], PriorityStyle> = {
  high: {
    bar: "bg-priority-high",
    badgeBg: "bg-priority-high/10",
    badgeBorder: "border-priority-high/25",
    badgeText: "text-priority-high",
    dotOn: "bg-priority-high",
    dotOff: "bg-priority-high/30",
    glow: "shadow-priority-high",
    label: "Urgent",
  },
  medium: {
    bar: "bg-priority-med",
    badgeBg: "bg-priority-med/10",
    badgeBorder: "border-priority-med/20",
    badgeText: "text-priority-med",
    dotOn: "bg-priority-med/80",
    dotOff: "bg-white/10",
    glow: "",
    label: "Med",
  },
  low: {
    bar: "",
    badgeBg: "",
    badgeBorder: "border-border/40",
    badgeText: "text-muted-foreground/60",
    dotOn: "bg-muted-foreground/40",
    dotOff: "bg-transparent",
    glow: "",
    label: "Low",
  },
};

export function TaskRow({
  task, dense = false, showArea = true, draggable = false,
}: { task: Task; dense?: boolean; showArea?: boolean; draggable?: boolean }) {
  const { toggleTask, deleteTask, updateTask, addTask, state } = useStore();
  const selection = useTaskSelection();
  const isSelected = selection.isSelected(task.id);

  const [open, setOpen] = useState(false);
  const [pomOpen, setPomOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const completionVisual = useCompletionVisual();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [expanded, setExpanded] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [subDraft, setSubDraft] = useState("");
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressMoved = useRef(false);
  // Track which haptic "snap" thresholds we've already fired during a single
  // swipe gesture so they only buzz once per crossing.
  const swipeHapticState = useRef<{ peek: boolean; armed: boolean }>({ peek: false, armed: false });

  const subtasks = state.tasks.filter(t => t.parentTaskId === task.id);
  const hasSubs = subtasks.length > 0;
  const doneSubs = subtasks.filter(s => s.done).length;
  const pct = hasSubs ? Math.round((doneSubs / subtasks.length) * 100) : 0;
  const allDone = hasSubs && doneSubs === subtasks.length;
  const isSubtask = !!task.parentTaskId;

  const areaColor = (state.areas ?? []).find(a => a.name === task.area)?.color || undefined;
  const resolvedIcon = resolveTaskIcon(task);

  useEffect(() => { if (!editing) setDraft(task.title); }, [task.title, editing]);
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current; if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (!next) { setDraft(task.title); return; }
    if (next !== task.title) void updateTask(task.id, { title: next });
  };
  const cancel = () => { setDraft(task.title); setEditing(false); };

  const handleToggle = () => {
    const wasDone = task.done;
    if (!wasDone) {
      setCelebrate(true);
      playCompletionChime();
      haptics.success?.();
      toast.success("Done — softly.", {
        description: pickAffirmation(),
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            haptics.tap?.();
            void updateTask(task.id, { done: false });
          },
        },
      });
      window.setTimeout(() => { toggleTask(task.id); setCelebrate(false); }, 900);
    } else {
      toggleTask(task.id);
    }
  };

  const withHaptic = <T extends (...args: any[]) => any>(fn: T, variant: keyof typeof haptics = "tap") =>
    ((...args: Parameters<T>) => { haptics[variant]?.(); return fn(...args); }) as T;

  const handleSnooze = () => {
    const next = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const prev = { dueDate: task.dueDate, status: task.status, snoozedUntil: task.snoozedUntil };
    void updateTask(task.id, { dueDate: next, status: "parked", snoozedUntil: next });
    haptics.tap?.();
    toast("Snoozed to tomorrow", {
      description: task.title,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          haptics.tap?.();
          void updateTask(task.id, prev);
        },
      },
    });
  };
  const handleReschedule = () => setOpen(true);
  const handleCyclePriority = () => {
    const order: Task["priority"][] = ["low", "medium", "high"];
    const i = order.indexOf(task.priority);
    const next = order[(i + 1) % order.length];
    void updateTask(task.id, { priority: next });
    toast(`Priority: ${next}`);
  };
  const handleMove = () => setQuickEditOpen(true);

  // Long-press → quick edit popover. Cancelled by movement (scroll/swipe).
  const LONG_PRESS_MS = 550;
  const LONG_PRESS_SLOP = 8; // px of movement allowed before cancel
  const startLongPress = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressStart.current = { x: e.clientX, y: e.clientY };
    longPressMoved.current = false;
    longPressTimer.current = window.setTimeout(() => {
      if (longPressMoved.current) return;
      haptics.pickup?.();
      setQuickEditOpen(true);
    }, LONG_PRESS_MS);
  };
  const moveLongPress = (e: React.PointerEvent) => {
    if (!longPressStart.current || !longPressTimer.current) return;
    const dx = e.clientX - longPressStart.current.x;
    const dy = e.clientY - longPressStart.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_SLOP) {
      longPressMoved.current = true;
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressStart.current = null;
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    if (selection.selectionMode) {
      e.preventDefault();
      selection.toggle(task.id, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      e.preventDefault();
      selection.toggle(task.id, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
      return;
    }
    if (selection.paneOpen) { selection.selectOnly(task.id); return; }
    // Tap does nothing — expansion is via chevron, edit via double-click,
    // and the quick-edit menu is reserved for press-and-hold.
  };

  const leadingActions = (
    <LeadingActions>
      <SwipeAction onClick={withHaptic(() => setEditing(true))}>
        <div className="flex h-full items-center gap-2 bg-sky-500/90 px-4 text-sm font-medium text-white">
          <Pencil className="h-4 w-4" /> Edit
        </div>
      </SwipeAction>
      <SwipeAction onClick={withHaptic(handleCyclePriority)}>
        <div className="flex h-full items-center gap-2 bg-amber-500/90 px-4 text-sm font-medium text-white">
          <Star className="h-4 w-4" /> Priority
        </div>
      </SwipeAction>
      <SwipeAction onClick={withHaptic(handleMove)}>
        <div className="flex h-full items-center gap-2 bg-violet-500/90 px-4 text-sm font-medium text-white">
          <FolderInput className="h-4 w-4" /> Move
        </div>
      </SwipeAction>
    </LeadingActions>
  );

  const trailingActions = (
    <TrailingActions>
      <SwipeAction onClick={withHaptic(handleToggle, "success")}>
        <div className="flex h-full items-center gap-2 bg-emerald-500/90 px-4 text-sm font-medium text-white">
          ✓ Complete
        </div>
      </SwipeAction>
      <SwipeAction onClick={withHaptic(handleSnooze)}>
        <div className="flex h-full items-center gap-2 bg-indigo-500/90 px-4 text-sm font-medium text-white">
          <Snowflake className="h-4 w-4" /> Snooze
        </div>
      </SwipeAction>
      <SwipeAction onClick={withHaptic(() => deleteTask(task.id), "delete")}>
        <div className="flex h-full items-center gap-2 bg-rose-500/90 px-4 text-sm font-medium text-white">
          <Trash2 className="h-4 w-4" /> Delete
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  const rowBody = (
    <RowShell
      task={task}
      dense={dense}
      draggable={draggable}
      celebrate={celebrate}
      selected={isSelected}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerMove={moveLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => { e.preventDefault(); setQuickEditOpen(true); }}
    >
      {/* Status dot (area color) — hidden on mobile to reduce leading clutter */}
      <span
        className="mt-[7px] hidden h-2 w-2 shrink-0 rounded-full ring-1 ring-border/60 sm:inline-block"
        style={areaColor ? { backgroundColor: areaColor } : { backgroundColor: "hsl(var(--muted-foreground) / 0.5)" }}
        aria-hidden
      />
      <Checkbox checked={task.done} onCheckedChange={handleToggle} className="mt-[3px]" aria-label={`Mark complete: ${task.title}`} />

      {/* Contextual icon — desktop only; on mobile the area chip in the meta line carries the same signal */}
      <div className="mt-[1px] hidden h-5 w-5 shrink-0 place-items-center rounded-md bg-muted/50 text-muted-foreground sm:grid">
        {resolvedIcon.kind === "lucide"
          ? <resolvedIcon.Icon className="h-3.5 w-3.5" aria-hidden />
          : <span className="text-sm leading-none" aria-hidden>{resolvedIcon.char}</span>}
      </div>

      {(hasSubs || addingSub) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
              else if (e.key === "Escape") { e.preventDefault(); cancel(); }
            }}
            rows={1}
            className="w-full resize-none overflow-hidden rounded-md border-0 bg-transparent p-0 text-[15px] font-medium leading-snug outline-none ring-0 focus:outline-none focus:ring-0"
            placeholder="Write a soft task…"
          />
        ) : (
          <button
            type="button"
            onClick={handleTitleClick}
            onDoubleClick={() => setEditing(true)}
            className={cn(
              "block w-full cursor-pointer text-left text-[15px] font-medium leading-snug text-foreground transition-colors break-words whitespace-normal",
              task.done && "text-muted-foreground line-through",
              celebrate && "text-primary",
            )}
          >
            {task.title}
          </button>
        )}

        {/* Metadata row: area · smart due · priority dots · tags */}
        {!editing && (showArea || task.dueDate || (task.tags?.length ?? 0) > 0 || task.priority === "high" || task.resetItemId) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {showArea && (
              <span className="inline-flex items-center gap-1">
                {task.area}
              </span>
            )}
            {task.dueDate && (<>
              {showArea && <span className="opacity-40">·</span>}
              <SmartDueChip date={task.dueDate} done={task.done} />
            </>)}
            {task.priority !== "low" && (
              <span className="inline-flex items-center gap-0.5" aria-label={`Priority ${task.priority}`} title={`Priority: ${task.priority}`}>
                {Array.from({ length: PRIORITY_DOTS[task.priority] + 1 }).map((_, i) => (
                  <span key={i} className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_TONE[task.priority])} />
                ))}
              </span>
            )}
            {task.dayPart && <span className="opacity-70">{task.dayPart}</span>}
            {task.resetItemId && (
              <a href="/home-reset" className="inline-flex items-center gap-1 text-secondary-foreground/80 hover:text-secondary-foreground">
                <Sparkle className="h-2.5 w-2.5" /> Reset
              </a>
            )}
            {(task.tags ?? []).slice(0, 3).map(name => (
              <TagChip key={name} name={name} size="xs" linkable />
            ))}
          </div>
        )}

        {/* Subtask progress bar */}
        {!editing && hasSubs && (
          <div className="mt-1.5 flex items-center gap-2">
            <Progress
              value={pct}
              className={cn(
                "h-1 flex-1 transition-all duration-500",
                allDone && "[&>div]:bg-primary [&>div]:shadow-[0_0_8px_hsl(var(--primary)/0.55)]",
              )}
            />
            <span className={cn("text-[10px] tabular-nums leading-none", allDone ? "font-semibold text-primary" : "text-muted-foreground/80")}>
              {doneSubs}/{subtasks.length}
            </span>
          </div>
        )}
      </div>

      {/* Desktop hover actions — plan, edit, snooze, move, details */}
      <TaskHoverActions
        task={task}
        onEdit={() => setEditing(true)}
        onDetails={() => setQuickEditOpen(true)}
      />

      {celebrate && <CompletionBurst variant={completionVisual} />}
    </RowShell>
  );

  return (
    <>
      <div data-no-swipe>
        <SwipeableList type={SwipeType.IOS} fullSwipe={false} threshold={10} className="!bg-transparent">
          <SwipeableListItem
            leadingActions={leadingActions}
            trailingActions={trailingActions}
            blockSwipe={editing || draggable || isSubtask}
            onSwipeStart={() => {
              swipeHapticState.current = { peek: false, armed: false };
              haptics.swipe();
            }}
            onSwipeProgress={(p) => {
              const s = swipeHapticState.current;
              if (!s.peek && p >= 15) { s.peek = true; haptics.snap(); }
              if (!s.armed && p >= 45) { s.armed = true; haptics.tap(); }
            }}
            onSwipeEnd={() => {
              swipeHapticState.current = { peek: false, armed: false };
            }}
          >
            <div className="flex w-full items-stretch">
              <div
                className="flex shrink-0 touch-none select-none items-center pl-1 pr-0.5 text-muted-foreground/40 sm:hidden"
                aria-label="Drag to reveal actions"
                title="Swipe from here"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <div
                className="min-w-0 flex-1"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {rowBody}
              </div>
            </div>
          </SwipeableListItem>
        </SwipeableList>
      </div>

      <QuickTaskSheet task={task} open={quickEditOpen} onOpenChange={setQuickEditOpen} />

      {expanded && (
        <div className="ml-10 mt-1 space-y-1 border-l border-border/40 pl-3">
          {task.notes && (
            <p className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
          )}
          {subtasks.map(s => <TaskRow key={s.id} task={s} dense showArea={false} />)}
          {addingSub ? (
            <Input
              autoFocus
              value={subDraft}
              onChange={e => setSubDraft(e.target.value)}
              placeholder="Subtask…"
              className="h-8 text-sm"
              onBlur={() => { if (!subDraft.trim()) setAddingSub(false); }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && subDraft.trim()) {
                  await addTask({ title: subDraft.trim(), area: task.area, parentTaskId: task.id, projectId: task.projectId });
                  setSubDraft("");
                } else if (e.key === "Escape") {
                  setSubDraft(""); setAddingSub(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingSub(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              + Add subtask
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block text-[11px] text-primary/80 hover:text-primary"
          >
            Open full editor →
          </button>
        </div>
      )}

      <TaskEditor open={open} onOpenChange={setOpen} task={task} />
      <PomodoroTimer open={pomOpen} onOpenChange={setPomOpen} task={task} />
    </>
  );
}

type ShellHandlers = {
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
};

function RowShell({
  task, dense, draggable, celebrate, selected, children, ...handlers
}: { task: Task; dense: boolean; draggable: boolean; celebrate?: boolean; selected?: boolean; children: React.ReactNode } & ShellHandlers) {
  const cls = cn(
    "group relative flex items-start gap-2.5 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm px-3 transition-all",
    "hover:border-primary/30 hover:bg-card/80 hover:shadow-[0_6px_22px_-14px_hsl(var(--primary)/0.45)]",
    dense ? "py-2" : "py-3",
    celebrate && "border-primary/40 bg-primary/5 scale-[1.005]",
    selected && "border-primary/60 bg-primary/10 ring-1 ring-primary/40",
  );
  if (!draggable) return <div className={cls} data-no-swipe {...handlers}>{children}</div>;
  return <DraggableShell task={task} className={cls} handlers={handlers}>{children}</DraggableShell>;
}

function DraggableShell({ task, className, children, handlers }: { task: Task; className: string; children: React.ReactNode; handlers?: ShellHandlers }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn(className, isDragging && "opacity-40")} data-no-swipe {...handlers}>
      <button {...listeners} {...attributes} aria-label="Drag" className="mt-1 -ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}