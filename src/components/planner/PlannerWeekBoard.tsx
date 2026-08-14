import { useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { PlannerCapacityBar } from "./PlannerCapacityBar";
import { UnscheduledTasksRail } from "@/components/calendar/UnscheduledTasksRail";
import { WeekPlanningDashboard } from "@/components/calendar/WeekPlanningDashboard";
import { KIND_ICONS } from "./kindIcon";
import { cn } from "@/lib/utils";


/**
 * Week as a planning board: one column per day with capacity, drag items
 * between days, plus an unscheduled rail and the week review below.
 */
export function PlannerWeekBoard({ weekStart, onSelectDay, onOpenItem }: {
  weekStart: Date;
  onSelectDay?: (d: Date) => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
}) {
  const { updateTask, updateAppointment } = useStore() as any;
  const { byDay } = usePlannerFeed(weekStart, 7);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const cols = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const onDrop = (targetISO: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const raw = e.dataTransfer.getData("application/x-planner-item") || e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [type, id] = raw.split(":");
    if (type === "task") { updateTask(id, { dueDate: targetISO }); toast.success(`Moved to ${format(new Date(`${targetISO}T12:00:00`), "EEE, MMM d")}`); }
    else if (type === "appointment") { updateAppointment(id, { date: targetISO }); toast.success("Appointment moved"); }
    else toast.message("That item can't be moved from here");
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cols.map(d => {
          const key = format(d, "yyyy-MM-dd");
          const items = byDay.get(key) ?? [];
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
              <PlannerCapacityBar date={d} className="mb-1.5" />
              <div className="flex max-h-[420px] flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pr-0.5">
                {items.length === 0 && <p className="px-1 py-2 text-[11px] text-muted-foreground">Nothing planned</p>}
                {items.map(it => {
                  const Icon = KIND_ICONS[it.kind];
                  const isTask = it.sourceRef.type === "task";
                  return (
                    <button
                      key={it.id}
                      type="button"
                      draggable={it.sourceRef.type === "task" || it.sourceRef.type === "appointment"}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/x-planner-item", `${it.sourceRef.type}:${it.sourceRef.id}`);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onOpenItem?.(it)}
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
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <WeekPlanningDashboard weekStart={weekStart} onJumpToDay={onSelectDay} />
        <div className="[&_[data-rail-list]]:grid [&_[data-rail-list]]:gap-2 xl:[&_[data-rail-list]]:grid-cols-3 lg:[&_[data-rail-list]]:grid-cols-2">
          <UnscheduledTasksRail />
        </div>
      </div>
    </div>
  );
}
