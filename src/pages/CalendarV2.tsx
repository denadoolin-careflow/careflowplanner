import { useMemo } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { pickTopThree } from "@/lib/top-three";
import { CommandBar } from "@/components/calendar-v2/CommandBar";
import { UniversalInbox } from "@/components/calendar-v2/UniversalInbox";
import { DayCanvas } from "@/components/calendar-v2/DayCanvas";
import { FamilyLanes } from "@/components/calendar-v2/FamilyLanes";

export default function CalendarV2() {
  const { state } = useStore();
  const date = useMemo(() => new Date(), []);
  const iso = format(date, "yyyy-MM-dd");

  const dayTasks = useMemo(
    () => state.tasks.filter((t) => t.dueDate === iso && !t.parentTaskId && t.status !== "parked"),
    [state.tasks, iso],
  );
  const unscheduled = useMemo(
    () => state.tasks.filter((t) =>
      !t.done && !t.parentTaskId && t.status !== "parked" &&
      (t.inbox === true || (!t.dueDate && !t.startTime))
    ),
    [state.tasks],
  );
  const dayAppts = useMemo(
    () => (state.appointments ?? []).filter((a) => a.date === iso),
    [state.appointments, iso],
  );
  const topThree = useMemo(() => pickTopThree(state.tasks, iso), [state.tasks, iso]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 px-2 pb-10 sm:px-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.24em] text-primary/70">Prototype</p>
        <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground">← Classic calendar</Link>
      </div>

      <CommandBar date={date} tasks={dayTasks} appointments={dayAppts} topThree={topThree} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <UniversalInbox unscheduled={unscheduled} />
        <DayCanvas date={date} tasks={dayTasks} appointments={dayAppts} unscheduled={unscheduled} />
      </div>

      <FamilyLanes date={date} tasks={dayTasks} appointments={dayAppts} />
    </div>
  );
}