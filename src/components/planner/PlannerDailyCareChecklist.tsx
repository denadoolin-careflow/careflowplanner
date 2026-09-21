import { useMemo } from "react";
import { Check, Circle, Pill, UtensilsCrossed } from "lucide-react";
import { doseSlots, useMedicationLogs, useMedications } from "@/lib/medications";
import { useMealCompletion } from "@/lib/meal-completion";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

function timeLabel(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const hour = hours % 12 || 12;
  return `${hour}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}${hours < 12 ? "a" : "p"}`;
}

export function PlannerDailyCareChecklist({ iso, compact = false }: { iso: string; compact?: boolean }) {
  const { medications } = useMedications();
  const { statusOf, setStatus } = useMedicationLogs(iso);
  const { state } = useStore();
  const { done: mealsDone, toggle: toggleMeal } = useMealCompletion();
  const meds = useMemo(() => doseSlots(medications), [medications]);
  const meals = useMemo(() => state.meals.filter(meal => meal.date === iso), [state.meals, iso]);
  if (!meds.length && !meals.length) return null;

  return (
    <section className={cn("rounded-lg border border-border/60 bg-card/45 p-2", compact && "rounded-none border-x-0 border-t-0")} aria-label="Meds and meals checklist">
      {!compact && <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Meds &amp; meals</p>}
      <div className={cn("flex gap-1.5", compact ? "flex-wrap" : "flex-wrap")}>
        {meds.map(slot => {
          const checked = statusOf(slot.med.id, slot.time) === "taken";
          return <button key={`med-${slot.med.id}-${slot.time}`} type="button"
            onClick={() => { haptics.tap(); void setStatus(slot.med.id, slot.time, checked ? null : "taken"); }}
            aria-pressed={checked} aria-label={`${checked ? "Uncheck" : "Check off"} ${slot.med.name} at ${timeLabel(slot.time)}`}
            className={cn("inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]", checked ? "border-primary/35 bg-primary/10 text-foreground" : "border-border/60 bg-background/60 text-muted-foreground")}>
            {checked ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Pill className="h-3.5 w-3.5 shrink-0" />}
            <span className={cn("truncate", checked && "line-through")}>{slot.med.name}</span><span className="shrink-0 font-mono text-[9px] opacity-70">{timeLabel(slot.time)}</span>
          </button>;
        })}
        {meals.map(meal => {
          const checked = !!mealsDone[meal.id];
          return <button key={`meal-${meal.id}`} type="button"
            onClick={() => { haptics.tap(); toggleMeal(meal.id); }} aria-pressed={checked}
            aria-label={`${checked ? "Uncheck" : "Check off"} ${meal.slot}: ${meal.name}`}
            className={cn("inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]", checked ? "border-primary/35 bg-primary/10 text-foreground" : "border-border/60 bg-background/60 text-muted-foreground")}>
            {checked ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
            <UtensilsCrossed className="h-3 w-3 shrink-0" /><span className={cn("truncate", checked && "line-through")}>{meal.name}</span>
          </button>;
        })}
      </div>
    </section>
  );
}