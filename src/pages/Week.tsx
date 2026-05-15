import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { startOfWeek, addDays, format } from "date-fns";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { AgendaView } from "@/components/calendar/AgendaView";
import { CalendarTasksPanel } from "@/components/calendar/CalendarTasksPanel";
import { CalendarViewToggle, type CalView } from "@/components/calendar/CalendarViewToggle";
import { QuickAddCalendarPopover } from "@/components/calendar/QuickAddCalendarPopover";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { WeekNavigator } from "@/components/week/WeekNavigator";
import { hoursToHM } from "@/lib/time-blocks";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";
import { useLongDropListener, hourToDayPart, partDropHour } from "@/lib/long-press-drag";

export default function Week() {
  const { state, updateTask, updateAppointment } = useStore();
  const [start, setStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [view, setView] = useState<CalView>("schedule");
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  useEffect(() => { gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => {}); }, []);

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ label: a.title, time: a.time, id: a.id, kind: "appt" as const })),
    ...gEvents.filter(g => g.date === k).map(g => ({ label: g.title, time: g.time ?? undefined, kind: "gcal" as const })),
    ...state.tasks.filter(t => t.dueDate === k && !t.done && !t.parentTaskId).map(t => ({
      label: t.title, time: undefined as string | undefined, id: t.id, kind: "task" as const,
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

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="cozy-card gradient-sage flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Week of</p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              {format(start, "MMMM d")} – {format(addDays(start, 6), "MMMM d")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Drag tasks from the right onto any day or hour.</p>
            <div className="mt-3"><WeekNavigator weekStart={start} onChange={setStart} /></div>
          </div>
        </div>

        <SectionCard title="This week" accent="warm" action={
          <div className="flex items-center gap-2">
            <QuickAddCalendarPopover days={days} />
            <CalendarViewToggle value={view} onChange={setView} />
          </div>
        }>
          {view === "schedule" && (
            <TimeGrid days={days} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} onApptDropAt={handleApptDrop} onApptClick={setEditApptId} />
          )}
          {view === "agenda" && (
            <AgendaView days={days} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} onApptClick={setEditApptId} />
          )}
        </SectionCard>

        <CalendarTasksPanel days={days} />
      </div>
      <UnscheduledTasksRail onTaskClick={setEditTaskId} />
      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
    </div>
  );
}
