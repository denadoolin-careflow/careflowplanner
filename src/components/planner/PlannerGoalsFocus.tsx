/**
 * Goals in focus: a compact read of the active goals with progress, shown in
 * the month overview. The goals page stays the source of truth.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlannerGoalsFocus({ className, limit = 3 }: { className?: string; limit?: number }) {
  const { state } = useStore() as any;
  const goals = ((state.goals ?? []) as Goal[])
    .filter(goal => goal.status === "active")
    .slice(0, limit);

  if (!goals.length) return null;

  return (
    <section className={cn("rounded-xl border border-border/60 bg-card/50 p-3", className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5 text-primary" aria-hidden />
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Goals in focus</p>
        <Button asChild size="sm" variant="ghost" className="ml-auto h-7 rounded-full px-2 text-[11px]">
          <Link to="/goals">All goals <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </div>
      <ul className="space-y-2">
        {goals.map(goal => (
          <li key={goal.id}>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{goal.title}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{Math.round(goal.progress ?? 0)}%</span>
            </div>
            <Progress value={goal.progress ?? 0} className="mt-1 h-1.5" />
          </li>
        ))}
      </ul>
    </section>
  );
}
