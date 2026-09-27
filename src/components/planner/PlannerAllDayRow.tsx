import type { PlannerFeedItem } from "@/lib/planner/feed";
import { cn } from "@/lib/utils";
import { CosmicEventHover } from "./CosmicEventHover";
import { useStore } from "@/lib/store";
import { PlannerTaskRow } from "./PlannerTaskRow";
import { useDropZone } from "@/lib/planner/planner-dnd";

/** Compact all-day strip shown above a timeline column. */
export function PlannerAllDayRow({ dateISO, items, onOpen, className }: {
  dateISO: string;
  items: PlannerFeedItem[];
  onOpen?: (item: PlannerFeedItem) => void;
  className?: string;
}) {
  const { state } = useStore();
  const zone = useDropZone({ dateISO }, { id: `all-day:${dateISO}` });
  return (
    <div
      ref={zone.ref}
      {...zone.nativeProps}
      {...zone.dataProps}
      className={cn("flex min-h-[34px] flex-col gap-0.5 px-1 py-1", zone.className, className)}
    >
      {items.slice(0, 3).map(it => {
        if (it.sourceRef.type === "task") {
          const task = state.tasks.find(candidate => candidate.id === it.sourceRef.id);
          if (task) return <PlannerTaskRow key={it.id} task={task} compact allDay />;
        }
        const button = <button
          key={it.id}
          type="button"
          onClick={() => onOpen?.(it)}
          title={it.title}
          aria-label={it.kind === "cosmic" ? `Open cosmic event ${it.title}` : `Open ${it.title}`}
          className="rounded-md px-1.5 py-0.5 text-left text-[10px] leading-tight [overflow-wrap:anywhere]"
          style={{ background: `${it.color}22`, color: it.color }}
        >
          {it.title}
        </button>;
        return it.cosmicEvent ? <CosmicEventHover key={it.id} event={it.cosmicEvent}>{button}</CosmicEventHover> : button;
      })}
      {items.length > 3 && (
        <span className="px-1.5 text-[9px] text-muted-foreground">+{items.length - 3} more</span>
      )}
    </div>
  );
}
