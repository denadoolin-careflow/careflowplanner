import { CalendarClock, CheckCircle2, Circle, Sparkles, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import type { DayPlan } from "@/lib/planner/day-plan";
import { fmt12, taskTime } from "@/lib/planner/day-plan";

export function YearDaySummary({ plan }: { plan: DayPlan }) {
  const empty = !plan.cosmic.length && !plan.events.length && !plan.tasks.length && !plan.meals.length;
  return (
    <div className="space-y-2 text-xs">
      <div>
        <p className="font-display text-sm font-semibold">{format(parseISO(plan.iso), "EEEE, MMMM d")}</p>
        <p className="text-[10px] text-muted-foreground">{empty ? "Nothing planned yet" : `${plan.tasks.length} tasks · ${plan.events.length} events · ${plan.meals.length} meals`}</p>
      </div>
      {plan.cosmic.map(item => <div key={item.id} className="flex gap-1.5 text-muted-foreground"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /><span>{item.label}</span></div>)}
      {plan.events.map(event => <div key={event.id} className="flex gap-1.5"><CalendarClock className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" /><span className="min-w-0"><span className="font-medium">{event.title}</span>{event.time ? <span className="text-muted-foreground"> · {fmt12(event.time)}</span> : null}</span></div>)}
      {plan.tasks.slice(0, 6).map(task => <div key={task.id} className="flex gap-1.5">{task.done ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />}<span className="min-w-0 flex-1">{task.title}</span>{taskTime(task) ? <span className="shrink-0 text-[10px] text-muted-foreground">{fmt12(taskTime(task))}</span> : null}</div>)}
      {plan.tasks.length > 6 && <p className="text-[10px] text-muted-foreground">+{plan.tasks.length - 6} more tasks</p>}
      {plan.meals.map(meal => <div key={meal.id} className="flex gap-1.5 text-muted-foreground"><UtensilsCrossed className="mt-0.5 h-3 w-3 shrink-0 text-yellow-600" /><span><span className="font-medium text-foreground">{meal.slot}:</span> {meal.name}</span></div>)}
      <Link to={`/planner/${plan.iso}`} className="inline-flex pt-1 text-[11px] font-medium text-primary hover:underline">Open this day →</Link>
    </div>
  );
}