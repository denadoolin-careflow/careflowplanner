import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { useNavigate } from "react-router-dom";
import { apptOccursOn } from "@/lib/appointment-range";
import { resolveTaskIcon } from "@/lib/task-icons";
import {
  Sun, CalendarRange, Inbox as InboxIcon, Calendar as CalendarIcon,
  Cake, TreePine, Sparkles, Hourglass, Clock, FolderOpen, MoreHorizontal,
  ArrowRight, CalendarPlus, Bell, ChevronRight, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { TaskHoverActions } from "@/components/tasks/TaskHoverActions";

const FOCUS_KEY = "careflow:inbox-overview-focus";
type Focus = "all" | "today" | "upcoming" | "needs";

function readFocus(): Focus {
  if (typeof window === "undefined") return "all";
  const v = window.localStorage.getItem(FOCUS_KEY);
  return v === "today" || v === "upcoming" || v === "needs" || v === "all" ? v : "all";
}

function fmtTime(hhmm?: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const d = new Date(); d.setHours(h, m || 0, 0, 0);
  return format(d, "h:mma").toLowerCase().replace(":00", "");
}

function relativeDay(iso: string, today: Date): string {
  const d = parseISO(iso);
  const diff = differenceInCalendarDays(d, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 6) return `In ${diff} days`;
  return format(d, "EEE");
}

function partOfDay(t: Task): "morning" | "afternoon" | "evening" {
  if (t.dayPart === "Morning") return "morning";
  if (t.dayPart === "Afternoon") return "afternoon";
  if (t.dayPart === "Evening" || t.dayPart === "Late Night") return "evening";
  if (t.startTime) {
    const h = parseInt(t.startTime.split(":")[0], 10);
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  }
  return "afternoon";
}

function priorityDot(p?: string) {
  if (p === "high") return "bg-red-500";
  if (p === "medium") return "bg-amber-500";
  if (p === "low") return "bg-sky-500";
  return "bg-muted-foreground/40";
}

function priorityLabel(p?: string) {
  if (p === "high") return "High";
  if (p === "medium") return "Medium";
  if (p === "low") return "Low";
  return "";
}

/** Soft translucent shell with atmospheric accent gradient. */
function CardShell({
  accent, dim, children,
}: { accent: string; dim?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-border/50 bg-card/70 p-4 backdrop-blur-md transition-all duration-300",
        "shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.10)]",
        dim && "opacity-50 hover:opacity-100",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-70", accent)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

function InsightBanner({ tone, children }: { tone: "amber" | "primary" | "emerald"; children: React.ReactNode }) {
  const toneCls = tone === "amber"
    ? "bg-amber-50/60 text-amber-900 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20"
    : tone === "emerald"
    ? "bg-emerald-50/60 text-emerald-900 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20"
    : "bg-primary/8 text-foreground ring-primary/20 dark:bg-primary/15";
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-medium ring-1 backdrop-blur-sm", toneCls)}>
      <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

/** Tiny SVG ring for today's completion. */
function CompletionRing({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div className="relative grid h-12 w-12 place-items-center">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--primary))"
          strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <span className="absolute text-[10.5px] font-semibold tabular-nums text-foreground">{pct}%</span>
    </div>
  );
}

function TaskRow({ t, onToggle, rightPill }: { t: Task; onToggle: () => void; rightPill?: string }) {
  const { Icon } = (() => {
    const r = resolveTaskIcon(t);
    return r.kind === "lucide" ? { Icon: r.Icon } : { Icon: InboxIcon };
  })();
  return (
    <div
      className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-muted/40"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-careflow-task", t.id);
        e.dataTransfer.setData("text/plain", t.title);
      }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={t.done ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
          t.done ? "border-primary bg-primary text-primary-foreground" : "border-border/70 hover:border-foreground/50",
        )}
      >
        {t.done && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <button
        type="button"
        onClick={() => openTaskEditor(t.id)}
        className="min-w-0 flex-1 truncate text-left text-[13px] text-foreground"
      >
        {t.title}
      </button>
      {t.priority && (
        <span className="hidden items-center gap-1 rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/50 sm:inline-flex">
          <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot(t.priority))} />
          {priorityLabel(t.priority)}
        </span>
      )}
      {rightPill && (
        <span className="shrink-0 rounded-full bg-background/70 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground ring-1 ring-border/50 group-hover:hidden">
          {rightPill}
        </span>
      )}
      <TaskHoverActions
        task={t}
        onEdit={() => openTaskEditor(t.id)}
        onDetails={() => openTaskEditor(t.id)}
      />
    </div>
  );
}

