import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Trash2, GripVertical, Timer, Settings2, ChevronRight, Sparkle, CalendarDays } from "lucide-react";
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

export function TaskRow({ task, dense = false, showArea = true, draggable = false }: { task: Task; dense?: boolean; showArea?: boolean; draggable?: boolean }) {
  const { toggleTask, deleteTask, updateTask, addTask, state } = useStore();
  const selection = useTaskSelection();
  const isSelected = selection.isSelected(task.id);
  const [open, setOpen] = useState(false);
  const [pomOpen, setPomOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
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
      window.setTimeout(() => setCelebrate(false), 900);
      toast.success("Done — softly.", { description: pickAffirmation() });
    }
  };

  const handleTitleClick = (e: React.MouseEvent) => {
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
    >
      <Checkbox checked={task.done} onCheckedChange={handleToggle} className="mt-0.5" />
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
              "block w-full cursor-text rounded-md text-left text-sm transition-all",
              task.done && "text-muted-foreground line-through",
              celebrate && "text-primary",
            )}
            aria-label="Edit task"
          >
            {task.title}
          </button>
        )}
        {!editing && (showArea || task.dueDate || task.dayPart || task.priority === "high" || task.resetItemId) && (
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
            {task.priority === "high" && <Badge className="rounded-full bg-accent text-accent-foreground text-[10px] font-normal hover:bg-accent">priority</Badge>}
            {task.energy && <Badge variant="outline" className="rounded-full text-[10px] font-normal capitalize">{task.energy} energy</Badge>}
            {hasSubs && <Badge variant="outline" className="rounded-full text-[10px] font-normal">{subtasks.filter(s=>s.done).length}/{subtasks.length}</Badge>}
            {task.resetItemId && (
              <a href="/home-reset" className="inline-flex">
                <Badge variant="outline" className="rounded-full border-secondary/60 bg-secondary/30 text-[10px] font-normal">
                  <Sparkle className="mr-0.5 h-2.5 w-2.5" /> Reset
                </Badge>
              </a>
            )}
          </div>
        )}
      </div>
      <QuickScheduleButton task={task} />
      <QuickDayPartButton task={task} />
      {!isSubtask && (
        <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <SubtaskAddMenu
            onAddManual={() => { setExpanded(true); setAddingSub(true); }}
            onAddWithAI={generateSubtasks}
            aiLoading={aiLoading}
          />
        </div>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setOpen(true)} aria-label="More options" title="Details">
        <Settings2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setPomOpen(true)} aria-label="Start pomodoro" title="Pomodoro">
        <Timer className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => deleteTask(task.id)} aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      {celebrate && (
        <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="animate-ping rounded-full bg-primary/20 px-3 py-1 text-base">✨</span>
        </span>
      )}
    </RowShell>
    <QuickEditPopover task={task} open={quickEditOpen} onOpenChange={setQuickEditOpen} />
    {hasSubs && (
      <div className="ml-8 mr-2 mt-0.5 mb-1 flex items-center gap-2">
        <Progress value={pct} className="h-1.5 flex-1" />
        <span className="text-[10px] tabular-nums text-muted-foreground">{doneSubs}/{subtasks.length}</span>
      </div>
    )}
    {expanded && (
      <div className="ml-8 space-y-1 border-l border-border/40 pl-2">
        {subtasks.map(s => <TaskRow key={s.id} task={s} dense showArea={false} />)}
        {addingSub && (
          <div className="flex gap-1 py-1">
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
                  });
                  setSubDraft("");
                } else if (e.key === "Escape") {
                  setSubDraft("");
                  setAddingSub(false);
                }
              }}
            />
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
  if (!draggable) return <div className={cls} style={style} {...handlers}>{children}</div>;
  return <DraggableShell task={task} className={cls} style={style} handlers={handlers}>{children}</DraggableShell>;
}

function DraggableShell({ task, className, style, children, handlers }: { task: Task; className: string; style?: React.CSSProperties; children: React.ReactNode; handlers?: ShellHandlers }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn(className, isDragging && "opacity-40")} style={style} {...handlers}>
      <button {...listeners} {...attributes} aria-label="Drag" className="mt-0.5 -ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}
