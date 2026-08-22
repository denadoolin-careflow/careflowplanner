import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWeekFilters, type WeekDueRange } from "@/lib/planner/week-filters";
import { useTags } from "@/hooks/use-tags";
import { SavedViewsMenu } from "./SavedViewsMenu";
import type { SavedViewLayout, SavedViewScope } from "@/lib/saved-views";
import type { Area, Energy, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const AREAS: Area[] = [
  "Family", "Kids", "Caregiving", "Home", "Meals",
  "Appointments", "Holidays & Birthdays", "Personal", "Creative Projects", "Money",
];
const PRIORITIES: Priority[] = ["high", "medium", "low"];
const ENERGIES: Energy[] = ["high", "medium", "low"];
const DUE: { id: WeekDueRange; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "today", label: "Today" },
  { id: "overdue", label: "Overdue" },
  { id: "scheduled", label: "Timed" },
  { id: "unscheduled", label: "Anytime" },
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors",
        on ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/60",
      )}
    >
      {children}
    </button>
  );
}

/** Search + quick filters shared by every weekly planner view. */
export function PlannerWeekFilterBar({
  className,
  layout = "list",
  scope = "week",
  onApplyLayout,
}: {
  className?: string;
  layout?: SavedViewLayout;
  scope?: SavedViewScope;
  onApplyLayout?: (layout: SavedViewLayout, scope: SavedViewScope) => void;
}) {
  const { filters, patch, toggleIn, reset, activeCount } = useWeekFilters();
  const { tags } = useTags();
  const topTags = tags.slice(0, 24);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={e => patch({ search: e.target.value })}
          placeholder="Search this week"
          aria-label="Search items in this week"
          className="h-8 rounded-full pl-8 text-xs"
        />
        {filters.search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => patch({ search: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DUE.map(d => (
          <Chip key={d.id} on={filters.dueRange === d.id} onClick={() => patch({ dueRange: d.id })}>
            {d.label}
          </Chip>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full text-xs" aria-label="More filters">
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Filters
            {activeCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px]">{activeCount}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Narrow this week</span>
            <button type="button" className="text-[11px] text-primary hover:underline" onClick={reset}>Clear all</button>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium">Priority</p>
            <div className="flex flex-wrap gap-1">
              {PRIORITIES.map(p => (
                <Chip key={p} on={filters.priorities.includes(p)} onClick={() => toggleIn("priorities", p)}>{p}</Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium">Energy</p>
            <div className="flex flex-wrap gap-1">
              {ENERGIES.map(e => (
                <Chip key={e} on={filters.energies.includes(e)} onClick={() => toggleIn("energies", e)}>{e}</Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium">Area</p>
            <div className="flex flex-wrap gap-1">
              {AREAS.map(a => (
                <Chip key={a} on={filters.areas.includes(a)} onClick={() => toggleIn("areas", a)}>{a}</Chip>
              ))}
            </div>
          </div>

          {topTags.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium">Tags</p>
              <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                {topTags.map(t => (
                  <Chip key={t.id} on={filters.tags.includes(t.name)} onClick={() => toggleIn("tags", t.name)}>{t.name}</Chip>
                ))}
              </div>
            </div>
          )}

          <FieldFilterRows />

          <Chip on={filters.hideDone} onClick={() => patch({ hideDone: !filters.hideDone })}>Hide completed</Chip>

        </PopoverContent>
      </Popover>

      <SavedViewsMenu layout={layout} scope={scope} onApplyLayout={onApplyLayout} />

      {activeCount > 0 && (
        <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs text-muted-foreground" onClick={reset}>
          Clear
        </Button>
      )}
    </div>
  );
}
