import { useCalendarPrefs, type CalendarKind } from "@/lib/calendar-prefs";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useWeekFilters } from "@/lib/planner/week-filters";
import type { Energy, Priority } from "@/lib/types";

const FILTERS: { label: string; kinds: CalendarKind[]; tone: string }[] = [
  { label: "Events", kinds: ["appt", "gcal"], tone: "bg-calendar-event" },
  { label: "Tasks", kinds: ["task"], tone: "bg-calendar-task" },
  { label: "Meals", kinds: ["meal"], tone: "bg-calendar-meal" },
  { label: "Family & care", kinds: ["care", "bday", "hol", "season"], tone: "bg-calendar-care" },
  { label: "Lunar & astrology", kinds: ["cosmic"], tone: "bg-calendar-cosmic" },
];

export function PlannerMonthFilters() {
  const { prefs, setFilters } = useCalendarPrefs();
  const { filters, toggleIn, patch, activeCount } = useWeekFilters();
  const active = new Set(prefs.filters);
  const toggleGroup = (kinds: CalendarKind[]) => {
    const next = new Set(active);
    const on = kinds.some(kind => next.has(kind));
    kinds.forEach(kind => on ? next.delete(kind) : next.add(kind));
    setFilters(next);
  };
  return (
    <div className="planner-month-filters" aria-label="Month categories">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Show</span>
      {FILTERS.map(filter => {
        const on = filter.kinds.some(kind => active.has(kind));
        return <button key={filter.label} type="button" aria-pressed={on} onClick={() => toggleGroup(filter.kinds)} className={cn("planner-filter-chip", !on && "opacity-45")}>
          <span className={cn("h-2 w-2 rounded-full", filter.tone)} aria-hidden />{filter.label}
        </button>;
      })}
      <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="h-8 shrink-0 rounded-full px-2.5 text-xs"><SlidersHorizontal className="mr-1 h-3.5 w-3.5" />Filters{activeCount > 0 && <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px]">{activeCount}</span>}</Button></PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-3 p-3">
          <MonthFilterRow label="Priority" values={["high", "medium", "low"] as Priority[]} active={filters.priorities} onToggle={value => toggleIn("priorities", value)} />
          <MonthFilterRow label="Energy" values={["high", "medium", "low"] as Energy[]} active={filters.energies} onToggle={value => toggleIn("energies", value)} />
          <div><p className="mb-1 text-[11px] font-medium">Status</p><div className="flex gap-1"><FilterChip on={!filters.hideDone && !filters.completedOnly} onClick={() => patch({ hideDone: false, completedOnly: false })}>All</FilterChip><FilterChip on={filters.hideDone} onClick={() => patch({ hideDone: true, completedOnly: false })}>Open</FilterChip><FilterChip on={filters.completedOnly} onClick={() => patch({ completedOnly: true, hideDone: false })}>Done</FilterChip></div></div>
        </PopoverContent></Popover>
    </div>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cn("rounded-full border px-2.5 py-1 text-[11px] capitalize", on ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground")}>{children}</button>;
}

function MonthFilterRow<T extends string>({ label, values, active, onToggle }: { label: string; values: T[]; active: T[]; onToggle: (value: T) => void }) {
  return <div><p className="mb-1 text-[11px] font-medium">{label}</p><div className="flex gap-1">{values.map(value => <FilterChip key={value} on={active.includes(value)} onClick={() => onToggle(value)}>{value}</FilterChip>)}</div></div>;
}
