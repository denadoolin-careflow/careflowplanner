import { PlannerPriorityStrip } from "@/components/planner/PlannerPriorityStrip";

/**
 * Side-panel Top Priorities card. Reads the same day-scoped set as the
 * pinned strip in the planner views, so pins stay in sync everywhere.
 */
export function TopPrioritiesCard({ date }: { date: Date }) {
  return <PlannerPriorityStrip date={date} scope="day" />;
}
