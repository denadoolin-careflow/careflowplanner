import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  startOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay,
  startOfWeek, addDays, addMonths, subMonths, isSameWeek, endOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Flower2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import type { Task } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { AgendaView } from "@/components/calendar/AgendaView";
import { getRhythmForecast, type Element } from "@/lib/rhythm-forecast";
import { Moon } from "lucide-react";
import { Sunrise, Sun } from "lucide-react";
import { formatTime12 } from "@/lib/routines";
import { getMoonPhase } from "@/lib/moon";
import { getKeyPhaseInfo, isKeyPhaseDay } from "@/lib/lunar-phases";
import { CalendarTasksPanel } from "@/components/calendar/CalendarTasksPanel";
import { CalendarViewToggle, type CalView } from "@/components/calendar/CalendarViewToggle";
import { QuickAddCalendarPopover } from "@/components/calendar/QuickAddCalendarPopover";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { useCycle } from "@/lib/cycle-store";
import { phaseForDate, PHASE_META } from "@/lib/cycle";
import { prefetchMoonMonth } from "@/lib/moon-providers";
import { useTimeBlocks, colorClasses } from "@/lib/time-blocks";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DayLunarSheet } from "@/components/lunar/DayLunarSheet";
import { Checkbox } from "@/components/ui/checkbox";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Zap } from "lucide-react";
import type { WeatherCondition } from "@/lib/weather";
import { DayDetailExtras } from "@/components/calendar/DayDetailExtras";
import { DayTasksPanel } from "@/components/calendar/DayTasksPanel";
import { apptOccursOn, apptRangeMeta } from "@/lib/appointment-range";
import { getTransitsForDate } from "@/lib/transits";
import { useTransitsEnabled } from "@/lib/astrology-prefs";
import { ScopeHero } from "@/components/layout/ScopeHero";
import { PlanningHeader } from "@/components/today/PlanningHeader";
import { QuickAddBar } from "@/components/today/QuickAddBar";
import { ScopeSidebar } from "@/components/layout/ScopeSidebar";
import { isSameMonth as isSameMonthFn } from "date-fns";
import { useSidebarHidden } from "@/lib/today-view";

