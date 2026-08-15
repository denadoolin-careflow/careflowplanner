import type { PlannerFeedItem } from "@/lib/planner/feed";
import { cn } from "@/lib/utils";

/** Compact all-day strip shown above a timeline column. */
export function PlannerAllDayRow({ items, onOpen, className }: {
  items: PlannerFeedItem[];
  onOpen?: (item: PlannerFeedItem) => void;
  className?: string;
}) {
  if (!items.length) return <div className={cn("min-h-[6px]", className)} />;
  return (
    <div className={cn("flex flex-col gap-0.5 px-1 py-1", className)}>
      {items.slice(0, 3).map(it => (
        <button
          key={it.id}
          type="button"
          onClick={() => onOpen?.(it)}
          title={it.title}
          aria-label={it.kind === "cosmic" ? `Open cosmic event ${it.title}` : `Open ${it.title}`}
          className="truncate rounded-md px-1.5 py-0.5 text-left text-[10px] leading-tight"
          style={{ background: `${it.color}22`, color: it.color }}
        >
          {it.title}
        </button>
      ))}
      {items.length > 3 && (
        <span className="px-1.5 text-[9px] text-muted-foreground">+{items.length - 3} more</span>
      )}
    </div>
  );
}
