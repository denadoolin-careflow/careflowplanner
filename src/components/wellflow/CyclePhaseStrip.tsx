/**
 * Cycle phase strip for WellFlow — where you are in your cycle and what tends
 * to nourish that stretch. General food ideas, not medical advice.
 */
import { useState } from "react";
import { Moon, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCycleNutrition } from "@/lib/wellflow/cycle-nutrition";
import { addIngredientsToGroceries } from "@/lib/wellflow/meal-plan";

export function CyclePhaseStrip({ className }: { className?: string }) {
  const { enabled, info, nourishment } = useCycleNutrition();
  const [busy, setBusy] = useState<string | null>(null);

  if (!enabled || !info || !nourishment) return null;

  const addFood = async (food: string) => {
    setBusy(food);
    try {
      const added = await addIngredientsToGroceries([food]);
      toast.success(added ? `${food} added to groceries` : "Already on your list or in the pantry");
    } catch {
      toast.error("Could not add that to groceries");
    } finally { setBusy(null); }
  };

  return (
    <section
      aria-label="Cycle nourishment"
      className={cn("rounded-2xl border border-border/50 bg-card/60 p-3", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold">
          <Moon className="h-3.5 w-3.5" aria-hidden />
          {nourishment.label} · day {info.cycleDay}
        </span>
        <span className="text-xs text-muted-foreground">{nourishment.focus}</span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{nourishment.note}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {nourishment.foods.map(f => (
          <button
            key={f} type="button" onClick={() => addFood(f)} disabled={busy !== null}
            aria-label={`Add ${f} to groceries`}
            className="inline-flex min-h-[2rem] items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 text-xs transition-colors hover:bg-muted/60 disabled:opacity-60"
          >
            {busy === f ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 opacity-60" />}
            {f}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        General nourishment ideas based on your own cycle dates — not medical advice.
      </p>
    </section>
  );
}
