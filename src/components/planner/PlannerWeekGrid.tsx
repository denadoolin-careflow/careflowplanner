import { addDays, format, isSameDay } from "date-fns";
import { PlannerTimeline } from "./PlannerTimeline";
import { PlannerAllDayRow } from "./PlannerAllDayRow";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { cn } from "@/lib/utils";

/** Multi-day hour grid with an all-day row fed by the shared planner feed. */
export function PlannerWeekGrid({ start, days = 7, onOpenItem, onSelectDay }: {
  start: Date;
  days?: number;
  onOpenItem?: (item: PlannerFeedItem) => void;
  onSelectDay?: (d: Date) => void;
}) {
  const cols = Array.from({ length: days }, (_, i) => addDays(start, i));
  const today = new Date();
  const { byDay } = usePlannerFeed(start, days);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div
        className="sticky top-0 z-10 grid border-b border-border/60 bg-card/70 backdrop-blur"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
      >
        {cols.map(d => {
          const key = format(d, "yyyy-MM-dd");
          const isToday = isSameDay(d, today);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay?.(d)}
              className={cn("flex flex-col items-center py-2 text-center transition-colors hover:bg-muted/40", isToday && "text-primary")}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-80">{format(d, "EEE")}</span>
              <span className={cn("mt-0.5 font-display text-lg font-semibold leading-none",
                isToday && "grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground")}>
                {format(d, "d")}
              </span>
            </button>
          );
        })}
      </div>
      <div
        className="grid border-b border-border/40 bg-background/40"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
      >
        {cols.map((d, i) => (
          <PlannerAllDayRow
            key={format(d, "yyyy-MM-dd")}
            items={(byDay.get(format(d, "yyyy-MM-dd")) ?? []).filter(it => it.allDay)}
            onOpen={onOpenItem}
            className={cn("min-w-0", i > 0 && "border-l border-border/40")}
          />
        ))}
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
