import { useState, useCallback, useMemo } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { DateBarStrip } from "@/components/cards/DateBarStrip";
import { AuroraClock } from "@/components/cards/AuroraClock";
import { format, isSameDay, addDays } from "date-fns";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { AgendaView } from "@/components/calendar/AgendaView";
import { CalendarTasksPanel } from "@/components/calendar/CalendarTasksPanel";
import { CalendarViewToggle, type CalView } from "@/components/calendar/CalendarViewToggle";
import { QuickAddCalendarPopover } from "@/components/calendar/QuickAddCalendarPopover";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { hoursToHM } from "@/lib/time-blocks";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LayoutGrid, ChevronDown, Sparkles } from "lucide-react";
import { useLongDropListener, hourToDayPart, partDropHour } from "@/lib/long-press-drag";
import { CustomizableGrid } from "@/components/dashboard/CustomizableGrid";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskSelectionProvider, useTaskSelection } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane";
import { PhaseBadge } from "@/components/cycle/PhaseBadge";
import { CycleLogSheet } from "@/components/cycle/CycleLogSheet";
import { MoonJournalReminderBanner } from "@/components/cycle/MoonJournalReminderBanner";
import { RhythmForecastCard } from "@/components/rhythm/RhythmForecastCard";
import { ElementBadge } from "@/components/rhythm/ElementBadge";
import { RhythmJournalPrompt } from "@/components/rhythm/RhythmJournalPrompt";
import { useRhythmForecastEnabled, getRhythmForecast } from "@/lib/rhythm-forecast";
import { PlanWithEnergyDialog } from "@/components/rhythm/PlanWithEnergyDialog";
import { Wand2 } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMoonPhase } from "@/lib/moon";
import { DailyPlanningDashboard } from "@/components/calendar/DailyPlanningDashboard";
import { cn } from "@/lib/utils";
import { TodayEnergy } from "@/components/today/TodayEnergy";

const MOON_TEMPLATE_MAP: Record<string, string> = {
  "new": "new-moon",
  "waxing-crescent": "new-moon",
  "first-quarter": "first-quarter-moon",
  "waxing-gibbous": "first-quarter-moon",
  "full": "full-moon",
  "waning-gibbous": "full-moon",
  "last-quarter": "last-quarter-moon",
  "waning-crescent": "last-quarter-moon",
};

