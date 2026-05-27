import { useEffect, useMemo, useState } from "react";
import { Bell, AlertCircle, Calendar, Clock, CheckCircle2, Check, X, CalendarClock, Pencil, Sparkles } from "lucide-react";
import { format, isBefore, isAfter, addDays, parseISO, startOfDay, startOfWeek, differenceInCalendarYears } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { clearAllDismissed, dismiss, dismissMany, getDismissed, onDismissedChange, undismiss, undismissMany } from "@/lib/dismissed-notifications";
import { toast } from "sonner";
import { playCompletionChime } from "@/lib/completion-sound";
import { listMemories, memoryTypeMeta, type Memory } from "@/lib/memories";
import { QuickTaskInlineEditor } from "@/components/tasks/QuickTaskInlineEditor";

export function NotificationCenter() {
  const { state, toggleTask, updateTask } = useStore();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => onDismissedChange(() => setDismissed(getDismissed())), []);
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  useEffect(() => {
    let cancel = false;
    listMemories().then((m) => { if (!cancel) setMemories(m); }).catch(() => {});
    return () => { cancel = true; };
  }, []);

  const today = startOfDay(new Date());
  const todayISO = format(today, "yyyy-MM-dd");
  const tomorrowISO = format(addDays(today, 1), "yyyy-MM-dd");
  const weekEnd = addDays(today, 7);
  const todayMD = format(today, "MM-dd");

  const onThisDay = useMemo(() => {
    return memories
      .filter((m) => {
        if (dismissed.has(m.id)) return false;
        if (format(parseISO(m.date), "MM-dd") !== todayMD) return false;
        return differenceInCalendarYears(today, parseISO(m.date)) >= 1;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [memories, dismissed, todayMD, today]);

  const buckets = useMemo(() => {
    const overdue: typeof state.tasks = [];
    const dueToday: typeof state.tasks = [];
    const dueTomorrow: typeof state.tasks = [];
    const upcoming: typeof state.tasks = [];
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId || t.status === "parked") continue;
      if (!t.dueDate) continue;
      if (dismissed.has(t.id)) continue;
      const d = parseISO(t.dueDate);
      if (t.dueDate === todayISO) dueToday.push(t);
      else if (t.dueDate === tomorrowISO) dueTomorrow.push(t);
      else if (isBefore(d, today)) overdue.push(t);
      else if (isAfter(d, today) && isBefore(d, weekEnd)) upcoming.push(t);
    }
    const todayAppts = state.appointments.filter(a => a.date === todayISO && !dismissed.has(a.id));
    return { overdue, dueToday, dueTomorrow, upcoming, todayAppts };
  }, [state.tasks, state.appointments, todayISO, tomorrowISO, today, weekEnd, dismissed]);

  const count = buckets.overdue.length + buckets.dueToday.length + buckets.todayAppts.length + onThisDay.length;
  const totalShown =
    buckets.overdue.length + buckets.dueToday.length + buckets.dueTomorrow.length +
    buckets.upcoming.length + buckets.todayAppts.length + onThisDay.length;

  const handleComplete = async (id: string, title: string) => {
    await toggleTask(id);
    try { playCompletionChime(); } catch {}
    toast.success(`Completed “${title}”`);
  };

  const handleReschedule = async (id: string, iso: string, title: string, label: string) => {
    await updateTask(id, { dueDate: iso });
    toast(`Moved “${title}” to ${label}`);
  };

  const handleDismiss = (id: string, label?: string) => {
    dismiss(id);
    toast(label ? `Dismissed “${label}”` : "Dismissed", {
      action: { label: "Undo", onClick: () => undismiss(id) },
    });
  };

  const handleDismissMany = (ids: string[], label: string) => {
    if (ids.length === 0) return;
    dismissMany(ids);
    toast(`Cleared ${ids.length} · ${label}`, {
      action: { label: "Undo", onClick: () => undismissMany(ids) },
    });
  };

  const TaskRow = ({ t }: { t: any }) => (
    <div className="rounded-md px-1 py-0.5">
      <div className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-muted">
      <button
        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border text-transparent hover:border-primary hover:text-primary"
        title="Mark complete"
        onClick={(e) => { e.stopPropagation(); void handleComplete(t.id, t.title); }}
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => setEditingId(editingId === t.id ? null : t.id)}
      >
        <div className="truncate text-xs font-medium">{t.title}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          {t.dueDate ? format(parseISO(t.dueDate), "EEE MMM d") : "No date"}
          {t.area ? ` · ${t.area}` : ""}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <ReschedulePopover task={t} onPick={handleReschedule} />
        <Button
          variant="ghost" size="icon" className="h-6 w-6"
          title="Quick edit"
          onClick={(e) => { e.stopPropagation(); setEditingId(editingId === t.id ? null : t.id); }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-6 w-6"
          title="Dismiss notification"
          onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      </div>
      {editingId === t.id && (
        <div className="mt-1 px-1 pb-1">
          <QuickTaskInlineEditor taskId={t.id} onClose={() => setEditingId(null)} />
        </div>
      )}
    </div>
  );

  const ApptRow = ({ a }: { a: any }) => (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
      <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{a.title}</div>
        <div className="truncate text-[10px] text-muted-foreground">{a.time ?? format(parseISO(a.date), "EEE MMM d")}</div>
      </div>
      <Button
        variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
        title="Dismiss"
        onClick={() => dismiss(a.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  const Section = ({ label, items, icon, color, kind }: { label: string; items: any[]; icon: React.ReactNode; color: string; kind: "task" | "appt" }) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className={`flex items-center gap-1.5 px-2 pb-1 pt-2 text-[10px] uppercase tracking-[0.15em] ${color}`}>
          {icon} {label} <span className="ml-auto opacity-60">{items.length}</span>
          <button
            className="ml-1 text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={() => dismissMany(items.map((x: any) => x.id))}
            title="Clear section"
          >clear</button>
        </div>
        <div className="space-y-0.5">
          {items.slice(0, 8).map((t: any) =>
            kind === "task" ? <TaskRow key={t.id} t={t} /> : <ApptRow key={t.id} a={t} />
          )}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-[16px] rounded-full px-1 text-[9px]" variant="destructive">
              {count > 9 ? "9+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-2" align="end">
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          <div className="font-display text-sm font-semibold">Notifications</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{format(today, "EEE MMM d")}</span>
            {totalShown > 0 && (
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => dismissMany([
                  ...buckets.overdue, ...buckets.dueToday, ...buckets.dueTomorrow,
                  ...buckets.upcoming, ...buckets.todayAppts,
                ].map(x => x.id))}
              >Clear all</button>
            )}
            {dismissed.size > 0 && (
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => clearAllDismissed()}
                title="Restore cleared notifications"
              >Restore</button>
            )}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {onThisDay.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[10px] uppercase tracking-[0.15em] text-[hsl(350_55%_55%)]">
                <Sparkles className="h-3 w-3" /> On this day <span className="ml-auto opacity-60">{onThisDay.length}</span>
                <button
                  className="ml-1 text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  onClick={() => dismissMany(onThisDay.map(m => m.id))}
                  title="Clear section"
                >clear</button>
              </div>
              <div className="space-y-0.5">
                {onThisDay.slice(0, 6).map((m) => {
                  const meta = memoryTypeMeta(m.memoryType);
                  const years = differenceInCalendarYears(today, parseISO(m.date));
                  return (
                    <div key={m.id} className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                      <span className="mt-0.5 text-sm leading-none">{meta.emoji}</span>
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => { navigate(`/memories`); setOpen(false); }}
                      >
                        <div className="truncate text-xs font-medium">{m.title}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {years} {years === 1 ? "year" : "years"} ago · {format(parseISO(m.date), "MMM d, yyyy")}
                        </div>
                      </button>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        title="Dismiss"
                        onClick={(e) => { e.stopPropagation(); dismiss(m.id); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <Section kind="task" label="Overdue" items={buckets.overdue} icon={<AlertCircle className="h-3 w-3" />} color="text-destructive" />
          <Section kind="task" label="Today" items={buckets.dueToday} icon={<Clock className="h-3 w-3" />} color="text-foreground" />
          <Section kind="appt" label="Appointments today" items={buckets.todayAppts} icon={<Calendar className="h-3 w-3" />} color="text-primary" />
          <Section kind="task" label="Tomorrow" items={buckets.dueTomorrow} icon={<Clock className="h-3 w-3" />} color="text-muted-foreground" />
          <Section kind="task" label="Upcoming this week" items={buckets.upcoming} icon={<Calendar className="h-3 w-3" />} color="text-muted-foreground" />
          {totalShown === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <p className="text-xs text-muted-foreground">You're all caught up.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReschedulePopover({ task, onPick }: { task: any; onPick: (id: string, iso: string, title: string, label: string) => void }) {
  const today = startOfDay(new Date());
  const opts = [
    { label: "Today", iso: format(today, "yyyy-MM-dd") },
    { label: "Tomorrow", iso: format(addDays(today, 1), "yyyy-MM-dd") },
    { label: "This weekend", iso: format(addDays(startOfWeek(today, { weekStartsOn: 1 }), 5), "yyyy-MM-dd") },
    { label: "Next week", iso: format(addDays(today, 7), "yyyy-MM-dd") },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" title="Reschedule" onClick={(e) => e.stopPropagation()}>
          <CalendarClock className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Reschedule</div>
        {opts.map(o => (
          <button
            key={o.label}
            className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
            onClick={() => onPick(task.id, o.iso, task.title, o.label)}
          >{o.label}<span className="float-right text-[10px] text-muted-foreground">{format(parseISO(o.iso), "MMM d")}</span></button>
        ))}
      </PopoverContent>
    </Popover>
  );
}