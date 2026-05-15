import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks,
  startOfYear, endOfYear, eachMonthOfInterval, addYears, subYears,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, RefreshCw, Inbox as InboxIcon, CalendarPlus, List, LayoutGrid, CheckSquare, CalendarClock, HeartPulse, UtensilsCrossed, Cake } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatRelativeDate } from "@/lib/date-format";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { hoursToHM } from "@/lib/time-blocks";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { BirthdayHolidayEditor } from "@/components/calendar/BirthdayHolidayEditor";

type View = "day" | "week" | "month" | "year";

export default function CalendarPage() {
  const { state, addTask, deleteAppointment, updateTask, updateAppointment, updateBirthday, updateHoliday } = useStore();
  const [taskTitle, setTaskTitle] = useState("");
  const [toInbox, setToInbox] = useState(true);
  const [view, setView] = useState<View>("month");
  const [layout, setLayout] = useState<"grid" | "schedule">("grid");
  const [cursor, setCursor] = useState<Date>(new Date());
  const ALL_KINDS = ["task","appt","care","meal","bday","hol","gcal"] as const;
  type Kind = typeof ALL_KINDS[number];
  const [kindFilter, setKindFilter] = useState<Set<Kind>>(() => new Set(ALL_KINDS));
  const toggleKind = (k: Kind) => setKindFilter(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [gLoading, setGLoading] = useState(false);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editBdayId, setEditBdayId] = useState<string | null>(null);
  const [editHolId, setEditHolId] = useState<string | null>(null);
  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;
  const editingBday = editBdayId ? state.birthdays.find(b => b.id === editBdayId) ?? null : null;
  const editingHol = editHolId ? state.holidays.find(h => h.id === editHolId) ?? null : null;

  const loadGoogle = async () => {
    setGLoading(true);
    try {
      const r = await gcalFetchEvents();
      setGEvents(r.events ?? []);
    } catch (e: any) {
      // Silent on first load when not connected; show on manual refresh
      console.warn("gcal load failed", e);
    } finally { setGLoading(false); }
  };

  useEffect(() => { loadGoogle(); }, []);

  const colorOf = (k: "appt"|"bday"|"hol"|"gcal"|"task"|"care"|"meal") =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-secondary-soft text-secondary-foreground"
    : k === "task" ? "bg-warm-soft text-warm-foreground border border-primary/30"
    : k === "care" ? "bg-rose-100 text-rose-900 border border-rose-300/50 dark:bg-rose-900/30 dark:text-rose-100"
    : k === "meal" ? "bg-amber-100 text-amber-900 border border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100"
    : "bg-muted text-foreground";

  // Adapter for TimeGrid which only knows about a narrower set of kinds.
  const eventsOnForGrid = (k: string) => eventsOn(k)
    .filter(e => e.kind !== "meal")
    .map(e => ({
      ...e,
      kind: (e.kind === "care" ? "task" : e.kind) as "appt" | "bday" | "gcal" | "hol" | "task",
    }));

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ kind: "appt" as const, id: a.id, label: a.title, time: a.time })),
    ...state.birthdays.filter(b => b.date === k).map(b => ({ kind: "bday" as const, id: b.id, label: `🎂 ${b.name}`, time: undefined })),
    ...state.holidays.filter(h => h.date === k).map(h => ({ kind: "hol" as const, id: h.id, label: `✨ ${h.name}`, time: undefined })),
    ...gEvents.filter(g => g.date === k).map(g => ({ kind: "gcal" as const, label: g.title, time: g.time ?? undefined, color: g.color })),
    ...state.tasks.filter(t => t.dueDate === k && !t.done && !t.parentTaskId).map(t => ({
      kind: (t.area === "Caregiving" ? "care" : "task") as "care" | "task",
      id: t.id,
      label: `${t.done ? "✓" : "○"} ${t.title}`,
      time: undefined,
    })),
    ...(state.meals ?? []).filter(m => m.date === k).map(m => ({
      kind: "meal" as const,
      id: m.id,
      label: `${m.slot}: ${m.name}`,
      time: undefined,
    })),
  ];

  /** Drop a task onto a day — sets due date only. */
  const handleDayDrop = async (taskId: string, dateISO: string) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    await updateTask(taskId, { dueDate: dateISO, inbox: false });
    toast(`Scheduled “${t.title}” for ${dateISO}`);
  };

  /** Drop onto a time slot (week/day) — TimeGrid creates the block; we set the task's due date. */
  const handleTimeDrop = async (taskId: string, dateISO: string, startHour: number) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    await updateTask(taskId, { dueDate: dateISO, inbox: false });
    toast(`Scheduled “${t.title}” at ${hoursToHM(startHour)}`);
  };

  const shift = (dir: 1 | -1) => {
    setCursor(c => {
      if (view === "day") return addDays(c, dir);
      if (view === "week") return dir > 0 ? addWeeks(c, 1) : subWeeks(c, 1);
      if (view === "month") return dir > 0 ? addMonths(c, 1) : subMonths(c, 1);
      return dir > 0 ? addYears(c, 1) : subYears(c, 1);
    });
  };

  const headerLabel = view === "day"
    ? format(cursor, "EEEE, MMMM d, yyyy")
    : view === "week"
      ? `${format(startOfWeek(cursor, { weekStartsOn: 0 }), "MMM d")} – ${format(endOfWeek(cursor, { weekStartsOn: 0 }), "MMM d, yyyy")}`
      : view === "month"
        ? format(cursor, "MMMM yyyy")
        : format(cursor, "yyyy");

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
      <div className="cozy-card gradient-calm p-6">
        <h2 className="font-display text-3xl font-semibold">Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Appointments, birthdays, holidays — color-coded and gentle.</p>
      </div>

      <SectionCard title="Quick add task" accent="calm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const title = taskTitle.trim();
            if (!title) return;
            await addTask({
              title,
              inbox: toInbox,
              dueDate: toInbox ? undefined : cursor.toISOString().slice(0, 10),
            });
            setTaskTitle("");
            toast(toInbox ? `Added “${title}” to Inbox` : `Scheduled “${title}” for ${format(cursor, "MMM d")}`);
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <Input
            placeholder="What needs to get done?"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="flex-1"
          />
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5">
            {toInbox ? <InboxIcon className="h-3.5 w-3.5 text-muted-foreground" /> : <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" />}
            <Label htmlFor="cal-inbox-toggle" className="text-xs text-muted-foreground">
              {toInbox ? "To Inbox" : `Schedule ${format(cursor, "MMM d")}`}
            </Label>
            <Switch id="cal-inbox-toggle" checked={toInbox} onCheckedChange={setToInbox} />
          </div>
          <Button type="submit" disabled={!taskTitle.trim()}>Add</Button>
        </form>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>{gEvents.length > 0 ? `Showing ${gEvents.length} Google event${gEvents.length === 1 ? "" : "s"}.` : "Connect Google Calendar in Settings to see your events here."}</span>
        <Button size="sm" variant="ghost" className="h-7 rounded-full" onClick={() => { loadGoogle(); toast("Refreshing Google events…"); }} disabled={gLoading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${gLoading ? "animate-spin" : ""}`} /> Refresh Google
        </Button>
      </div>

      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <span>{headerLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="ml-1 h-7 px-2 text-xs" onClick={() => setCursor(new Date())}>Today</Button>
          </div>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-full bg-muted/60 p-0.5">
              {(["day","week","month","year"] as View[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                    view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-full bg-muted/60 p-0.5">
              <button
                onClick={() => setLayout("grid")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  layout === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3 w-3" /> Grid
              </button>
              <button
                onClick={() => setLayout("schedule")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  layout === "schedule" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Schedule list view"
              >
                <List className="h-3 w-3" /> Schedule
              </button>
            </div>
          </div>
        }
        accent="warm"
      >
        {layout === "schedule" ? (
          <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {([
              { k: "task" as Kind, label: "Tasks", Icon: CheckSquare },
              { k: "appt" as Kind, label: "Appointments", Icon: CalendarClock },
              { k: "care" as Kind, label: "Caregiving", Icon: HeartPulse },
              { k: "meal" as Kind, label: "Meals", Icon: UtensilsCrossed },
              { k: "bday" as Kind, label: "Birthdays", Icon: Cake },
              { k: "hol" as Kind, label: "Holidays", Icon: Cake },
              { k: "gcal" as Kind, label: "Google", Icon: CalendarClock },
            ] as const).map(({ k, label, Icon }) => {
              const on = kindFilter.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                    on
                      ? "border-primary/40 bg-primary-soft text-foreground shadow-sm"
                      : "border-border/50 bg-muted/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setKindFilter(new Set(ALL_KINDS))}
              className="ml-auto text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              All
            </button>
          </div>
          <ScheduleView
            view={view}
            cursor={cursor}
            eventsOn={eventsOn}
            colorOf={colorOf}
            kindFilter={kindFilter}
            onItemClick={(item) => {
              if (item.kind === "appt" && item.id) setEditApptId(item.id);
              else if (item.kind === "task" && item.id) setEditTaskId(item.id);
              else if (item.kind === "care" && item.id) setEditTaskId(item.id);
              else if (item.kind === "bday" && item.id) setEditBdayId(item.id);
              else if (item.kind === "hol" && item.id) setEditHolId(item.id);
            }}
            onItemReschedule={async (item, dateISO) => {
              if (item.kind === "appt" && item.id) {
                await updateAppointment(item.id, { date: dateISO });
                toast(`Moved “${item.label}” to ${format(parseISO(dateISO), "MMM d")}`);
              } else if ((item.kind === "task" || item.kind === "care") && item.id) {
                await updateTask(item.id, { dueDate: dateISO, inbox: false });
                toast(`Rescheduled task to ${format(parseISO(dateISO), "MMM d")}`);
              } else if (item.kind === "bday" && item.id) {
                await updateBirthday(item.id, { date: dateISO });
                toast(`Moved “${item.label}” to ${format(parseISO(dateISO), "MMM d")}`);
              } else if (item.kind === "hol" && item.id) {
                await updateHoliday(item.id, { date: dateISO });
                toast(`Moved “${item.label}” to ${format(parseISO(dateISO), "MMM d")}`);
              }
            }}
          />
          </>
        ) : (
          <>
            {view === "month" && <MonthView cursor={cursor} eventsOn={eventsOn} colorOf={colorOf} onTaskDropDay={handleDayDrop} />}
            {view === "week" && (
              <TimeGrid
                days={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor, { weekStartsOn: 0 }), i))}
                appointmentsOn={eventsOnForGrid}
                onTaskDropAt={handleTimeDrop}
              />
            )}
            {view === "day" && (
              <TimeGrid days={[cursor]} appointmentsOn={eventsOnForGrid} onTaskDropAt={handleTimeDrop} />
            )}
            {view === "year" && <YearView cursor={cursor} eventsOn={eventsOn} setCursor={setCursor} setView={setView} />}
          </>
        )}
      </SectionCard>

      <SectionCard title="All appointments" accent="sage">
        <ul className="space-y-1.5">
          {state.appointments.sort((a,b) => a.date.localeCompare(b.date)).map(a => (
            <li key={a.id} className="group flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground">{format(parseISO(a.date), "MMM d")} {a.time ?? ""}</span>
              <span className="flex-1">{a.title}</span>
              <span className="text-xs text-muted-foreground">{a.type}</span>
              <button onClick={() => deleteAppointment(a.id)} className="opacity-0 group-hover:opacity-60"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      </SectionCard>
      </div>
      <UnscheduledTasksRail />
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
    </div>
  );
}

type EventItem = { kind: "appt" | "bday" | "hol" | "gcal" | "task" | "care" | "meal"; id?: string; label: string; time?: string; color?: string };
type EventsFn = (k: string) => EventItem[];
type ColorFn = (k: EventItem["kind"]) => string;

function MonthView({ cursor, eventsOn, colorOf, onTaskDropDay }: { cursor: Date; eventsOn: EventsFn; colorOf: ColorFn; onTaskDropDay?: (taskId: string, dateISO: string) => void }) {
  const ms = startOfMonth(cursor);
  const gs = startOfWeek(ms, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gs, end: addDays(gs, 41) });
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map(d => {
          const k = d.toISOString().slice(0,10);
          const ev = eventsOn(k);
          const today = isSameDay(d, new Date());
          const inMonth = isSameMonth(d, cursor);
          return (
            <div
              key={k}
              onDragOver={(e) => {
                if (!onTaskDropDay) return;
                if (!Array.from(e.dataTransfer.types).includes("application/x-careflow-task")) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setHoverISO(k);
              }}
              onDragLeave={() => setHoverISO(p => p === k ? null : p)}
              onDrop={(e) => {
                if (!onTaskDropDay) return;
                const id = e.dataTransfer.getData("application/x-careflow-task");
                if (!id) return;
                e.preventDefault();
                onTaskDropDay(id, k);
                setHoverISO(null);
              }}
              className={cn(
                "min-h-24 rounded-lg border p-1.5 text-xs transition-colors",
                inMonth ? "border-border/60 bg-card" : "border-transparent text-muted-foreground/50",
                today && "ring-2 ring-primary",
                hoverISO === k && "ring-2 ring-primary bg-primary/10",
              )}
            >
              <div className="text-right text-[11px] font-medium">{format(d, "d")}</div>
              <div className="mt-0.5 space-y-0.5">
                {ev.map((e, i) => <div key={i} className={cn("truncate rounded px-1 py-0.5 text-[10px]", colorOf(e.kind))}>{e.label}</div>)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function WeekView({ cursor, eventsOn, colorOf }: { cursor: Date; eventsOn: EventsFn; colorOf: ColorFn }) {
  const start = startOfWeek(cursor, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map(d => {
        const k = d.toISOString().slice(0,10);
        const ev = eventsOn(k);
        const today = isSameDay(d, new Date());
        return (
          <div key={k} className={cn("min-h-32 rounded-xl border border-border/60 bg-card p-2", today && "ring-2 ring-primary")}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
              <span className="text-sm font-semibold">{format(d, "d")}</span>
            </div>
            <div className="space-y-1">
              {ev.length === 0 && <p className="text-[11px] text-muted-foreground">—</p>}
              {ev.map((e, i) => (
                <div key={i} className={cn("truncate rounded px-1.5 py-1 text-[11px]", colorOf(e.kind))}>
                  {e.time && <span className="mr-1 font-medium">{e.time}</span>}{e.label}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ cursor, eventsOn, colorOf }: { cursor: Date; eventsOn: EventsFn; colorOf: ColorFn }) {
  const k = cursor.toISOString().slice(0,10);
  const ev = eventsOn(k).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  return (
    <div className="space-y-2">
      {ev.length === 0 ? (
        <p className="rounded-lg bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">A clear day. Enjoy it.</p>
      ) : ev.map((e, i) => (
        <div key={i} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", colorOf(e.kind))}>
          <span className="w-16 text-xs font-medium opacity-80">{e.time ?? "any time"}</span>
          <span className="flex-1">{e.label}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-60">{e.kind}</span>
        </div>
      ))}
    </div>
  );
}

function YearView({ cursor, eventsOn, setCursor, setView }: { cursor: Date; eventsOn: EventsFn; setCursor: (d: Date) => void; setView: (v: View) => void }) {
  const months = eachMonthOfInterval({ start: startOfYear(cursor), end: endOfYear(cursor) });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {months.map(m => {
        const ms = startOfMonth(m);
        const gs = startOfWeek(ms, { weekStartsOn: 0 });
        const cells = eachDayOfInterval({ start: gs, end: addDays(gs, 41) });
        return (
          <button
            key={m.toISOString()}
            onClick={() => { setCursor(m); setView("month"); }}
            className="rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:bg-muted/40"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{format(m, "MMMM")}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(m, "yyyy")}</span>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-[9px] text-muted-foreground/70">
              {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="text-center">{d}</div>)}
            </div>
            <div className="mt-0.5 grid grid-cols-7 gap-0.5">
              {cells.map(d => {
                const k = d.toISOString().slice(0,10);
                const has = eventsOn(k).length > 0;
                const today = isSameDay(d, new Date());
                const inMonth = isSameMonth(d, m);
                return (
                  <div key={k} className={cn(
                    "relative aspect-square rounded text-center text-[9px] leading-[1.4]",
                    inMonth ? "text-foreground" : "text-muted-foreground/30",
                    today && "bg-primary/15 font-bold text-primary",
                  )}>
                    {format(d, "d")}
                    {has && inMonth && <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-1 rounded-full bg-accent-foreground" />}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const SCHED_DRAG_MIME = "application/x-careflow-sched";

function ScheduleView({ view, cursor, eventsOn, colorOf, onItemClick, onItemReschedule, kindFilter }: { view: View; cursor: Date; eventsOn: EventsFn; colorOf: ColorFn; onItemClick?: (item: EventItem) => void; onItemReschedule?: (item: EventItem, dateISO: string) => void | Promise<void>; kindFilter?: Set<EventItem["kind"]> }) {
  const [dragging, setDragging] = useState<EventItem | null>(null);
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  let start: Date, end: Date;
  if (view === "day") { start = cursor; end = cursor; }
  else if (view === "week") { start = startOfWeek(cursor, { weekStartsOn: 0 }); end = endOfWeek(cursor, { weekStartsOn: 0 }); }
  else if (view === "month") { start = startOfMonth(cursor); end = endOfMonth(cursor); }
  else { start = startOfYear(cursor); end = endOfYear(cursor); }

  const days = eachDayOfInterval({ start, end });
  const filterFn = (it: EventItem) => !kindFilter || kindFilter.has(it.kind);
  const sections = days
    .map(d => ({ date: d, iso: d.toISOString().slice(0, 10), items: eventsOn(d.toISOString().slice(0, 10)).filter(filterFn).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")) }))
    .filter(s => s.items.length > 0);

  // For drop targets, use ALL days in the range so users can drop on empty days too.
  const dropDays = days;

  if (sections.length === 0 && !dragging) {
    return <p className="rounded-lg bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">Nothing scheduled in this {view}.</p>;
  }

  // Map for quick lookup of section by iso
  const byIso = new Map(sections.map(s => [s.iso, s] as const));

  return (
    <div className="space-y-4">
      {dropDays.map(d => {
        const iso = d.toISOString().slice(0, 10);
        const s = byIso.get(iso);
        const isDropTarget = !!dragging && (!s || dragging.id ? true : false);
        // Skip rendering empty days unless we're actively dragging
        if (!s && !dragging) return null;
        return (
          <div
            key={iso}
            onDragOver={(ev) => {
              if (!onItemReschedule || !dragging) return;
              if (!Array.from(ev.dataTransfer.types).includes(SCHED_DRAG_MIME)) return;
              ev.preventDefault();
              ev.dataTransfer.dropEffect = "move";
              setHoverISO(iso);
            }}
            onDragLeave={() => setHoverISO(p => p === iso ? null : p)}
            onDrop={(ev) => {
              if (!onItemReschedule || !dragging) return;
              ev.preventDefault();
              const item = dragging;
              setHoverISO(null);
              setDragging(null);
              if (item) void onItemReschedule(item, iso);
            }}
            className={cn(
              "rounded-xl transition-colors",
              hoverISO === iso && "bg-primary/10 ring-2 ring-primary p-2",
            )}
          >
            <div className="sticky top-0 z-10 mb-1.5 flex items-baseline gap-2 bg-card/80 py-1 backdrop-blur-sm">
              <span className={cn("font-display text-sm font-semibold", isSameDay(d, new Date()) && "text-primary")}>
                {formatRelativeDate(iso)}
              </span>
              <span className="text-[11px] text-muted-foreground">{format(d, "EEE, MMM d")}</span>
              {s && <span className="ml-auto text-[10px] text-muted-foreground">{s.items.length} item{s.items.length === 1 ? "" : "s"}</span>}
            </div>
            {!s ? (
              <p className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-center text-[11px] text-muted-foreground">Drop here to schedule</p>
            ) : (
            <ul className="space-y-1">
              {s.items.map((e, i) => (
                (() => {
                  const clickable = !!onItemClick && (e.kind === "appt" || e.kind === "task") && !!e.id;
                  const draggable = !!onItemReschedule && (e.kind === "appt" || e.kind === "task") && !!e.id;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => clickable && onItemClick!(e)}
                        draggable={draggable}
                        onDragStart={draggable ? (ev) => {
                          ev.dataTransfer.setData(SCHED_DRAG_MIME, e.id!);
                          ev.dataTransfer.effectAllowed = "move";
                          setDragging(e);
                        } : undefined}
                        onDragEnd={() => { setDragging(null); setHoverISO(null); }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all",
                          colorOf(e.kind),
                          clickable && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          draggable && "active:cursor-grabbing",
                          dragging?.id === e.id && "opacity-50",
                          !clickable && "cursor-default",
                        )}
                      >
                        <span className="w-16 shrink-0 text-xs font-medium opacity-80">{e.time ?? "any time"}</span>
                        <span className="flex-1 truncate">{e.label}</span>
                        <span className="text-[10px] uppercase tracking-wider opacity-60">{e.kind}</span>
                      </button>
                    </li>
                  );
                })()
              ))}
            </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
