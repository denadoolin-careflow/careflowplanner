import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { MoonPrioritiesCard } from "@/components/today/widgets/MoonPrioritiesCard";
import { TasksTodayWidget } from "@/components/today/widgets/TasksTodayWidget";
import { MealsPlannedWidget } from "@/components/today/widgets/MealsPlannedWidget";
import { CollapsibleWidget } from "@/components/today/CollapsibleWidget";
import { useCollapsedWidgets } from "@/lib/today-view";

interface Props {
  /** Anchor date used by the per-day widgets. */
  date: Date;
  /** Optional task click handler (opens task editor). */
  onTaskClick?: (id: string) => void;
  /** Extra widgets/cards rendered above the shared rail (e.g. unscheduled tasks). */
  children?: React.ReactNode;
}

/**
 * Shared widgets rail for the Week and Month pages so the right column feels
 * the same across the three planning views.
 */
export function ScopeSidebar({ date, onTaskClick, children }: Props) {
  const { collapsed, toggle } = useCollapsedWidgets();

  return (
    <aside className="min-w-0 max-w-full space-y-3 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:w-[clamp(240px,28vw,340px)] md:self-start md:overflow-y-auto md:pr-1">
      <div className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        At a glance
      </div>
      {children}
      <CollapsibleWidget id="weather" title="Weather"
        collapsed={collapsed.has("weather")} onToggle={() => toggle("weather")}>
        <WeatherWidget />
      </CollapsibleWidget>
      <CollapsibleWidget id="moon-priorities" title="Moon & Top 3"
        collapsed={collapsed.has("moon-priorities")} onToggle={() => toggle("moon-priorities")}>
        <MoonPrioritiesCard date={date} onTaskClick={onTaskClick} />
      </CollapsibleWidget>
      <CollapsibleWidget id="tasks-today" title="Tasks"
        collapsed={collapsed.has("tasks-today")} onToggle={() => toggle("tasks-today")}>
        <TasksTodayWidget date={date} />
      </CollapsibleWidget>
      <CollapsibleWidget id="meals-planned" title="Meals planned"
        collapsed={collapsed.has("meals-planned")} onToggle={() => toggle("meals-planned")}>
        <MealsPlannedWidget date={date} />
      </CollapsibleWidget>
    </aside>
  );
}