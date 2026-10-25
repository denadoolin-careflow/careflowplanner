import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useMonthlyProject } from "@/lib/projects/monthly-planning";
import { validNextStep } from "@/lib/projects/garden-phases";

/** Shows this month's Monthly Planning next small step on Today. */
export function MonthlyNextStepCard() {
  const { state, updateTask } = useStore();
  const { project } = useMonthlyProject(new Date());
  console.log("[MonthlyNextStepCard]", JSON.stringify({ project: project?.id, details: project?.details, tasks: state.tasks.length }));
  if (!project) return null;
  const sections = (state.projectSections ?? []).filter((s: any) => s.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id && !t.parentTaskId);
  const nextId = validNextStep(project.details?.nextStepTaskId, tasks, sections);
  const task = nextId ? tasks.find(t => t.id === nextId) : undefined;
  if (!task) return null;

  return (
    <section aria-label="This month's next small step" className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Moon className="h-3.5 w-3.5" aria-hidden />{format(new Date(), "MMMM")} planning · next small step
      </p>
      <p className="mt-1.5 font-display text-lg leading-snug">{task.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={task.isTopThree ? "outline" : "default"} className="h-10 gap-1.5"
          onClick={() => {
            if (task.isTopThree) { toast("Already on Today"); return; }
            void updateTask(task.id, { isTopThree: true });
            toast.success("Added to Today");
          }}>
          <Sun className="h-4 w-4" />{task.isTopThree ? "On Today" : "Add to Today"}
        </Button>
        <Button asChild size="sm" variant="ghost" className="h-10">
          <Link to={`/projects/${project.id}`}>Open {format(new Date(), "MMMM")} plan</Link>
        </Button>
      </div>
    </section>
  );
}
