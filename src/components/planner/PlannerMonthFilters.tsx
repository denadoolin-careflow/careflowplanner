import { useCalendarPrefs, type CalendarKind } from "@/lib/calendar-prefs";
import { cn } from "@/lib/utils";

const FILTERS: { label: string; kinds: CalendarKind[]; tone: string }[] = [
  { label: "Events", kinds: ["appt", "gcal"], tone: "bg-calendar-event" },
  { label: "Tasks", kinds: ["task"], tone: "bg-calendar-task" },
  { label: "Meals", kinds: ["meal"], tone: "bg-calendar-meal" },
  { label: "Family & care", kinds: ["care", "bday", "hol", "season"], tone: "bg-calendar-care" },
  { label: "Lunar & astrology", kinds: ["cosmic"], tone: "bg-calendar-cosmic" },
];

export function PlannerMonthFilters() {
  const { prefs, setFilters } = useCalendarPrefs();
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
    </div>
  );
}
