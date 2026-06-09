import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ListChecks, UtensilsCrossed, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MealSlotCard } from "@/components/today/MealSlotCard";
import { QuickDayPartButton } from "@/components/tasks/QuickDayPartButton";

/** Condensed single-card planner: meals + all tasks grouped by day part. */
export function DayPlanBoard({ date, onTaskClick }: { date: Date; onTaskClick?: (id: string) => void }) {
  const { state, toggleTask, addTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");

  const tasks = useMemo(
    () => state.tasks.filter(t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked"),
    [state.tasks, iso],
  );
  const groups = useMemo(() => {
    const g: Record<string, typeof tasks> = { Morning: [], Afternoon: [], Evening: [], Anytime: [] };
    for (const t of tasks) {
      const dp = (t.dayPart ?? "").toLowerCase();
      if (dp === "morning") g.Morning.push(t);
      else if (dp === "afternoon") g.Afternoon.push(t);
      else if (dp === "evening") g.Evening.push(t);
      else g.Anytime.push(t);
    }
    return g;
  }, [tasks]);

  const [draft, setDraft] = useState("");

  return (
    <section className="cozy-card overflow-hidden">
      <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-3">
        {(["Breakfast", "Lunch", "Dinner"] as const).map(slot => (
          <div key={slot} className="rounded-2xl border border-border/40 bg-background/60 p-3">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <UtensilsCrossed className="h-3 w-3 text-accent" /> {slot}
            </div>
            <MealSlotCard date={date} slot={slot} />
          </div>
        ))}
      </div>

      <div className="border-t border-border/40 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5 text-primary" /> Today’s tasks
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] tabular-nums text-primary">
              {tasks.length}
            </span>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const title = draft.trim();
              if (!title) return;
              await addTask({ title, dueDate: iso });
              setDraft("");
            }}
            className="flex items-center gap-1 rounded-full border border-dashed border-border/60 bg-background/50 px-2 py-1"
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Quick add…"
              className="w-32 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
            />
          </form>
        </div>
        <div className="space-y-3">
          {(["Morning", "Afternoon", "Evening", "Anytime"] as const).map(part => {
            const list = groups[part];
            if (list.length === 0) return null;
            return (
              <div key={part}>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {part}
                </div>
                <ul className="space-y-1">
                  {list.map(t => (
                    <li key={t.id} className="flex items-center gap-2 rounded-lg bg-background/60 px-2 py-1.5">
                      <Checkbox checked={t.done} onCheckedChange={() => void toggleTask(t.id)} />
                      <button
                        type="button"
                        onClick={() => onTaskClick?.(t.id)}
                        className={cn(
                          "min-w-0 flex-1 whitespace-normal break-words text-left text-sm",
                          t.done && "text-muted-foreground line-through",
                        )}
                      >
                        {t.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <p className="rounded-lg border border-dashed border-border/50 px-2 py-6 text-center text-xs text-muted-foreground">
              Nothing on the plan yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}