/**
 * Weekly consistency — a readback of how steadily you logged this week.
 * Not a health score and not medical advice.
 */
import { SectionCard } from "@/components/cards/SectionCard";
import { cn } from "@/lib/utils";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import { useAdherence, type AdherenceTargets } from "@/lib/wellflow/adherence";
import { useGoals } from "@/lib/wellflow/data";
import { useMedications, doseSlots } from "@/lib/medications";

export function AdherenceCard({ compact = false }: { compact?: boolean }) {
  const { goals } = useGoals();
  const { medications } = useMedications();

  const targets: AdherenceTargets = {
    calories: goals?.calories ?? null,
    protein: goals?.protein ?? null,
    water: goals?.water_oz ?? null,
    movementDays: 3,
    doseSlotsPerDay: doseSlots(medications).length,
  };

  const data = useAdherence(targets);

  if (!data) {
    return <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />;
  }

  const { current, previous } = data;
  const delta = current.score - previous.score;

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/30 px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Consistency</p>
          <p className="text-lg font-semibold tabular-nums">{current.score}%</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Flame className="h-3.5 w-3.5 text-primary" />
          {current.loggingStreak} day{current.loggingStreak === 1 ? "" : "s"}
        </div>
      </div>
    );
  }

  return (
    <SectionCard
      title="This week's consistency"
      subtitle="How steadily you logged — your own data, nothing more"
      accent="sage"
    >
      <div className="flex items-end gap-4">
        <div>
          <p className="text-3xl font-semibold tabular-nums">{current.score}%</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {delta === 0 ? "Same as last week" : (
              <>
                {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta > 0 ? "+" : ""}{delta} vs last week
              </>
            )}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="flex items-center justify-end gap-1 text-sm font-medium">
            <Flame className="h-4 w-4 text-primary" /> {current.loggingStreak} day streak
          </p>
          <p className="text-[11px] text-muted-foreground">Best {current.bestStreak}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {current.parts.map(p => (
          <li key={p.key}>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="tabular-nums font-medium">{p.hit}/{p.of}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all",
                    p.ratio >= 0.7 ? "bg-primary" : "bg-primary/50")}
                   style={{ width: `${Math.min(100, Math.round(p.ratio * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>

      {current.weakest && current.weakest.ratio < 0.6 && (
        <p className="mt-3 rounded-2xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {current.weakest.label} has the fewest entries this week — a small, kind place to start.
        </p>
      )}
    </SectionCard>
  );
}
