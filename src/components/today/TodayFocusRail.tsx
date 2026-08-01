import { GreetingBlock } from "@/components/today/dashboard/GreetingBlock";
import { CapacityCard } from "@/components/today/dashboard/CapacityCard";
import { AnchorTodayCard } from "@/components/today/dashboard/AnchorTodayCard";
import { TopThreeStrip } from "@/components/today/TopThreeStrip";
import { PlannerAtmosphereStrip } from "@/components/planner/PlannerAtmosphereStrip";
import { DashCard } from "@/components/today/dashboard/DashCard";

/** Left-hand focus column: who you are today, how much you have, what holds the day. */
export function TodayFocusRail({ date, onTaskClick }: { date: Date; onTaskClick?: (id: string) => void }) {
  return (
    <aside aria-label="Today focus" className="space-y-3">
      <GreetingBlock date={date} />
      <CapacityCard date={date} />
      <AnchorTodayCard date={date} onTaskClick={onTaskClick} />
      <DashCard eyebrow="Priorities" title="Top 3">
        <TopThreeStrip date={date} onTaskClick={onTaskClick} />
      </DashCard>
      <PlannerAtmosphereStrip date={date} />
    </aside>
  );
}