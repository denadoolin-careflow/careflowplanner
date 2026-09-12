import { CalendarClock, CheckSquare2, Heart, UtensilsCrossed } from "lucide-react";
import type { PlannerFeedItem } from "@/lib/planner/feed";
import { dayLoad, loadLevel } from "@/lib/planner/month-move";
import { cn } from "@/lib/utils";

export function CapacityIndicator({ minutes, compact = false }: { minutes: number; compact?: boolean }) {
  const level = loadLevel(minutes);
  return (
    <div className={cn("inline-flex items-center gap-1.5", compact && "gap-1")} aria-label={`${level.label} day capacity`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map(step => <span key={step} className={cn("rounded-full", compact ? "h-1 w-1" : "h-1.5 w-1.5", step <= level.steps ? "bg-primary" : "bg-muted")} />)}
      </span>
      {!compact && <span className="text-[10px] text-muted-foreground">{level.label}</span>}
    </div>
  );
}

export function PlannerMonthSummary({ items, weekLoads }: { items: PlannerFeedItem[]; weekLoads: number[] }) {
  const stats = [
    { label: "Events", value: items.filter(i => i.kind === "appt" || i.kind === "gcal").length, Icon: CalendarClock, tone: "text-calendar-event" },
    { label: "Tasks", value: items.filter(i => i.kind === "task").length, Icon: CheckSquare2, tone: "text-calendar-task" },
    { label: "Meals", value: items.filter(i => i.kind === "meal").length, Icon: UtensilsCrossed, tone: "text-calendar-meal" },
    { label: "Care", value: items.filter(i => i.kind === "care" || i.area === "Caregiving" || i.area === "Family" || i.area === "Kids").length, Icon: Heart, tone: "text-calendar-care" },
  ];
  const totalMinutes = dayLoad(items);
  const monthLevel = loadLevel(Math.round(totalMinutes / Math.max(1, new Set(items.map(i => i.date)).size)));
  return (
    <section aria-label="Month summary" className="planner-month-summary">
      <div className="planner-month-summary__stats">
        {stats.map(({ label, value, Icon, tone }) => (
          <div key={label} className="planner-month-stat">
            <Icon className={cn("h-4 w-4", tone)} aria-hidden />
            <span className="text-lg font-semibold tabular-nums">{value}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <div className="planner-month-rhythm">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Monthly rhythm</p><p className="text-xs text-foreground">{monthLevel.label} overall</p></div>
          <CapacityIndicator minutes={Math.round(totalMinutes / Math.max(1, new Set(items.map(i => i.date)).size))} />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2" aria-label="Load across the month’s weeks">
          {weekLoads.slice(0, 5).map((load, index) => {
            const level = loadLevel(load);
            return <div key={index} className="space-y-1"><div className="flex h-8 items-end rounded bg-muted/50 p-1"><span className="w-full rounded-sm bg-primary/70" style={{ height: `${Math.max(12, level.steps * 18)}%` }} /></div><p className="text-center text-[9px] text-muted-foreground">W{index + 1}</p></div>;
          })}
        </div>
      </div>
    </section>
  );
}
