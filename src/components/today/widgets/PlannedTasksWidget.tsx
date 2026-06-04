import { useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { CalendarDays, GripVertical, Sun, CalendarRange, Calendar as CalendarIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { openTaskEditor } from "@/lib/open-task-editor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Scope = "today" | "week" | "month";

const TABS: { id: Scope; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "week",  label: "Week",  icon: CalendarRange },
  { id: "month", label: "Month", icon: CalendarIcon },
];

export function PlannedTasksWidget({ date = new Date() }: { date?: Date }) {
  const { state, updateTask } = useStore();
  const [scope, setScope] = useState<Scope>("today");
  const [dropHover, setDropHover] = useState(false);
  const todayISO = format(date, "yyyy-MM-dd");

  const buckets = useMemo(() => {
    const wk = { start: startOfWeek(date, { weekStartsOn: 0 }), end: endOfWeek(date, { weekStartsOn: 0 }) };
    const mo = { start: startOfMonth(date), end: endOfMonth(date) };
    const today: Task[] = [];
    const week: Task[] = [];
    const month: Task[] = [];
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId || t.status === "parked" || !t.dueDate) continue;
      const d = parseISO(t.dueDate + "T00:00:00");
      if (t.dueDate === todayISO) { today.push(t); continue; }
      if (isWithinInterval(d, wk)) { week.push(t); continue; }
      if (isWithinInterval(d, mo)) { month.push(t); continue; }
    }
    const byTime = (a: Task, b: Task) =>
      (a.dueDate ?? "").localeCompare(b.dueDate ?? "") ||
      (a.startTime ?? "").localeCompare(b.startTime ?? "");
    return { today: today.sort(byTime), week: week.sort(byTime), month: month.sort(byTime) };
  }, [state.tasks, todayISO, date]);

  const list = buckets[scope];

  const onDragStart = (e: React.DragEvent, t: Task) => {
    e.dataTransfer.setData(TASK_DRAG_MIME, t.id);
    e.dataTransfer.setData("text/plain", t.title);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropToToday = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropHover(false);
    const id = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (!id) return;
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    if (t.dueDate === todayISO) return;
    await updateTask(id, { dueDate: todayISO, inbox: false });
    toast.success(`Moved “${t.title}” to today`);
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Planned tasks</h3>
        </div>
        <div className="inline-flex rounded-full border border-border/50 bg-background/40 p-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setScope(t.id)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
                scope === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {scope !== "today" && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropHover(true); }}
          onDragLeave={() => setDropHover(false)}
          onDrop={onDropToToday}
          className={cn(
            "mb-2 rounded-xl border border-dashed px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider transition-all",
            dropHover
              ? "border-primary/70 bg-primary/15 text-primary"
              : "border-border/60 bg-background/40 text-muted-foreground",
          )}
          role="region"
          aria-label="Drop to move task to today"
        >
          ↓ Drop to move to today
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          {scope === "today" ? "Nothing planned for today." : scope === "week" ? "No tasks later this week." : "No tasks later this month."}
        </p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {list.map(t => (
            <li
              key={t.id}
              draggable
              onDragStart={(e) => onDragStart(e, t)}
              className="group flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/60 px-1 py-1 text-xs hover:border-primary/40"
              title="Drag to a time slot or onto today"
            >
              <span className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground/60 group-hover:text-muted-foreground active:cursor-grabbing" aria-hidden>
                <GripVertical className="h-3 w-3" />
              </span>
              <button
                type="button"
                onClick={() => openTaskEditor(t.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left hover:bg-muted/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">{t.title}</span>
                {t.dueDate && t.dueDate !== todayISO && (
                  <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
                    {format(parseISO(t.dueDate + "T00:00:00"), "MMM d")}
                  </span>
                )}
                {t.startTime && (
                  <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">{t.startTime}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}