import { addDays, format, isSameDay } from "date-fns";
import { PlannerTimeline } from "./PlannerTimeline";
import { cn } from "@/lib/utils";

/** Renders N consecutive daily timelines side-by-side. Reuses PlannerTimeline.
 * `unified` gives an Apple-Calendar-week feel: sticky day headers, tight column
 * chrome, and continuous vertical spacing rather than individual card frames.
 */
export function PlannerMultiDayView({ start, days, unified }: { start: Date; days: number; unified?: boolean }) {
  const cols = Array.from({ length: days }, (_, i) => addDays(start, i));
  const today = new Date();

  if (unified) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <div
          className="sticky top-0 z-10 grid border-b border-border/60 bg-card/70 backdrop-blur"
          style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
        >
          {cols.map(d => {
            const isToday = isSameDay(d, today);
            return (
              <div key={format(d, "yyyy-MM-dd")} className={cn("flex flex-col items-center py-2 text-center", isToday && "text-primary")}> 
                <span className="text-[10px] uppercase tracking-[0.2em] opacity-80">{format(d, "EEE")}</span>
                <span className={cn("mt-0.5 font-display text-lg font-semibold leading-none",
                  isToday && "grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground")}>
                  {format(d, "d")}
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
          {cols.map((d, i) => (
            <div key={format(d, "yyyy-MM-dd")} className={cn("min-h-0 min-w-0", i > 0 && "border-l border-border/40")}>
              <PlannerTimeline date={d} bare />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
