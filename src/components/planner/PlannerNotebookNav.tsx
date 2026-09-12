import { BookOpenText, CalendarDays, CalendarRange, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerView } from "@/lib/planner-prefs";

export function PlannerNotebookNav({ view, monthOverview, onView, onOverview, onNotes }: {
  view: PlannerView;
  monthOverview: boolean;
  onView: (view: PlannerView) => void;
  onOverview: () => void;
  onNotes: () => void;
}) {
  const items = [
    { label: "Week", icon: CalendarRange, active: view === "week", action: () => onView("week") },
    { label: "Month", icon: CalendarDays, active: view === "month" && !monthOverview, action: () => onView("month") },
    { label: "Overview", icon: LayoutDashboard, active: view === "month" && monthOverview, action: onOverview },
    { label: "Notes", icon: BookOpenText, active: false, action: onNotes },
  ];
  return (
    <nav aria-label="Planner sections" className="planner-notebook-nav">
      {items.map(({ label, icon: Icon, active, action }) => (
        <Button key={label} type="button" variant="ghost" size="sm" onClick={action} aria-current={active ? "page" : undefined}
          className={cn("planner-notebook-nav__item", active && "planner-notebook-nav__item--active")}>
          <Icon className="h-4 w-4" /><span>{label}</span>
        </Button>
      ))}
    </nav>
  );
}