function MonthWxIcon({ c, className }: { c: WeatherCondition; className?: string }) {
  const cls = cn("h-2.5 w-2.5 sm:h-3 sm:w-3", className);
  if (c === "clear") return <Sun className={cls} />;
  if (c === "partly-cloudy") return <CloudSun className={cls} />;
  if (c === "cloudy") return <Cloud className={cls} />;
  if (c === "fog") return <CloudFog className={cls} />;
  if (c === "drizzle") return <CloudDrizzle className={cls} />;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

const TASK_DRAG_MIME = "application/x-careflow-task";
const APPT_DRAG_MIME = "application/x-careflow-appt";
const BLOCK_DRAG_MIME = "application/x-careflow-block";

export default function Month() {
  const { state, updateTask, updateAppointment, toggleTask } = useStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const transitsOn = useTransitsEnabled();
  const { settings: cycleSettings, periods: cyclePeriods } = useCycle();
  const [cursor, setCursor] = useState(new Date());
  const [sidebarHidden] = useSidebarHidden();
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [view, setView] = useState<CalView>("schedule");
  const [showMoon, setShowMoon] = useState(true);
  const [sheetISO, setSheetISO] = useState<string | null>(null);
  const [lunarDate, setLunarDate] = useState<Date | null>(null);
  useEffect(() => { gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => {}); }, []);
  useEffect(() => { void prefetchMoonMonth(cursor, { neighbors: true }); }, [cursor]);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });
  const monthDays = days.filter(d => isSameMonth(d, cursor));
  const fromISO = days[0].toISOString().slice(0, 10);
  const toISO = days[days.length - 1].toISOString().slice(0, 10);
  const { blocks, update: updateBlock } = useTimeBlocks(fromISO, toISO);
  const { days: wxDays } = useWeekForecast();
  const [tempUnit] = useTempUnit();
  const wxFmt = (c: number) => `${tempUnit === "F" ? cToF(c) : c}°`;

  const colorOf = (k: "appt"|"bday"|"hol"|"gcal"|"task") =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-gradient-to-r from-rose-500/15 to-amber-500/15 text-foreground/85 border border-rose-500/25"
    : k === "task" ? "bg-warm-soft text-warm-foreground border border-primary/30"
    : "bg-muted text-foreground";

  type EvItem = { kind: "appt"|"bday"|"hol"|"gcal"|"task"|"block"; label: string; taskId?: string; apptId?: string; blockId?: string; blockColor?: string; time?: string | null };
  const eventsOn = (k: string): EvItem[] => [
    ...blocks.filter(b => b.date === k).map(b => ({
      kind: "block" as const, label: `${b.icon ? b.icon + " " : ""}${b.title}`, blockId: b.id, blockColor: b.color,
      time: b.allDay ? null : b.startTime,
    })),
    ...state.appointments
      .filter(a => apptOccursOn(a, k))
      .map(a => {
        const m = apptRangeMeta(a, k);
        const prefix = m.isMulti && !m.isStart ? (m.isEnd ? "↦ " : "· ") : "";
        return { kind: "appt" as const, label: `${prefix}${a.title}`, apptId: a.id, time: m.isStart ? a.time : null };
      }),
    ...state.birthdays.filter(b => b.date === k).map(b => ({ kind: "bday" as const, label: `🎂 ${b.name}` })),
    ...state.holidays.filter(h => h.date === k).map(h => ({ kind: "hol" as const, label: `✨ ${h.name}` })),
    ...gEvents.filter(g => g.date === k).map(g => ({ kind: "gcal" as const, label: g.title })),
    ...state.tasks.filter(t => t.dueDate === k && !t.done && !t.parentTaskId).map(t => ({
      kind: "task" as const, label: t.title, taskId: t.id,
    })),
  ];

  const handleDayDrop = async (taskId: string, iso: string) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    if (t.dueDate === iso) return;
    await updateTask(taskId, { dueDate: iso, inbox: false });
    haptics.tap();
    toast(`Moved “${t.title}” to ${format(new Date(iso), "MMM d")}`);
  };

  const handleApptDayDrop = async (apptId: string, iso: string) => {
    const a = state.appointments.find(x => x.id === apptId);
    if (!a || a.date === iso) return;
    await updateAppointment(apptId, { date: iso });
    haptics.tap();
    toast(`Moved “${a.title}” to ${format(new Date(iso), "MMM d")}`);
  };

  const handleBlockDayDrop = async (blockId: string, iso: string) => {
    const b = blocks.find(x => x.id === blockId);
    if (!b || b.date === iso) return;
    await updateBlock(blockId, { date: iso });
    haptics.tap();
    toast(`Moved “${b.title}” to ${format(new Date(iso), "MMM d")}`);
  };

  const openBlockInWeek = (iso: string) => {
    navigate(`/week?date=${iso}`);
  };

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;

  // Element → soft tint + dot color for the monthly grid overlay.
  // earth=green, water=blue, air=yellow, fire=orange.
  // Element palette per redesign: earth=sage, water=soft blue, fire=soft orange, air=lavender.
  const ELEMENT_STYLE: Record<Element, { tint: string; ring: string; dot: string; label: string; pill: string; pillText: string }> = {
    earth: { tint: "bg-emerald-500/[0.06]", ring: "ring-emerald-500/20", dot: "bg-emerald-500", label: "Earth",
             pill: "bg-emerald-500/15 border-emerald-500/25", pillText: "text-emerald-700 dark:text-emerald-300" },
    water: { tint: "bg-sky-500/[0.06]",     ring: "ring-sky-500/20",     dot: "bg-sky-500",     label: "Water",
             pill: "bg-sky-500/15 border-sky-500/25",         pillText: "text-sky-700 dark:text-sky-300" },
    air:   { tint: "bg-violet-400/[0.07]",  ring: "ring-violet-400/25",  dot: "bg-violet-400",  label: "Air",
             pill: "bg-violet-400/15 border-violet-400/25",   pillText: "text-violet-700 dark:text-violet-300" },
    fire:  { tint: "bg-orange-500/[0.06]",  ring: "ring-orange-500/20",  dot: "bg-orange-500",  label: "Fire",
             pill: "bg-orange-500/15 border-orange-500/25",   pillText: "text-orange-700 dark:text-orange-300" },
  };

  const todayForecast = getRhythmForecast(new Date());
  const todayEl = ELEMENT_STYLE[todayForecast.element];

  return (
    <div className={cn(
      "mx-auto grid w-full min-w-0 max-w-6xl gap-4 md:gap-5 lg:gap-6",
      sidebarHidden
        ? "lg:grid-cols-1"
        : "lg:grid-cols-[minmax(0,1fr)_clamp(240px,28vw,340px)]",
    )}>
      <div className="min-w-0 space-y-6">
        <PlanningHeader
          date={cursor}
          title={format(cursor, "MMMM yyyy")}
          subtitle="Your greeting, weather, and cosmic rhythm — carried across each planning view."
          slot={<QuickAddBar date={cursor} />}
          onTaskClick={(id) => {
            const t = state.tasks.find(x => x.id === id);
            if (t) setEditingTask(t);
          }}
        />
        <ScopeHero
          scope="month"
          date={cursor}
          title={format(cursor, "MMMM yyyy")}
          eyebrow="Month of"
          pickerLabel={format(cursor, "MMM yyyy")}
          isCurrent={isSameMonthFn(cursor, new Date())}
          onPrev={() => setCursor(subMonths(cursor, 1))}
          onNext={() => setCursor(addMonths(cursor, 1))}
          onToday={() => setCursor(new Date())}
          onDatePick={setCursor}
          showQuickAdd
          actions={
            <>
              <Link
                to="/reset/month"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-secondary-soft/60 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-secondary-soft"
              >
                <Flower2 className="h-3.5 w-3.5" /> Reset & reflect
              </Link>
              <Link
                to="/month/overview"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-primary/15"
              >
                <Moon className="h-3.5 w-3.5" /> Monthly overview
              </Link>
            </>
          }
        />

        <SectionCard title="Calendar" accent="calm" action={
          <div className="flex items-center gap-2">
            <QuickAddCalendarPopover days={[cursor]} />
            <button
              onClick={() => setShowMoon(v => !v)}
              aria-pressed={showMoon}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                showMoon
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground"
              )}
              title="Toggle moon phase, sign & element overlay"
            >
              <Moon className="h-3.5 w-3.5" /> Moon
            </button>
            <div className="hidden sm:inline-flex">
              <CalendarViewToggle value={view} onChange={setView} />
            </div>
          </div>
        }>
          {/* Mobile: full-width view toggle under Quick Add */}
          <div className="-mx-1 mb-3 flex justify-center overflow-x-auto sm:hidden">
            <CalendarViewToggle value={view} onChange={setView} />
          </div>
          {view === "agenda" ? (
            <AgendaView
              days={monthDays}
              appointmentsOn={(k) => eventsOn(k).map(e => ({ label: e.label, time: e.time, id: e.apptId, kind: e.kind === "task" ? undefined : (e.kind as any) }))}
              onTaskDropAt={(id, iso) => handleDayDrop(id, iso)}
              onApptClick={setEditApptId}
            />
          ) : (
          <>
          {/* Weekly astrology strip: current week's moon signature */}
          <div className={cn(
            "mb-3 flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] backdrop-blur-sm transition-colors",
            todayEl.pill,
          )}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">This week</span>
            <span className="inline-flex items-center gap-1.5 text-sm" aria-hidden>
              <span className="text-base leading-none">{todayForecast.glyph}</span>
              <span className={cn("font-medium", todayEl.pillText)}>
                {todayForecast.phaseLabel} · {todayForecast.sign.sign}
              </span>
            </span>
            <span className="ml-auto text-[11px] italic text-muted-foreground">
              Focus · {todayForecast.guidance.keywords.slice(0, 3).join(" • ")}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className="px-1 py-1 text-center sm:px-2">
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {days.map(d => {
              const k = d.toISOString().slice(0,10);
              const inMonth = isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
              const inCurrentWeek = isSameWeek(d, new Date(), { weekStartsOn: 0 });
              const dow = d.getDay(); // 0..6 for week-edge rounding
              const ev = eventsOn(k);
              const phase = cycleSettings.enabled ? phaseForDate(d, cyclePeriods, cycleSettings) : null;
              const phaseVar = phase ? PHASE_META[phase].tokenVar : null;
              const moon = showMoon ? getRhythmForecast(d) : null;
              const moonStyle = moon ? ELEMENT_STYLE[moon.element] : null;
              // Mark element transitions — when today's element differs from yesterday's.
              const prevMoon = showMoon ? getRhythmForecast(addDays(d, -1)) : null;
              const elementChanged = !!(moon && prevMoon && moon.element !== prevMoon.element);
              // Key lunar phase (Sow/Grow/Glow/Let go) — only on the 4 exact days.
              const dayPhase = getMoonPhase(d);
              const keyPhase = isKeyPhaseDay(dayPhase) ? getKeyPhaseInfo(dayPhase) : null;
              const wx = wxDays?.find(w => w.date === k) ?? null;
              const transits = transitsOn && inMonth
                ? getTransitsForDate(d).filter(t => t.kind === "ingress" || t.kind === "retrograde" || t.kind === "voc")
                : [];
              return (
                <div
                  key={k}
                  onDragOver={(e) => {
                    const types = Array.from(e.dataTransfer.types);
                    if (!types.includes(TASK_DRAG_MIME) && !types.includes(APPT_DRAG_MIME) && !types.includes(BLOCK_DRAG_MIME)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setHoverISO(k);
                  }}
                  onDragLeave={() => setHoverISO(p => p === k ? null : p)}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData(TASK_DRAG_MIME);
                    const apptId = e.dataTransfer.getData(APPT_DRAG_MIME);
                    const blockId = e.dataTransfer.getData(BLOCK_DRAG_MIME);
                    if (!taskId && !apptId && !blockId) return;
                    e.preventDefault();
                    if (taskId) handleDayDrop(taskId, k);
                    if (apptId) handleApptDayDrop(apptId, k);
                    if (blockId) handleBlockDayDrop(blockId, k);
                    setHoverISO(null);
                    setDraggingTaskId(null);
                  }}
                  onClick={inMonth ? (e) => {
                    // Only open the day sheet when clicking the cell background,
                    // not when an inner item (task/appt/block/moon) handled it.
                    if ((e.target as HTMLElement).closest("[data-day-item]")) return;
                    setSheetISO(k);
                  } : undefined}
                  className={cn(
                    "group/day relative min-h-16 rounded-xl border p-1.5 text-xs transition-all duration-200 ease-out sm:min-h-28 sm:p-2 cursor-pointer",
                    inMonth
                      ? cn("border-border/60", moonStyle ? cn(moonStyle.tint, "ring-1 ring-inset", moonStyle.ring) : "bg-card")
                      : "border-transparent bg-transparent text-muted-foreground/50 cursor-default",
                    today && "ring-2 ring-primary shadow-sm",
                    inCurrentWeek && !today && "bg-primary/[0.04] ring-1 ring-primary/20",
                    inCurrentWeek && dow === 0 && "rounded-l-2xl",
                    inCurrentWeek && dow === 6 && "rounded-r-2xl",
                    inMonth && elementChanged && "ring-2 ring-offset-1 ring-offset-background ring-foreground/40",
                    hoverISO === k && "scale-[1.03] bg-primary/10 ring-2 ring-primary shadow-md",
                    inMonth && "hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30",
                  )}
                  style={inMonth && keyPhase && !today ? {
                    boxShadow: `inset 0 0 0 2px hsl(${keyPhase.hsl} / 0.55)`,
                  } : undefined}
                >
                  {/* Top row: date + moon glyph */}
                  <div className="flex items-center justify-between gap-1">
                    <div className={cn(
                      "text-[11px] font-semibold tabular-nums sm:text-[12px]",
                      today ? "grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm sm:h-6 sm:w-6" : "text-foreground/85",
                    )}>{format(d, "d")}</div>
                    {moon && (
                      <span
                        aria-hidden
                        className="text-[13px] leading-none opacity-90 sm:text-[15px]"
                        title={`${moon.phaseLabel} · Moon in ${moon.sign.sign}`}
                      >{moon.glyph}</span>
                    )}
                  </div>
                  {/* Combined element pill: phase • sign, colored by element */}
                  {inMonth && moon && moonStyle && (
                    <button
                      type="button"
                      data-day-item
                      onClick={(e) => { e.stopPropagation(); setLunarDate(d); }}
                      title={`${moon.phaseLabel} · Moon in ${moon.sign.sign} (${moonStyle.label})${keyPhase ? ` · ${keyPhase.verb}` : ""}`}
                      aria-label={`${moon.phaseLabel}, moon in ${moon.sign.sign}`}
                      className={cn(
                        "mt-1 hidden w-full items-center gap-1 rounded-full border px-1.5 py-[2px] text-[9.5px] font-medium leading-none transition hover:brightness-105 md:inline-flex",
                        moonStyle.pill, moonStyle.pillText,
                      )}
                    >
                      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", moonStyle.dot)} />
                      <span className="truncate">{moon.phaseLabel} · {moon.sign.sign}</span>
                    </button>
                  )}
                  {/* Tiny muted moon theme */}
                  {inMonth && moon && (
                    <div className="mt-0.5 hidden text-[10px] italic leading-tight text-muted-foreground md:block">
                      {moon.guidance.keywords.slice(0, 2).map(k => k[0].toUpperCase() + k.slice(1)).join(" • ")}
                    </div>
                  )}
                  {inMonth && (phaseVar || wx) && (
                    <div className="mt-0.5 flex items-center gap-1 text-[9px] leading-none text-muted-foreground sm:text-[10px]">
                      {phaseVar && (
                        <span
                          title={`${PHASE_META[phase!].label} phase`}
                          aria-label={`${PHASE_META[phase!].label} phase`}
                          className="inline-flex items-center"
                          style={{ color: `hsl(var(${phaseVar}))` }}
                        >
                          <span aria-hidden className="text-[11px] leading-none sm:text-xs">{PHASE_META[phase!].glyph}</span>
                        </span>
                      )}
                      {wx && (
                        <span
                          className="inline-flex items-center gap-0.5"
                          title={`${wx.label} · ${wxFmt(wx.highC)}/${wxFmt(wx.lowC)}${wx.precip >= 25 ? ` · ${wx.precip}%` : ""}`}
                          aria-label={wx.label}
                        >
                          <MonthWxIcon c={wx.condition} />
                          <span className="hidden tabular-nums sm:inline">{wxFmt(wx.highC)}</span>
                          {wx.precip >= 40 && <span className="hidden text-primary tabular-nums sm:inline">{wx.precip}%</span>}
                        </span>
                      )}
                    </div>
                  )}
                  {inMonth && transits.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-0.5 text-[9px] leading-none sm:text-[10px]">
                      {transits.slice(0, 3).map(t => (
                        <span
                          key={t.id}
                          title={t.detail}
                          aria-label={t.label}
                          className={cn(
                            "rounded px-0.5 tabular-nums",
                            t.tone === "warn" && "text-amber-600 dark:text-amber-400",
                            t.tone === "rest" && "text-muted-foreground",
                            t.tone === "soft" && "text-foreground/70",
                          )}
                        >
                          {t.glyph}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Mobile (<md): dot row indicator, max 4 dots */}
                  {inMonth && ev.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5 md:hidden">
                      {ev.slice(0, 4).map((it, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            it.kind === "task" ? "bg-warm-foreground/70"
                            : it.kind === "appt" ? "bg-primary"
                            : it.kind === "block" ? "bg-accent"
                            : it.kind === "bday" ? "bg-accent-foreground"
                            : it.kind === "hol" ? "bg-secondary-foreground"
                            : "bg-muted-foreground"
                          )}
                        />
                      ))}
                      {ev.length > 4 && <span className="text-[8px] leading-none text-muted-foreground">+{ev.length - 4}</span>}
                    </div>
                  )}
                  <div className="mt-0.5 hidden space-y-0.5 md:block">
                    {ev.slice(0,3).map((it, i) => {
                      const isTask = it.kind === "task" && !!it.taskId;
                      const isAppt = it.kind === "appt" && !!it.apptId;
                      const isBlock = it.kind === "block" && !!it.blockId;
                      const isBeingDragged = isTask && draggingTaskId === it.taskId;
                      const blockCls = isBlock && it.blockColor ? colorClasses(it.blockColor) : null;
                      return (
                        <div
                          key={i}
                          data-day-item
                          draggable={isTask || isAppt || isBlock}
                          onDragStart={(isTask || isAppt || isBlock) ? (e) => {
                            e.stopPropagation();
                            if (isTask) {
                              e.dataTransfer.setData(TASK_DRAG_MIME, it.taskId!);
                              setDraggingTaskId(it.taskId!);
                            } else if (isAppt) {
                              e.dataTransfer.setData(APPT_DRAG_MIME, it.apptId!);
                            } else if (isBlock) {
                              e.dataTransfer.setData(BLOCK_DRAG_MIME, it.blockId!);
                            }
                            e.dataTransfer.setData("text/plain", it.label);
                            e.dataTransfer.effectAllowed = "move";
                            haptics.pickup();
                          } : undefined}
                          onDragEnd={isTask ? () => setDraggingTaskId(null) : undefined}
                          onClick={(isTask || isAppt || isBlock) ? (e) => {
                            e.stopPropagation();
                            if (isTask) {
                              const t = state.tasks.find(x => x.id === it.taskId);
                              if (t) setEditingTask(t);
                            } else if (isAppt) {
                              setEditApptId(it.apptId!);
                            } else if (isBlock) {
                              openBlockInWeek(k);
                            }
                          } : undefined}
                          className={cn(
                            "flex items-start gap-1 rounded px-1 py-0.5 text-[10px] leading-tight whitespace-normal break-words transition-all duration-150",
                            isBlock && blockCls
                              ? cn(blockCls.bg, blockCls.text, "ring-1 ring-inset", blockCls.ring, "ring-opacity-30")
                              : colorOf(it.kind as "appt"|"bday"|"hol"|"gcal"|"task"),
                            (isTask || isAppt || isBlock) && "cursor-grab hover:scale-[1.04] hover:shadow-sm hover:ring-1 hover:ring-primary/40 active:cursor-grabbing",
                            isBeingDragged && "opacity-40 scale-95",
                          )}
                          title={isBlock && it.time ? `${it.time} · ${it.label}` : it.label}
                          style={isBlock && blockCls?.style ? blockCls.style : undefined}
                        >
                          {isTask && (
                            <button
                              draggable={false}
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                haptics.tap();
                                void toggleTask(it.taskId!);
                              }}
                              aria-label="Mark task done"
                              className="group/cb mt-[1px] grid h-3 w-3 shrink-0 place-items-center rounded-full border border-primary/60 bg-background text-primary hover:bg-primary hover:text-primary-foreground"
                            >
                              <Check className="h-2 w-2 opacity-0 group-hover/cb:opacity-100" />
                            </button>
                          )}
                          <span className="min-w-0 flex-1">{it.label}</span>
                        </div>
                      );
                    })}
                    {ev.length > 3 && <div className="text-[10px] text-muted-foreground">+{ev.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
          </>
          )}
        </SectionCard>

        <CalendarTasksPanel days={monthDays} title={`Tasks · ${format(cursor, "MMMM yyyy")}`} />
      </div>
      <ScopeSidebar scope="month" date={cursor} onTaskClick={(id) => {
        const t = state.tasks.find(x => x.id === id);
        if (t) setEditingTask(t);
      }} />
      <UnscheduledTasksRail />

      {editingTask && (
        <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)} />
      )}
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />

      <Sheet open={!!sheetISO} onOpenChange={(o) => !o && setSheetISO(null)}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={cn("overflow-y-auto", isMobile ? "max-h-[85vh] rounded-t-2xl" : "w-full sm:max-w-md")}>
          {sheetISO && (() => {
            const d = new Date(sheetISO + "T00:00:00");
            const moon = getRhythmForecast(d);
            const dayPhaseRaw = getMoonPhase(d);
            const keyPhase = isKeyPhaseDay(dayPhaseRaw) ? getKeyPhaseInfo(dayPhaseRaw) : null;
            const cyclePhase = cycleSettings.enabled ? phaseForDate(d, cyclePeriods, cycleSettings) : null;
            const cycleMeta = cyclePhase ? PHASE_META[cyclePhase] : null;
            return (
              <>
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-3">
                    <MoonGlyph date={d} size={36} />
                    <span className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {format(d, "EEEE, MMM d")}
                      </span>
                      <span className="font-display text-lg">{moon.phaseLabel}</span>
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-border/50 bg-card/60 p-2.5">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Moon in</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span aria-hidden>{moon.sign.glyph}</span>
                      <span className="font-medium">{moon.sign.sign}</span>
                    </div>
                  </div>
                  {cycleMeta ? (
                    <div
                      className="rounded-xl border border-border/50 p-2.5"
                      style={{ background: `hsl(var(${cycleMeta.tokenVar}) / 0.12)` }}
                    >
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cycle</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: `hsl(var(${cycleMeta.tokenVar}))` }}
                        />
                        <span className="font-medium">{cycleMeta.label}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/50 bg-card/60 p-2.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Key phase</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {keyPhase ? (
                          <>
                            <span aria-hidden>{keyPhase.glyph}</span>
                            <span className="font-medium">{keyPhase.verb}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">{moon.phaseLabel}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => { setSheetISO(null); setLunarDate(d); }}
                >
                  <Moon className="mr-1.5 h-3.5 w-3.5" /> Lunar guidance for this day
                </Button>
              </>
            );
          })()}

          {sheetISO && <DayDetailExtras iso={sheetISO} />}
          {sheetISO && <DayTasksPanel iso={sheetISO} />}

          {sheetISO && (() => {
            const items = eventsOn(sheetISO);
            const isTimed = (hm?: string | null) => !!hm && /^\d{2}:\d{2}/.test(hm);
            const timed = items
              .filter(it => isTimed(it.time))
              .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
            const allDay = items.filter(it => !isTimed(it.time));
            const hourLabel = (hm: string) => {
              const h = parseInt(hm.slice(0, 2), 10);
              if (h === 0) return "12 AM";
              if (h < 12) return `${h} AM`;
              if (h === 12) return "12 PM";
              return `${h - 12} PM`;
            };
            const handleClick = (it: typeof items[number]) => {
              if (it.kind === "task" && it.taskId) {
                const t = state.tasks.find(x => x.id === it.taskId);
                if (t) { setEditingTask(t); setSheetISO(null); }
              } else if (it.kind === "appt" && it.apptId) {
                setEditApptId(it.apptId); setSheetISO(null);
              } else if (it.kind === "block") {
                openBlockInWeek(sheetISO!); setSheetISO(null);
              }
            };
            const renderRow = (it: typeof items[number], i: number) => {
              const blockCls = it.kind === "block" && it.blockColor ? colorClasses(it.blockColor) : null;
              const task = it.kind === "task" && it.taskId
                ? state.tasks.find(x => x.id === it.taskId) ?? null
                : null;
              return (
                <div
                  key={i}
                  onClick={() => handleClick(it)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                    blockCls ? cn(blockCls.bg, blockCls.text, "ring-1 ring-inset", blockCls.ring) : colorOf(it.kind as any),
                    (it.kind === "task" || it.kind === "appt" || it.kind === "block") && "cursor-pointer",
                    task?.done && "opacity-60",
                  )}
                  style={blockCls?.style}
                >
                  {task && (
                    <Checkbox
                      checked={!!task.done}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => { haptics.tap(); void toggleTask(task.id); }}
                      aria-label={task.done ? "Mark not done" : "Mark done"}
                      className="shrink-0"
                    />
                  )}
                  <span className={cn("min-w-0 flex-1", task?.done && "line-through")}>{it.label}</span>
                </div>
              );
            };
            if (items.length === 0) {
              return (
                <div className="mt-5 rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                  Nothing scheduled
                </div>
              );
            }
            return (
              <div className="mt-5 space-y-4">
                {allDay.length > 0 && (
                  <section>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Check className="h-3 w-3" /> All day
                    </div>
                    <div className="space-y-1.5">
                      {allDay.map((it, i) => renderRow(it, i))}
                    </div>
                  </section>
                )}

                {timed.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3 w-3" /> Timeline
                    </div>
                    <ol className="relative space-y-2">
                      {timed.map((it, i) => {
                        const hm = it.time!.slice(0, 5);
                        const prevH = i > 0 ? parseInt(timed[i - 1].time!.slice(0, 2), 10) : -1;
                        const curH = parseInt(hm.slice(0, 2), 10);
                        const showHour = curH !== prevH;
                        return (
                          <li key={i}>
                            {showHour && i > 0 && (
                              <div className="mb-2 flex items-center gap-2 pl-[64px]">
                                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                                  {hourLabel(hm)}
                                </span>
                                <span className="h-px flex-1 bg-border/60" />
                              </div>
                            )}
                            <div className="flex items-stretch gap-3">
                              <div className="relative flex w-[56px] shrink-0 flex-col items-end pr-2">
                                <span className="font-mono text-[11px] leading-5 text-muted-foreground">
                                  {formatTime12(hm)}
                                </span>
                              </div>
                              <div className="relative flex flex-1 items-start">
                                <span className="absolute -left-[10px] top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                                <span className="absolute -left-[5px] top-0 bottom-0 w-px bg-border/60" />
                                <div className="ml-2 min-w-0 flex-1">
                                  {renderRow(it, i)}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
      <DayLunarSheet date={lunarDate} open={!!lunarDate} onOpenChange={(o) => !o && setLunarDate(null)} />
    </div>
  );
}
