import { useMemo } from "react";
import { format } from "date-fns";
import { UtensilsCrossed, ArrowRight, Check, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";

const SLOTS: Meal["slot"][] = ["Breakfast", "Lunch", "Dinner"];

/**
 * Compact at-a-glance overview of today's meals.
 * Detailed editing lives in the per-slot meal card inside Morning/Afternoon/Evening,
 * so this widget only shows status to avoid repeating the meal name.
 */
export function MealsPlannedWidget({ date }: { date: Date }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const meals = useMemo(
    () => Object.fromEntries(state.meals.filter(m => m.date === iso).map(m => [m.slot, m])),
    [state.meals, iso],
  ) as Partial<Record<Meal["slot"], Meal>>;

  const plannedCount = SLOTS.filter(s => meals[s]).length;

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-accent" />
          <h3 className="font-display text-sm font-semibold text-foreground">Meals today</h3>
        </div>
        <Link to="/meals" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Plan <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">
        {plannedCount} of {SLOTS.length} planned · edit on each time-of-day card
      </p>
      <ul className="grid grid-cols-3 gap-1.5">
        {SLOTS.map(slot => {
          const planned = !!meals[slot];
          return (
            <li
              key={slot}
              className={
                "flex flex-col items-center gap-1 rounded-lg border border-border/40 bg-background/60 px-1.5 py-2 text-center"
              }
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{slot}</span>
              {planned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Check className="h-3 w-3" /> planned
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Circle className="h-3 w-3" /> open
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}