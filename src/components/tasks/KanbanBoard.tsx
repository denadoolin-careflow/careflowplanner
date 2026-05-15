import { useMemo, useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";
import { haptics } from "@/lib/haptics";
import { Plus } from "lucide-react";
import { toast } from "sonner";

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
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-careflow-task", task.id);
        e.dataTransfer.setData("text/plain", task.title);
        e.dataTransfer.effectAllowed = "move";
        haptics.pickup?.();
      }}
      className="rounded-xl bg-card/80 hover:shadow-[0_4px_18px_-12px_hsl(var(--primary)/0.45)] cursor-grab active:cursor-grabbing"
    >
      <TaskRow task={task} dense />
    </div>
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