import { useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Check, ChevronDown, ChevronRight, Maximize2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { type PlannerFeedItem } from "@/lib/planner/feed";
import { useRangeRows } from "@/lib/planner/use-range-rows";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { ScheduleConflictDialog } from "./ScheduleConflictDialog";
import { useScheduleDrop, readDraggedItem, PLANNER_ITEM_MIME } from "@/lib/planner/use-schedule-drop";
import { KIND_ICONS } from "./kindIcon";
import { Checkbox } from "@/components/ui/checkbox";
import { PlannerBulkBar } from "./PlannerBulkBar";
import { usePlannerSelection } from "@/lib/planner/selection";
import { OutlineBreadcrumb } from "./OutlineBreadcrumb";
import { cn } from "@/lib/utils";

/** Week as one flat, time-ordered list grouped by day. */
export function PlannerWeekList({ weekStart, days = 7, onSelectDay, onOpenItem }: {
  weekStart: Date;
  days?: number;
  onSelectDay?: (d: Date) => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
}) {
  const { state } = useStore() as any;
  const { byDay, toggleDone, outline } = useRangeRows(weekStart, days);
  const { schedule, scheduleMany, pending, setPending, resolve } = useScheduleDrop();
  const { selected, ids: selectedIds, toggle: toggleSel, clear } = usePlannerSelection();
  const [dropDay, setDropDay] = useState<string | null>(null);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = onOpenItem ?? openItem;
  const cols = Array.from({ length: days }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <OutlineBreadcrumb tasks={state.tasks ?? []} />
      <div className="divide-y divide-border/50">
        {cols.map(d => {
          const key = format(d, "yyyy-MM-dd");
          const items = byDay.get(key) ?? [];
          const isToday = isSameDay(d, today);
          return (
            <section
              key={key}
              aria-label={format(d, "EEEE, MMMM d")}
              onDragOver={e => { if (Array.from(e.dataTransfer.types).includes(PLANNER_ITEM_MIME)) { e.preventDefault(); setDropDay(key); } }}
              onDragLeave={() => setDropDay(cur => (cur === key ? null : cur))}
              onDrop={e => {
                e.preventDefault();
                setDropDay(null);
                const dragged = readDraggedItem(e);
                if (dragged) schedule(dragged, key);
              }}
              className={cn(dropDay === key && "bg-primary/5 outline outline-1 outline-primary/40")}
            >
              <button
                type="button"
                onClick={() => onSelectDay?.(d)}
                className="sticky top-0 z-10 flex w-full items-baseline gap-2 border-b border-border/40 bg-card/90 px-3 py-1.5 text-left backdrop-blur"
              >
                <span className={cn("font-display text-sm font-semibold", isToday && "text-primary")}>
                  {format(d, "EEEE")}
                </span>
                <span className="text-[11px] text-muted-foreground">{format(d, "MMM d")}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</span>
              </button>
              {items.length === 0 ? (
                <p className="px-4 py-2 text-[12px] text-muted-foreground/70">Nothing planned</p>
              ) : (
                <ul className="divide-y divide-border/30">
                  {items.map(it => {
                    const Icon = KIND_ICONS[it.kind];
                    const isTask = it.sourceRef.type === "task";
                    return (
                      <li key={it.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          draggable={it.sourceRef.type === "task" || it.sourceRef.type === "appointment"}
                          onDragStart={e => {
                            e.dataTransfer.setData(PLANNER_ITEM_MIME, `${it.sourceRef.type}:${it.sourceRef.id}`);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => handleOpen(it)}
                          onKeyDown={e => { if (e.key === "Enter") handleOpen(it); }}
                          className={cn(
                            "group/row flex w-full cursor-pointer items-start gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted/50",
                            it.done && "opacity-50 line-through",
                          )}
                        >
                          {isTask && (
                            <span className="mt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                              <Checkbox
                                aria-label={`Select ${it.title}`}
                                checked={selected.has(it.sourceRef.id)}
                                onCheckedChange={() => toggleSel(it.sourceRef.id)}
                              />
                            </span>
                          )}
                          {isTask ? (
                            <span
                              role="checkbox"
                              aria-checked={!!it.done}
                              tabIndex={0}
                              onClick={e => { e.stopPropagation(); toggleDone(it); }}
                              onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); toggleDone(it); } }}
                              className={cn(
                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                                it.done ? "border-transparent" : "border-muted-foreground/40 hover:border-muted-foreground/70",
                              )}
                              style={{ backgroundColor: it.done ? it.color : undefined }}
                            >
                              {it.done && <Check className="h-3 w-3 text-white" />}
                            </span>
                          ) : (
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${it.color}1f`, color: it.color }}>
                              <Icon className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span className="w-14 shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {it.allDay ? "All day" : (it.time?.slice(0, 5) ?? "—")}
                          </span>
                          <span className="min-w-0 flex-1 [overflow-wrap:anywhere] whitespace-normal break-words">{it.title}</span>
                          {isTask && outline.hasChildren(it.sourceRef.id) && (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); outline.toggleCollapsed(it.sourceRef.id); }}
                              aria-label={outline.isCollapsed(it.sourceRef.id) ? `Expand subtasks of ${it.title}` : `Collapse subtasks of ${it.title}`}
                              aria-expanded={!outline.isCollapsed(it.sourceRef.id)}
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {outline.isCollapsed(it.sourceRef.id) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {isTask && (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); outline.zoomTo(it.sourceRef.id); }}
                              aria-label={`Zoom into ${it.title}`}
                              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
                            >
                              <Maximize2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <PlannerBulkBar
        ids={selectedIds}
        anchorDate={weekStart}
        onClear={clear}
        onScheduleMany={scheduleMany}
      />
      <ScheduleConflictDialog pending={pending} onCancel={() => setPending(null)} onResolve={resolve} />
      {dialogs}
    </div>
  );
}
