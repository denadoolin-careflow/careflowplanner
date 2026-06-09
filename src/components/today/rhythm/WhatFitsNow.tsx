import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Sparkles, RefreshCw, Clock, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import type { Task, Energy } from "@/lib/types";
import { useDayEnergy } from "@/lib/energy-store";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

function estMin(t: Task) { return t.estMinutes ?? 15; }
function inferEnergy(t: Task): Energy {
  if (t.energy) return t.energy;
  const m = estMin(t);
  if (m <= 10) return "low";
  if (m <= 30) return "medium";
  return "high";
}

function recommend(tasks: Task[], dominantEnergy: Energy, today: string) {
  const base = tasks.filter(t => !t.parentTaskId && !t.done && t.dueDate && t.status !== "parked");
  const score = (t: Task) => {
    const e = inferEnergy(t);
    const energyMatch = e === dominantEnergy ? 0 : e === "low" ? 1 : 2;
    const overdue = (t.dueDate ?? "") < today ? -3 : 0;
    const soon = Math.max(0, Math.min(5, ((parseISO(t.dueDate ?? today).getTime() - Date.now()) / 86400000)));
    return energyMatch + soon + overdue + estMin(t) / 30;
  };
  return [...base].sort((a, b) => score(a) - score(b)).slice(0, 3);
}

interface Props {
  date: Date;
  onTaskClick?: (id: string) => void;
}

/**
 * "What fits right now" — 3 AI-style recommendations based on energy and
 * time-to-due, plus a "Do One Thing" CTA that completes the top pick.
 */
export function WhatFitsNow({ date, onTaskClick }: Props) {
  const { state, toggleTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const [energy] = useDayEnergy(iso);
  const [tick, setTick] = useState(0);

  const picks = useMemo(
    () => recommend(state.tasks, energy, iso),
    [state.tasks, energy, iso, tick],
  );

  const doOneThing = async () => {
    const top = picks[0];
    if (!top) {
      toast("Nothing pending — you're caught up ✨");
      return;
    }
    await toggleTask(top.id);
    toast.success(`Done: ${top.title}`);
  };

  return (
    <section className="cozy-card overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight text-foreground">
            What fits right now?
          </h2>
          <p className="text-xs text-muted-foreground">
            Tuned to your energy, time, and priorities
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2 text-xs text-muted-foreground"
          onClick={() => setTick(t => t + 1)}
        >
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {picks.map((t, i) => {
          const Icon = ICONS[i] ?? Leaf;
          const mins = estMin(t);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTaskClick?.(t.id)}
              className={cn(
                "group flex flex-col items-start gap-2 rounded-2xl border border-border/50 bg-background/70",
                "px-3 py-3 text-left transition-all hover:border-primary/40 hover:bg-background",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" /> {mins} min
                </span>
              </div>
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm font-medium text-foreground">{t.title}</div>
                {t.area && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{t.area}</div>
                )}
              </div>
            </button>
          );
        })}
        {picks.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
            All caught up — nothing pulling for your attention.
          </div>
        )}

      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={doOneThing}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full",
            "bg-gradient-to-r from-primary/90 to-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-soft",
            "transition-all hover:from-primary hover:to-primary/90",
          )}
          title="Complete top pick"
        >
          <Sparkles className="h-3 w-3" />
          Do One Thing
        </button>
      </div>
    </section>
  );
}