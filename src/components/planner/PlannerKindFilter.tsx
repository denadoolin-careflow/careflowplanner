import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCalendarPrefs, type CalendarKind } from "@/lib/calendar-prefs";
import { KIND_LABEL, useKindColors } from "@/lib/calendar-colors";
import { cn } from "@/lib/utils";

/** Shared legend + filter for every planner range. Backed by calendar prefs. */
export function PlannerKindFilter({ className }: { className?: string }) {
  const { prefs, toggleFilter, resetFilters, ALL_KINDS } = useCalendarPrefs();
  const { colorOf } = useKindColors();
  const active = new Set<CalendarKind>(prefs.filters);
  const hidden = ALL_KINDS.length - active.size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm" variant="outline"
          className={cn("h-8 shrink-0 rounded-full text-xs", className)}
          aria-label="Filter what shows on the planner"
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" /> Show
          {hidden > 0 && <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px]">{hidden} hidden</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Show on planner</span>
          <button type="button" className="text-[11px] text-primary hover:underline" onClick={resetFilters}>All</button>
        </div>
        <div className="space-y-0.5">
          {ALL_KINDS.map(k => {
            const on = active.has(k);
            return (
              <button
                key={k}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggleFilter(k)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
                  !on && "opacity-45",
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(k) }} />
                <span className="flex-1">{KIND_LABEL[k]}</span>
                {on && <span className="text-[10px] text-muted-foreground">on</span>}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