export default function Today() {
  return (
    <TaskSelectionProvider storageKey="today">
      <TodayInner />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

function TodayInner() {
  const { state, updateTask, updateAppointment } = useStore();
  const { paneOpen, togglePane, setOrderedIds, clear } = useTaskSelection();
  const [searchParams, setSearchParams] = useSearchParams();
  const [day, setDay] = useState<Date>(() => {
    const d = searchParams.get("date");
    if (d) {
      const parsed = new Date(d + "T00:00:00");
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  useEffect(() => {
    const d = searchParams.get("date");
    if (!d) return;
    const parsed = new Date(d + "T00:00:00");
    if (!isNaN(parsed.getTime()) && !isSameDay(parsed, day)) setDay(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const setDayAndUrl = useCallback((d: Date) => {
    setDay(d);
    const next = new URLSearchParams(searchParams);
    if (isSameDay(d, new Date())) next.delete("date");
    else next.set("date", format(d, "yyyy-MM-dd"));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [view, setView] = useState<CalView>("schedule");
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [cycleSheetOpen, setCycleSheetOpen] = useState(false);
  const [layout, setLayout] = useState<"schedule" | "plan">("schedule");
  const navigate = useNavigate();
  const today = day;
  const isReallyToday = isSameDay(day, new Date());
  const lowMode = state.settings.lowEnergyMode;

  // Stable reference list so child memoization doesn't break on each parent render.
  const days = useMemo(() => [today], [today]);

  const todayISO = format(today, "yyyy-MM-dd");
  const visibleTaskIds = useMemo(
    () => state.tasks.filter(t => t.dueDate === todayISO && !t.parentTaskId).map(t => t.id),
    [state.tasks, todayISO],
  );
  useEffect(() => { setOrderedIds(visibleTaskIds); }, [visibleTaskIds, setOrderedIds]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  const eventsOn = useCallback((k: string) => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ label: a.title, time: a.time, id: a.id, kind: "appt" as const })),
    ...state.tasks.filter(t => t.dueDate === k && !t.parentTaskId).map(t => ({
      label: t.title, time: undefined as string | undefined, id: t.id, kind: "task" as const, done: t.done,
    })),
  ], [state.appointments, state.tasks]);

  const handleTimeDrop = useCallback(async (taskId: string, dateISO: string, startHour: number) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    const dp = hourToDayPart(startHour);
    const dayPart = dp ? (dp[0].toUpperCase() + dp.slice(1)) as any : undefined;
    await updateTask(taskId, { dueDate: dateISO, inbox: false, ...(dayPart ? { dayPart } : {}) });
    toast(`Scheduled “${t.title}” at ${hoursToHM(startHour)}`);
  }, [state.tasks, updateTask]);

  const handleApptDrop = useCallback(async (apptId: string, dateISO: string, startHour: number) => {
    const a = state.appointments.find(x => x.id === apptId);
    if (!a) return;
    await updateAppointment(apptId, { date: dateISO, time: hoursToHM(startHour) });
    toast(`Moved “${a.title}” to ${hoursToHM(startHour)}`);
  }, [state.appointments, updateAppointment]);

  useLongDropListener((d) => {
    if (d.payload.type !== "task" || !d.part) return;
    const iso = d.iso ?? today.toISOString().slice(0, 10);
    void handleTimeDrop(d.payload.id, iso, partDropHour(d.part));
  });

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [rhythmOn] = useRhythmForecastEnabled();
  const [planEnergyOpen, setPlanEnergyOpen] = useState(false);
  const forecast = useMemo(() => getRhythmForecast(today), [today]);

  const body = (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="cozy-card overflow-hidden">
          <div className="relative gradient-calm p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(60% 80% at 85% 30%, hsl(var(--primary)/0.18), transparent 70%), radial-gradient(50% 70% at 15% 90%, hsl(var(--moon, var(--primary))/0.15), transparent 70%)",
              }}
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{format(today, "EEEE")}</p>
                <h2 className="text-gradient-glow font-display text-3xl font-semibold sm:text-4xl">
                  {format(today, "MMMM d, yyyy")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lowMode ? "Low-energy mode: only the essentials." : "Drag tasks from the right onto your day."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setDayAndUrl(addDays(day, -1))} aria-label="Previous day">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <DayPickerButton date={day} onChange={setDayAndUrl} />
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setDayAndUrl(addDays(day, 1))} aria-label="Next day">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {!isReallyToday && (
                    <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => setDayAndUrl(new Date())}>Today</Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={() => setPlanEnergyOpen(true)}
                    title="Plan with this energy — low-energy, home/care, personal, can-wait"
                  >
                    <Wand2 className="mr-1 h-3.5 w-3.5" /> Plan with this energy
                  </Button>
                  <PhaseBadge
                    date={today}
                    className="ml-1"
                    onClick={() => {
                      const tpl = MOON_TEMPLATE_MAP[getMoonPhase(today)] ?? "daily";
                      navigate(`/journal?template=${tpl}`);
                    }}
                  />
                  <div className="ml-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 p-1">
                    <Button
                      size="sm" variant="ghost"
                      className={cn("h-7 rounded-full px-3 text-xs", layout === "schedule" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
                      onClick={() => setLayout("schedule")}
                    >
                      <LayoutGrid className="mr-1 h-3.5 w-3.5" /> Schedule
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className={cn("h-7 rounded-full px-3 text-xs", layout === "plan" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
                      onClick={() => setLayout("plan")}
                    >
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> Plan
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-8 w-8 lg:inline-flex"
                    onClick={togglePane}
                    title={paneOpen ? "Hide details pane" : "Show details pane"}
                    aria-label="Toggle details pane"
                  >
                    {paneOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <AuroraClock className="sm:self-center" />
            </div>
            <div className="relative mt-5">
              <DateBarStrip date={today} />
            </div>
          </div>
        </div>

        <MoonJournalReminderBanner date={today} />

        {rhythmOn && (
          <TodayEnergy date={today} />
        )}

        {layout === "plan" ? (
          <DailyPlanningDashboard day={today} />
        ) : (
        <SectionCard
          title="Today"
          subtitle={view === "schedule" ? "Click a slot to add a time block, or drag a task in." : "Chronological view of everything on your day."}
          accent="warm"
          action={
            <div className="flex items-center gap-2">
              <QuickAddCalendarPopover days={[today]} />
              <CalendarViewToggle value={view} onChange={setView} />
            </div>
          }
        >
          {view === "schedule" && (
            <TimeGrid days={days} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} onApptDropAt={handleApptDrop} onApptClick={setEditApptId} />
          )}
          {view === "agenda" && (
            <AgendaView days={days} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} onApptClick={setEditApptId} />
          )}
        </SectionCard>
        )}

        {layout === "schedule" && <CalendarTasksPanel days={days} />}

        <Collapsible open={widgetsOpen} onOpenChange={setWidgetsOpen}>
          <div className="cozy-card p-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <span className="font-display text-base font-semibold">Widgets</span>
                <span className="text-xs text-muted-foreground">Weather, Pomodoro, Habits & more</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${widgetsOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <CustomizableGrid pageKey="today" />
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
      {paneOpen && <TaskDetailPane />}
      <UnscheduledTasksRail onTaskClick={setEditTaskId} />
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <CycleLogSheet open={cycleSheetOpen} onOpenChange={setCycleSheetOpen} date={today} />
      <PlanWithEnergyDialog
        open={planEnergyOpen}
        onOpenChange={setPlanEnergyOpen}
        date={today}
        forecast={forecast}
      />
    </div>
  );

  return <WorkspaceShell>{body}</WorkspaceShell>;
}
