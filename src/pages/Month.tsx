import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  startOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay,
  startOfWeek, addDays, addMonths, subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Flower2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import type { Task } from "@/lib/types";
import { personalGreeting } from "@/lib/greeting";
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
import { ScopeNavToggle } from "@/components/calendar/ScopeNavToggle";
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

const TASK_DRAG_MIME = "application/x-careflow-task";
const APPT_DRAG_MIME = "application/x-careflow-appt";
const BLOCK_DRAG_MIME = "application/x-careflow-block";

export default function Month() {
  const { state, updateTask, updateAppointment, toggleTask } = useStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { settings: cycleSettings, periods: cyclePeriods } = useCycle();
  const [cursor, setCursor] = useState(new Date());
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [hoverISO, setHoverISO] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [view, setView] = useState<CalView>("schedule");
  const [showMoon, setShowMoon] = useState(false);
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

  const colorOf = (k: "appt"|"bday"|"hol"|"gcal"|"task") =>
    k === "appt" ? "bg-primary-soft text-foreground"
    : k === "bday" ? "bg-accent-soft text-accent-foreground"
    : k === "hol" ? "bg-secondary-soft text-secondary-foreground"
    : k === "task" ? "bg-warm-soft text-warm-foreground border border-primary/30"
    : "bg-muted text-foreground";

  type EvItem = { kind: "appt"|"bday"|"hol"|"gcal"|"task"|"block"; label: string; taskId?: string; apptId?: string; blockId?: string; blockColor?: string; time?: string | null };
  const eventsOn = (k: string): EvItem[] => [
    ...blocks.filter(b => b.date === k).map(b => ({
      kind: "block" as const, label: `${b.icon ? b.icon + " " : ""}${b.title}`, blockId: b.id, blockColor: b.color,
      time: b.allDay ? null : b.startTime,
    })),
    ...state.appointments.filter(a => a.date === k).map(a => ({ kind: "appt" as const, label: a.title, apptId: a.id, time: a.time })),
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
  const ELEMENT_STYLE: Record<Element, { tint: string; ring: string; dot: string; label: string }> = {
    earth: { tint: "bg-emerald-500/10", ring: "ring-emerald-500/30", dot: "bg-emerald-500", label: "Earth" },
    water: { tint: "bg-sky-500/10",     ring: "ring-sky-500/30",     dot: "bg-sky-500",     label: "Water" },
    air:   { tint: "bg-yellow-400/15",  ring: "ring-yellow-500/30",  dot: "bg-yellow-500",  label: "Air"   },
    fire:  { tint: "bg-orange-500/10",  ring: "ring-orange-500/30",  dot: "bg-orange-500",  label: "Fire"  },
  };

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="cozy-card gradient-warm flex flex-col gap-3 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {personalGreeting(state.settings.name)} <span className="opacity-60">· Month of</span>
            </p>
            <h2 className="font-display text-2xl font-semibold sm:text-4xl">{format(cursor, "MMMM yyyy")}</h2>
          </div>
          <div className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <ScopeNavToggle active="month" className="mr-1" />
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setCursor(subMonths(cursor, 1))} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <DayPickerButton date={cursor} onChange={setCursor} label={format(cursor, "MMM yyyy")} />
            <Button variant="ghost" size="sm" className="h-8 shrink-0 px-3 text-xs" onClick={() => setCursor(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
            <Link
              to="/reset/month"
              className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-secondary-soft/60 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-secondary-soft"
            >
              <Flower2 className="h-3.5 w-3.5" /> Reset & reflect
            </Link>
            <Link
              to="/month/overview"
              className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-primary/15"
            >
              <Moon className="h-3.5 w-3.5" /> Monthly overview
            </Link>
          </div>
        </div>

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
          {showMoon && (
            <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="font-medium uppercase tracking-wider">Moon overlay · element:</span>
              {(Object.keys(ELEMENT_STYLE) as Element[]).map(el => (
                <span key={el} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-full", ELEMENT_STYLE[el].dot)} />
                  {ELEMENT_STYLE[el].label}
                </span>
              ))}
              <span className="sm:hidden italic opacity-80">Tap any day's moon for guidance</span>
            </div>
          )}
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
              const inMonth = isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
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
                    "group/day relative min-h-14 rounded-lg border p-1 text-xs transition-all duration-200 ease-out sm:min-h-24 sm:p-1.5",
                    inMonth
                      ? cn("border-border/60", moonStyle ? cn(moonStyle.tint, "ring-1 ring-inset", moonStyle.ring) : "bg-card")
                      : "border-transparent bg-transparent text-muted-foreground/50",
                    today && "ring-2 ring-primary",
                    inMonth && elementChanged && "ring-2 ring-offset-1 ring-offset-background ring-foreground/40",
                    hoverISO === k && "scale-[1.03] bg-primary/10 ring-2 ring-primary shadow-md",
                  )}
                  style={inMonth && keyPhase && !today ? {
                    boxShadow: `inset 0 0 0 2px hsl(${keyPhase.hsl} / 0.55)`,
                  } : undefined}
                >
                  <div className="flex items-center justify-between">
                    {moon ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLunarDate(d); }}
                        title={`${moon.phaseLabel} · Moon in ${moon.sign.sign} (${moonStyle!.label})${keyPhase ? ` · ${keyPhase.verb}` : ""}`}
                        aria-label={`${moon.phaseLabel}, moon in ${moon.sign.sign}`}
                        className="inline-flex items-center gap-1 rounded text-[10px] leading-none hover:bg-foreground/5 sm:text-[11px]"
                      >
                        <span aria-hidden>{moon.glyph}</span>
                        <span className="hidden text-[10px] text-muted-foreground sm:inline" aria-hidden>{moon.sign.glyph}</span>
                        {keyPhase && (
                          <span
                            className="hidden rounded-full px-1 text-[9px] font-medium sm:inline"
                            style={{ background: `hsl(${keyPhase.hsl} / 0.18)`, color: `hsl(${keyPhase.hsl})` }}
                          >
                            {keyPhase.verb}
                          </span>
                        )}
                      </button>
                    ) : keyPhase ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLunarDate(d); }}
                        title={`${keyPhase.label} · ${keyPhase.invitation}`}
                        aria-label={keyPhase.label}
                        className="inline-flex items-center gap-1 rounded-full px-1 text-[10px] font-medium hover:brightness-95 sm:text-[11px]"
                        style={{ background: `hsl(${keyPhase.hsl} / 0.18)`, color: `hsl(${keyPhase.hsl})` }}
                      >
                        <span aria-hidden>{keyPhase.glyph}</span>
                        <span className="hidden sm:inline">{keyPhase.verb}</span>
                      </button>
                    ) : phaseVar ? (
                      <span
                        title={`${PHASE_META[phase!].label} phase`}
                        aria-label={`${PHASE_META[phase!].label} phase`}
                        className="h-2 w-2 rounded-full"
                        style={{ background: `hsl(var(${phaseVar}))`, boxShadow: `0 0 0 2px hsl(var(${phaseVar}) / 0.18)` }}
                      />
                    ) : <span />}
                    <div className={cn("text-right text-[10px] font-medium sm:text-[11px]", today && "text-primary")}>{format(d, "d")}</div>
                  </div>
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
      <UnscheduledTasksRail />

      {editingTask && (
        <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)} />
      )}
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />

      <Sheet open={!!sheetISO} onOpenChange={(o) => !o && setSheetISO(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {sheetISO ? format(new Date(sheetISO + "T00:00:00"), "EEEE, MMM d") : ""}
            </SheetTitle>
          </SheetHeader>
          {sheetISO && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                const d = new Date(sheetISO + "T00:00:00");
                setSheetISO(null);
                setLunarDate(d);
              }}
            >
              <Moon className="mr-1.5 h-3.5 w-3.5" /> Lunar guidance for this day
            </Button>
          )}
          {sheetISO && (() => {
            const items = eventsOn(sheetISO);
            if (items.length === 0) {
              return <p className="mt-4 text-sm text-muted-foreground">Nothing on this day.</p>;
            }
            const partOf = (hm?: string | null): "morning" | "afternoon" | "evening" | "allday" => {
              if (!hm || !/^\d{2}:\d{2}/.test(hm)) return "allday";
              const h = parseInt(hm.slice(0, 2), 10);
              if (h < 12) return "morning";
              if (h < 17) return "afternoon";
              return "evening";
            };
            const groups: Record<"morning" | "afternoon" | "evening" | "allday", typeof items> = {
              morning: [], afternoon: [], evening: [], allday: [],
            };
            for (const it of items) groups[partOf(it.time)].push(it);
            for (const k of ["morning", "afternoon", "evening"] as const) {
              groups[k].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
            }
            const PARTS = [
              { key: "morning", label: "Morning", icon: Sunrise, hint: "Before 12 PM" },
              { key: "afternoon", label: "Afternoon", icon: Sun, hint: "12 – 5 PM" },
              { key: "evening", label: "Evening", icon: Moon, hint: "After 5 PM" },
              { key: "allday", label: "All day", icon: Check, hint: "No time" },
            ] as const;
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
            return (
              <div className="mt-4 space-y-4">
                {PARTS.map(p => {
                  const list = groups[p.key];
                  if (list.length === 0) return null;
                  const Icon = p.icon;
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
                          const blockCls = it.kind === "block" && it.blockColor ? colorClasses(it.blockColor) : null;
                          return (
                            <li
                              key={i}
                              onClick={() => handleClick(it)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                                blockCls ? cn(blockCls.bg, blockCls.text, "ring-1 ring-inset", blockCls.ring) : colorOf(it.kind as any),
                                (it.kind === "task" || it.kind === "appt" || it.kind === "block") && "cursor-pointer",
                              )}
                              style={blockCls?.style}
                            >
                              {it.time && <span className="shrink-0 font-mono text-xs opacity-70">{formatTime12(it.time.slice(0, 5))}</span>}
                              <span className="min-w-0 flex-1">{it.label}</span>
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
      <DayLunarSheet date={lunarDate} open={!!lunarDate} onOpenChange={(o) => !o && setLunarDate(null)} />
    </div>
  );
}
