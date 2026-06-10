import { useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { CalendarDays, Clock, Sun, CalendarRange, Calendar as CalendarIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { TASK_DRAG_MIME } from "@/components/calendar/UnscheduledTasksRail";
import { openTaskEditor } from "@/lib/open-task-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { CompletionBurst } from "@/components/cards/CompletionBurst";
import { useCompletionVisual } from "@/lib/completion-visual";
import type { CompletionVisualKey } from "@/lib/completion-visual";
import { playCompletionChime } from "@/lib/completion-sound";
import { haptics } from "@/lib/haptics";
import { pickAffirmation } from "@/lib/affirmations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Scope = "today" | "week" | "month";
const TABS: { id: Scope; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "week",  label: "Week",  icon: CalendarRange },
  { id: "month", label: "Month", icon: CalendarIcon },
];

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date(); d.setHours(h, m, 0, 0);
  return format(d, "h:mma").toLowerCase();
}

/** Unified widget: scheduled (timed) + planned (anytime) tasks for the day, with checkboxes. */
export function TasksTodayWidget({ date = new Date() }: { date?: Date }) {
  const { state, updateTask, toggleTask } = useStore();
  const [scope, setScope] = useState<Scope>("today");
  const [dropHover, setDropHover] = useState(false);
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const completionVisual = useCompletionVisual();
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
    const byTime = (a: Task, b: Task) => {
      // Scheduled (has startTime) first, sorted by time; then untimed by title
      if (a.startTime && !b.startTime) return -1;
      if (!a.startTime && b.startTime) return 1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
    };
    return { today: today.sort(byTime), week: week.sort(byTime), month: month.sort(byTime) };
  }, [state.tasks, todayISO, date]);

  const list = buckets[scope];
  const scheduledCount = buckets.today.filter(t => !!t.startTime).length;

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

  const handleToggle = (t: Task) => {
    if (t.done) { void toggleTask(t.id); return; }
    setCelebrateId(t.id);
    playCompletionChime();
    haptics.success?.();
    toast.success("Done — softly.", {
      description: pickAffirmation(),
      duration: 5000,
      action: { label: "Undo", onClick: () => { haptics.tap?.(); void updateTask(t.id, { done: false }); } },
    });
    window.setTimeout(() => { void toggleTask(t.id); setCelebrateId(null); }, 900);
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Tasks</h3>
          {scope === "today" && scheduledCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
              <Clock className="h-2.5 w-2.5" /> {scheduledCount} scheduled
            </span>
          )}
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
        >
          ↓ Drop to move to today
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          {scope === "today" ? "Nothing on the list — breathe." : scope === "week" ? "No tasks later this week." : "No tasks later this month."}
        </p>
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {list.map(t => {
            const celebrate = celebrateId === t.id;
            return (
              <li
                key={t.id}
                draggable
                onDragStart={(e) => onDragStart(e, t)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-2 py-1.5 text-xs transition-all hover:border-primary/40",
                  celebrate && "ring-2 ring-primary/40",
                )}
              >
                <Checkbox
                  checked={t.done || celebrate}
                  onCheckedChange={() => handleToggle(t)}
                  aria-label={`Mark “${t.title}” done`}
                  className="shrink-0"
                />
                {t.startTime ? (
                  <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                    {fmtTime(t.startTime)}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => openTaskEditor(t.id)}
                  className="min-w-0 flex-1 truncate text-left text-foreground hover:underline focus:outline-none"
                >
                  {t.title}
                </button>
                {t.dueDate && t.dueDate !== todayISO && (
                  <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">
                    {format(parseISO(t.dueDate + "T00:00:00"), "MMM d")}
                  </span>
                )}
                {celebrate && <CompletionBurst variant={completionVisual} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}