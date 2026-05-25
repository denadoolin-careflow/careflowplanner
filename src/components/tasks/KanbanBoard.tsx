import { useMemo, useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";
import { haptics } from "@/lib/haptics";
import { Plus, CalendarDays, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { inferTaskIcon } from "@/lib/task-icons";
import { CoverImagePicker } from "@/components/common/CoverImagePicker";
import { Badge } from "@/components/ui/badge";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { formatRelativeDate } from "@/lib/date-format";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { useViewPrefs } from "@/hooks/useViewPrefs";

type ColumnKey = "inbox" | "today" | "upcoming" | "waiting" | "done";
type Column = { key: ColumnKey; label: string; accent: string; match: (t: Task, today: string) => boolean; onDrop: (t: Task) => Partial<Task> };

const COLUMNS: Column[] = [
  { key: "inbox", label: "Inbox", accent: "bg-muted/60", match: t => !!t.inbox && !t.done,
    onDrop: () => ({ inbox: true, done: false, status: "active", dueDate: undefined }) },
  { key: "today", label: "Today", accent: "bg-primary/10", match: (t, d) => !t.done && !t.inbox && t.dueDate === d,
    onDrop: () => ({ inbox: false, done: false, status: "active", dueDate: todayISO() }) },
  { key: "upcoming", label: "Upcoming", accent: "bg-accent/15", match: (t, d) => !t.done && !t.inbox && !!t.dueDate && t.dueDate > d,
    onDrop: t => ({ inbox: false, done: false, status: "active", dueDate: t.dueDate && t.dueDate > todayISO() ? t.dueDate : format(addDays(new Date(), 1), "yyyy-MM-dd") }) },
  { key: "waiting", label: "Waiting", accent: "bg-secondary-soft", match: t => !t.done && t.status === "waiting",
    onDrop: () => ({ status: "waiting", done: false }) },
  { key: "done", label: "Done", accent: "bg-warm-soft", match: t => t.done,
    onDrop: () => ({ done: true, lastCompletedAt: new Date().toISOString() }) },
];

export function KanbanBoard({ tasks, scope = "all" }: { tasks: Task[]; scope?: "all" | "project" }) {
  const { updateTask, addTask } = useStore();
  const today = todayISO();
  const [hover, setHover] = useState<ColumnKey | null>(null);

  const columns = useMemo(() => {
    const visible = scope === "project" ? COLUMNS.filter(c => c.key !== "inbox") : COLUMNS;
    return visible.map(c => ({ ...c, items: tasks.filter(t => c.match(t, today)) }));
  }, [tasks, today, scope]);

  const onDrop = async (e: React.DragEvent, col: Column) => {
    e.preventDefault();
    setHover(null);
    const id = e.dataTransfer.getData("application/x-careflow-task");
    if (!id) return;
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    haptics.snap?.();
    await updateTask(id, col.onDrop(t));
    toast(`Moved to ${col.label}`);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      {columns.map(col => (
        <div
          key={col.key}
          onDragOver={(e) => {
            if (!Array.from(e.dataTransfer.types).includes("application/x-careflow-task")) return;
            e.preventDefault(); e.dataTransfer.dropEffect = "move"; setHover(col.key);
          }}
          onDragLeave={() => setHover(p => p === col.key ? null : p)}
          onDrop={(e) => onDrop(e, col)}
          className={cn(
            "flex w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-card/60 p-2 snap-start transition-colors",
            hover === col.key && "ring-2 ring-primary bg-primary/5",
          )}
        >
          <div className={cn("mb-2 flex items-center justify-between rounded-lg px-2 py-1.5", col.accent)}>
            <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
            <span className="text-[11px] text-muted-foreground">{col.items.length}</span>
          </div>
          <div className="flex-1 space-y-1 min-h-32">
            {col.items.map(t => <KanbanCard key={t.id} task={t} />)}
          </div>
          <QuickAdd col={col} onAdd={async (title) => {
            const patch = col.onDrop({ id: "", title, area: "Personal", done: false, priority: "medium", createdAt: "" } as Task);
            await addTask({ title, area: "Personal", ...patch } as any);
          }} />
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ task }: { task: Task }) {
  const { updateTask, state } = useStore();
  const { visible } = useViewPrefs("board");
  const Icon = inferTaskIcon(task.title, task.notes);
  const areaColor = (state.areas ?? []).find(a => a.name === task.area)?.color;
  const overdue = task.dueDate ? differenceInCalendarDays(parseISO(task.dueDate), new Date()) < 0 && !task.done : false;
  const [openEditor, setOpenEditor] = useState(false);
  return (
    <>
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-careflow-task", task.id);
        e.dataTransfer.setData("text/plain", task.title);
        e.dataTransfer.effectAllowed = "move";
        haptics.pickup?.();
      }}
      className="group overflow-hidden rounded-xl border border-border/60 bg-card/90 transition hover:border-primary/40 hover:shadow-[0_8px_24px_-14px_hsl(var(--primary)/0.55)] cursor-grab active:cursor-grabbing"
      style={areaColor ? { boxShadow: `inset 3px 0 0 0 ${areaColor}` } : undefined}
    >
      {visible.cover && task.coverUrl && (
        <div className="aspect-[16/7] overflow-hidden bg-muted">
          <img src={task.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpenEditor(true)}
        className="block w-full text-left px-2.5 py-2"
      >
        <div className="flex items-start gap-1.5 min-w-0">
          {visible.icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <span className={cn("flex-1 min-w-0 text-sm leading-snug break-words whitespace-normal", task.done && "text-muted-foreground line-through")}>{task.title}</span>
        </div>
        {((visible.tags && task.tags?.length) || (visible.dueDate && task.dueDate) || (visible.priority && task.priority === "high")) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {visible.tags && (task.tags ?? []).slice(0, 3).map(t => (
              <Badge key={t} variant="secondary" className="rounded-full px-1.5 py-0 text-[10px] font-normal">{t}</Badge>
            ))}
            {visible.dueDate && task.dueDate && (
              <Badge variant="outline" className={cn("gap-1 rounded-full text-[10px] font-normal", overdue && "border-destructive/60 bg-destructive/10 text-destructive")}>
                <CalendarDays className="h-2.5 w-2.5" /> {formatRelativeDate(task.dueDate)}
              </Badge>
            )}
            {visible.priority && task.priority === "high" && <Badge className="rounded-full bg-accent text-[10px] font-normal text-accent-foreground hover:bg-accent">priority</Badge>}
          </div>
        )}
      </button>
      <div className="flex items-center justify-end gap-1 border-t border-border/40 bg-background/40 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
        <CoverImagePicker
          value={task.coverUrl}
          defaultQuery={task.title}
          onChange={(url) => updateTask(task.id, { coverUrl: url ?? undefined })}
          trigger={<button type="button" className="rounded p-1 text-muted-foreground hover:text-primary" title="Cover image"><ImagePlus className="h-3.5 w-3.5" /></button>}
        />
      </div>
    </div>
    <TaskEditor open={openEditor} onOpenChange={setOpenEditor} task={task} />
    </>
  );
}

function QuickAdd({ col, onAdd }: { col: Column; onAdd: (title: string) => Promise<void> }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border/60 px-2 py-1.5">
      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={async (e) => { if (e.key === "Enter" && v.trim()) { await onAdd(v.trim()); setV(""); } }}
        placeholder={`Add to ${col.label.toLowerCase()}…`}
        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}