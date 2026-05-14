import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Trash2, GripVertical, Timer, Settings2, ChevronRight, Plus, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { PomodoroTimer } from "@/components/tasks/PomodoroTimer";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import { pickAffirmation } from "@/lib/affirmations";
import { Input } from "@/components/ui/input";

export function TaskRow({ task, dense = false, showArea = true, draggable = false }: { task: Task; dense?: boolean; showArea?: boolean; draggable?: boolean }) {
  const { toggleTask, deleteTask, updateTask, addTask, state } = useStore();
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

  return (
    <>
    <RowShell task={task} dense={dense} draggable={draggable} celebrate={celebrate}>
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
            onClick={() => setEditing(true)}
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
        {!editing && (showArea || task.dayPart || task.priority === "high" || task.resetItemId) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {showArea && <Badge variant="secondary" className="rounded-full bg-muted text-[10px] font-normal">{task.area}</Badge>}
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
      <Button
        variant="ghost" size="icon"
        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => { setExpanded(true); setAddingSub(true); }}
        aria-label="Add subtask" title="Add subtask"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
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

function RowShell({ task, dense, draggable, celebrate, children }: { task: Task; dense: boolean; draggable: boolean; celebrate?: boolean; children: React.ReactNode }) {
  const cls = cn(
    "group relative flex items-start gap-2 rounded-xl border border-transparent px-2 transition-all hover:border-border/60 hover:bg-muted/40",
    dense ? "py-1.5" : "py-2.5",
    celebrate && "border-primary/40 bg-primary/5 scale-[1.01]"
  );
  if (!draggable) return <div className={cls}>{children}</div>;
  return <DraggableShell task={task} className={cls}>{children}</DraggableShell>;
}

function DraggableShell({ task, className, children }: { task: Task; className: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn(className, isDragging && "opacity-40")}>
      <button {...listeners} {...attributes} aria-label="Drag" className="mt-0.5 -ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}
