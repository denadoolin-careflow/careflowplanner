import { useMemo } from "react";
import { Lightbulb, TrendingUp, Activity } from "lucide-react";
import { type Energy } from "@/lib/energy-store";
import type { Task, Habit } from "@/lib/types";

function countByEnergy(
  map: Record<string, Energy>,
  isoDates: string[],
): Record<Energy, number> {
  const out: Record<Energy, number> = { low: 0, medium: 0, high: 0 };
  for (const iso of isoDates) {
    const e = map[iso];
    if (e) out[e]++;
  }
  return out;
}

function avgPerDay(byEnergy: Record<Energy, number>, dayCounts: Record<Energy, number>) {
  const out: Record<Energy, number> = { low: 0, medium: 0, high: 0 };
  (["low", "medium", "high"] as Energy[]).forEach(e => {
    out[e] = dayCounts[e] > 0 ? byEnergy[e] / dayCounts[e] : 0;
  });
  return out;
}

export function CapacityInsights({
  energyMap,
  tasks,
  habits,
  days = 30,
}: {
  energyMap: Record<string, Energy>;
  tasks: Task[];
  habits: Habit[];
  days?: number;
}) {
  const insights = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Days logged per energy level
    const dayCounts: Record<Energy, number> = { low: 0, medium: 0, high: 0 };
    Object.entries(energyMap).forEach(([iso, e]) => {
      const d = new Date(iso);
      if (d >= cutoff) dayCounts[e]++;
    });

    // Tasks completed by energy of completion day
    const taskCounts: Record<Energy, number> = { low: 0, medium: 0, high: 0 };
    tasks.forEach(t => {
      if (!t.done || !t.lastCompletedAt) return;
      const d = new Date(t.lastCompletedAt);
      if (d < cutoff) return;
      const iso = d.toISOString().slice(0, 10);
      const e = energyMap[iso];
      if (e) taskCounts[e]++;
    });

    // Habit ticks by energy
    const habitCounts: Record<Energy, number> = { low: 0, medium: 0, high: 0 };
    habits.forEach(h => {
      Object.entries(h.log ?? {}).forEach(([iso, done]) => {
        if (!done) return;
        const d = new Date(iso);
        if (d < cutoff) return;
        const e = energyMap[iso];
        if (e) habitCounts[e]++;
      });
    });

    const taskAvg = avgPerDay(taskCounts, dayCounts);
    const habitAvg = avgPerDay(habitCounts, dayCounts);

    // Generate plain-language patterns
    const patterns: string[] = [];
    const totalLogged = dayCounts.low + dayCounts.medium + dayCounts.high;
    if (totalLogged < 5) {
      patterns.push(
        `Log your energy for a few more days (${totalLogged}/${days}) to unlock richer patterns.`,
      );
    } else {
      const best = (["high", "medium", "low"] as Energy[])
        .filter(e => dayCounts[e] > 0)
        .sort((a, b) => taskAvg[b] - taskAvg[a])[0];
      if (best && taskAvg[best] > 0) {
        patterns.push(
          `You complete the most tasks on **${best}-energy** days (~${taskAvg[best].toFixed(1)}/day).`,
        );
      }
      if (taskAvg.low > taskAvg.high && dayCounts.low >= 2) {
        patterns.push(
          "Low-energy days are still productive for you — protect, don't punish them.",
        );
      }
      if (habitAvg.high > habitAvg.low && dayCounts.high >= 2) {
        patterns.push(
          `Habits land more consistently on high-energy days (${habitAvg.high.toFixed(1)} vs ${habitAvg.low.toFixed(1)} on low).`,
        );
      }
      const ratio = dayCounts.low / Math.max(totalLogged, 1);
      if (ratio > 0.4) {
        patterns.push(
          `Low-energy days are ${(ratio * 100).toFixed(0)}% of your last ${days}. Consider lighter weekly loads.`,
        );
      }
      if (dayCounts.high >= dayCounts.low + 3) {
        patterns.push("You've been mostly high-energy — a good window to tackle deferred priorities.");
      }
    }

    return { dayCounts, taskAvg, habitAvg, patterns };
  }, [energyMap, tasks, habits, days]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {(["low", "medium", "high"] as Energy[]).map(e => (
          <div
            key={e}
            className="rounded-md border border-border/40 bg-muted/40 px-2 py-2"
          >
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground capitalize">
              {e}
            </div>
            <div className="mt-1 font-display text-lg tabular-nums">
              {insights.dayCounts[e]}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {insights.taskAvg[e].toFixed(1)} tasks/day
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Lightbulb className="h-3 w-3" /> Patterns
        </div>
        <ul className="mt-2 space-y-1.5 text-xs leading-snug">
          {insights.patterns.map((p, i) => (
            <li key={i} className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span
                dangerouslySetInnerHTML={{
                  __html: p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Activity className="h-3 w-3" />
        Based on the last {days} days of logged energy.
      </div>
    </div>
  );
}