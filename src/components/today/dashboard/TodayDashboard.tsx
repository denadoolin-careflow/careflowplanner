import { useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { burnoutMultiplier, useBurnoutCheckIn } from "@/lib/burnout-checkin";
import { GreetingBlock } from "./GreetingBlock";
import { ScopeSegmented } from "./ScopeSegmented";
import { CareLoopRow } from "./CareLoopRow";
import { CapacityCard } from "./CapacityCard";
import { AnchorTodayCard } from "./AnchorTodayCard";
import { PlanColumn } from "./PlanColumn";
import { CareColumn } from "./CareColumn";
import { GrowColumn } from "./GrowColumn";
import { RoutinesHabitsRow } from "./RoutinesHabitsRow";
import { CapacityProvider } from "./capacity-context";
import { RhythmTodayCard } from "@/components/today/RhythmTodayCard";
import { DinnerTonightCard } from "@/components/today/DinnerTonightCard";
import { CleaningTodayCard } from "@/components/today/CleaningTodayCard";
import { ConnectionsCard } from "@/components/today/ConnectionsCard";
import { TodayNudgeStrip } from "@/components/today/TodayNudgeStrip";
import { WellFlowTodayCard } from "@/components/today/WellFlowTodayCard";


export function TodayDashboard({
  date, onTaskClick, onExhale, controls,
}: {
  date: Date;
  onTaskClick?: (id: string) => void;
  onExhale: () => void;
  controls?: React.ReactNode;
}) {
  const { state } = useStore();
  const { entry } = useBurnoutCheckIn(date);
  const iso = format(date, "yyyy-MM-dd");

  const capacity = useMemo(() => ({
    level: entry.level,
    multiplier: burnoutMultiplier(entry.level),
    isLow: entry.level === "tender" || entry.level === "depleted",
    isSpacious: entry.level === "spacious",
  }), [entry.level]);

  const inboxCount = state.tasks.filter(t => !t.done && (t as any).inbox).length;
  const scheduledCount = state.tasks.filter(t => t.dueDate === iso && !t.done).length;
  const anchorTask = state.tasks.find(t => t.id === entry.mvdTaskId)
    ?? state.tasks.find(t => !t.done && t.isTopThree);

  return (
    <CapacityProvider value={capacity}>
      <div className="animate-fade-in space-y-4">
        <GreetingBlock date={date} />
        <div className="flex justify-center"><ScopeSegmented active="today" /></div>
        {controls}
        <CareLoopRow
          inboxCount={inboxCount}
          anchorLabel={anchorTask ? anchorTask.title.slice(0, 28) : "Choose one"}
          scheduledCount={scheduledCount}
          onExhale={onExhale}
        />
        <TodayNudgeStrip date={date} />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <CapacityCard date={date} />
          <AnchorTodayCard date={date} onTaskClick={onTaskClick} />
        </div>
        <RhythmTodayCard date={date} />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <DinnerTonightCard date={date} />
          <CleaningTodayCard />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <WellFlowTodayCard />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <PlanColumn date={date} onTaskClick={onTaskClick} />
          <CareColumn date={date} onTaskClick={onTaskClick} />
          <GrowColumn date={date} />
        </div>
        <ConnectionsCard date={date} onTaskClick={onTaskClick} />
        <RoutinesHabitsRow date={date} />

      </div>
    </CapacityProvider>
  );
}