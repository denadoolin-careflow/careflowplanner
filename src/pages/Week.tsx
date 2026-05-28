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
import { personalGreeting } from "@/lib/greeting";
import { hoursToHM } from "@/lib/time-blocks";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { useLongDropListener, hourToDayPart, partDropHour } from "@/lib/long-press-drag";
import { WeekPlanningDashboard } from "@/components/calendar/WeekPlanningDashboard";
import { WeekRhythmRow } from "@/components/rhythm/WeekRhythmRow";
import { RhythmJournalPrompt } from "@/components/rhythm/RhythmJournalPrompt";
import { Link } from "react-router-dom";
import { Flower2 } from "lucide-react";
import { ScopeNavToggle } from "@/components/calendar/ScopeNavToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { DayLunarSheet } from "@/components/lunar/DayLunarSheet";
import { DayContextStrip } from "@/components/calendar/DayContextStrip";

export default function Week() {
  const { state, updateTask, updateAppointment } = useStore();
  const isMobile = useIsMobile();
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
    ...state.appointments.filter(a => a.date === k).map(a => ({ label: a.title, time: a.time, id: a.id, kind: "appt" as const })),
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
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="cozy-card gradient-sage flex flex-col gap-3 p-4 sm:p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {personalGreeting(state.settings.name)} <span className="opacity-60">· Week of</span>
            </p>
            <h2 className="font-display text-2xl font-semibold sm:text-4xl">
              {format(start, "MMMM d")} – {format(addDays(start, 6), "MMMM d")}
            </h2>
            {layout === "plan" && (
              <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
                Set your intention, top three, and review the week.
              </p>
            )}
            <div className="mt-3"><WeekNavigator weekStart={start} onChange={setStart} /></div>
          </div>
          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <ScopeNavToggle active="week" />
          <Link
            to="/reset/week"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-secondary-soft/60 px-3 py-1.5 text-xs font-medium text-foreground/85 hover:bg-secondary-soft"
          >
            <Flower2 className="h-3.5 w-3.5" /> Reset & reflect
          </Link>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/60 p-1">
            <Button
              size="sm"
              variant="ghost"
              className={cn("h-8 rounded-full px-3 text-xs", layout === "grid" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
              onClick={() => setLayout("grid")}
            >
              <LayoutGrid className="mr-1 h-3.5 w-3.5" /> Schedule
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn("h-8 rounded-full px-3 text-xs", layout === "plan" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
              onClick={() => setLayout("plan")}
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Plan
            </Button>
          </div>
          </div>
        </div>

        <RhythmJournalPrompt date={start} scope="weekly" />

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
          </>
        )}
      </div>
      {layout === "grid" && <UnscheduledTasksRail onTaskClick={setEditTaskId} />}
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <DayLunarSheet date={lunarDate} open={!!lunarDate} onOpenChange={(o) => !o && setLunarDate(null)} />
    </div>
  );
}
