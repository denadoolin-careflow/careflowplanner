import { useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { EnergyCheckIn } from "@/components/cards/EnergyCheckIn";
import { format } from "date-fns";
import { toast } from "sonner";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { hoursToHM } from "@/lib/time-blocks";

export default function Today() {
  const { state, updateTask } = useStore();
  const T = todayISO();
  const today = new Date();
  const lowMode = state.settings.lowEnergyMode;

  const eventsOn = (k: string) => [
    ...state.appointments.filter(a => a.date === k).map(a => ({ label: a.title, time: a.time })),
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
        <div className="cozy-card overflow-hidden">
          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between gradient-calm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{format(today, "EEEE")}</p>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">{format(today, "MMMM d, yyyy")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lowMode ? "Low-energy mode: only the essentials." : "Drag tasks from the right onto your day."}
              </p>
            </div>
            <EnergyCheckIn />
          </div>
        </div>

        <SectionCard title="Today" subtitle="Click a slot to add a time block, or drag a task in." accent="warm">
          <TimeGrid days={[today]} appointmentsOn={eventsOn} onTaskDropAt={handleTimeDrop} />
        </SectionCard>
      </div>
      <UnscheduledTasksRail />
    </div>
  );
}
