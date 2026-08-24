import { AnchorTodayCard } from "@/components/today/dashboard/AnchorTodayCard";
import { TopThreeStrip } from "@/components/today/TopThreeStrip";
import { PlannerAtmosphereStrip } from "@/components/planner/PlannerAtmosphereStrip";
import { DashCard } from "@/components/today/dashboard/DashCard";
import { TaskSourcePanel } from "@/components/planner/TaskSourcePanel";

/** Left-hand focus column: what holds the day, and what's waiting to be placed. */
export function TodayFocusRail({ date, onTaskClick, showSources }: { date: Date; onTaskClick?: (id: string) => void; showSources?: boolean }) {
  return (
    <aside aria-label="Today focus" className="animate-fade-in space-y-3">
      <AnchorTodayCard date={date} onTaskClick={onTaskClick} />
      <DashCard eyebrow="Priorities" title="Top 3">
        <TopThreeStrip date={date} onTaskClick={onTaskClick} />
      </DashCard>
      <PlannerAtmosphereStrip date={date} />
      {showSources && (
        <div className="h-[480px]">
          <TaskSourcePanel selectedDate={date} />
        </div>
      )}
    </aside>
  );
}
