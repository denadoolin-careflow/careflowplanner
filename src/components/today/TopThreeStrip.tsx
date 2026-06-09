import { useMemo } from "react";
import { format } from "date-fns";
import { Star, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { pickTopThree } from "@/lib/top-three";

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
      <div className="flex flex-col gap-2">
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3 shrink-0" />
          <span>Top 3 today</span>
          <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] tabular-nums text-primary">
            {doneCount}/{Math.max(top.length, 1)}
          </span>
        </div>
        {top.length === 0 ? (
          <p className="flex-1 text-[11px] text-muted-foreground">
            Star up to 3 tasks below to anchor your day.
          </p>
        ) : (
        <ul className="flex min-w-0 flex-1 flex-wrap items-start gap-1.5">
            {top.map((t, idx) => (
              <li
                key={t.id}
                className={cn(
                  "inline-flex min-w-0 max-w-full items-start gap-1.5 rounded-2xl border border-border/40 bg-card/70 px-2 py-1 transition",
                  "hover:border-primary/30 hover:bg-card",
                  t.done && "opacity-60",
                )}
              >
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">
                  {idx + 1}
                </span>
                <Checkbox
                  checked={t.done}
                  onCheckedChange={() => toggleTask(t.id)}
                  aria-label={`Complete ${t.title}`}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <button
                  type="button"
                  className={cn(
                    "min-w-0 flex-1 whitespace-normal break-words text-left text-xs leading-snug",
                    t.done && "line-through",
                  )}
                  onClick={() => onTaskClick?.(t.id)}
                  title={t.title}
                  style={{ overflowWrap: "anywhere" }}
                >
                  {t.title}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-amber-500"
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
    </div>
  );
}