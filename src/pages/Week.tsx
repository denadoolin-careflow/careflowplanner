import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { startOfWeek, addDays, format } from "date-fns";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { WeekNavigator } from "@/components/week/WeekNavigator";
import { hoursToHM } from "@/lib/time-blocks";
import { gcalFetchEvents, type GCalEvent } from "@/lib/google-calendar";

export default function Week() {
  const { state, updateTask } = useStore();
  const [start, setStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  useEffect(() => { gcalFetchEvents().then(r => setGEvents(r.events ?? [])).catch(() => {}); }, []);

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ label: a.title, time: a.time })),
    ...gEvents.filter(g => g.date === k).map(g => ({ label: g.title, time: g.time ?? undefined })),
    ...state.tasks.filter(t => t.dueDate === k && !t.done && !t.parentTaskId).map(t => ({
      label: `○ ${t.title}`, time: undefined as string | undefined,
    })),
  ];

  const handleTimeDrop = async (taskId: string, dateISO: string, startHour: number) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    await updateTask(taskId, { dueDate: dateISO, inbox: false });
    toast(`Scheduled “${t.title}” at ${hoursToHM(startHour)}`);
  };

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

        <SectionCard title="This week" accent="warm">
          <TimeGrid days={days} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} />
        </SectionCard>
      </div>
      <UnscheduledTasksRail />
    </div>
  );
}
