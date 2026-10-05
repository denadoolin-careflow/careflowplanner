import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Check, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useStore, todayISO } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { CleaningTask } from "@/lib/types";

const CADENCE_DAYS: Record<CleaningTask["cadence"], number> = { daily: 1, weekly: 7, monthly: 30, seasonal: 90 };
const TOTAL = 15 * 60;

/** How overdue a chore is, relative to its cadence (higher = more urgent). */
function overdueScore(c: CleaningTask, today: string) {
  if (c.nextDueDate) return differenceInCalendarDays(parseISO(today), parseISO(c.nextDueDate)) / CADENCE_DAYS[c.cadence] + 1;
  if (!c.lastDone) return 2;
  return differenceInCalendarDays(parseISO(today), parseISO(c.lastDone)) / CADENCE_DAYS[c.cadence];
}

export function FifteenMinuteReset() {
  const { state, toggleCleaning } = useStore() as any;
  const today = todayISO();
  const picks = useMemo(() => {
    const list: CleaningTask[] = state.cleaning ?? [];
    return list
      .filter((c) => !c.done)
      .map((c) => ({ c, s: overdueScore(c, today) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((x) => x.c);
  // Freeze the pick list once per session of the card so checked items don't vanish.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, (state.cleaning ?? []).length]);
  const [left, setLeft] = useState(TOTAL);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => {
      if (l <= 1) { setRunning(false); haptics.success(); return 0; }
      return l - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [running]);

  const doneCount = picks.filter((p) => state.cleaning.find((c: CleaningTask) => c.id === p.id)?.done).length;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = 1 - left / TOTAL;

  return (
    <section className="overflow-hidden rounded-3xl bg-kitchen-cream p-5 text-kitchen-ink ring-1 ring-kitchen-terracotta/20 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" className="stroke-kitchen-terracotta/15" strokeWidth="3" />
            <circle cx="18" cy="18" r="16" fill="none" className="stroke-kitchen-terracotta transition-all" strokeWidth="3"
              strokeLinecap="round" strokeDasharray={`${pct * 100.5} 100.5`} />
          </svg>
          <span className="font-display text-lg font-semibold tabular-nums">{mm}:{ss}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-kitchen-terracotta">
            <Timer className="h-3.5 w-3.5" /> Today's 15-minute reset
          </p>
          <h2 className="font-display text-xl font-semibold leading-tight">
            {picks.length ? `${doneCount} of ${picks.length} done` : "Everything's caught up"}
          </h2>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!picks.length || left === 0}
              onClick={() => { haptics.tap(); setRunning((r) => !r); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-kitchen-terracotta px-4 py-2 text-sm font-semibold text-kitchen-cream active:scale-95 disabled:opacity-40"
            >
              {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {left < TOTAL ? "Resume" : "Start"}</>}
            </button>
            {left < TOTAL && (
              <button type="button" aria-label="Reset timer" onClick={() => { setRunning(false); setLeft(TOTAL); }}
                className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-kitchen-terracotta/30">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {picks.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {picks.map((p) => {
            const done = !!state.cleaning.find((c: CleaningTask) => c.id === p.id)?.done;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => { done ? haptics.tap() : haptics.success(); void toggleCleaning(p.id); }}
                  className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    done ? "bg-kitchen-terracotta/10 opacity-70" : "bg-background/60 hover:bg-background")}
                >
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full ring-2 ring-kitchen-terracotta/50",
                    done && "bg-kitchen-terracotta ring-kitchen-terracotta")}>
                    {done && <Check className="h-3.5 w-3.5 text-kitchen-cream" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                  <span className="text-[11px] opacity-60">{p.zone}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
