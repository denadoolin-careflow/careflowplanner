import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks,
  startOfYear, endOfYear, eachMonthOfInterval, addYears, subYears,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, RefreshCw, List, LayoutGrid, CheckSquare, CalendarClock, HeartPulse, UtensilsCrossed, Cake, Sparkles, Columns3 } from "lucide-react";
import { formatRelativeDate } from "@/lib/date-format";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { hoursToHM } from "@/lib/time-blocks";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { BirthdayHolidayEditor } from "@/components/calendar/BirthdayHolidayEditor";
import { InboxCapture } from "@/components/calendar/InboxCapture";
import { MonthPlanningDashboard } from "@/components/calendar/MonthPlanningDashboard";
import { moonPhaseFor } from "@/lib/moon-phase";
import { Globe2 } from "lucide-react";
import { MoonPhaseBadge } from "@/components/rhythm/MoonPhaseBadge";
import { ElementBadge } from "@/components/rhythm/ElementBadge";

type View = "day" | "week" | "month" | "year";

export default function CalendarPage() {
  const { state, deleteAppointment, updateTask, updateAppointment, updateBirthday, updateHoliday } = useStore();
  const tz = state.settings.timeZone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");
  const tzOffset = (() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date());
      return parts.find(p => p.type === "timeZoneName")?.value ?? "";
    } catch { return ""; }
  })();
  const [view, setView] = useState<View>("month");
  const [layout, setLayout] = useState<"grid" | "schedule" | "kanban" | "plan">("grid");
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
    ...state.appointments.filter(a => a.date === k).map(a => ({ kind: "appt" as const, id: a.id, label: `${a.icon ? a.icon + " " : ""}${a.title}`, time: a.time })),
    ...state.birthdays.filter(b => b.date === k).map(b => ({ kind: "bday" as const, id: b.id, label: `🎂 ${b.name}`, time: undefined })),
    ...state.holidays.filter(h => h.date === k).map(h => ({ kind: "hol" as const, id: h.id, label: `✨ ${h.name}`, time: undefined })),
    ...gEvents.filter(g => g.date === k).map(g => ({ kind: "gcal" as const, label: g.title, time: g.time ?? undefined, color: g.color })),
    ...state.tasks.filter(t => t.dueDate === k && !t.done && !t.parentTaskId).map(t => ({
      kind: (t.area === "Caregiving" ? "care" : "task") as "care" | "task",
      id: t.id,
      label: `${t.icon && !t.icon.startsWith("lc:") ? t.icon : (t.done ? "✓" : "○")} ${t.title}`,
      time: undefined,
    })),
    ...(state.meals ?? []).filter(m => m.date === k).map(m => ({
      kind: "meal" as const,
      id: m.id,
      label: `${m.slot}: ${m.name}`,
      time: undefined,
    })),
  ];

  // Filter-aware wrapper used by all layouts.
  const eventsOnFiltered = (k: string) =>
    eventsOn(k).filter(e => kindFilter.has(e.kind as Kind));

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

  /** Unified item editor opener — used by every calendar layout. */
  const openItemEditor = (item: EventItem) => {
    if (item.kind === "appt" && item.id) setEditApptId(item.id);
    else if ((item.kind === "task" || item.kind === "care") && item.id) setEditTaskId(item.id);
    else if (item.kind === "bday" && item.id) setEditBdayId(item.id);
    else if (item.kind === "hol" && item.id) setEditHolId(item.id);
  };

  /** Unified reschedule handler — works for any item that owns a date/time. */
  const rescheduleItem = async (
    item: EventItem,
    patch: { date?: string; time?: string | null },
  ) => {
    const { date, time } = patch;
    if (item.kind === "appt" && item.id) {
      await updateAppointment(item.id, {
        ...(date ? { date } : {}),
        ...(time !== undefined ? { time } : {}),
      });
    } else if ((item.kind === "task" || item.kind === "care") && item.id && date) {
      await updateTask(item.id, { dueDate: date, inbox: false });
    } else if (item.kind === "bday" && item.id && date) {
      await updateBirthday(item.id, { date });
    } else if (item.kind === "hol" && item.id && date) {
      await updateHoliday(item.id, { date });
    } else {
      return;
    }
    if (date) toast(`Moved “${item.label}” to ${format(parseISO(date), "MMM d")}`);
    else if (time) toast(`Moved “${item.label}” to ${time}`);
    else if (time === null) toast(`Cleared time for “${item.label}”`);
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
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <MoonPhaseBadge date={cursor} />
          <ElementBadge date={cursor} />
        </div>
      </div>

      <InboxCapture defaultDate={cursor} />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-0.5">
            <Globe2 className="h-3 w-3" />
            <span className="font-medium text-foreground">{tz}</span>
            {tzOffset && <span className="opacity-70">{tzOffset}</span>}
          </span>
          <span>{gEvents.length > 0 ? `Showing ${gEvents.length} Google event${gEvents.length === 1 ? "" : "s"}.` : "Connect Google Calendar in Settings to see your events here."}</span>
        </span>
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
              <button
                onClick={() => setLayout("kanban")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  layout === "kanban" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Kanban view"
              >
                <Columns3 className="h-3 w-3" /> Kanban
              </button>
              {view === "month" && (
                <button
                  onClick={() => setLayout("plan")}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    layout === "plan" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Monthly planning dashboard"
                >
                  <Sparkles className="h-3 w-3" /> Plan
                </button>
              )}
            </div>
          </div>
        }
        accent="warm"
      >
        {layout === "plan" && view === "month" ? (
          <MonthPlanningDashboard cursor={cursor} onJumpToDate={(d) => { setCursor(d); setLayout("grid"); setView("day"); }} />
        ) : (
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
          {layout === "schedule" ? (
          <ScheduleView
            view={view}
            cursor={cursor}
            eventsOn={eventsOnFiltered}
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
          ) : layout === "kanban" ? (
            <KanbanByTimeframe
              view={view}
              cursor={cursor}
              eventsOn={eventsOnFiltered}
              colorOf={colorOf}
              onItemClick={openItemEditor}
              onItemReschedule={rescheduleItem}
            />
          ) : (
            <>
            {view === "month" && (
              <MonthView
                cursor={cursor}
                eventsOn={eventsOnFiltered}
                colorOf={colorOf}
                onTaskDropDay={handleDayDrop}
                onItemClick={openItemEditor}
                onItemReschedule={rescheduleItem}
              />
            )}
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
            {view === "year" && <YearView cursor={cursor} eventsOn={eventsOnFiltered} setCursor={setCursor} setView={setView} />}
            </>
          )}
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
      <BirthdayHolidayEditor kind="birthday" item={editingBday} open={!!editingBday} onOpenChange={(o) => !o && setEditBdayId(null)} />
      <BirthdayHolidayEditor kind="holiday" item={editingHol} open={!!editingHol} onOpenChange={(o) => !o && setEditHolId(null)} />
    </div>
  );
}

type EventItem = { kind: "appt" | "bday" | "hol" | "gcal" | "task" | "care" | "meal"; id?: string; label: string; time?: string; color?: string };
type EventsFn = (k: string) => EventItem[];
type ColorFn = (k: EventItem["kind"]) => string;

const ITEM_DRAG_MIME = "application/x-careflow-item";

function MonthView({
  cursor, eventsOn, colorOf, onTaskDropDay, onItemClick, onItemReschedule,
}: {
  cursor: Date;
  eventsOn: EventsFn;
  colorOf: ColorFn;
  onTaskDropDay?: (taskId: string, dateISO: string) => void;
  onItemClick?: (item: EventItem) => void;
  onItemReschedule?: (item: EventItem, patch: { date?: string; time?: string | null }) => void | Promise<void>;
}) {
  const ms = startOfMonth(cursor);
  const gs = startOfWeek(ms, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gs, end: addDays(gs, 41) });
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<{ item: EventItem; sourceISO: string } | null>(null);
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
                const types = Array.from(e.dataTransfer.types);
                const acceptsTask = !!onTaskDropDay && types.includes("application/x-careflow-task");
                const acceptsItem = !!onItemReschedule && types.includes(ITEM_DRAG_MIME);
                if (!acceptsTask && !acceptsItem) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setHoverISO(k);
              }}
              onDragLeave={() => setHoverISO(p => p === k ? null : p)}
              onDrop={async (e) => {
                const taskId = onTaskDropDay ? e.dataTransfer.getData("application/x-careflow-task") : "";
                const itemPayload = onItemReschedule ? e.dataTransfer.getData(ITEM_DRAG_MIME) : "";
                if (!taskId && !itemPayload) return;
                e.preventDefault();
                setHoverISO(null);
                if (itemPayload && onItemReschedule) {
                  const { sourceISO } = JSON.parse(itemPayload) as { sourceISO: string };
                  if (draggingItem && sourceISO !== k) {
                    await onItemReschedule(draggingItem.item, { date: k });
                  }
                  setDraggingItem(null);
                } else if (taskId && onTaskDropDay) {
                  onTaskDropDay(taskId, k);
                }
              }}
              className={cn(
                "flex min-h-28 flex-col rounded-xl border p-2 text-xs transition-colors sm:min-h-32",
                inMonth ? "border-border/60 bg-card" : "border-transparent bg-muted/20 text-muted-foreground/50",
                today && "ring-2 ring-primary",
                hoverISO === k && "ring-2 ring-primary bg-primary/10",
              )}
            >
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {d.getDate() === 1 ? format(d, "MMM") : ""}
                </span>
                <div className="flex items-center gap-1">
                  {(() => {
                    const moon = moonPhaseFor(d);
                    return moon ? (
                      <span
                        className="text-[11px] leading-none"
                        title={moon.label}
                        aria-label={moon.label}
                      >
                        {moon.emoji}
                      </span>
                    ) : null;
                  })()}
                  <span className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                    today ? "bg-primary text-primary-foreground" : "text-foreground/80",
                  )}>
                    {format(d, "d")}
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                {ev.map((e, i) => {
                  const editable = (e.kind === "appt" || e.kind === "task" || e.kind === "care" || e.kind === "bday" || e.kind === "hol") && !!e.id;
                  const clickable = editable && !!onItemClick;
                  const draggable = editable && !!onItemReschedule;
                  return (
                    <button
                      key={i}
                      type="button"
                      title={e.label}
                      disabled={!clickable && !draggable}
                      onClick={(ev2) => { ev2.stopPropagation(); if (clickable) onItemClick!(e); }}
                      draggable={draggable}
                      onDragStart={(ev2) => {
                        if (!draggable) return;
                        ev2.dataTransfer.effectAllowed = "move";
                        ev2.dataTransfer.setData(ITEM_DRAG_MIME, JSON.stringify({ sourceISO: k }));
                        setDraggingItem({ item: e, sourceISO: k });
                      }}
                      onDragEnd={() => setDraggingItem(null)}
                      className={cn(
                        "w-full rounded-md px-1.5 py-1 text-left text-[11px] leading-snug break-words whitespace-normal transition-transform",
                        colorOf(e.kind),
                        clickable && "hover:-translate-y-0.5 hover:shadow-sm cursor-pointer",
                        draggable && "active:cursor-grabbing",
                        draggingItem?.item.id === e.id && "opacity-50",
                      )}
                    >
                      {e.time && <span className="mr-1 font-medium opacity-80">{e.time}</span>}
                      {e.label}
                    </button>
                  );
                })}
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

