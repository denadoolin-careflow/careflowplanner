import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { startOfWeek, addDays, format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { AgendaView } from "@/components/calendar/AgendaView";
import { DayPartsView } from "@/components/calendar/DayPartsView";
import { format as fmtDate, isSameDay } from "date-fns";
import { CalendarTasksPanel } from "@/components/calendar/CalendarTasksPanel";
import { CalendarViewToggle, useCalView } from "@/components/calendar/CalendarViewToggle";
import { QuickAddCalendarPopover } from "@/components/calendar/QuickAddCalendarPopover";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { WeekNavigator } from "@/components/week/WeekNavigator";
import { hoursToHM } from "@/lib/time-blocks";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { useLongDropListener, hourToDayPart, partDropHour } from "@/lib/long-press-drag";
import { WeekPlanningDashboard } from "@/components/calendar/WeekPlanningDashboard";
import { apptOccursOn, apptRangeMeta } from "@/lib/appointment-range";
import { WeekRhythmRow } from "@/components/rhythm/WeekRhythmRow";
import { WeekTransitStrip } from "@/components/rhythm/WeekTransitStrip";
import { RhythmJournalPrompt } from "@/components/rhythm/RhythmJournalPrompt";
import { Link } from "react-router-dom";
import { Flower2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DayLunarSheet } from "@/components/lunar/DayLunarSheet";
import { DayContextStrip } from "@/components/calendar/DayContextStrip";
import { WeekHabitsStrip } from "@/components/week/WeekHabitsStrip";
import { ScopeHero } from "@/components/layout/ScopeHero";
import { PlanningHero } from "@/components/today/rhythm/PlanningHero";
import { Triptych } from "@/components/today/RhythmDashboard";
import { DailyDebrief } from "@/components/today/DailyDebrief";
import { ScopeSidebar } from "@/components/layout/ScopeSidebar";
import { addWeeks, subWeeks, isSameWeek } from "date-fns";
import { useSidebarHidden } from "@/lib/today-view";

export default function Week() {
  const { state, updateTask, updateAppointment } = useStore();
  const isMobile = useIsMobile();
  const [sidebarHidden] = useSidebarHidden();
  const [searchParams] = useSearchParams();
  const [start, setStart] = useState(() => {
    const d = searchParams.get("date");
    const base = d ? new Date(d + "T00:00:00") : new Date();
    return startOfWeek(isNaN(base.getTime()) ? new Date() : base, { weekStartsOn: 1 });
  });
  useEffect(() => {
    const d = searchParams.get("date");
    if (!d) return;
    const base = new Date(d + "T00:00:00");
    if (!isNaN(base.getTime())) setStart(startOfWeek(base, { weekStartsOn: 1 }));
  }, [searchParams]);
  const [view, setView] = useCalView();
  const [layout, setLayout] = useState<"grid" | "plan">("grid");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [lunarDate, setLunarDate] = useState<Date | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  useEffect(() => { gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => {}); }, []);

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => apptOccursOn(a, k)).map(a => {
      const m = apptRangeMeta(a, k);
      const prefix = m.isMulti && !m.isStart ? (m.isEnd ? "↦ " : "· ") : "";
      return { label: `${prefix}${a.title}`, time: m.isStart ? a.time : undefined, id: a.id, kind: "appt" as const };
    }),
    ...gEvents.filter(g => g.date === k).map(g => ({ label: g.title, time: g.time ?? undefined, kind: "gcal" as const })),
    ...state.tasks.filter(t => t.dueDate === k && !t.parentTaskId).map(t => ({
      label: t.title, time: undefined as string | undefined, id: t.id, kind: "task" as const, done: t.done,
    })),
  ];

  const handleTimeDrop = async (taskId: string, dateISO: string, startHour: number) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    const dp = hourToDayPart(startHour);
    const dayPart = dp ? (dp[0].toUpperCase() + dp.slice(1)) as any : undefined;
    await updateTask(taskId, { dueDate: dateISO, inbox: false, ...(dayPart ? { dayPart } : {}) });
    toast(`Scheduled “${t.title}” at ${hoursToHM(startHour)}`);
  };

  const handleApptDrop = async (apptId: string, dateISO: string, startHour: number) => {
    const a = state.appointments.find(x => x.id === apptId);
    if (!a) return;
    await updateAppointment(apptId, { date: dateISO, time: hoursToHM(startHour) });
    toast(`Moved “${a.title}”`);
  };

  useLongDropListener((d) => {
    if (d.payload.type !== "task" || !d.part) return;
    const iso = d.iso ?? days[0].toISOString().slice(0, 10);
    void handleTimeDrop(d.payload.id, iso, partDropHour(d.part));
  });

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;

  // On mobile, show one day at a time in the schedule view, controlled by WeekRhythmRow.
  const visibleDays = isMobile && view === "schedule" ? [selectedDate] : days;

  return (
    <div className={cn(
      "mx-auto grid w-full min-w-0 max-w-6xl gap-4 md:gap-5 lg:gap-6",
      sidebarHidden || !!editTaskId
        ? "lg:grid-cols-1"
        : "lg:grid-cols-[minmax(0,1fr)_clamp(240px,28vw,340px)]",
    )}>
      <div className="min-w-0 space-y-6">
        <PlanningHero
          date={start}
          title={`Week of ${format(start, "MMM d")}`}
          subtitle="Your greeting, weather, and cosmic rhythm — carried across each planning view."
        />
        <Triptych date={start} />
        <DailyDebrief date={selectedDate} />
        <ScopeHero
          scope="week"
          date={start}
          title={`${format(start, "MMM d")} – ${format(addDays(start, 6), "MMM d")}`}
          subtitle={layout === "plan" ? "Set your intention, top three, and review the week." : undefined}
          eyebrow="Week of"
          pickerLabel={format(start, "MMM d")}
          isCurrent={isSameWeek(start, new Date(), { weekStartsOn: 1 })}
          onPrev={() => setStart(subWeeks(start, 1))}
          onNext={() => setStart(addWeeks(start, 1))}
          onToday={() => setStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          onDatePick={(d) => setStart(startOfWeek(d, { weekStartsOn: 1 }))}
          showQuickAdd
          actions={
            <>
              <Link
                to="/reset/week"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-secondary-soft/60 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-secondary-soft"
              >
                <Flower2 className="h-3.5 w-3.5" /> Reset & reflect
              </Link>
              <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/60 p-1">
                <Button size="sm" variant="ghost"
                  className={cn("h-7 rounded-full px-3 text-xs", layout === "grid" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
                  onClick={() => setLayout("grid")}>
                  <LayoutGrid className="mr-1 h-3.5 w-3.5" /> Schedule
                </Button>
                <Button size="sm" variant="ghost"
                  className={cn("h-7 rounded-full px-3 text-xs", layout === "plan" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
                  onClick={() => setLayout("plan")}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Plan
                </Button>
              </div>
            </>
          }
        >
          <WeekNavigator weekStart={start} onChange={setStart} />
        </ScopeHero>

        <RhythmJournalPrompt date={start} scope="weekly" />
        <WeekTransitStrip weekStart={start} />

        {layout === "plan" ? (
          <WeekPlanningDashboard weekStart={start} onJumpToDay={(d) => { setStart(startOfWeek(d, { weekStartsOn: 1 })); setLayout("grid"); }} />
        ) : (
          <>
            <SectionCard title="This week" accent="warm" action={
              <div className="flex items-center gap-2">
                <QuickAddCalendarPopover days={days} />
                <div className="hidden sm:inline-flex">
                  <CalendarViewToggle value={view} onChange={setView} />
                </div>
              </div>
            }>
              {/* Mobile: full-width view toggle right under Quick Add */}
              <div className="-mx-1 mb-3 overflow-x-auto sm:hidden">
                <div className="flex justify-center">
                  <CalendarViewToggle value={view} onChange={setView} />
                </div>
              </div>
              <WeekRhythmRow
                weekStart={start}
                selectedDate={selectedDate}
                onSelectDay={setSelectedDate}
                onLunarOpen={setLunarDate}
                className="mb-2"
              />
              {view === "schedule" && (
                <TimeGrid days={visibleDays} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} onApptDropAt={handleApptDrop} onApptClick={setEditApptId} />
              )}
              {view === "parts" && (
                <div className="space-y-4">
                  {(isMobile ? [selectedDate] : days).map(d => (
                    <div key={d.toISOString()} className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <h3 className={cn(
                          "font-display text-sm font-semibold",
                          isSameDay(d, new Date()) && "text-primary"
                        )}>
                          {fmtDate(d, "EEEE")} <span className="text-muted-foreground font-normal">{fmtDate(d, "MMM d")}</span>
                        </h3>
                      </div>
                      <DayContextStrip date={d} onLunar={setLunarDate} />
                      <DayPartsView
                        days={[d]}
                        appointmentsOn={eventsOn}
                        onTaskDropAt={handleTimeDrop}
                        onApptClick={setEditApptId}
                        onTaskClick={setEditTaskId}
                      />
                    </div>
                  ))}
                </div>
              )}
              {view === "agenda" && (
                <AgendaView days={isMobile ? [selectedDate] : days} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} onApptClick={setEditApptId} onLunarOpen={setLunarDate} />
              )}
            </SectionCard>

            <CalendarTasksPanel days={days} />
            <WeekHabitsStrip weekStart={start} />
          </>
        )}
      </div>
      {layout === "grid" && !editTaskId && (
        <ScopeSidebar scope="week" date={selectedDate} onTaskClick={setEditTaskId} />
      )}
      {layout === "grid" && <UnscheduledTasksRail onTaskClick={setEditTaskId} />}
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <DayLunarSheet date={lunarDate} open={!!lunarDate} onOpenChange={(o) => !o && setLunarDate(null)} />
    </div>
  );
}
