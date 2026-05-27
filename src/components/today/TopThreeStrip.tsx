import { useMemo } from "react";
import { format } from "date-fns";
import { Star, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Priority, Task } from "@/lib/types";

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function pickTopThree(tasks: Task[], dateISO: string): Task[] {
  const pool = tasks.filter(
    (t) => t.dueDate === dateISO && !t.parentTaskId && t.status !== "parked",
  );
  return [...pool]
    .sort((a, b) => {
      if (!!b.isTopThree !== !!a.isTopThree) return b.isTopThree ? 1 : -1;
      if (a.done !== b.done) return a.done ? 1 : -1;
      const r = RANK[a.priority ?? "medium"] - RANK[b.priority ?? "medium"];
      if (r !== 0) return r;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    })
    .slice(0, 3);
}

/** Slim Top-3 strip rendered inside the day's schedule / time-of-day / agenda card. */
export function TopThreeStrip({
  date,
  onTaskClick,
}: {
  date: Date;
  onTaskClick?: (id: string) => void;
}) {
  const { state, toggleTask, updateTask } = useStore();
  const dateISO = format(date, "yyyy-MM-dd");
  const top = useMemo(() => pickTopThree(state.tasks, dateISO), [state.tasks, dateISO]);
  const doneCount = top.filter((t) => t.done).length;

  return (
    <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          Top 3 today
        </div>
        <span className="text-[10px] text-muted-foreground">
          {doneCount}/{Math.max(top.length, 1)} done
        </span>
      </div>
      {top.length === 0 ? (
        <p className="px-1 py-1 text-[11px] text-muted-foreground">
          Star up to 3 tasks below to anchor your day.
        </p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-3">
          {top.map((t, idx) => (
            <li
              key={t.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border/40 bg-card/70 px-2 py-1.5 transition",
                "hover:border-primary/30 hover:bg-card",
                t.done && "opacity-60",
              )}
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">
                {idx + 1}
              </span>
              <Checkbox
                checked={t.done}
                onCheckedChange={() => toggleTask(t.id)}
                aria-label={`Complete ${t.title}`}
              />
              <button
                type="button"
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-xs",
                  t.done && "line-through",
                )}
                onClick={() => onTaskClick?.(t.id)}
                title={t.title}
              >
                {t.title}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-amber-500"
                onClick={() => updateTask(t.id, { isTopThree: !t.isTopThree })}
                title={t.isTopThree ? "Unpin priority" : "Pin as priority"}
              >
                <Star className={cn("h-3 w-3", t.isTopThree && "fill-amber-400 text-amber-500")} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}