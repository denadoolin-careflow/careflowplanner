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

/** Compact Top 3 tasks panel pinned directly above the day-parts / schedule / agenda. */
export function TopThreeToday({
  date,
  onTaskClick,
}: {
  date: Date;
  onTaskClick?: (id: string) => void;
}) {
  const { state, toggleTask, updateTask } = useStore();
  const dateISO = format(date, "yyyy-MM-dd");
  const top = useMemo(() => pickTopThree(state.tasks, dateISO), [state.tasks, dateISO]);

  return (
    <div className="cozy-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-sm font-semibold">Top 3 today</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {top.filter((t) => t.done).length}/{Math.max(top.length, 1)} done
        </span>
      </div>
      <div className="space-y-1.5 p-2 sm:p-3">
        {top.length === 0 && (
          <p className="rounded-lg border border-dashed border-border/60 bg-card/40 p-3 text-xs text-muted-foreground">
            No tasks for today yet. Star up to 3 to focus your day.
          </p>
        )}
        {top.map((t, idx) => (
          <div
            key={t.id}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/50 px-2.5 py-2 transition",
              "hover:border-primary/30 hover:bg-card/80",
              t.done && "opacity-60",
            )}
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {idx + 1}
            </span>
            <Checkbox
              checked={t.done}
              onCheckedChange={() => toggleTask(t.id)}
              aria-label={`Complete ${t.title}`}
            />
            <button
              type="button"
              className={cn("min-w-0 flex-1 truncate text-left text-sm", t.done && "line-through")}
              onClick={() => onTaskClick?.(t.id)}
            >
              {t.title}
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-amber-500"
              onClick={() => updateTask(t.id, { isTopThree: !t.isTopThree })}
              title={t.isTopThree ? "Unpin priority" : "Pin as priority"}
            >
              <Star className={cn("h-3.5 w-3.5", t.isTopThree && "fill-amber-400 text-amber-500")} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}