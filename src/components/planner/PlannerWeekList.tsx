import { addDays, format, isSameDay } from "date-fns";
import { Check, ChevronDown, ChevronRight, Maximize2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { type PlannerFeedItem } from "@/lib/planner/feed";
import { useRangeRows } from "@/lib/planner/use-range-rows";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { useScheduleDrop } from "@/lib/planner/use-schedule-drop";
import { useDraggableCard, useDropZone, feedDragItem } from "@/lib/planner/planner-dnd";
import { KIND_ICONS } from "./kindIcon";
import { Checkbox } from "@/components/ui/checkbox";
import { PlannerBulkBar } from "./PlannerBulkBar";
import { usePlannerSelection } from "@/lib/planner/selection";
import { OutlineBreadcrumb } from "./OutlineBreadcrumb";
import { cn } from "@/lib/utils";

type Outline = ReturnType<typeof useRangeRows>["outline"];

/** One row in the list — draggable through the shared planner drag layer. */
function ListRow({ item, onOpen, onToggle, outline, selected, onSelect }: {
  item: PlannerFeedItem;
  onOpen: (it: PlannerFeedItem) => void;
  onToggle: (it: PlannerFeedItem) => void;
  outline: Outline;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = KIND_ICONS[item.kind];
  const isTask = item.sourceRef.type === "task";
  const drag = useDraggableCard(feedDragItem(item), { idPrefix: "weeklist" });
  return (
    <li>
      <div
        ref={drag.ref}
        {...drag.props}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(item)}
        onKeyDown={e => { if (e.key === "Enter") onOpen(item); }}
        className={cn(
          "group/row flex w-full cursor-pointer items-start gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted/50",
          item.done && "opacity-50",
          drag.className,
        )}
      >
        {isTask && (
          <span className="mt-0.5 shrink-0" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <Checkbox
              aria-label={`Select ${item.title}`}
              checked={selected}
              onCheckedChange={() => onSelect(item.sourceRef.id)}
            />
          </span>
        )}
        {isTask ? (
          <span
            role="checkbox"
            aria-checked={!!item.done}
            tabIndex={0}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggle(item); }}
            onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onToggle(item); } }}
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
              item.done ? "border-transparent" : "border-muted-foreground/40 hover:border-muted-foreground/70",
            )}
            style={{ backgroundColor: item.done ? item.color : undefined }}
          >
            {item.done && <Check className="h-3 w-3 text-white" />}
          </span>
        ) : (
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${item.color}1f`, color: item.color }}>
            <Icon className="h-2.5 w-2.5" />
          </span>
        )}
        <span className="w-14 shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          {item.allDay ? "All day" : (item.time?.slice(0, 5) ?? "—")}
        </span>
        <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere] whitespace-normal break-words", item.done && "line-through")}>{item.title}</span>
        {isTask && outline.hasChildren(item.sourceRef.id) && (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); outline.toggleCollapsed(item.sourceRef.id); }}
            aria-label={outline.isCollapsed(item.sourceRef.id) ? `Expand subtasks of ${item.title}` : `Collapse subtasks of ${item.title}`}
            aria-expanded={!outline.isCollapsed(item.sourceRef.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {outline.isCollapsed(item.sourceRef.id) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
        {isTask && (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); outline.zoomTo(item.sourceRef.id); }}
            aria-label={`Zoom into ${item.title}`}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </li>
  );
}

/** One day group — a drop target for the shared drag layer. */
function ListDay({ date, items, isToday, onSelectDay, ...rowProps }: {
  date: Date;
  items: PlannerFeedItem[];
  isToday: boolean;
  onSelectDay?: (d: Date) => void;
  onOpen: (it: PlannerFeedItem) => void;
  onToggle: (it: PlannerFeedItem) => void;
  outline: Outline;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  const key = format(date, "yyyy-MM-dd");
  const zone = useDropZone({ dateISO: key }, { id: `weeklist:${key}` });
  return (
    <section
      ref={zone.ref as any}
      {...zone.nativeProps}
      {...zone.dataProps}
      aria-label={format(date, "EEEE, MMMM d")}
      className={zone.className}
    >
      <button
        type="button"
        onClick={() => onSelectDay?.(date)}
        className="sticky top-0 z-10 flex w-full items-baseline gap-2 border-b border-border/40 bg-card/90 px-3 py-1.5 text-left backdrop-blur"
      >
        <span className={cn("font-display text-sm font-semibold", isToday && "text-primary")}>{format(date, "EEEE")}</span>
        <span className="text-[11px] text-muted-foreground">{format(date, "MMM d")}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </button>
      {items.length === 0 ? (
        <p className="px-4 py-3 text-[12px] text-muted-foreground/70">Nothing planned — drop something here.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {items.map(it => (
            <ListRow
              key={it.id}
              item={it}
              onOpen={rowProps.onOpen}
              onToggle={rowProps.onToggle}
              outline={rowProps.outline}
              selected={rowProps.selectedIds.has(it.sourceRef.id)}
              onSelect={rowProps.onSelect}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Week as one flat, time-ordered list grouped by day. */
export function PlannerWeekList({ weekStart, days = 7, onSelectDay, onOpenItem }: {
  weekStart: Date;
  days?: number;
  onSelectDay?: (d: Date) => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
}) {
  const { state } = useStore() as any;
  const { byDay, toggleDone, outline } = useRangeRows(weekStart, days);
  const { scheduleMany } = useScheduleDrop();
  const { selected, ids: selectedIds, toggle: toggleSel, clear } = usePlannerSelection();
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = onOpenItem ?? openItem;
  const cols = Array.from({ length: days }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <OutlineBreadcrumb tasks={state.tasks ?? []} />
      <div className="divide-y divide-border/50">
        {cols.map(d => (
          <ListDay
            key={format(d, "yyyy-MM-dd")}
            date={d}
            items={byDay.get(format(d, "yyyy-MM-dd")) ?? []}
            isToday={isSameDay(d, today)}
            onSelectDay={onSelectDay}
            onOpen={handleOpen}
            onToggle={toggleDone}
            outline={outline}
            selectedIds={selected}
            onSelect={toggleSel}
          />
        ))}
      </div>
      <PlannerBulkBar
        ids={selectedIds}
        anchorDate={weekStart}
        onClear={clear}
        onScheduleMany={scheduleMany}
      />
      {dialogs}
    </div>
  );
}
