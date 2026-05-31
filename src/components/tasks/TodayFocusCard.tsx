import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore, todayISO } from "@/lib/store";
import { Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { energyBucket, ENERGY_META } from "@/lib/task-energy";
import type { Energy, Task } from "@/lib/types";

/**
 * "Today's Focus" hero card shown above task lists & on Today.
 * Surfaces pinned focus tasks (existing `isTopThree` flag, up to 5),
 * today's completion progress, and an inferred energy summary.
 */
export function TodayFocusCard() {
  const { state, toggleTask } = useStore();
  const today = todayISO();

  const focus = useMemo(() =>
    (state.tasks ?? [])
      .filter(t => !t.parentTaskId && t.isTopThree && !t.done)
      .slice(0, 5),
    [state.tasks],
  );

  const todays = useMemo(() => {
    return (state.tasks ?? []).filter(t =>
      !t.parentTaskId &&
      (t.dueDate === today || (t.done && (t.lastCompletedAt ?? "").slice(0, 10) === today)),
    );
  }, [state.tasks, today]);
  const done = todays.filter(t => t.done).length;
  const total = todays.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const energySummary: Energy | "unset" = useMemo(() => {
    const active = todays.filter(t => !t.done);
    if (active.length === 0) return "unset";
    const scores: Record<Energy, number> = { high: 0, medium: 0, low: 0 };
    for (const t of active) {
      const b = energyBucket(t);
      if (b !== "unset") scores[b]++;
    }
    const top = (Object.entries(scores) as [Energy, number][]).sort((a, b) => b[1] - a[1])[0];
    return top && top[1] > 0 ? top[0] : "unset";
  }, [todays]);
  const energyMeta = ENERGY_META[energySummary];

  if (focus.length === 0 && total === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-card/70 to-accent/10 p-5 shadow-[0_8px_30px_-18px_hsl(var(--primary)/0.5)] backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.15),transparent_60%)]" aria-hidden />
      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-background/70 text-primary shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Today's Focus</h2>
            <p className="text-xs text-muted-foreground">A gentle anchor for the day.</p>
          </div>
        </div>

        {focus.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Must Do</h3>
            <ul className="space-y-1.5">
              {focus.map(t => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-background/50 px-3 py-2 transition hover:bg-background/70">
                  <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id)} aria-label={`Complete ${t.title}`} />
                  <span className="flex-1 text-sm font-medium text-foreground">{t.title}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Progress" value={`${done}/${total}`}>
            <Progress value={pct} className="mt-1.5 h-1" />
          </Stat>
          <Stat label="Energy" value={`${energyMeta.emoji} ${energyMeta.label.replace(" energy", "")}`} />
          <Stat label="Focus" value={`${focus.length} pinned`}>
            <Link to="/tasks/today" className="mt-1 inline-block text-[11px] text-primary/80 hover:text-primary">
              View all →
            </Link>
          </Stat>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl bg-background/50 px-3 py-2")}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      {children}
    </div>
  );
}