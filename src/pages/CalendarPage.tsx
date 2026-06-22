import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks,
  startOfYear, endOfYear, eachMonthOfInterval, addYears, subYears,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, RefreshCw, List, LayoutGrid, CheckSquare, CalendarClock, HeartPulse, UtensilsCrossed, Cake, Sparkles, Columns3, Sun, Moon, Sunrise, Check } from "lucide-react";
import { formatRelativeDate } from "@/lib/date-format";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { WidgetRail } from "@/components/calendar/WidgetRail";
import { SummaryStrip } from "@/components/calendar/SummaryStrip";
import { TodaysRhythmCard } from "@/components/calendar/TodaysRhythmCard";
import { useCalendarPrefs } from "@/lib/calendar-prefs";
import { MoonPhaseChip, ElementChip, AtmosphereChip } from "@/components/calendar/CalendarHeroChips";
import { CalendarItemCard } from "@/components/calendar/CalendarItemCard";
import { useLongPressDrag, useLongDropListener, type LongDropDetail } from "@/lib/long-press-drag";
import { hoursToHM } from "@/lib/time-blocks";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { BirthdayHolidayEditor } from "@/components/calendar/BirthdayHolidayEditor";
import { InboxCapture } from "@/components/calendar/InboxCapture";
import { MonthPlanningDashboard } from "@/components/calendar/MonthPlanningDashboard";
import { useCheckins } from "@/lib/checkins";
import { buildCheckinAppointments } from "@/lib/checkin-calendar";
import { moonPhaseFor } from "@/lib/moon-phase";
import { getMoonPhase } from "@/lib/moon";
import { getKeyPhaseInfo, isKeyPhaseDay } from "@/lib/lunar-phases";
import { Globe2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apptOccursOn, apptRangeMeta } from "@/lib/appointment-range";
import { useCelebrations } from "@/lib/seasons/hooks";
import { buildCosmicCalendarIndex } from "@/lib/cosmic/calendar-feed";
import { AgendaRail } from "@/components/calendar/AgendaRail";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarRange, PanelRightClose, PanelRightOpen } from "lucide-react";

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
  const { prefs, setView: persistView, setLayout: persistLayout, toggleFilter, resetFilters, ALL_KINDS } = useCalendarPrefs();
  const view = prefs.view as View;
  const layout = prefs.layout;
  type Kind = typeof ALL_KINDS[number];
  const setView = (v: View) => persistView(v);
  const setLayout = (l: typeof layout) => persistLayout(l);
  const kindFilter = useMemo(() => new Set<Kind>(prefs.filters as Kind[]), [prefs.filters]);
  const setKindFilter = (next: Set<Kind>) => resetFilters_setExplicit(next);
  // ad-hoc setter that mirrors set-state semantics (only used by "All" filter reset).
  const resetFilters_setExplicit = (next: Set<Kind>) => {
    // Synchronize by toggling deltas via toggleFilter.
    const current = new Set<Kind>(prefs.filters as Kind[]);
    for (const k of ALL_KINDS) {
      const inNext = next.has(k);
      const inCur = current.has(k);
      if (inNext !== inCur) toggleFilter(k);
    }
  };
  const toggleKind = (k: Kind) => toggleFilter(k);
  const [cursor, setCursor] = useState<Date>(new Date());
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [gLoading, setGLoading] = useState(false);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editBdayId, setEditBdayId] = useState<string | null>(null);
  const [editHolId, setEditHolId] = useState<string | null>(null);
  type RightPanel = "widgets" | "agenda" | "hidden";
  const [rightPanel, setRightPanel] = useState<RightPanel>(() => {
    if (typeof localStorage === "undefined") return "widgets";
    return (localStorage.getItem("calendar-right-panel") as RightPanel) || "widgets";
  });
  const [quickAddISO, setQuickAddISO] = useState<string | null>(null);
  const switchRightPanel = (next: RightPanel) => {
    setRightPanel(next);
    try { localStorage.setItem("calendar-right-panel", next); } catch { /* noop */ }
  };
  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;
  const editingBday = editBdayId ? state.birthdays.find(b => b.id === editBdayId) ?? null : null;
  const editingHol = editHolId ? state.holidays.find(h => h.id === editHolId) ?? null : null;
  const checkins = useCheckins();
  const checkinAppts = (() => {
    try {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return buildCheckinAppointments(checkins, state.recipients ?? [], from, 90);
    } catch { return []; }
  })();

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

  const colorOf = (k: "appt"|"bday"|"hol"|"gcal"|"task"|"care"|"meal"|"season"|"cosmic") =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-secondary-soft text-secondary-foreground"
    : k === "task" ? "bg-warm-soft text-warm-foreground border border-primary/30"
    : k === "care" ? "bg-rose-100 text-rose-900 border border-rose-300/50 dark:bg-rose-900/30 dark:text-rose-100"
    : k === "meal" ? "bg-amber-100 text-amber-900 border border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100"
    : k === "season" ? "bg-pink-100 text-pink-900 border border-pink-300/50 dark:bg-pink-900/30 dark:text-pink-100"
    : k === "cosmic" ? "bg-indigo-100 text-indigo-900 border border-indigo-300/50 dark:bg-indigo-900/30 dark:text-indigo-100"
    : "bg-muted text-foreground";

  const { celebrations } = useCelebrations();
  const cosmicIndex = useMemo(() => buildCosmicCalendarIndex(addDays(cursor, -60), 180), [cursor]);

  // Adapter for TimeGrid which only knows about a narrower set of kinds.
  const eventsOnForGrid = (k: string) => eventsOn(k)
    .filter(e => e.kind !== "meal" && e.kind !== "season" && e.kind !== "cosmic")
    .map(e => ({
      ...e,
      kind: (e.kind === "care" ? "task" : e.kind) as "appt" | "bday" | "gcal" | "hol" | "task",
    }));

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => apptOccursOn(a, k)).map(a => {
      const m = apptRangeMeta(a, k);
      const prefix = m.isMulti && !m.isStart ? (m.isEnd ? "↦ " : "· ") : "";
      return { kind: "appt" as const, id: a.id, label: `${prefix}${a.icon ? a.icon + " " : ""}${a.title}`, time: m.isStart ? a.time : undefined };
    }),
    ...checkinAppts.filter(a => a.date === k).map(a => ({ kind: "appt" as const, id: a.id, label: `💜 ${a.title}`, time: a.time })),
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
    ...celebrations.filter(c => {
      if (c.date === k) return true;
      if (c.recursYearly && c.date.slice(5) === k.slice(5)) return true;
      return false;
    }).map(c => ({
      kind: "season" as const,
      id: c.id,
      label: `${c.icon ?? "🎉"} ${c.title}`,
      time: undefined,
    })),
    ...((cosmicIndex.get(k) ?? []).map(c => ({
      kind: "cosmic" as const,
      id: c.id,
      label: c.label,
      time: undefined,
    }))),
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
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
      <div className="cozy-card gradient-calm p-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">CareFlow</div>
        <h2 className="font-display mt-1 text-3xl font-semibold">Calendar 🌿</h2>
        <p className="mt-1 text-sm text-muted-foreground">Appointments, birthdays, holidays, meals, caregiving, and life planning — all in one place.</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <MoonPhaseChip date={cursor} />
          <ElementChip date={cursor} />
          <AtmosphereChip />
        </div>
      </div>

      <TodaysRhythmCard date={cursor} />
      <SummaryStrip
        onOpenBirthday={(id) => setEditBdayId(id)}
        onOpenAppointment={(id) => setEditApptId(id)}
        onOpenHoliday={(id) => setEditHolId(id)}
      />

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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="whitespace-nowrap text-base sm:text-lg">{headerLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="ml-1 h-7 px-2 text-xs" onClick={() => setCursor(new Date())}>Today</Button>
          </div>
        }
        action={
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
            <div className="flex shrink-0 gap-1 rounded-full bg-muted/60 p-0.5">
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
            <div className="flex shrink-0 gap-1 rounded-full bg-muted/60 p-0.5">
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
          <div className="mb-3 -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <button
              type="button"
              onClick={() => setKindFilter(new Set(ALL_KINDS))}
              className="shrink-0 rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              All
            </button>
            {([
              { k: "task" as Kind, label: "Tasks", Icon: CheckSquare },
              { k: "appt" as Kind, label: "Appointments", Icon: CalendarClock },
              { k: "care" as Kind, label: "Caregiving", Icon: HeartPulse },
              { k: "meal" as Kind, label: "Meals", Icon: UtensilsCrossed },
              { k: "bday" as Kind, label: "Birthdays", Icon: Cake },
              { k: "hol" as Kind, label: "Holidays", Icon: Cake },
              { k: "gcal" as Kind, label: "Google", Icon: CalendarClock },
              { k: "season" as Kind, label: "Celebrations", Icon: Sparkles },
              { k: "cosmic" as Kind, label: "Cosmic", Icon: Sparkles },
            ] as const).map(({ k, label, Icon }) => {
              const on = kindFilter.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  aria-pressed={on}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                    on
                      ? "border-primary/40 bg-primary-soft text-foreground shadow-sm"
                      : "border-border/50 bg-muted/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              );
            })}
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
                onDayClick={(iso) => setQuickAddISO(iso)}
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
      {rightPanel === "hidden" ? (
        <aside className="shrink-0">
          <button
            type="button"
            onClick={() => switchRightPanel("widgets")}
            className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            title="Show side panel"
          >
            <PanelRightOpen className="h-3.5 w-3.5" /> Show panel
          </button>
        </aside>
      ) : (
      <aside className="w-full shrink-0 space-y-3 lg:w-[320px] xl:w-[360px]">
        <div className="flex items-center gap-1 rounded-full bg-muted/60 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => switchRightPanel("widgets")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
              rightPanel === "widgets"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={rightPanel === "widgets"}
          >
            <PanelRightOpen className="h-3.5 w-3.5" /> Widgets
          </button>
          <button
            type="button"
            onClick={() => switchRightPanel("agenda")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
              rightPanel === "agenda"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={rightPanel === "agenda"}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Agenda
          </button>
          <button
            type="button"
            onClick={() => switchRightPanel("hidden")}
            className="flex items-center justify-center rounded-full px-2 py-1.5 text-muted-foreground hover:text-foreground"
            title="Hide panel"
            aria-label="Hide panel"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </div>
        {rightPanel === "widgets" ? (
          <WidgetRail date={cursor} />
        ) : (
          <AgendaRail
            cursor={cursor}
            eventsOn={eventsOnFiltered}
            onItemClick={openItemEditor}
            onItemReschedule={rescheduleItem}
            onAddForDate={(iso) => setQuickAddISO(iso)}
          />
        )}
      </aside>
      )}
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <BirthdayHolidayEditor kind="birthday" item={editingBday} open={!!editingBday} onOpenChange={(o) => !o && setEditBdayId(null)} />
      <BirthdayHolidayEditor kind="holiday" item={editingHol} open={!!editingHol} onOpenChange={(o) => !o && setEditHolId(null)} />
      <Dialog open={!!quickAddISO} onOpenChange={(o) => !o && setQuickAddISO(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Quick add — {quickAddISO ? format(parseISO(quickAddISO), "EEE, MMM d, yyyy") : ""}
            </DialogTitle>
          </DialogHeader>
          {quickAddISO && (
            <InboxCapture
              key={quickAddISO}
              defaultDate={parseISO(quickAddISO)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type EventItem = { kind: "appt" | "bday" | "hol" | "gcal" | "task" | "care" | "meal" | "season" | "cosmic"; id?: string; label: string; time?: string; color?: string };
type EventsFn = (k: string) => EventItem[];
type ColorFn = (k: EventItem["kind"]) => string;

const ITEM_DRAG_MIME = "application/x-careflow-item";

function MonthView({
  cursor, eventsOn, colorOf, onTaskDropDay, onItemClick, onItemReschedule, onDayClick,
}: {
  cursor: Date;
  eventsOn: EventsFn;
  colorOf: ColorFn;
  onTaskDropDay?: (taskId: string, dateISO: string) => void;
  onItemClick?: (item: EventItem) => void;
  onItemReschedule?: (item: EventItem, patch: { date?: string; time?: string | null }) => void | Promise<void>;
  onDayClick?: (iso: string) => void;
}) {
  const ms = startOfMonth(cursor);
  const gs = startOfWeek(ms, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gs, end: addDays(gs, 41) });
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<{ item: EventItem; sourceISO: string } | null>(null);
  const isMobile = useIsMobile();
  const [sheetISO, setSheetISO] = useState<string | null>(null);
  const dotClass = (kind: EventItem["kind"]) =>
    kind === "task" ? "bg-warm-foreground/70"
    : kind === "appt" ? "bg-primary"
    : kind === "care" ? "bg-rose-500"
    : kind === "meal" ? "bg-amber-500"
    : kind === "bday" ? "bg-accent-foreground"
    : kind === "hol" ? "bg-secondary-foreground"
    : "bg-muted-foreground";
  const partOfTime = (t?: string | null): "morning" | "afternoon" | "evening" | "allday" => {
    if (!t || !/^\d{2}:\d{2}/.test(t)) return "allday";
    const h = parseInt(t.slice(0, 2), 10);
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  };
  return (
    <>
      <div className="grid grid-cols-7 gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:gap-1 sm:text-xs">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="px-1 py-1 text-center sm:px-2">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5 sm:gap-1">
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
                  const payload = JSON.parse(itemPayload) as { sourceISO: string; itemKind?: EventItem["kind"]; itemId?: string };
                  if (payload.sourceISO !== k) {
                    let target: EventItem | null = draggingItem?.item ?? null;
                    if (!target && payload.itemKind && payload.itemId) {
                      target = eventsOn(payload.sourceISO).find(
                        x => x.kind === payload.itemKind && x.id === payload.itemId,
                      ) ?? null;
                    }
                    if (target) await onItemReschedule(target, { date: k });
                  }
                  setDraggingItem(null);
                } else if (taskId && onTaskDropDay) {
                  onTaskDropDay(taskId, k);
                }
              }}
              onClick={
                inMonth
                  ? () => {
                      if (isMobile) setSheetISO(k);
                      else onDayClick?.(k);
                    }
                  : undefined
              }
              className={cn(
                "flex min-h-16 flex-col rounded-lg border p-1 text-xs transition-colors sm:min-h-32 sm:rounded-xl sm:p-2",
                inMonth ? "border-border/60 bg-card" : "border-transparent bg-muted/20 text-muted-foreground/50",
                today && "ring-2 ring-primary",
                hoverISO === k && "ring-2 ring-primary bg-primary/10",
                inMonth && "cursor-pointer",
              )}
            >
              <div className="mb-1 flex items-baseline justify-between gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {d.getDate() === 1 ? format(d, "MMM") : ""}
                </span>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {(() => {
                    const moon = moonPhaseFor(d);
                    if (!moon) return null;
                    const p = getMoonPhase(d);
                    const key = isKeyPhaseDay(p) ? getKeyPhaseInfo(p) : null;
                    return (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-0.5 text-[10px] leading-none sm:px-1 sm:text-[11px]"
                        style={key ? { background: `hsl(${key.hsl} / 0.18)`, color: `hsl(${key.hsl})` } : undefined}
                        title={key ? `${moon.label} · ${key.verb} — ${key.invitation}` : moon.label}
                        aria-label={key ? `${moon.label}, ${key.verb}` : moon.label}
                      >
                        <span>{moon.emoji}</span>
                        {key && <span className="hidden font-medium sm:inline">{key.verb}</span>}
                      </span>
                    );
                  })()}
                  <span className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold sm:text-[11px]",
                    today ? "bg-primary text-primary-foreground" : "text-foreground/80",
                  )}>
                    {format(d, "d")}
                  </span>
                </div>
              </div>
              {/* Mobile: dot indicators */}
              {inMonth && ev.length > 0 && (
                <div className="flex flex-wrap items-center gap-0.5 md:hidden">
                  {ev.slice(0, 4).map((e, i) => (
                    <span key={i} className={cn("h-1.5 w-1.5 rounded-full", dotClass(e.kind))} />
                  ))}
                  {ev.length > 4 && (
                    <span className="text-[8px] leading-none text-muted-foreground">+{ev.length - 4}</span>
                  )}
                </div>
              )}
              {/* Desktop (md+): full event list */}
              <div className="hidden flex-1 flex-col gap-1 md:flex">
                {ev.map((e, i) => {
                  const editable = (e.kind === "appt" || e.kind === "task" || e.kind === "care" || e.kind === "bday" || e.kind === "hol") && !!e.id;
                  const clickable = editable && !!onItemClick;
                  const draggable = editable && !!onItemReschedule;
                  return (
                    <div key={i} onClick={(ev2) => ev2.stopPropagation()}>
                      <CalendarItemCard
                        kind={e.kind}
                        id={e.id}
                        label={e.label}
                        time={e.time}
                        color={e.color}
                        variant="compact"
                        disabled={!clickable && !draggable}
                        onClick={clickable ? () => onItemClick!(e) : undefined}
                        draggable={draggable}
                        onDragStart={(ev2) => {
                          if (!draggable) return;
                          ev2.dataTransfer.effectAllowed = "move";
                          ev2.dataTransfer.setData(ITEM_DRAG_MIME, JSON.stringify({ sourceISO: k }));
                          setDraggingItem({ item: e, sourceISO: k });
                        }}
                        onDragEnd={() => setDraggingItem(null)}
                        className={cn(draggingItem?.item.id === e.id && "opacity-50")}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* Mobile day-detail sheet — grouped by time of day */}
      <Sheet open={!!sheetISO} onOpenChange={(o) => !o && setSheetISO(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-base">
              {sheetISO ? format(new Date(sheetISO + "T00:00:00"), "EEEE, MMM d") : ""}
            </SheetTitle>
          </SheetHeader>
          {sheetISO && (() => {
            const items = eventsOn(sheetISO);
            if (items.length === 0) {
              return <p className="mt-4 text-sm text-muted-foreground">Nothing on this day.</p>;
            }
            const groups: Record<"morning" | "afternoon" | "evening" | "allday", typeof items> = {
              morning: [], afternoon: [], evening: [], allday: [],
            };
            for (const it of items) groups[partOfTime(it.time)].push(it);
            for (const key of ["morning", "afternoon", "evening"] as const) {
              groups[key].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
            }
            const PARTS = [
              { key: "morning" as const, label: "Morning", Icon: Sunrise, hint: "Before 12 PM" },
              { key: "afternoon" as const, label: "Afternoon", Icon: Sun, hint: "12 – 5 PM" },
              { key: "evening" as const, label: "Evening", Icon: Moon, hint: "After 5 PM" },
              { key: "allday" as const, label: "All day", Icon: Check, hint: "No time" },
            ];
            const handle = (it: typeof items[number]) => {
              const editable = (it.kind === "appt" || it.kind === "task" || it.kind === "care" || it.kind === "bday" || it.kind === "hol") && !!it.id;
              if (editable && onItemClick) {
                onItemClick(it);
                setSheetISO(null);
              }
            };
            return (
              <div className="mt-4 space-y-4">
                {PARTS.map(p => {
                  const list = groups[p.key];
                  if (list.length === 0) return null;
                  const Icon = p.Icon;
                  return (
                    <section key={p.key}>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          {p.label}
                        </div>
                        <span className="text-[10px] text-muted-foreground/70">{p.hint}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {list.map((it, i) => {
                          const editable = (it.kind === "appt" || it.kind === "task" || it.kind === "care" || it.kind === "bday" || it.kind === "hol") && !!it.id;
                          return (
                            <li key={i}>
                              <CalendarItemCard
                                kind={it.kind}
                                id={it.id}
                                label={it.label}
                                time={it.time}
                                color={it.color}
                                onClick={editable && onItemClick ? () => handle(it) : undefined}
                                disabled={!(editable && onItemClick)}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
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
                <CalendarItemCard
                  key={i}
                  kind={e.kind}
                  id={e.id}
                  label={e.label}
                  time={e.time}
                  color={e.color}
                  variant="compact"
                  disabled
                />
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
                <CalendarItemCard
                  key={i}
                  kind={e.kind}
                  id={e.id}
                  label={e.label}
                  time={e.time}
                  color={e.color}
                  disabled={!clickable && !draggable}
                  onClick={clickable ? () => onItemClick!(e) : undefined}
                  draggable={draggable}
                  onDragStart={() => draggable && setDragging(e)}
                  onDragEnd={() => { setDragging(null); setOverKey(null); }}
                  className={cn(dragging?.id === e.id && "opacity-50")}
                />
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
                      <CalendarItemCard
                        kind={e.kind}
                        id={e.id}
                        label={e.label}
                        time={e.time}
                        color={e.color}
                        disabled={!clickable && !draggable}
                        onClick={clickable ? () => onItemClick!(e) : undefined}
                        draggable={draggable}
                        onDragStart={draggable ? (ev) => {
                          ev.dataTransfer.setData(SCHED_DRAG_MIME, e.id!);
                          ev.dataTransfer.effectAllowed = "move";
                          setDragging(e);
                        } : undefined}
                        onDragEnd={() => { setDragging(null); setHoverISO(null); }}
                        className={cn(dragging?.id === e.id && "opacity-50")}
                      />
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
