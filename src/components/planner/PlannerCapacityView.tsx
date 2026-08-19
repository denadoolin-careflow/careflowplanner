import { useMemo, useState } from "react";
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";
import { Gauge, ChevronDown, Target as TargetIcon, ArrowRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import {
  fmtHours, useAllocationComparison, useRhythmSeries, GROUP_LABEL, type GroupBy,
} from "@/lib/planner/time-allocation";
import { targetMinutesForWindow, useAreaTargets } from "@/lib/planner/area-targets";
import { resolveActivity, readZoneTag } from "@/lib/task-tracking";
import { useActualGroups } from "@/lib/planner/actuals";

type Range = "day" | "week" | "month";

const GROUPS: GroupBy[] = ["area", "activity", "person", "zone", "kind"];

const rangeWindow = (date: Date, range: Range): { from: Date; days: number; label: string } => {
  if (range === "day") return { from: date, days: 1, label: format(date, "EEE, MMM d") };
  if (range === "week") {
    const from = startOfWeek(date, { weekStartsOn: 1 });
    return { from, days: 7, label: `Week of ${format(from, "MMM d")}` };
  }
  const from = startOfMonth(date);
  const days = endOfMonth(date).getDate();
  return { from, days, label: format(date, "MMMM yyyy") };
};

/**
 * Capacity planning: how much time each area / activity / person / zone takes,
 * measured against weekly targets so the schedule can be adjusted on purpose.
 */
export function PlannerCapacityView({ date, className, onSelectDate }: {
  date: Date;
  className?: string;
  onSelectDate?: (d: Date) => void;
}) {
  const [range, setRange] = useState<Range>("week");
  const [groupBy, setGroupBy] = useState<GroupBy>("area");
  const { from, days, label } = useMemo(() => rangeWindow(date, range), [date, range]);

  const { current, deltaFor } = useAllocationComparison(from, days, groupBy);
  const { slices, totalPlannedMin, totalDoneMin, plannedShare, untrackedCount } = current;
  const { targetFor, setTarget } = useAreaTargets();
  const { byKey: actualByKey, totalMin: totalActualMin, actuals } = useActualGroups(from, days, groupBy);
  const { days: rhythm } = useRhythmSeries(from, days);

  const maxMin = Math.max(1, ...slices.map(s => s.plannedMin));
  const spark = rhythm.map(d => ({
    name: d.label,
    Planned: d.plannedH,
    Completed: d.doneH,
    Actual: Math.round(((actuals.byDay.get(format(d.date, "yyyy-MM-dd")) ?? 0) / 360)) / 10,
  }));
  const totalDelta = totalActualMin - totalPlannedMin;

  return (
    <section aria-label="Capacity planning" className={cn("cozy-card space-y-3 p-3", className)}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Gauge className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Capacity planning</p>
          <h3 className="truncate font-display text-base font-semibold">{label}</h3>
        </div>
        <div role="group" aria-label="Capacity range" className="inline-flex shrink-0 rounded-full border border-border/60 bg-background/60 p-0.5">
          {(["day", "week", "month"] as Range[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn("rounded-full px-2.5 py-1 text-[11px] capitalize transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <div role="group" aria-label="Group time by" className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUPS.map(g => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            aria-pressed={groupBy === g}
            className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              groupBy === g
                ? "border-primary bg-primary/15 font-medium text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground")}
          >
            {GROUP_LABEL[g]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border/50 bg-background/50 px-3 py-2">
        <span className="font-display text-xl font-semibold tabular-nums">{fmtHours(totalPlannedMin)}</span>
        <span className="text-[11px] text-muted-foreground">planned · {Math.round(plannedShare * 100)}% of waking hours</span>
        <span className="text-[11px] text-muted-foreground">{fmtHours(totalDoneMin)} completed</span>
        {totalActualMin > 0 && (
          <>
            <span className="text-[11px] text-muted-foreground">{fmtHours(totalActualMin)} actual</span>
            <span className={cn("rounded-full px-1.5 py-px text-[10px] tabular-nums",
              totalDelta > 0 ? "bg-destructive/12 text-destructive" : "bg-primary/12 text-primary")}>
              {totalDelta > 0 ? `${fmtHours(totalDelta)} over` : `${fmtHours(Math.abs(totalDelta))} under`} plan
            </span>
          </>
        )}
        {untrackedCount > 0 && groupBy !== "kind" && groupBy !== "area" && (
          <span className="text-[11px] text-muted-foreground/80">{untrackedCount} untagged</span>
        )}
      </div>

      {spark.length > 1 && (
        <div className="h-[86px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="capPlanned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <RTooltip
                formatter={(v: number, n: string) => [`${v}h`, n]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, color: "hsl(var(--card-foreground))" }}
                itemStyle={{ color: "hsl(var(--card-foreground))" }}
                labelStyle={{ color: "hsl(var(--card-foreground))" }}
              />
              <Area type="monotone" dataKey="Planned" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#capPlanned)" />
              <Area type="monotone" dataKey="Completed" stroke="hsl(var(--accent))" strokeWidth={1.5} fill="none" />
              <Area type="monotone" dataKey="Actual" stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {slices.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Nothing timed in this window yet — schedule a few things and your balance shows up here.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {slices.map(s => (
            <CapacityRow
              key={s.key}
              slice={s}
              maxMin={maxMin}
              days={days}
              from={from}
              groupBy={groupBy}
              delta={deltaFor(s.key)}
              actualMin={actualByKey.get(s.key) ?? 0}
              target={targetFor(groupBy, s.key)}
              onTarget={(h) => setTarget(groupBy, s.key, h)}
              onSelectDate={onSelectDate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CapacityRow({ slice, maxMin, days, from, groupBy, delta, actualMin, target, onTarget, onSelectDate }: {
  slice: { key: string; label: string; color: string; plannedMin: number; doneMin: number };
  maxMin: number;
  days: number;
  from: Date;
  groupBy: GroupBy;
  delta: number;
  actualMin: number;
  target: number | null;
  onTarget: (weeklyHours: number | null) => void;
  onSelectDate?: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((slice.plannedMin / maxMin) * 100);
  const donePct = slice.plannedMin > 0 ? Math.round((slice.doneMin / slice.plannedMin) * 100) : 0;
  const actualPct = Math.round((actualMin / maxMin) * 100);
  const actualDelta = actualMin - slice.plannedMin;
  const targetMin = target ? targetMinutesForWindow(target, days) : null;
  const overBy = targetMin === null ? null : slice.plannedMin - targetMin;

  return (
    <li className="rounded-xl border border-border/50 bg-background/40 px-2.5 py-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{slice.label}</span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{fmtHours(slice.plannedMin)}</span>
          {Math.abs(delta) >= 30 && (
            <span
              className={cn("shrink-0 rounded-full px-1.5 py-px text-[10px] tabular-nums",
                delta > 0 ? "bg-destructive/12 text-destructive" : "bg-primary/12 text-primary")}
              title="Change versus the previous period"
            >
              {delta > 0 ? "+" : "−"}{fmtHours(Math.abs(delta))}
            </span>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-6 w-6 shrink-0", target ? "text-primary" : "text-muted-foreground")}
                aria-label={`Weekly target for ${slice.label}`}
              >
                <TargetIcon className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 space-y-2 p-3" align="end">
              <p className="text-[11px] font-medium">Weekly target — {slice.label}</p>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={target ?? ""}
                  placeholder="hours"
                  aria-label={`Weekly hours target for ${slice.label}`}
                  className="h-8 text-xs"
                  onChange={(e) => onTarget(e.target.value === "" ? null : Number(e.target.value))}
                />
                <span className="text-[11px] text-muted-foreground">h/wk</span>
              </div>
              {target && (
                <Button variant="ghost" size="sm" className="h-7 w-full text-[11px]" onClick={() => onTarget(null)}>
                  Clear target
                </Button>
              )}
            </PopoverContent>
          </Popover>
          <CollapsibleTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" aria-label={`Adjust ${slice.label}`}>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar"
          aria-label={`${slice.label} planned time`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: slice.color, opacity: 0.45 }} />
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(0, Math.round(pct * donePct / 100))}%`, background: slice.color }} />
          {targetMin !== null && (
            <span
              className="absolute inset-y-0 w-px bg-foreground/70"
              style={{ left: `${Math.min(100, (targetMin / maxMin) * 100)}%` }}
              aria-hidden
            />
          )}
        </div>

        {actualMin > 0 && (
          <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-muted/60"
            role="progressbar" aria-label={`${slice.label} actual tracked time`}
            aria-valuenow={actualPct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, Math.min(100, actualPct))}%`, background: slice.color, opacity: 0.9 }}
            />
          </div>
        )}

        <p className="mt-1 text-[10.5px] text-muted-foreground">
          {fmtHours(slice.doneMin)} completed ({donePct}%)
          {actualMin > 0 && (
            <span className="ml-1.5">
              · {fmtHours(actualMin)} tracked
              <span className={cn("ml-1", actualDelta > 0 ? "text-destructive" : "text-primary")}>
                ({actualDelta > 0 ? `+${fmtHours(actualDelta)} over` : `${fmtHours(Math.abs(actualDelta))} under`})
              </span>
            </span>
          )}
          {overBy !== null && (
            <span className={cn("ml-1.5", overBy > 0 ? "text-destructive" : "text-primary")}>
              · {overBy > 0 ? `${fmtHours(overBy)} over` : `${fmtHours(Math.abs(overBy))} under`} target
            </span>
          )}
        </p>

        <CollapsibleContent>
          <AdjustList from={from} days={days} groupBy={groupBy} sliceKey={slice.key} onSelectDate={onSelectDate} />
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/** Unscheduled tasks inside this group — the fastest lever for adjusting a day. */
function AdjustList({ from, days, groupBy, sliceKey, onSelectDate }: {
  from: Date;
  days: number;
  groupBy: GroupBy;
  sliceKey: string;
  onSelectDate?: (d: Date) => void;
}) {
  const { state, updateTask } = useStore();
  const fromISO = format(from, "yyyy-MM-dd");
  const toISO = format(addDays(from, days - 1), "yyyy-MM-dd");

  const matches = useMemo(() => {
    const recipientName = new Map<string, string>((state.recipients ?? []).map(r => [r.id, r.name]));
    return (state.tasks ?? []).filter((t: any) => {
      if (!t.dueDate || t.dueDate < fromISO || t.dueDate > toISO || t.done) return false;
      if (groupBy === "area") return (t.area || "Unsorted") === sliceKey;
      if (groupBy === "activity") return (resolveActivity(t)?.id ?? "__untracked__") === sliceKey;
      if (groupBy === "zone") return (readZoneTag(t.tags) ?? "__untracked__") === sliceKey;
      if (groupBy === "person") return (t.recipientId ? recipientName.get(t.recipientId) : "__untracked__") === sliceKey;
      return false;
    });
  }, [state.tasks, state.recipients, groupBy, sliceKey, fromISO, toISO]);

  const unscheduled = matches.filter((t: any) => !t.startTime);

  if (groupBy === "kind") {
    return <p className="pt-2 text-[11px] text-muted-foreground">Switch to Area, Activity, Person or Zone to adjust items here.</p>;
  }

  return (
    <div className="space-y-1.5 pt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10.5px] text-muted-foreground">
          {matches.length} task{matches.length === 1 ? "" : "s"} · {unscheduled.length} unscheduled
        </span>
        {unscheduled.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-[10.5px]"
            onClick={() => {
              const next = format(addDays(from, days), "yyyy-MM-dd");
              unscheduled.forEach((t: any) => void updateTask(t.id, { dueDate: next }));
            }}
          >
            Push unscheduled to next {days === 1 ? "day" : days === 7 ? "week" : "period"}
          </Button>
        )}
      </div>
      <ul className="space-y-0.5">
        {matches.slice(0, 6).map((t: any) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelectDate?.(new Date(`${t.dueDate}T00:00:00`))}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-[11px] hover:bg-muted/60"
            >
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {t.startTime ? t.startTime : `${t.estMinutes ?? 30}m`}
              </span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-1 py-1 text-[11px] text-muted-foreground">No tasks in this group yet.</li>
        )}
      </ul>
    </div>
  );
}
