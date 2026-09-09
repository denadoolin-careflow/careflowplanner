import { useCallback, useEffect, useState } from "react";
import { Plus, UtensilsCrossed, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChannel } from "@/lib/wellflow/data";
import { MealPickerPopover } from "@/components/meals/MealPickerPopover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Meal } from "@/lib/types";

const SLOTS: { slot: Meal["slot"]; short: string; label: string }[] = [
  { slot: "Breakfast", short: "B", label: "Breakfast" },
  { slot: "Lunch", short: "L", label: "Lunch" },
  { slot: "Dinner", short: "D", label: "Dinner" },
];

/** Calories logged per ISO day across a window. */
function useLoggedCalories(days: string[]) {
  const [byDay, setByDay] = useState<Record<string, number>>({});
  const from = days[0];
  const to = days[days.length - 1];

  const load = useCallback(async () => {
    if (!from || !to) return;
    const { data } = await supabase
      .from("food_entries")
      .select("date, calories")
      .gte("date", from)
      .lte("date", to);
    const map: Record<string, number> = {};
    for (const r of data ?? []) {
      map[r.date as string] = (map[r.date as string] ?? 0) + Number(r.calories ?? 0);
    }
    setByDay(map);
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);
  useChannel("food", load);

  return byDay;
}

function SlotChip({ iso, slot, short, label }: { iso: string; slot: Meal["slot"]; short: string; label: string }) {
  const { state, addMeal, updateMeal } = useStore();
  const meal = state.meals.find(m => m.date === iso && m.slot === slot);

  return (
    <MealPickerPopover
      slot={slot}
      onPick={(picked) => {
        const patch = {
          name: picked.name,
          prepMinutes: picked.prep_minutes ?? undefined,
          ingredients: picked.ingredients,
          steps: picked.steps,
          tags: picked.tags,
        };
        if (meal) void updateMeal(meal.id, patch);
        else void addMeal({ ...patch, date: iso, slot });
      }}
      trigger={
        <button
          type="button"
          title={meal ? `${label}: ${meal.name}` : `Add ${label.toLowerCase()}`}
          aria-label={meal ? `${label}: ${meal.name}. Edit meal` : `Add ${label.toLowerCase()}`}
          className={cn(
            "flex min-h-[24px] w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight",
            meal
              ? "border-yellow-300/70 bg-yellow-100/70 text-yellow-950 dark:border-yellow-800/60 dark:bg-yellow-900/40 dark:text-yellow-50"
              : "border-dashed border-border/70 bg-card/50 text-muted-foreground",
          )}
        >
          {meal ? <UtensilsCrossed className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
          <span className="truncate">{meal ? meal.name : short}</span>
        </button>
      }
    />
  );
}

/** Per-day meal slots plus tracked food calories, shown above the all-day row. */
export function PlannerWeekMealsRow({ days, colTemplate, gutterClass }: {
  days: string[];
  colTemplate: string;
  gutterClass?: string;
}) {
  const calories = useLoggedCalories(days);

  return (
    <div className="grid border-b border-border/40 bg-background/30" style={{ gridTemplateColumns: colTemplate }}>
      <div className={cn("sticky left-0 z-30 flex items-center justify-end border-r border-border/50 bg-card/95 pr-1 text-[9px] uppercase tracking-wider text-muted-foreground/70 backdrop-blur", gutterClass)}>
        Meals
      </div>
      {days.map((iso, i) => (
        <div key={iso} className={cn("min-w-0 space-y-0.5 px-1 py-1", i > 0 && "border-l border-border/40")}>
          {SLOTS.map(s => (
            <SlotChip key={s.slot} iso={iso} slot={s.slot} short={s.short} label={s.label} />
          ))}
          {calories[iso] ? (
            <span className="flex items-center gap-1 px-0.5 text-[9px] text-muted-foreground">
              <Flame className="h-2.5 w-2.5" aria-hidden />
              {Math.round(calories[iso])} kcal tracked
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
