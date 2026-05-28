import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Trash2, GripVertical, Timer, Settings2, ChevronRight, Sparkle, CalendarDays, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { PomodoroTimer } from "@/components/tasks/PomodoroTimer";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import { pickAffirmation } from "@/lib/affirmations";
import { Input } from "@/components/ui/input";
import { QuickScheduleButton } from "@/components/tasks/QuickScheduleButton";
import { QuickDayPartButton } from "@/components/tasks/QuickDayPartButton";
import { SubtaskAddMenu } from "@/components/tasks/SubtaskAddMenu";
import { QuickEditPopover } from "@/components/tasks/QuickEditPopover";
import { haptics } from "@/lib/haptics";
import { formatRelativeDate } from "@/lib/date-format";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useTaskSelection } from "@/lib/task-selection";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { resolveTaskIcon } from "@/lib/task-icons";
import { TagChip } from "@/components/tags/TagChip";
import { playCompletionChime } from "@/lib/completion-sound";
import { CompletionBurst } from "@/components/cards/CompletionBurst";
import { useCompletionVisual } from "@/lib/completion-visual";


export function TaskRow({ task, dense = false, showArea = true, draggable = false }: { task: Task; dense?: boolean; showArea?: boolean; draggable?: boolean }) {
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
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const subtasks = state.tasks.filter(t => t.parentTaskId === task.id);
  const hasSubs = subtasks.length > 0;
  const doneSubs = subtasks.filter(s => s.done).length;
  const pct = hasSubs ? Math.round((doneSubs / subtasks.length) * 100) : 0;
  const allDone = hasSubs && doneSubs === subtasks.length;
  const [subDueDate, setSubDueDate] = useState<string | undefined>(undefined);
  const [aiLoading, setAiLoading] = useState(false);
  const isSubtask = !!task.parentTaskId;

  const generateSubtasks = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-subtasks", {
        body: { title: task.title, notes: task.notes, area: task.area, count: 5 },
      });
      if (error) throw error;
      const list: string[] = Array.isArray(data?.subtasks) ? data.subtasks : [];
      if (list.length === 0) { toast.error("No subtasks generated"); return; }
      for (const title of list) {
        await addTask({ title, area: task.area, parentTaskId: task.id, projectId: task.projectId });
      }
      setExpanded(true);
      toast.success(`Added ${list.length} steps`, { description: "AI broke this down into gentle steps." });
    } catch (e: any) {
      toast.error("AI breakdown failed", { description: e?.message ?? String(e) });
    } finally {
      setAiLoading(false);
    }
  };
  const areaColor = (state.areas ?? []).find(a => a.name === task.area)?.color || undefined;
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const savedScrollY = useRef<number | null>(null);

  // Preserve window scroll position when the task editor dialog opens/closes.
  // Radix Dialog locks body scroll which can jump the page on mobile; this
  // restores the user's place after closing.
  useEffect(() => {
    if (open) {
      savedScrollY.current = window.scrollY;
      return;
    }
    const y = savedScrollY.current;
    if (y == null) return;
    savedScrollY.current = null;
    // Wait for Radix to release scroll lock before restoring.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0, behavior: "auto" });
      });
      (window as any).__taskRowRestoreRaf = raf2;
    });
    return () => {
      cancelAnimationFrame(raf1);
      const r = (window as any).__taskRowRestoreRaf;
      if (r) cancelAnimationFrame(r);
    };
  }, [open]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipeStart.current; swipeStart.current = null;
    if (!s) return;
    if (editing) return;
    const end = e.changedTouches[0];
    const dx = end.clientX - s.x;
    const dy = end.clientY - s.y;
    const dt = Date.now() - s.t;
    if (dt > 500) return;
    if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return;
    // Ignore swipes that start on interactive children (checkbox, buttons).
    const target = e.target as HTMLElement | null;
    if (target?.closest("button,input,textarea,[role='checkbox']")) return;
    haptics.swipe?.();
    setOpen(true);
  };

  const startLongPress = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    longPressed.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      haptics.pickup?.();
      setQuickEditOpen(true);
    }, 480);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setQuickEditOpen(true);
  };

  // Keep draft synced when task changes externally (and we're not editing).
  useEffect(() => { if (!editing) setDraft(task.title); }, [task.title, editing]);

  // Autosize + focus when entering edit mode.
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
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
    toggleTask(task.id);
    if (!wasDone) {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1100);
      playCompletionChime();
      haptics.success();
      toast.success("Done — softly.", { description: pickAffirmation() });
    }
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
    if (selection.paneOpen) {
      selection.selectOnly(task.id);
      return;
    }
    setEditing(true);
  };

  const resolvedIcon = resolveTaskIcon(task);

  return (
    <>
    <RowShell
      task={task}
      dense={dense}
      draggable={draggable}
      celebrate={celebrate}
      areaColor={areaColor}
      selected={isSelected}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Checkbox checked={task.done} onCheckedChange={handleToggle} className="mt-0.5" />
      {resolvedIcon.kind === "lucide" ? (
        <resolvedIcon.Icon className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      ) : (
        <span className="mt-0.5 inline-block w-4 shrink-0 text-center text-sm leading-none" aria-hidden>
          {resolvedIcon.char}
        </span>
      )}
      {(hasSubs || addingSub) && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-0.5 grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground"
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
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
              else if (e.key === "Escape") { e.preventDefault(); cancel(); }
            }}
            rows={1}
            className={cn(
              "w-full resize-none overflow-hidden rounded-md border-0 bg-transparent p-0 text-sm leading-snug",
              "outline-none ring-0 focus:outline-none focus:ring-0",
              "placeholder:text-muted-foreground",
              task.done && "text-muted-foreground line-through",
            )}
            placeholder="Write a soft task…"
          />
        ) : (
          <button
            type="button"
            onClick={handleTitleClick}
            className={cn(
              "block w-full cursor-text rounded-md text-left text-sm leading-snug transition-all break-words whitespace-normal",
              task.done && "text-muted-foreground line-through",
              celebrate && "text-primary",
            )}
            aria-label="Edit task"
          >
            {task.title}
          </button>
        )}
        {!editing && hasSubs && (
          <div className="mt-1 flex items-center gap-1.5">
            <Progress
              value={pct}
              className={cn(
                "h-1 flex-1 transition-all",
                allDone && "[&>div]:bg-primary [&>div]:shadow-[0_0_8px_hsl(var(--primary)/0.55)]",
              )}
            />
            <span className={cn(
              "flex items-center gap-0.5 text-[9px] tabular-nums leading-none",
              allDone ? "font-semibold text-primary" : "text-muted-foreground",
            )}>
              {allDone && <Check className="h-2 w-2" />}
              {doneSubs}/{subtasks.length}
            </span>
          </div>
        )}
        {!editing && (showArea || task.dueDate || task.dayPart || task.resetItemId || (task.tags?.length ?? 0) > 0) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {showArea && (
              <Badge
                variant="secondary"
                className="rounded-full bg-muted text-[10px] font-normal"
                style={areaColor ? { backgroundColor: `${areaColor}22`, color: areaColor } : undefined}
              >
                {areaColor && (
                  <span
                    className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: areaColor }}
                  />
                )}
                {task.area}
              </Badge>
            )}
            {task.dueDate && (() => {
              const diff = differenceInCalendarDays(parseISO(task.dueDate), new Date());
              const overdue = diff < 0 && !task.done;
              const isToday = diff === 0;
              return (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full text-[10px] font-normal gap-1",
                    overdue && "border-destructive/60 bg-destructive/10 text-destructive",
                    isToday && !overdue && "border-primary/50 bg-primary/10 text-primary",
                  )}
                >
                  <CalendarDays className="h-2.5 w-2.5" />
                  {formatRelativeDate(task.dueDate)}
                </Badge>
              );
            })()}
            {task.dayPart && <Badge variant="outline" className="rounded-full text-[10px] font-normal">{task.dayPart}</Badge>}
            {hasSubs && <Badge variant="outline" className="rounded-full text-[10px] font-normal">{subtasks.filter(s=>s.done).length}/{subtasks.length}</Badge>}
            {task.resetItemId && (
              <a href="/home-reset" className="inline-flex">
                <Badge variant="outline" className="rounded-full border-secondary/60 bg-secondary/30 text-[10px] font-normal">
                  <Sparkle className="mr-0.5 h-2.5 w-2.5" /> Reset
                </Badge>
              </a>
            )}
            {(task.tags ?? []).slice(0, 5).map(name => (
              <TagChip key={name} name={name} size="xs" linkable />
            ))}
          </div>
        )}
      </div>
      <div className="hidden sm:contents">
        <QuickScheduleButton task={task} />
        <QuickDayPartButton task={task} />
      </div>
      {!isSubtask && (
        <div className="hidden opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 sm:block">
          <SubtaskAddMenu
            onAddManual={() => { setExpanded(true); setAddingSub(true); }}
            onAddWithAI={generateSubtasks}
            aiLoading={aiLoading}
          />
        </div>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground/70 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" onClick={() => setOpen(true)} aria-label="More options" title="Details">
        <Settings2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="hidden h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 sm:inline-flex" onClick={() => setPomOpen(true)} aria-label="Start pomodoro" title="Pomodoro">
        <Timer className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="hidden h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 sm:inline-flex" onClick={() => deleteTask(task.id)} aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      {celebrate && <CompletionBurst variant={completionVisual} />}
    </RowShell>
    <QuickEditPopover task={task} open={quickEditOpen} onOpenChange={setQuickEditOpen} />
    {expanded && (
      <div className="ml-8 space-y-1 border-l border-border/40 pl-2">
        {subtasks.map(s => <TaskRow key={s.id} task={s} dense showArea={false} />)}
        {addingSub && (
          <div className="flex items-center gap-1 py-1">
            <Input
              autoFocus
              value={subDraft}
              onChange={e => setSubDraft(e.target.value)}
              placeholder="Subtask…"
              className="h-8 text-sm"
              onBlur={() => { if (!subDraft.trim()) setAddingSub(false); }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && subDraft.trim()) {
                  await addTask({
                    title: subDraft.trim(),
                    area: task.area,
                    parentTaskId: task.id,
                    projectId: task.projectId,
                    dueDate: subDueDate,
                  });
                  setSubDraft("");
                  setSubDueDate(undefined);
                } else if (e.key === "Escape") {
                  setSubDraft("");
                  setSubDueDate(undefined);
                  setAddingSub(false);
                }
              }}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 gap-1 px-2 text-[11px]", subDueDate && "text-primary")}
                  onMouseDown={(e) => e.preventDefault()}
                  title="Set due date"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {subDueDate ? format(parseISO(subDueDate), "MMM d") : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={subDueDate ? parseISO(subDueDate) : undefined}
                  onSelect={(d) => setSubDueDate(d ? format(d, "yyyy-MM-dd") : undefined)}
                  initialFocus
                />
                {subDueDate && (
                  <div className="border-t border-border/60 p-2">
                    <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => setSubDueDate(undefined)}>
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}
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
  onPointerLeave?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
};

function RowShell({ task, dense, draggable, celebrate, areaColor, selected, children, ...handlers }: { task: Task; dense: boolean; draggable: boolean; celebrate?: boolean; areaColor?: string; selected?: boolean; children: React.ReactNode } & ShellHandlers) {
  const cls = cn(
    "group relative flex items-start gap-2 rounded-xl border border-transparent pl-3 pr-2 transition-all",
    "hover:border-primary/30 hover:bg-muted/40 hover:shadow-[0_4px_18px_-12px_hsl(var(--primary)/0.45)]",
    dense ? "py-1.5" : "py-2.5",
    celebrate && "border-primary/40 bg-primary/5 scale-[1.01]",
    selected && "border-primary/60 bg-primary/10 ring-1 ring-primary/40"
  );
  const style = areaColor ? { boxShadow: `inset 3px 0 0 0 ${areaColor}` } : undefined;
  if (!draggable) return <div className={cls} style={style} data-no-swipe {...handlers}>{children}</div>;
  return <DraggableShell task={task} className={cls} style={style} handlers={handlers}>{children}</DraggableShell>;
}

function DraggableShell({ task, className, style, children, handlers }: { task: Task; className: string; style?: React.CSSProperties; children: React.ReactNode; handlers?: ShellHandlers }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn(className, isDragging && "opacity-40")} style={style} data-no-swipe {...handlers}>
      <button {...listeners} {...attributes} aria-label="Drag" className="mt-0.5 -ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}
