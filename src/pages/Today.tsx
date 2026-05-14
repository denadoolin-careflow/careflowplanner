import { useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { DateBarStrip } from "@/components/cards/DateBarStrip";
import { AuroraClock } from "@/components/cards/AuroraClock";
import { format, isSameDay, addDays } from "date-fns";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { AgendaView } from "@/components/calendar/AgendaView";
import { DayPartsView } from "@/components/calendar/DayPartsView";
import { CalendarTasksPanel } from "@/components/calendar/CalendarTasksPanel";
import { CalendarViewToggle, type CalView } from "@/components/calendar/CalendarViewToggle";
import { QuickAddCalendarPopover } from "@/components/calendar/QuickAddCalendarPopover";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { hoursToHM } from "@/lib/time-blocks";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LayoutGrid, ChevronDown } from "lucide-react";
import { useLongDropListener, hourToDayPart, partDropHour } from "@/lib/long-press-drag";
import { CustomizableGrid } from "@/components/dashboard/CustomizableGrid";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Today() {
  const { state, updateTask, updateAppointment } = useStore();
  const [day, setDay] = useState<Date>(new Date());
  const [view, setView] = useState<CalView>("schedule");
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const today = day;
  const isReallyToday = isSameDay(day, new Date());
  const lowMode = state.settings.lowEnergyMode;

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ label: a.title, time: a.time, id: a.id, kind: "appt" as const })),
    ...state.tasks.filter(t => t.dueDate === k && !t.done && !t.parentTaskId).map(t => ({
      label: `○ ${t.title}`, time: undefined as string | undefined,
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
    toast(`Moved “${a.title}” to ${hoursToHM(startHour)}`);
  };

  useLongDropListener((d) => {
    if (d.payload.type !== "task" || !d.part) return;
    const iso = d.iso ?? today.toISOString().slice(0, 10);
    void handleTimeDrop(d.payload.id, iso, partDropHour(d.part));
  });

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;
  const [widgetsOpen, setWidgetsOpen] = useState(false);

  return (
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
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <DayPickerButton date={day} onChange={setDay} />
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {!isReallyToday && (
                    <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => setDay(new Date())}>Today</Button>
                  )}
                </div>
              </div>
              <AuroraClock className="sm:self-center" />
            </div>
            <div className="relative mt-5">
              <DateBarStrip date={today} />
            </div>
          </div>
        </div>

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
            <TimeGrid days={[today]} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} onApptDropAt={handleApptDrop} onApptClick={setEditApptId} />
          )}
          {view === "agenda" && (
            <AgendaView days={[today]} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} onApptClick={setEditApptId} />
          )}
          {view === "dayparts" && (
            <DayPartsView
              days={[today]}
              appointmentsOn={eventsOn}
              onTaskDropAt={handleTimeDrop}
              onApptClick={setEditApptId}
              onTaskClick={setEditTaskId}
            />
          )}
        </SectionCard>

        <CalendarTasksPanel days={[today]} />

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
      <UnscheduledTasksRail onTaskClick={setEditTaskId} />
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
    </div>
  );
}
