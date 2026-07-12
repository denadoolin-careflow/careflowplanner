import { addDays, format } from "date-fns";
import { PlannerTimeline } from "./PlannerTimeline";

/** Renders N consecutive daily timelines side-by-side. Reuses PlannerTimeline. */
export function PlannerMultiDayView({ start, days }: { start: Date; days: number }) {
  const cols = Array.from({ length: days }, (_, i) => addDays(start, i));
  return (
    <div className="grid h-full min-h-0 gap-2" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
      {cols.map(d => (
        <div key={format(d, "yyyy-MM-dd")} className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-1 flex items-baseline gap-2 px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
            <span className="font-display text-sm font-semibold">{format(d, "MMM d")}</span>
          </div>
          <div className="min-h-0 flex-1">
            <PlannerTimeline date={d} />
          </div>
        </div>
      ))}
    </div>
  );
}