function EventRow({
  icon, title, subtitle, pill, pillTone = "primary", onClick,
}: {
  icon: React.ReactNode; title: string; subtitle?: string;
  pill: string; pillTone?: "primary" | "amber" | "rose" | "muted"; onClick?: () => void;
}) {
  const tone =
    pillTone === "amber" ? "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"
    : pillTone === "rose" ? "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300"
    : pillTone === "muted" ? "bg-muted text-muted-foreground ring-border/50"
    : "bg-primary/10 text-primary ring-primary/20";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/40"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>}
      </span>
      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1", tone)}>{pill}</span>
    </button>
  );
}

function FocusToggle({
  value, onChange, counts,
}: {
  value: Focus; onChange: (v: Focus) => void;
  counts: { today: number; upcoming: number; needs: number };
}) {
  const items: { id: Focus; label: string; n?: number }[] = [
    { id: "all", label: "All" },
    { id: "today", label: "Today", n: counts.today },
    { id: "upcoming", label: "Upcoming", n: counts.upcoming },
    { id: "needs", label: "Needs", n: counts.needs },
  ];
  return (
    <div className="mb-3 flex items-center gap-1 rounded-full border border-border/50 bg-card/60 p-1 backdrop-blur-md w-fit">
      {items.map(it => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors",
              active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
            {typeof it.n === "number" && (
              <span className={cn("rounded-full px-1.5 py-0 text-[10px]", active ? "bg-background/20" : "bg-muted")}>
                {it.n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function InboxOverview() {
  const { state, toggleTask, updateTask } = useStore() as any;
  const navigate = useNavigate();
  const [focus, setFocus] = useState<Focus>(() => readFocus());
  const [dropActive, setDropActive] = useState(false);
  const [suggestion, setSuggestion] = useState<{ taskId: string; date: string; time: string; label: string } | null>(null);

  const setFocusPersist = (f: Focus) => {
    setFocus(f);
    try { window.localStorage.setItem(FOCUS_KEY, f); } catch {}
  };

  const today = startOfDay(new Date());
  const todayISO = format(today, "yyyy-MM-dd");
  const weekEnd = addDays(today, 7);

  const data = useMemo(() => {
    const tasksToday: Task[] = [];
    const completedToday: Task[] = [];
    const tasksUpcoming: Task[] = [];
    const needs: Task[] = [];
    for (const t of state.tasks as Task[]) {
      if (t.parentTaskId || t.status === "parked") continue;
      if (t.dueDate === todayISO) {
        if (t.done) completedToday.push(t);
        else tasksToday.push(t);
        continue;
      }
      if (t.done) continue;
      if (!t.dueDate) { if (t.inbox) needs.push(t); continue; }
      const d = parseISO(t.dueDate);
      if (isWithinInterval(d, { start: addDays(today, 1), end: weekEnd })) tasksUpcoming.push(t);
    }
    const apptsToday = (state.appointments ?? []).filter((a: any) => apptOccursOn(a, todayISO));
    const apptsUpcoming = (state.appointments ?? []).filter((a: any) => {
      if (!a.date) return false;
      try {
        const d = parseISO(a.date);
        return isWithinInterval(d, { start: addDays(today, 1), end: weekEnd });
      } catch { return false; }
    });
    const bdaysUpcoming = (state.birthdays ?? []).filter((b: any) => {
      if (!b?.date) return false;
      try {
        const md = String(b.date).slice(5, 10);
        for (let i = 0; i <= 7; i++) if (format(addDays(today, i), "MM-dd") === md) return true;
      } catch {}
      return false;
    });
    const holidaysUpcoming = (state.holidays ?? []).filter((h: any) => {
      if (!h?.date) return false;
      try { return isWithinInterval(parseISO(h.date), { start: today, end: weekEnd }); } catch { return false; }
    });
    return { tasksToday, completedToday, tasksUpcoming, needs, apptsToday, apptsUpcoming, bdaysUpcoming, holidaysUpcoming };
  }, [state.tasks, state.appointments, state.birthdays, state.holidays, todayISO, today, weekEnd]);

  // Sorted Upcoming combined list — computed before any early return so hook
  // order stays stable across renders.
  const upcomingItems = useMemo(() => {
    type Item = { id: string; date: string; kind: "task" | "appt" | "bday" | "holiday"; title: string; subtitle?: string; task?: Task; raw?: any };
    const out: Item[] = [];
    data.tasksUpcoming.forEach(t => out.push({ id: `t-${t.id}`, date: t.dueDate!, kind: "task", title: t.title, subtitle: t.area, task: t }));
    (data.apptsUpcoming as any[]).forEach(a => out.push({ id: `a-${a.id}`, date: a.date, kind: "appt", title: a.title, subtitle: a.location ?? a.recipientId ?? "Appointment", raw: a }));
    (data.bdaysUpcoming as any[]).forEach(b => {
      const md = String(b.date).slice(5, 10);
      let occur = todayISO;
      for (let i = 0; i <= 7; i++) {
        const d = addDays(today, i);
        if (format(d, "MM-dd") === md) { occur = format(d, "yyyy-MM-dd"); break; }
      }
      out.push({ id: `b-${b.id}`, date: occur, kind: "bday", title: `${b.name ?? "Birthday"}`, subtitle: "Birthday", raw: b });
    });
    (data.holidaysUpcoming as any[]).forEach(h => out.push({ id: `h-${h.id}`, date: h.date, kind: "holiday", title: h.name ?? "Holiday", subtitle: "Holiday", raw: h }));
    return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [data, today, todayISO]);

  const todayCount = data.tasksToday.length + data.apptsToday.length;
  const upcomingCount = data.tasksUpcoming.length + data.apptsUpcoming.length + data.bdaysUpcoming.length + data.holidaysUpcoming.length;
  const needsCount = data.needs.length;
  if (todayCount + upcomingCount + needsCount + data.completedToday.length === 0) return null;

  // Today metrics
  const totalToday = data.tasksToday.length + data.completedToday.length;
  const pct = totalToday === 0 ? 0 : Math.round((data.completedToday.length / totalToday) * 100);
  const totalMin = data.tasksToday.reduce((s, t) => s + (t.estMinutes ?? 30), 0);
  const hrs = Math.floor(totalMin / 60), mins = totalMin % 60;
  const totalLabel = totalMin === 0 ? "" : hrs ? `${hrs}h${mins ? ` ${mins}m` : ""}` : `${mins} min`;

  const quickWins = data.tasksToday.filter(t => (t.estMinutes ?? 30) <= 15).length;
  const todayInsight = quickWins >= 2
    ? `${quickWins} tasks can be completed in under 15 minutes.`
    : pct >= 60 ? "You're ahead of schedule today."
    : data.tasksToday.length === 0 ? "Your day is clear — breathe."
    : "Completing your morning tasks keeps your afternoon open.";

  // Time-of-day groups
  const groups = { morning: [] as Task[], afternoon: [] as Task[], evening: [] as Task[] };
  data.tasksToday.forEach(t => groups[partOfDay(t)].push(t));

  // Upcoming insight
  const dayCounts = new Map<string, number>();
  data.tasksUpcoming.forEach(t => dayCounts.set(t.dueDate!, (dayCounts.get(t.dueDate!) ?? 0) + 1));
  data.apptsUpcoming.forEach((a: any) => dayCounts.set(a.date, (dayCounts.get(a.date) ?? 0) + 1));
  let busiest = ""; let busiestN = 0;
  dayCounts.forEach((n, d) => { if (n > busiestN) { busiestN = n; busiest = d; } });
  const upcomingInsight = busiestN >= 2
    ? `${relativeDay(busiest, today)} is your busiest day.`
    : upcomingCount === 0 ? "The week ahead is open."
    : "A calm week ahead.";

  // Needs Scheduling featured + insight
  const featured = data.needs[0];
  const needsInsight = featured
    ? `You have ${needsCount} task${needsCount === 1 ? "" : "s"} waiting.`
    : "Inbox is clear of unscheduled items.";

  // Compute a "best opening" for a dropped task: scan today + next 5 days at
  // 9am/1pm/3pm/7pm and pick the first slot not already filled by a task with
  // matching startTime.
  const findBestOpening = (taskId: string) => {
    const t = (state.tasks as Task[]).find(x => x.id === taskId);
    const taken = new Set(
      (state.tasks as Task[])
        .filter(x => x.dueDate && x.startTime && !x.done)
        .map(x => `${x.dueDate}T${x.startTime}`),
    );
    const slots = ["09:00", "13:00", "15:00", "19:00"];
    for (let d = 0; d < 6; d++) {
      const date = format(addDays(today, d), "yyyy-MM-dd");
      for (const time of slots) {
        if (!taken.has(`${date}T${time}`)) {
          const rel = relativeDay(date, today);
          const label = `${rel}, ${fmtTime(time) || time}`;
          return { taskId, date, time, label, task: t };
        }
      }
    }
    const date = format(addDays(today, 1), "yyyy-MM-dd");
    return { taskId, date, time: "15:00", label: `${relativeDay(date, today)}, 3pm`, task: t };
  };

  const handleScheduleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const id = e.dataTransfer.getData("application/x-careflow-task");
    if (!id) return;
    const s = findBestOpening(id);
    setSuggestion({ taskId: s.taskId, date: s.date, time: s.time, label: s.label });
    haptics.snap?.();
    toast("Scheduling suggestion ready", { description: s.label });
  };

  const handleScheduleDragOver = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes("application/x-careflow-task")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!dropActive) setDropActive(true);
    }
  };

  const acceptSuggestion = async () => {
    if (!suggestion) return;
    await updateTask(suggestion.taskId, { dueDate: suggestion.date, startTime: suggestion.time, inbox: false });
    haptics.snap?.();
    toast("Scheduled", { description: suggestion.label });
    setSuggestion(null);
  };

  const suggestedTask = suggestion ? (state.tasks as Task[]).find(t => t.id === suggestion.taskId) : null;

  const showToday = focus === "all" || focus === "today";
  const showUpcoming = focus === "all" || focus === "upcoming";
  const showNeeds = focus === "all" || focus === "needs";

  return (
    <section className="space-y-3">
      <FocusToggle
        value={focus}
        onChange={setFocusPersist}
        counts={{ today: todayCount, upcoming: upcomingCount, needs: needsCount }}
      />

      <div className={cn(
        "grid gap-3",
        focus === "all" ? "lg:grid-cols-3" : "lg:grid-cols-1",
      )}>
        {/* TODAY */}
        {showToday && (
        <CardShell accent="from-amber-200/30 via-amber-100/10 to-transparent dark:from-amber-500/15">
          <header className="mb-3 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100/70 ring-1 ring-amber-200/60 dark:bg-amber-500/15 dark:ring-amber-500/25">
              <Sun className="h-4.5 w-4.5 text-amber-600 dark:text-amber-300" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[17px] font-semibold tracking-tight text-foreground">Today</h3>
              <p className="text-[11.5px] text-muted-foreground">
                {data.tasksToday.length} task{data.tasksToday.length === 1 ? "" : "s"}{totalLabel && ` · ${totalLabel}`}
              </p>
            </div>
            <CompletionRing pct={pct} />
          </header>

          <InsightBanner tone="emerald">{todayInsight}</InsightBanner>

          <div className="mt-3 space-y-3">
            {(["morning", "afternoon", "evening"] as const).map(part => {
              const list = groups[part];
              if (list.length === 0 && data.apptsToday.length === 0) return null;
              const items = part === "morning"
                ? [...data.apptsToday.filter((a: any) => { const t = a.time ?? ""; return !t || parseInt(t) < 12; }), ...list]
                : part === "afternoon"
                ? [...data.apptsToday.filter((a: any) => { const t = a.time ?? ""; const h = parseInt(t); return h >= 12 && h < 17; }), ...list]
                : [...data.apptsToday.filter((a: any) => { const t = a.time ?? ""; const h = parseInt(t); return h >= 17; }), ...list];
              if (items.length === 0) return null;
              const label = part[0].toUpperCase() + part.slice(1);
              return (
                <div key={part}>
                  <div className="mb-1 flex items-center gap-2 px-2">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                    <span className="rounded-full bg-muted/60 px-1.5 py-0 text-[10px] text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {items.map((it: any) =>
                      it.title && it.id && !it.priority && it.time !== undefined
                        ? <EventRow key={`a-${it.id}`} icon={<CalendarIcon className="h-3.5 w-3.5" />}
                            title={it.title} subtitle={it.location}
                            pill={fmtTime(it.time) || "All day"} pillTone="primary"
                            onClick={() => navigate(`/calendar?date=${todayISO}`)} />
                        : <TaskRow key={`t-${it.id}`} t={it as Task}
                            onToggle={() => toggleTask((it as Task).id)}
                            rightPill={(it as Task).startTime ? fmtTime((it as Task).startTime) : label} />
                    )}
                  </div>
                </div>
              );
            })}
            {data.tasksToday.length === 0 && data.apptsToday.length === 0 && (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">Nothing scheduled — enjoy the open space.</p>
            )}
          </div>

          <footer className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              {data.completedToday.length} completed
            </span>
            <button type="button" onClick={() => navigate("/today")}
              className="inline-flex items-center gap-1 font-medium text-foreground/70 hover:text-foreground">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </footer>
        </CardShell>
        )}

        {/* UPCOMING */}
        {showUpcoming && (
        <CardShell accent="from-sky-200/30 via-sky-100/10 to-transparent dark:from-primary/15">
          <header className="mb-3 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <CalendarRange className="h-4.5 w-4.5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[17px] font-semibold tracking-tight text-foreground">Upcoming</h3>
              <p className="text-[11.5px] text-muted-foreground">
                {upcomingCount} item{upcomingCount === 1 ? "" : "s"} · Next 7 days
              </p>
            </div>
            <button type="button" onClick={() => navigate("/calendar")}
              aria-label="Open calendar"
              className="grid h-9 w-9 place-items-center rounded-full border border-border/50 bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <CalendarIcon className="h-4 w-4" />
            </button>
          </header>

          <InsightBanner tone="primary">{upcomingInsight}</InsightBanner>

          <div className="mt-3 space-y-0.5">
            {upcomingItems.map(it => {
              const rel = relativeDay(it.date, today);
              const abs = format(parseISO(it.date), "EEE MMM d");
              const pill = `${rel} · ${abs.split(" ").slice(1).join(" ")}`;
              if (it.kind === "task" && it.task) {
                const r = resolveTaskIcon(it.task);
                const Ic = r.kind === "lucide" ? r.Icon : InboxIcon;
                return (
                  <EventRow key={it.id} icon={<Ic className="h-3.5 w-3.5" />}
                    title={it.title} subtitle={it.subtitle}
                    pill={pill} pillTone="primary"
                    onClick={() => openTaskEditor(it.task!.id)} />
                );
              }
              if (it.kind === "appt") return (
                <EventRow key={it.id} icon={<CalendarIcon className="h-3.5 w-3.5" />}
                  title={it.title} subtitle={it.subtitle}
                  pill={pill} pillTone="primary"
                  onClick={() => navigate(`/calendar?date=${it.date}`)} />
              );
              if (it.kind === "bday") return (
                <EventRow key={it.id} icon={<Cake className="h-3.5 w-3.5 text-rose-500" />}
                  title={it.title} subtitle={it.subtitle}
                  pill={pill} pillTone="rose"
                  onClick={() => navigate("/seasons/holidays")} />
              );
              return (
                <EventRow key={it.id} icon={<TreePine className="h-3.5 w-3.5 text-amber-600" />}
                  title={it.title} subtitle={it.subtitle}
                  pill={pill} pillTone="amber"
                  onClick={() => navigate("/seasons/holidays")} />
              );
            })}
            {upcomingItems.length === 0 && (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">No plans in the next seven days.</p>
            )}
          </div>

          <footer className="mt-3 flex items-center justify-end border-t border-border/40 pt-3 text-[12px]">
            <button type="button" onClick={() => navigate("/calendar")}
              className="inline-flex items-center gap-1 font-medium text-foreground/70 hover:text-foreground">
              <CalendarIcon className="h-3 w-3" /> View full calendar <ArrowRight className="h-3 w-3" />
            </button>
          </footer>
        </CardShell>
        )}

        {/* NEEDS SCHEDULING */}
        {showNeeds && (
        <CardShell accent="from-amber-300/25 via-amber-100/10 to-transparent dark:from-amber-500/15">
        <div
          onDragOver={handleScheduleDragOver}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleScheduleDrop}
          className={cn(
            "rounded-2xl transition-all",
            dropActive && "ring-2 ring-amber-400/60 ring-offset-2 ring-offset-background",
          )}
        >
          <header className="mb-3 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100/70 ring-1 ring-amber-200/60 dark:bg-amber-500/15 dark:ring-amber-500/25">
              <Hourglass className="h-4.5 w-4.5 text-amber-600 dark:text-amber-300" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[17px] font-semibold tracking-tight text-foreground">Needs Scheduling</h3>
              <p className="text-[11.5px] text-muted-foreground">
                {needsCount} task{needsCount === 1 ? "" : "s"} waiting
              </p>
            </div>
            <button type="button"
              aria-label="Auto-suggest schedule"
              className="grid h-9 w-9 place-items-center rounded-full border border-amber-200/60 bg-amber-50/60 text-amber-700 transition-colors hover:bg-amber-100/60 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
              <Sparkles className="h-4 w-4" />
            </button>
          </header>

          <InsightBanner tone="amber">{needsInsight}</InsightBanner>

          {suggestion && suggestedTask && (
            <div className="mt-3 rounded-2xl border border-emerald-300/50 bg-emerald-50/70 p-3 ring-1 ring-emerald-200/50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3" /> Suggested slot
                </span>
                <button type="button" onClick={() => setSuggestion(null)} aria-label="Dismiss suggestion"
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <button type="button" onClick={() => openTaskEditor(suggestedTask.id)}
                className="mt-1 block w-full truncate text-left text-[13.5px] font-medium text-foreground">
                {suggestedTask.title}
              </button>
              <div className="mt-1 text-[12px] text-foreground/80">{suggestion.label}</div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={acceptSuggestion}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]">
                  <CalendarPlus className="h-3.5 w-3.5" /> Schedule
                </button>
                <button type="button" onClick={() => setSuggestion(null)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted">
                  Not now
                </button>
              </div>
            </div>
          )}

          {featured ? (
            <div className="mt-3 rounded-2xl border border-amber-200/40 bg-background/70 p-3 shadow-sm dark:border-amber-500/20">
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100/70 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <FolderOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => openTaskEditor(featured.id)}
                    className="block w-full truncate text-left text-[13.5px] font-medium text-foreground">
                    {featured.title}
                  </button>
                  <span className="text-[11px] text-muted-foreground">{featured.area ?? "Personal"}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10.5px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {featured.estMinutes ?? 20} min
                </span>
                {featured.priority && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10.5px] text-muted-foreground ring-1 ring-border/50">
                    <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot(featured.priority))} />
                    {priorityLabel(featured.priority)} priority
                  </span>
                )}
              </div>

              <div className="mt-3 rounded-xl bg-amber-50/60 px-3 py-2 ring-1 ring-amber-200/50 dark:bg-amber-500/10 dark:ring-amber-500/20">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" /> Best opening
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">Tomorrow, 3:00 PM</span>
                  <span className="text-[10.5px] text-muted-foreground">60 min available</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                <button
                  type="button"
                  onClick={() => updateTask(featured.id, { dueDate: format(addDays(today, 1), "yyyy-MM-dd"), startTime: "15:00", inbox: false })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 px-3 py-2 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> Schedule
                </button>
                <button
                  type="button"
                  onClick={() => updateTask(featured.id, { snoozedUntil: format(addDays(today, 1), "yyyy-MM-dd"), status: "parked" })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Bell className="h-3.5 w-3.5" /> Snooze
                </button>
                <button
                  type="button"
                  onClick={() => openTaskEditor(featured.id)}
                  aria-label="More"
                  className="inline-flex items-center justify-center rounded-xl border border-border/60 bg-background/60 px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className={cn(
              "mt-3 grid place-items-center rounded-2xl border border-dashed px-4 py-6 text-center transition-colors",
              dropActive
                ? "border-amber-400 bg-amber-50/70 dark:bg-amber-500/10"
                : "border-border/60 bg-background/40",
            )}>
              <CalendarPlus className="mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-[12.5px] font-medium text-foreground">
                {dropActive ? "Drop to suggest a time" : "Drag tasks here to schedule"}
              </p>
              <p className="text-[11px] text-muted-foreground">Suggestions will appear as your inbox fills.</p>
            </div>
          )}

          {needsCount > 1 && (
            <footer className="mt-3 flex items-center justify-end border-t border-amber-200/30 pt-3 text-[12px] dark:border-amber-500/20">
              <button type="button"
                onClick={() => {
                  const el = document.getElementById("inbox-held");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex items-center gap-1 font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200">
                View unscheduled ({needsCount}) <ChevronRight className="h-3 w-3" />
              </button>
            </footer>
          )}
        </div>
        </CardShell>
        )}
      </div>
    </section>
  );
}