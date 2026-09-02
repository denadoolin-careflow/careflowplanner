import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DashCard, EmptyLine } from "@/components/today/dashboard/DashCard";
import { Button } from "@/components/ui/button";
import { Droplets, Scale, Syringe, UtensilsCrossed } from "lucide-react";
import {
  daysBetween, nextInjectionDate, sumEntries,
  useFoodEntries, useGlp1Profile, useGoals, useInjections, useWaterEntries, useWeights,
} from "@/lib/wellflow/data";
import { todayISO } from "@/lib/wellflow/types";

function Bar({ label, value, goal, unit = "" }: { label: string; value: number; goal: number | null; unit?: string }) {
  const pct = goal && goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}{unit}{goal ? ` / ${Math.round(goal)}${unit}` : ""}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Compact WellFlow summary for the Today dashboard. */
export function WellFlowTodayCard() {
  const date = todayISO();
  const { goals } = useGoals();
  const { entries } = useFoodEntries(date);
  const { total: waterTotal } = useWaterEntries(date);
  const { latest } = useWeights();
  const { profile } = useGlp1Profile();
  const { last } = useInjections();

  const totals = useMemo(() => sumEntries(entries), [entries]);
  const next = nextInjectionDate(last?.date ?? null, profile.frequency);
  const inDays = next ? daysBetween(date, next) : null;
  const empty = totals.meals === 0 && waterTotal === 0 && !latest;

  return (
    <DashCard
      eyebrow="WellFlow"
      title="Nutrition & body"
      action={<Button asChild size="sm" variant="ghost"><Link to="/wellflow">Open</Link></Button>}
    >
      {empty ? (
        <EmptyLine>Nothing logged today — a quick food or water entry takes seconds.</EmptyLine>
      ) : (
        <div className="space-y-2.5">
          <Bar label="Calories" value={totals.calories} goal={goals.calories} />
          <Bar label="Protein" value={totals.protein} goal={goals.protein} unit="g" />
          <Bar label="Water" value={waterTotal} goal={goals.water_oz} unit="oz" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><UtensilsCrossed className="h-3 w-3" /> {totals.meals} logged</span>
        <span className="inline-flex items-center gap-1"><Droplets className="h-3 w-3" /> {Math.round(waterTotal)} oz</span>
        {latest && <span className="inline-flex items-center gap-1"><Scale className="h-3 w-3" /> {latest.weight_lb} lb</span>}
        {inDays != null && (
          <span className="inline-flex items-center gap-1">
            <Syringe className="h-3 w-3" />
            {inDays > 0 ? `Injection in ${inDays}d` : inDays === 0 ? "Injection today" : "Injection due"}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/wellflow?log=food"><UtensilsCrossed className="h-4 w-4" /> Log food</Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="gap-1.5">
          <Link to="/wellflow?log=water"><Droplets className="h-4 w-4" /> Water</Link>
        </Button>
      </div>
    </DashCard>
  );
}
