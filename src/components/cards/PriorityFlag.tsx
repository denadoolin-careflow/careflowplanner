import { Flag, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

/**
 * Compact, consistent priority indicator used on task lists across
 * Today and Week views. Returns null for "low" (default) tasks unless
 * `showLow` is set, to avoid cluttering ordinary tasks.
 */
export function PriorityFlag({
  task,
  className,
  showLow = false,
}: {
  task: Pick<Task, "priority" | "isTopThree">;
  className?: string;
  showLow?: boolean;
}) {
  if (task.isTopThree) {
    return (
      <Star
        className={cn("h-3.5 w-3.5 shrink-0 fill-priority-high text-priority-high", className)}
        aria-label="Top 3 priority"
      />
    );
  }
  if (task.priority === "high") {
    return (
      <Flag
        className={cn("h-3.5 w-3.5 shrink-0 fill-priority-high/80 text-priority-high", className)}
        aria-label="High priority"
      />
    );
  }
  if (task.priority === "medium") {
    return (
      <Flag
        className={cn("h-3.5 w-3.5 shrink-0 fill-priority-med/70 text-priority-med", className)}
        aria-label="Medium priority"
      />
    );
  }
  if (showLow) {
    return (
      <Flag
        className={cn("h-3.5 w-3.5 shrink-0 text-priority-low/70", className)}
        aria-label="Low priority"
      />
    );
  }
  return null;
}

export const PRIORITY_RANK: Record<Task["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortTasksByPriority<T extends Pick<Task, "priority" | "isTopThree">>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (!!b.isTopThree !== !!a.isTopThree) return b.isTopThree ? 1 : -1;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}