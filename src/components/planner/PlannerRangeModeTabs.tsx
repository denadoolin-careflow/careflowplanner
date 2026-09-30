import { cn } from "@/lib/utils";
import { ViewPills } from "@/components/layout/ViewPills";

/** Small pill row for the mode within a range (Grid/Board, Calendar/Overview). */
export function PlannerRangeModeTabs<T extends string>({ value, onChange, options, className }: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  className?: string;
}) {
  return <ViewPills items={options.map(o => ({ value: o.id, label: o.label }))} value={value} onChange={onChange} ariaLabel="Planner layout" className={cn("planner-range-mode-tabs", className)} />;
}
