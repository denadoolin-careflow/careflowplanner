import { useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { PlannerCapacityBar } from "./PlannerCapacityBar";
import { PlannerDaySummaryStrip } from "./PlannerDaySummaryStrip";
import { WeekPlanningDashboard } from "@/components/calendar/WeekPlanningDashboard";
import { KIND_ICONS } from "./kindIcon";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { ScheduleConflictDialog } from "./ScheduleConflictDialog";
import { useWeekFilters, filterFeedItems } from "@/lib/planner/week-filters";
import { useScheduleDrop, readDraggedItem, PLANNER_ITEM_MIME, type DayPartKey } from "@/lib/planner/use-schedule-drop";
import { cn } from "@/lib/utils";

const PARTS = [
  { part: "morning" as const, label: "Morning", startH: 5, endH: 12 },
  { part: "afternoon" as const, label: "Afternoon", startH: 12, endH: 17 },
  { part: "evening" as const, label: "Evening", startH: 17, endH: 24 },
];

function itemPart(it: PlannerFeedItem): "morning" | "afternoon" | "evening" | "unscheduled" {
  if (it.allDay || !it.time) return "unscheduled";
  const h = Number(it.time.split(":")[0]);
  if (!Number.isFinite(h)) return "unscheduled";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}


/**
 * Week as a planning board: one column per day with capacity, drag items
 * between days, plus an unscheduled rail and the week review below.
 */
export function PlannerWeekBoard({ weekStart, onSelectDay, onOpenItem, showDashboard = true }: {
  weekStart: Date;
  onSelectDay?: (d: Date) => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
  /** The weekly plan dashboard now lives on the Overview tab. */
  showDashboard?: boolean;
}) {
  const { updateTask } = useStore() as any;
  const { byDay } = usePlannerFeed(weekStart, 7);
  const { filters } = useWeekFilters();
  const { schedule, pending, setPending, resolve } = useScheduleDrop();
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = onOpenItem ?? openItem;
  const [dragOver, setDragOver] = useState<string | null>(null);
  const cols = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const onDrop = (targetISO: string, e: React.DragEvent, part?: DayPartKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const dragged = readDraggedItem(e);
    if (!dragged) return;
    schedule(dragged, targetISO, part);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cols.map(d => {
          const key = format(d, "yyyy-MM-dd");
          const items = filterFeedItems(byDay.get(key) ?? [], filters);
          const isToday = isSameDay(d, today);
          return (
            <div
              key={key}
              onDragOver={(e) => { e.preventDefault(); setDragOver(key); }}
              onDragLeave={() => setDragOver(cur => (cur === key ? null : cur))}
              onDrop={(e) => onDrop(key, e)}
              className={cn(
                "flex min-h-[260px] flex-col rounded-2xl border border-border/60 bg-card/40 p-2 transition-colors",
                dragOver === key && "border-primary/60 bg-primary/5",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay?.(d)}
                className="mb-1.5 flex items-baseline justify-between gap-2 text-left"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</span>
                <span className={cn("font-display text-sm font-semibold", isToday && "text-primary")}>{format(d, "MMM d")}</span>
              </button>
              <PlannerDaySummaryStrip date={d} items={items} className="mb-1.5" />
              <div className="flex max-h-[520px] flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5">
                {(() => {
                  const groups = { morning: [] as PlannerFeedItem[], afternoon: [] as PlannerFeedItem[], evening: [] as PlannerFeedItem[], unscheduled: [] as PlannerFeedItem[] };
                  for (const it of items) groups[itemPart(it)].push(it);
                  const renderItem = (it: PlannerFeedItem) => {
                  const Icon = KIND_ICONS[it.kind];
                  const isTask = it.sourceRef.type === "task";
                  return (
                    <button
                      key={it.id}
                      type="button"
                      draggable={it.sourceRef.type === "task" || it.sourceRef.type === "appointment"}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(PLANNER_ITEM_MIME, `${it.sourceRef.type}:${it.sourceRef.id}`);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => handleOpen(it)}
                      className={cn(
                        "group flex items-start gap-2 rounded-xl border border-border/50 bg-card/60 px-2 py-2 text-left text-[11px] leading-snug shadow-sm transition-all hover:bg-muted/50 hover:shadow-md",
                        it.done && "opacity-50 line-through",
                      )}
                      style={{ borderLeft: `3px solid ${it.color}` }}
                    >
                      {isTask && (
                        <span
                          role="checkbox"
                          aria-checked={!!it.done}
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); updateTask(it.sourceRef.id, { done: !it.done }); }}
                          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); updateTask(it.sourceRef.id, { done: !it.done }); } }}
                          className={cn(
                            "mt-0.5 flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border transition-colors",
                            it.done ? "border-transparent" : "border-muted-foreground/40 hover:border-muted-foreground/70",
                          )}
                          style={{ backgroundColor: it.done ? it.color : undefined }}
                        >
                          {it.done && <Check className="h-2.5 w-2.5 text-white" />}
                        </span>
                      )}
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${it.color}1f`, color: it.color }}
                      >
                        <Icon className="h-2.5 w-2.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block break-words">{it.title}</span>
                        {it.time && <span className="text-[10px] text-muted-foreground">{it.time}</span>}
                      </div>
                    </button>
                  );
                  };
                  return (
                    <>
                      {groups.unscheduled.length > 0 && (
                        <section aria-label={`Anytime on ${format(d, "EEEE")}`} className="space-y-1">
                          <span className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Anytime</span>
                          {groups.unscheduled.map(renderItem)}
                        </section>
                      )}
                      {PARTS.map(p => (
                        <section
                          key={p.part}
                          aria-label={`${p.label} on ${format(d, "EEEE")}`}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(`${key}:${p.part}`); }}
                          onDrop={(e) => onDrop(key, e, p.part)}
                          className={cn("space-y-1 rounded-lg", dragOver === `${key}:${p.part}` && "bg-primary/5 outline outline-1 outline-primary/40")}
                        >
                          <div className="flex items-center justify-between gap-2 px-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{p.label}</span>
                          </div>
                          <PlannerCapacityBar date={d} part={p.part} compact />
                          {groups[p.part].length === 0
                            ? <p className="px-1 py-1 text-[10.5px] text-muted-foreground/70">Open</p>
                            : groups[p.part].map(renderItem)}
                        </section>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      <ScheduleConflictDialog pending={pending} onCancel={() => setPending(null)} onResolve={resolve} />
      {showDashboard && (
        <div className="[&>*]:w-full">
          <WeekPlanningDashboard weekStart={weekStart} onJumpToDay={onSelectDay} />
        </div>
      )}
      {dialogs}
    </div>
  );
}
