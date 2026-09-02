import { cn } from "@/lib/utils";

export interface GoalBarItem {
  label: string;
  value: number;
  goal: number | null;
  unit?: string;
}

/** Slim animated progress bars for nutrition goals. */
export function GoalBars({ items, className, compact }: { items: GoalBarItem[]; className?: string; compact?: boolean }) {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map(item => {
        const pct = item.goal && item.goal > 0 ? Math.min(item.value / item.goal, 1) : 0;
        const met = item.goal != null && item.goal > 0 && item.value >= item.goal;
        return (
          <div key={item.label}>
            <div className={cn("flex items-baseline justify-between", compact ? "text-[10px]" : "text-xs")}>
              <span className="text-muted-foreground">{item.label}</span>
              <span className="tabular-nums">
                {Math.round(item.value)}{item.unit}
                {item.goal ? <span className="text-muted-foreground"> / {Math.round(item.goal)}{item.unit}</span> : null}
              </span>
            </div>
            <div
              className={cn("mt-1 overflow-hidden rounded-full bg-muted", compact ? "h-1" : "h-1.5")}
              role="progressbar"
              aria-label={`${item.label} progress`}
              aria-valuenow={Math.round(pct * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700 ease-out",
                  met ? "bg-accent" : "bg-primary",
                )}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
