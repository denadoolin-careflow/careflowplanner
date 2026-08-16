import { useMemo } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import type { PlannerFeedItem } from "@/lib/planner/feed";
import { cn } from "@/lib/utils";

function hmToMin(v?: string | null): number | null {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
}

const DAY_AVAILABLE = (22 - 5) * 60;

/** Compact per-day summary: planned/completed counts, capacity rating,
 *  and moon + cycle chips that deep-link to the cosmic and rhythm pages. */
export function PlannerDaySummaryStrip({ date, items, className }: {
  date: Date;
  items: PlannerFeedItem[];
  className?: string;
}) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);
  const { periods, settings } = useCycle();

  const plannedMin = useMemo(() => {
    let total = 0;
    const blockTaskIds = new Set(blocks.filter(b => b.taskId).map(b => b.taskId as string));
    for (const b of blocks) {
      const s = hmToMin(b.startTime); const e = hmToMin(b.endTime);
      if (s === null) continue;
      total += Math.max(15, (e ?? s + 30) - s);
    }
    for (const t of state.tasks) {
      if (t.dueDate !== iso || blockTaskIds.has(t.id)) continue;
      if (hmToMin(t.startTime) === null) continue;
      total += t.estMinutes ?? 30;
    }
    for (const a of state.appointments) {
      if (a.date !== iso) continue;
      const s = hmToMin(a.time); if (s === null) continue;
      const e = hmToMin(a.endTime);
      total += Math.max(15, (e ?? s + 30) - s);
    }
    return total;
  }, [state.tasks, state.appointments, blocks, iso]);

  const total = items.length;
  const done = items.filter(i => i.done).length;
  const pct = Math.min(150, Math.round((plannedMin / DAY_AVAILABLE) * 100));
  const rating = pct > 100 ? "Overloaded" : pct >= 70 ? "Full" : pct >= 35 ? "Balanced" : "Light";
  const ratingTone = pct > 100 ? "text-destructive" : pct >= 70 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";

  const moon = MOON_INFO[getMoonPhase(date)];
  const cycle = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  return (
    <div className={cn("space-y-1 rounded-lg border border-border/40 bg-background/40 px-2 py-1.5", className)}>
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="text-[10.5px] text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{done}</span>/<span className="tabular-nums">{total}</span> done
        </span>
        <span className={cn("text-[10px] font-medium", ratingTone)}>{rating}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`Day capacity ${pct}%`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full", pct > 100 ? "bg-destructive" : "bg-primary/70")}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Link
          to="/cosmic-flow"
          aria-label={`${moon.label} — open Cosmic Flow`}
          className="inline-flex min-w-0 items-center gap-1 rounded-full border border-border/40 px-1.5 py-px text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <span aria-hidden>{moon.glyph}</span>
          <span className="truncate">{moon.label}</span>
        </Link>
        {cycle && (
          <Link
            to="/rhythm"
            aria-label={`${PHASE_META[cycle.phase]?.label ?? cycle.label} phase, day ${cycle.cycleDay} — open Rhythm`}
            className="inline-flex min-w-0 items-center gap-1 rounded-full border border-border/40 px-1.5 py-px text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: `hsl(var(${cycle.tokenVar}))` }} />
            <span className="truncate">{PHASE_META[cycle.phase]?.label ?? cycle.label}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
