import { cn } from "@/lib/utils";
import type { Routine } from "@/lib/routines";
import { getRoutineState, type GardenState } from "@/lib/routine-garden";
import { useMemo } from "react";

interface Props {
  routines: Routine[];
  activeFilter: GardenState | "all";
  onFilterChange: (next: GardenState | "all") => void;
}

const TILES: { state: GardenState; emoji: string; label: string }[] = [
  { state: "blooming", emoji: "🌸", label: "Blooming" },
  { state: "growing", emoji: "🌿", label: "Growing" },
  { state: "seedling", emoji: "🌱", label: "Need Care" },
];

export function TodaysGarden({ routines, activeFilter, onFilterChange }: Props) {
  const counts = useMemo(() => {
    const c: Record<GardenState, number> = { seedling: 0, growing: 0, blooming: 0, resting: 0 };
    routines.forEach(r => { c[getRoutineState(r)] += 1; });
    return c;
  }, [routines]);

  return (
    <section
      aria-label="Today's garden"
      className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-secondary/10 p-3 shadow-sm"
    >
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="font-display text-base font-semibold tracking-tight">Today's garden</h2>
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={cn(
            "text-[11px] font-medium underline-offset-2",
            activeFilter === "all" ? "text-foreground" : "text-muted-foreground hover:underline",
          )}
        >
          Show all
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TILES.map(t => {
          const isActive = activeFilter === t.state;
          return (
            <button
              key={t.state}
              type="button"
              onClick={() => onFilterChange(isActive ? "all" : t.state)}
              aria-pressed={isActive}
              className={cn(
                "flex min-h-[68px] flex-col items-start justify-between rounded-2xl border bg-background/60 p-2.5 text-left transition-all",
                "hover:bg-background/80 active:scale-[0.98]",
                isActive ? "border-primary/60 ring-1 ring-primary/40" : "border-border/50",
              )}
            >
              <span className="text-lg leading-none">{t.emoji}</span>
              <div>
                <div className="text-xl font-semibold leading-none tabular-nums">{counts[t.state]}</div>
                <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">{t.label}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
