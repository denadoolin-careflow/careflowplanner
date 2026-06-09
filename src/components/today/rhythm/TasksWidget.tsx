import { useMemo, useState } from "react";
import { format, addDays, addWeeks, addMonths, addYears, endOfWeek, endOfMonth, endOfYear } from "date-fns";
import {
  ListTodo, Search, GripVertical, CalendarDays, CalendarRange, CalendarClock, Calendar as CalendarIcon, Inbox,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { toast } from "sonner";
import { openTaskEditor } from "@/lib/open-task-editor";
import { QuickDayPartButton } from "@/components/tasks/QuickDayPartButton";

type Scope = "today" | "tomorrow" | "thisWeek" | "thisMonth" | "thisYear";

const BUCKETS: { id: Scope; label: string; icon: typeof CalendarDays }[] = [
  { id: "today",     label: "Today",      icon: CalendarDays },
  { id: "tomorrow",  label: "Tomorrow",   icon: CalendarClock },
  { id: "thisWeek",  label: "This Week",  icon: CalendarRange },
  { id: "thisMonth", label: "This Month", icon: CalendarIcon },
  { id: "thisYear",  label: "This Year",  icon: CalendarIcon },
];

function scopeDateISO(scope: Scope, ref: Date): string {
  switch (scope) {
    case "today":     return format(ref, "yyyy-MM-dd");
    case "tomorrow":  return format(addDays(ref, 1), "yyyy-MM-dd");
    case "thisWeek":  return format(endOfWeek(ref, { weekStartsOn: 0 }), "yyyy-MM-dd");
    case "thisMonth": return format(endOfMonth(ref), "yyyy-MM-dd");
    case "thisYear":  return format(endOfYear(ref), "yyyy-MM-dd");
  }
}

interface Props {
  /** Reference date — defaults to today */
  date?: Date;
}

/**
 * Sidebar task widget. Lists tasks (unscheduled by default) and lets the
 * user drag any task either into a built-in time-bucket drop zone
 * (Today / Tomorrow / This Week / Month / Year) to set its due date, or
 * onto any external drop target that accepts the standard
 * TASK_DRAG_MIME — e.g. the calendar grid or day-part lanes.
 */
const COLLAPSE_KEY = "careflow:today:tasks-widget:collapsed";
function readCollapsed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(COLLAPSE_KEY) === "1";
}

export function TasksWidget({ date = new Date() }: Props) {
  const { state, updateTask } = useStore();
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<Scope | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const toggleCollapsed = () => {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  };

  const tasks = useMemo(() => {
    const root = state.tasks.filter(t => !t.done && !t.parentTaskId && t.status !== "parked");
    const base = showAll ? root : root.filter(t => !t.dueDate);
    const term = q.trim().toLowerCase();
    const list = term ? base.filter(t => t.title.toLowerCase().includes(term)) : base;
    return list.slice(0, 50);
  }, [state.tasks, q, showAll]);

  const onDragStart = (e: React.DragEvent, t: Task) => {
    e.dataTransfer.setData(TASK_DRAG_MIME, t.id);
    e.dataTransfer.setData("text/plain", t.title);
    e.dataTransfer.effectAllowed = "move";
    setDragging(true);
  };
  const onDragEnd = () => { setDragging(false); setHover(null); };

  const assignTo = async (taskId: string, scope: Scope) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    const iso = scopeDateISO(scope, date);
    await updateTask(taskId, { dueDate: iso, inbox: false });
    toast.success(`Scheduled “${t.title}” → ${BUCKETS.find(b => b.id === scope)?.label}`);
  };

  const onBucketDrop = async (e: React.DragEvent, scope: Scope) => {
    e.preventDefault();
    setHover(null);
    const id = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (id) await assignTo(id, scope);
  };

  const openCount = useMemo(
    () => state.tasks.filter(t => !t.done && !t.parentTaskId && t.status !== "parked" && !t.dueDate).length,
    [state.tasks],
  );

  if (collapsed) {
    return (
      <section className="cozy-card flex flex-col items-center gap-2 p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex w-full items-center justify-between gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/40"
          aria-label="Expand tasks"
          title="Expand tasks"
        >
          <ListTodo className="h-3.5 w-3.5 text-primary" />
          <span className="tabular-nums">{openCount}</span>
          <ChevronLeft className="h-3 w-3" />
        </button>
      </section>
    );
  }

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Tasks</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowAll(s => !s)}
            className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
          >
            {showAll ? "All open" : <><Inbox className="h-2.5 w-2.5" /> Unscheduled</>}
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="Minimize tasks"
            title="Minimize tasks"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Find a task…"
          className="h-7 pl-7 text-xs"
        />
      </div>

      {/* Bucket drop zones */}
      <div className={cn(
        "mb-2 grid grid-cols-2 gap-1.5 transition-all",
        dragging ? "opacity-100" : "opacity-90",
      )}>
        {BUCKETS.map(b => {
          const Icon = b.icon;
          const isHover = hover === b.id;
          return (
            <div
              key={b.id}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setHover(b.id); }}
              onDragLeave={() => setHover(h => (h === b.id ? null : h))}
              onDrop={(e) => onBucketDrop(e, b.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed px-2 py-2 text-center text-[10px] font-medium transition-all",
                isHover
                  ? "border-primary/70 bg-primary/15 text-primary scale-[1.02]"
                  : dragging
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/60 bg-background/40 text-muted-foreground",
              )}
              role="region"
              aria-label={`Drop to schedule for ${b.label}`}
            >
              <Icon className="h-3 w-3" />
              <span className="uppercase tracking-wider">{b.label}</span>
            </div>
          );
        })}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          {q ? "No matches." : showAll ? "No open tasks." : "Inbox zero — nothing unscheduled."}
        </p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {tasks.map(t => (
            <li
              key={t.id}
              draggable
              onDragStart={(e) => onDragStart(e, t)}
              onDragEnd={onDragEnd}
              className="group flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/60 px-1 py-1 text-xs hover:border-primary/40"
              title="Drag onto a bucket above or onto a calendar slot — tap to edit"
            >
              <span
                className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60 group-hover:text-muted-foreground active:cursor-grabbing"
                aria-hidden
              >
                <GripVertical className="h-3 w-3" />
              </span>
              <button
                type="button"
                onClick={() => openTaskEditor(t.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-muted/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                aria-label={`Edit ${t.title}`}
              >
                <span className="min-w-0 flex-1 truncate text-foreground">{t.title}</span>
                {t.dueDate && (
                  <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    {format(new Date(t.dueDate + "T00:00:00"), "MMM d")}
                  </span>
                )}
                {t.estMinutes ? (
                  <span className="shrink-0 text-[9px] text-muted-foreground">{t.estMinutes}m</span>
                ) : null}
              </button>
              <QuickDayPartButton task={t} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}