import { useMemo } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { pickTopThree } from "@/lib/top-three";
import { CommandBar } from "@/components/calendar-v2/CommandBar";
import { UniversalInbox } from "@/components/calendar-v2/UniversalInbox";
import { DayCanvas } from "@/components/calendar-v2/DayCanvas";
import { FamilyLanes } from "@/components/calendar-v2/FamilyLanes";
import { CalendarV2ViewToggle, useCV2View } from "@/components/calendar-v2/CalendarV2ViewToggle";
import { FlowStages, type StageSignals } from "@/components/calendar-v2/FlowStages";
import { CareySuggestions } from "@/components/calendar-v2/CareySuggestions";
import { RecoveryStrip } from "@/components/calendar-v2/RecoveryStrip";
import { TimeContainers } from "@/components/calendar-v2/TimeContainers";
import { WeekView } from "@/components/calendar-v2/WeekView";
import { MonthView } from "@/components/calendar-v2/MonthView";
import { suggestRecovery } from "@/lib/calendar-v2/recovery";

export default function CalendarV2() {
  const { state } = useStore();
  const date = useMemo(() => new Date(), []);
  const iso = format(date, "yyyy-MM-dd");
  const [view, setView] = useCV2View();

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

  const signals: StageSignals = useMemo(() => {
    const doneToday = state.tasks.filter((t) => (t.lastCompletedAt ?? "").slice(0, 10) === iso).length;
    return {
      captureCount: unscheduled.length,
      clarifiedCount: dayTasks.filter((t) => t.area && (t.estMinutes ?? 0) > 0).length,
      prioritizedCount: topThree.length,
      scheduledCount: dayTasks.filter((t) => !!t.startTime).length,
      focusActive: topThree.length > 0,
      reflectedToday: doneToday > 0,
      recoveryPlanned:
        suggestRecovery(dayAppts).length === 0 ||
        dayTasks.some((t) => t.title.startsWith("🌿")),
    };
  }, [state.tasks, unscheduled.length, dayTasks, dayAppts, topThree.length, iso]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 px-2 pb-10 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.24em] text-primary/70">Prototype</p>
        <div className="flex items-center gap-3">
          <CalendarV2ViewToggle value={view} onChange={setView} />
          <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground">← Classic calendar</Link>
        </div>
      </div>

      <CommandBar date={date} tasks={dayTasks} appointments={dayAppts} topThree={topThree} />
      <FlowStages signals={signals} />

      {view === "day" && (
        <>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <UniversalInbox unscheduled={unscheduled} />
            <div className="space-y-4">
              <CareySuggestions date={date} tasks={dayTasks} unscheduled={unscheduled} appointments={dayAppts} />
              <RecoveryStrip date={date} appointments={dayAppts} />
              <DayCanvas date={date} tasks={dayTasks} appointments={dayAppts} unscheduled={unscheduled} />
            </div>
          </div>
          <TimeContainers date={date} tasks={dayTasks} appointments={dayAppts} />
          <FamilyLanes date={date} tasks={dayTasks} appointments={dayAppts} />
        </>
      )}

      {view === "week" && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <UniversalInbox unscheduled={unscheduled} />
          <WeekView date={date} />
        </div>
      )}

      {view === "month" && <MonthView date={date} />}
    </div>
  );
}