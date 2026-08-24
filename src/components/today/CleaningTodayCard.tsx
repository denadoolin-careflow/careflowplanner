/**
 * "What needs cleaned" — the day's open chores grouped by zone, with the same
 * low-energy essentials filter the planner sidebar uses.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { capacityLimit, useCapacity } from "@/components/today/dashboard/capacity-context";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { pickLowEnergy, useLowEnergyMode } from "@/lib/planner/low-energy";
import type { CleaningTask } from "@/lib/types";

export function CleaningTodayCard({ className }: { className?: string }) {
  const { state, toggleCleaning } = useStore();
  const capacity = useCapacity();
  const { lowEnergy, toggleLowEnergy } = useLowEnergyMode("cleaning");

  const limit = capacityLimit(6, capacity);

  const items = useMemo(() => {
    const open = state.cleaning.filter(c => !c.done);
    if (lowEnergy || capacity.isLow) return pickLowEnergy(open, Math.min(limit, 5));
    return open.slice(0, limit);
  }, [state.cleaning, lowEnergy, capacity.isLow, limit]);

  const byZone = useMemo(() => {
    const map = new Map<string, CleaningTask[]>();
    for (const c of items) {
      const zone = c.zone ?? "Whole home";
      map.set(zone, [...(map.get(zone) ?? []), c]);
    }
    return [...map.entries()];
  }, [items]);

  const openCount = state.cleaning.filter(c => !c.done).length;

  return (
    <DashCard
      eyebrow="Home"
      title="What needs cleaned"
      className={className}
      action={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleLowEnergy}
            aria-pressed={lowEnergy}
            aria-label="Show only low-energy essentials"
            className={cn(
              "inline-flex min-h-[28px] items-center gap-1 rounded-full border px-2 text-[10.5px] transition-colors",
              lowEnergy
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="h-3 w-3" aria-hidden /> Low
          </button>
          <Link to="/home-reset" className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
            Reset <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      }
      footer={
        openCount > items.length ? (
          <p className="text-[11px] text-muted-foreground">{openCount - items.length} more waiting — that's allowed.</p>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyLine>{capacity.isLow ? "Only the essentials today — and they're done." : "Home is caught up."}</EmptyLine>
      ) : (
        <div className="space-y-2.5">
          {byZone.map(([zone, list]) => (
            <div key={zone} className="space-y-1.5">
              <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">{zone}</p>
              <ul className="space-y-1.5">
                {list.map(c => (
                  <li key={c.id} className="flex items-start gap-2 text-[12.5px]">
                    <button
                      type="button"
                      onClick={() => { haptics.success?.(); void toggleCleaning(c.id); }}
                      aria-label={`Mark ${c.title} done`}
                      className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border text-transparent transition-all hover:bg-muted active:scale-125"
                    >
                      <Check className="h-2.5 w-2.5" aria-hidden />
                    </button>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{c.title}</span>
                    <span className="shrink-0 text-[10.5px] capitalize text-muted-foreground">{c.cadence}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </DashCard>
  );
}
