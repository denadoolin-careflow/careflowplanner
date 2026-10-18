import { useMemo } from "react";
import { useCycleDot } from "@/lib/planner/day-rhythm";
import { PHASE_META, type CyclePhase } from "@/lib/cycle";
import { PhaseGroceryButton } from "@/components/cycle/PhaseGroceryButton";

/** Meal Planner strip of foods that suit today's cycle phase. Hidden when cycle tracking is off. */
export function CyclePhaseFoodStrip() {
  const today = useMemo(() => new Date(), []);
  const phase = (useCycleDot(today) as { phase?: CyclePhase } | null)?.phase;
  if (!phase) return null;
  const meta = PHASE_META[phase];
  return (
    <section aria-label="Foods for your cycle phase" className="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
      <p className="text-sm font-medium">{meta.glyph} Foods for your {meta.label.toLowerCase()} phase</p>
      <PhaseGroceryButton phase={phase} className="mt-1" />
    </section>
  );
}
