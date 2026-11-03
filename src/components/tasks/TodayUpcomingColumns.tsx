import { useMemo, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PHASE_ORDER, phaseOfTodayTask } from "@/lib/today-phase-items";
import { PHASE_ICONS } from "@/lib/rhythm-phase-icons";
import { PlannerTaskRow } from "@/components/planner/PlannerTaskRow";
import type { Task } from "@/lib/types";

const PN = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" } as const;

/** Today & Upcoming · Two columns: "from earlier" note, Today by phase beside the next 7 days (tabs on phones). */
export function TodayUpcomingColumns() {
  const { state, toggleTask } = useStore();
  const [tab, setTab] = useState<"today" | "upcoming">("today");
  const today = format(new Date(), "yyyy-MM-dd");
  const horizon = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const roots = (state.tasks ?? []).filter((t: Task) => !t.parentTaskId);
  const overdue = roots.filter(t => !t.done && t.dueDate && t.dueDate < today);
  const todays = roots.filter(t => t.dueDate === today);
  const upcoming = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of roots) if (!t.done && t.dueDate && t.dueDate > today && t.dueDate <= horizon) m.set(t.dueDate, [...(m.get(t.dueDate) ?? []), t]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [roots, today, horizon]);

  const todayCol = (
    <div className="planner-card space-y-3 bg-card p-4">
      <h4 className="font-display text-lg">Today</h4>
      {todays.length === 0 && <p className="text-sm text-muted-foreground">Nothing planned for today.</p>}
      {PHASE_ORDER.map(p => {
        const list = todays.filter(t => phaseOfTodayTask(t) === p);
        if (!list.length) return null;
        const Icon = PHASE_ICONS[p];
        return (
          <section key={p} className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: `hsl(var(--rhythm-${p}-tint))`, color: `hsl(var(--rhythm-${p}-deep))` }}>
              <Icon className="h-3.5 w-3.5" /> {PN[p]}
            </span>
            {list.map(t => <PlannerTaskRow key={t.id} task={t} />)}
          </section>
        );
      })}
    </div>
  );
  const upcomingCol = (
    <div className="planner-card space-y-3 bg-card p-4">
      <h4 className="font-display text-lg">Upcoming</h4>
      {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing in the next week.</p>}
      {upcoming.map(([d, list]) => (
        <section key={d} className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{format(parseISO(d), "EEE, MMM d")}</div>
          {list.map(t => <PlannerTaskRow key={t.id} task={t} />)}
        </section>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {overdue.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "hsl(var(--rhythm-letgo-tint))", color: "hsl(var(--rhythm-letgo-deep))" }}>
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="min-w-0 flex-1 text-sm">{overdue.length} from earlier: {overdue[0].title}{overdue.length > 1 ? ` and ${overdue.length - 1} more` : ""}</p>
          <button type="button" onClick={() => void toggleTask(overdue[0].id)} className="min-h-[44px] shrink-0 rounded-full bg-card px-4 text-sm text-foreground">Done</button>
        </div>
      )}
      <div role="tablist" aria-label="Today or upcoming" className="flex gap-2 md:hidden">
        {(["today", "upcoming"] as const).map(k => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)}
            className={cn("min-h-[44px] rounded-full px-4 text-sm", tab === k ? "bg-primary text-primary-foreground" : "bg-card")}>
            {k === "today" ? "Today" : "Upcoming"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className={cn(tab !== "today" && "hidden md:block")}>{todayCol}</div>
        <div className={cn(tab !== "upcoming" && "hidden md:block")}>{upcomingCol}</div>
      </div>
    </div>
  );
}
