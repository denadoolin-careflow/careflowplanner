import { format } from "date-fns";
import { Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonthlyProject } from "@/lib/projects/monthly-planning";
import { ProjectGardenPage } from "@/components/projects/detail/garden/ProjectGardenPage";

/**
 * The month's Monthly Planning project rendered as a Garden board inside the
 * Planner month view. Creates the project on first tap; everything syncs
 * through the same project record used by the Projects hub.
 */
export function MonthlyPlanningGarden({ month }: { month: Date }) {
  const { project, creating, ensure } = useMonthlyProject(month);

  if (!project) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card p-6 text-center">
        <Moon className="mx-auto h-7 w-7 text-primary" aria-hidden />
        <h3 className="mt-2 font-display text-lg">{format(month, "MMMM yyyy")} · Monthly Planning</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Give this month its own gentle workspace: an intention, a next small step, and Plan · Grow · Care · Let go columns.
        </p>
        <Button className="mt-4 min-h-11" disabled={creating} onClick={() => void ensure()}>
          <Sparkles className="mr-1.5 h-4 w-4" />{creating ? "Creating…" : `Start ${format(month, "MMMM")} planning`}
        </Button>
      </section>
    );
  }

  return <ProjectGardenPage project={project} />;
}