/* ============================== Kanban view ============================== */

function KanbanByTimeframe({
  view, cursor, eventsOn, colorOf, onItemClick, onItemReschedule,
}: {
  view: View;
  cursor: Date;
  eventsOn: EventsFn;
  colorOf: ColorFn;
  onItemClick?: (item: EventItem) => void;
  onItemReschedule?: (item: EventItem, patch: { date?: string; time?: string | null }) => void | Promise<void>;
}) {
  type DropTarget = { date?: string; time?: string | null; preserveDow?: boolean; preserveDom?: boolean };
  type KItem = EventItem & { sourceDate?: string };
  type Col = { key: string; title: string; subtitle?: string; items: KItem[]; drop?: DropTarget };
  const cols: Col[] = [];
  const [dragging, setDragging] = useState<KItem | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const bucketTime: Record<string, string | null> = {
    Morning: "09:00", Afternoon: "14:00", Evening: "19:00", Night: "22:00", Anytime: null,
  };

  const bucketByHour = (time?: string) => {
    if (!time) return "Anytime";
    const h = parseInt(time.slice(0, 2), 10);
    if (isNaN(h)) return "Anytime";
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    if (h < 21) return "Evening";
    return "Night";
  };

  if (view === "day") {
    const iso = cursor.toISOString().slice(0, 10);
    const items = eventsOn(iso);
    const buckets = ["Morning", "Afternoon", "Evening", "Night", "Anytime"];
    for (const b of buckets) {
      cols.push({
        key: b,
        title: b,
        items: items.filter(i => bucketByHour(i.time) === b).map(i => ({ ...i, sourceDate: iso })),
        drop: { date: iso, time: bucketTime[b] },
      });
    }
  } else if (view === "week") {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const iso = d.toISOString().slice(0, 10);
      cols.push({
        key: iso,
        title: format(d, "EEE"),
        subtitle: format(d, "MMM d"),
        items: eventsOn(iso).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map(i => ({ ...i, sourceDate: iso })),
        drop: { date: iso },
      });
    }
  } else if (view === "month") {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    // group into weeks of 7
    for (let w = 0; w < days.length / 7; w++) {
      const wkDays = days.slice(w * 7, w * 7 + 7);
      const items: KItem[] = [];
      for (const d of wkDays) {
        const iso = d.toISOString().slice(0, 10);
        for (const ev of eventsOn(iso)) {
          items.push({ ...ev, sourceDate: iso, label: `${format(d, "EEE d")} · ${ev.label}` });
        }
      }
      cols.push({
        key: `wk-${w}`,
        title: `Week ${w + 1}`,
        subtitle: `${format(wkDays[0], "MMM d")} – ${format(wkDays[6], "MMM d")}`,
        items,
        drop: { date: wkDays[0].toISOString().slice(0, 10), preserveDow: true },
      });
    }
  } else {
    // year — by month
    const months = eachMonthOfInterval({ start: startOfYear(cursor), end: endOfYear(cursor) });
    for (const m of months) {
      const ms = startOfMonth(m);
      const me = endOfMonth(m);
      const days = eachDayOfInterval({ start: ms, end: me });
      const items: KItem[] = [];
      for (const d of days) {
        const iso = d.toISOString().slice(0, 10);
        for (const ev of eventsOn(iso)) {
          items.push({ ...ev, sourceDate: iso, label: `${format(d, "MMM d")} · ${ev.label}` });
        }
      }
      cols.push({ key: m.toISOString(), title: format(m, "MMMM"), subtitle: format(m, "yyyy"), items, drop: { date: ms.toISOString().slice(0, 10), preserveDom: true } });
    }
  }

  const resolveDropDate = (drop: DropTarget, sourceDate?: string): string | undefined => {
    if (!drop.date) return undefined;
    if (drop.preserveDow && sourceDate) {
      // keep day-of-week within target week
      const src = parseISO(sourceDate);
      const target = addDays(parseISO(drop.date), src.getDay());
      return target.toISOString().slice(0, 10);
    }
    if (drop.preserveDom && sourceDate) {
      const src = parseISO(sourceDate);
      const base = parseISO(drop.date);
      const lastDay = endOfMonth(base).getDate();
      const dom = Math.min(src.getDate(), lastDay);
      const target = new Date(base.getFullYear(), base.getMonth(), dom);
      return target.toISOString().slice(0, 10);
    }
    return drop.date;
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cols.map(c => (
        <div
          key={c.key}
          onDragOver={(e) => { if (c.drop && dragging) { e.preventDefault(); setOverKey(c.key); } }}
          onDragLeave={() => setOverKey(k => k === c.key ? null : k)}
          onDrop={async (e) => {
            e.preventDefault();
            setOverKey(null);
            if (!c.drop || !dragging || !onItemReschedule) return;
            const date = resolveDropDate(c.drop, dragging.sourceDate);
            const patch: { date?: string; time?: string | null } = {};
            if (date && date !== dragging.sourceDate) patch.date = date;
            if (view === "day" && c.drop.time !== undefined) patch.time = c.drop.time;
            if (patch.date || patch.time !== undefined) await onItemReschedule(dragging, patch);
            setDragging(null);
          }}
          className={cn(
            "flex w-60 shrink-0 flex-col rounded-xl border border-border/60 bg-muted/30 transition-colors",
            overKey === c.key && "border-primary/60 bg-primary/5",
          )}
        >
          <div className="sticky top-0 z-10 flex items-baseline justify-between gap-2 rounded-t-xl border-b border-border/60 bg-card/80 px-3 py-2 backdrop-blur">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{c.title}</div>
              {c.subtitle && <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{c.subtitle}</div>}
            </div>
            <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">{c.items.length}</span>
          </div>
          <div className="flex flex-col gap-1.5 p-2">
            {c.items.length === 0 ? (
              <p className="rounded-md px-2 py-3 text-center text-[11px] text-muted-foreground/60">—</p>
            ) : c.items.map((e, i) => {
              const editable = e.kind === "appt" || e.kind === "task" || e.kind === "care" || e.kind === "bday" || e.kind === "hol";
              const clickable = !!onItemClick && editable && !!e.id;
              const draggable = editable && !!e.id && !!onItemReschedule;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onItemClick!(e)}
                  draggable={draggable}
                  onDragStart={() => draggable && setDragging(e)}
                  onDragEnd={() => { setDragging(null); setOverKey(null); }}
                  className={cn(
                    "w-full rounded-lg px-2 py-1.5 text-left text-[11px] leading-snug transition-transform",
                    colorOf(e.kind),
                    clickable && "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm",
                    !clickable && "cursor-default",
                    draggable && "cursor-grab active:cursor-grabbing",
                    dragging?.id === e.id && "opacity-50",
                  )}
                >
                  {e.time && <span className="mr-1 font-semibold opacity-80">{e.time}</span>}
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
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
                  const editable = e.kind === "appt" || e.kind === "task" || e.kind === "care" || e.kind === "bday" || e.kind === "hol";
                  const clickable = !!onItemClick && editable && !!e.id;
                  const draggable = !!onItemReschedule && editable && !!e.id;
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
