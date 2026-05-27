import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Priority, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";

const ORDER: Priority[] = ["low", "medium", "high"];

const FLAG_TONE: Record<Priority, string> = {
  low: "text-muted-foreground/60",
  medium: "text-amber-500",
  high: "text-destructive",
};

const CHIP_TONE: Record<Priority, string> = {
  low: "border-border/60 bg-muted/40 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:border-amber-500 hover:text-amber-700 dark:text-amber-300",
  high: "border-destructive/50 bg-destructive/10 text-destructive hover:border-destructive hover:text-destructive",
};

/**
 * Hover/long-press affordance to quickly mark a task's priority without
 * opening the full editor. Renders a single Flag button; the popover shows
 * low / medium / high chips that update the task immediately.
 */
export function PriorityHoverButton({
  task,
  className,
}: {
  task: Task;
  className?: string;
}) {
  const { updateTask } = useStore();
  const current = task.priority;

  const pick = (p: Priority) => {
    haptics.snap?.();
    void updateTask(task.id, { priority: p });
  };

  return (
    <HoverCard openDelay={120} closeDelay={120}>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0",
            // Always visible when priority is high so the badge stays glanceable.
            current === "high"
              ? "opacity-100"
              : "opacity-60 hover:opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100",
            className,
          )}
          aria-label={`Set priority (currently ${current})`}
          title="Set priority"
          onClick={() => {
            // Cycle on click for keyboard / touch users without hover.
            const idx = ORDER.indexOf(current);
            pick(ORDER[(idx + 1) % ORDER.length]);
          }}
        >
          <Flag className={cn("h-3.5 w-3.5", FLAG_TONE[current])} />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        sideOffset={6}
        className="w-auto rounded-xl border-border/60 bg-popover/95 p-2 shadow-xl backdrop-blur"
      >
        <div className="flex items-center gap-1">
          <span className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Priority
          </span>
          {ORDER.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => pick(p)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] capitalize transition-all",
                current === p
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : CHIP_TONE[p],
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}