import { cn } from "@/lib/utils";
import type { PlannerView } from "@/lib/planner-prefs";
import { ViewPills } from "@/components/layout/ViewPills";

const OPTIONS: { id: PlannerView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "3day", label: "3 Days" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

export function PlannerViewToggle({ value, onChange, className }: {
  value: PlannerView; onChange: (v: PlannerView) => void; className?: string;
}) {
  return <ViewPills items={OPTIONS.map(o => ({ value: o.id, label: o.label }))} value={value} onChange={onChange} ariaLabel="Planner range" className={cn("planner-view-toggle", className)} />;
}
