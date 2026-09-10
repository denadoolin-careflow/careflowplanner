import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, UtensilsCrossed, Flame, Repeat, ShoppingCart, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChannel } from "@/lib/wellflow/data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WeekMealDialog } from "@/components/planner/WeekMealDialog";
import { WeekMealTemplatesDialog } from "@/components/planner/WeekMealTemplatesDialog";
import type { Meal } from "@/lib/types";

const BASE_SLOTS: { slot: Meal["slot"]; short: string; label: string }[] = [
  { slot: "Breakfast", short: "B", label: "Breakfast" },
  { slot: "Lunch", short: "L", label: "Lunch" },
  { slot: "Dinner", short: "D", label: "Dinner" },
];
const EXTRA_SLOTS: { slot: Meal["slot"]; short: string; label: string }[] = [
  { slot: "Snack", short: "S", label: "Snack" },
  { slot: "Drink", short: "Dr", label: "Drink" },
];

const EXTRAS_KEY = "careflow:planner:week-meal-extras";

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

function SlotChip({ iso, slot, short, label, onOpen }: {
  iso: string;
  slot: Meal["slot"];
  short: string;
  label: string;
  onOpen: (meal: Meal | null, date: string, slot: Meal["slot"]) => void;
}) {
  const { state } = useStore();
  const meal = state.meals.find(m => m.date === iso && m.slot === slot) ?? null;

  return (
    <button
      type="button"
      onClick={() => onOpen(meal, iso, slot)}
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
  );
}

/** Per-day meal slots plus tracked food calories, shown above the all-day row. */
export function PlannerWeekMealsRow({ days, colTemplate, gutterClass }: {
  days: string[];
  colTemplate: string;
  gutterClass?: string;
}) {
  const calories = useLoggedCalories(days);
  const { state, addGrocery } = useStore();
  const [showExtras, setShowExtras] = useState(() => {
    try { return localStorage.getItem(EXTRAS_KEY) === "1"; } catch { return false; }
  });
  const [editing, setEditing] = useState<{ meal: Meal | null; date: string; slot: Meal["slot"] } | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const slots = showExtras ? [...BASE_SLOTS, ...EXTRA_SLOTS] : BASE_SLOTS;
  const weekTotal = useMemo(
    () => days.reduce((sum, d) => sum + (calories[d] ?? 0), 0),
    [days, calories],
  );

  const toggleExtras = () => {
    setShowExtras(v => {
      const next = !v;
      try { localStorage.setItem(EXTRAS_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  const weekIngredientsToGroceries = async () => {
    const set = new Set<string>();
    for (const m of state.meals.filter(m => days.includes(m.date))) {
      for (const ing of m.ingredients ?? []) {
        const clean = String(ing).trim();
        if (clean) set.add(clean);
      }
    }
    if (!set.size) { toast.info("No ingredients on this week's meals yet."); return; }
    const have = new Set(state.grocery.filter(g => !g.bought).map(g => g.name.toLowerCase().trim()));
    let added = 0;
    for (const ing of set) {
      if (have.has(ing.toLowerCase())) continue;
      have.add(ing.toLowerCase());
      await addGrocery(ing);
      added++;
    }
    toast.success(added ? `Added ${added} items to your grocery list.` : "Everything is already on the list.");
  };

  return (
    <>
      <div className="grid border-b border-border/40 bg-background/30" style={{ gridTemplateColumns: colTemplate }}>
        <div className={cn("sticky left-0 z-30 flex flex-col items-end justify-center gap-0.5 border-r border-border/50 bg-card/95 py-1 pr-1 text-right backdrop-blur", gutterClass)}>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Meals</span>
          {weekTotal > 0 && (
            <span className="text-[9px] text-muted-foreground">{Math.round(weekTotal).toLocaleString()} kcal</span>
          )}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleExtras}
              aria-label={showExtras ? "Hide snack and drink slots" : "Show snack and drink slots"}
              title={showExtras ? "Hide snack & drink" : "Show snack & drink"}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", showExtras && "rotate-180")} />
            </button>
            <button
              type="button"
              onClick={() => setTemplatesOpen(true)}
              aria-label="Repeating meal patterns"
              title="Repeating meal patterns"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              <Repeat className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => void weekIngredientsToGroceries()}
              aria-label="Add this week's meal ingredients to grocery list"
              title="Add week's ingredients to grocery list"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              <ShoppingCart className="h-3 w-3" />
            </button>
          </div>
        </div>
        {days.map((iso, i) => (
          <div key={iso} className={cn("min-w-0 space-y-0.5 px-1 py-1", i > 0 && "border-l border-border/40")}>
            {slots.map(s => (
              <SlotChip
                key={s.slot}
                iso={iso}
                slot={s.slot}
                short={s.short}
                label={s.label}
                onOpen={(meal, date, slot) => setEditing({ meal, date, slot })}
              />
            ))}
            {calories[iso] ? (
              <span className="flex items-center gap-1 px-0.5 text-[9px] text-muted-foreground">
                <Flame className="h-2.5 w-2.5" aria-hidden />
                {Math.round(calories[iso]).toLocaleString()} kcal
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {editing && (
        <WeekMealDialog
          open
          onOpenChange={(v) => { if (!v) setEditing(null); }}
          meal={editing.meal}
          date={editing.date}
          slot={editing.slot}
        />
      )}
      <WeekMealTemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} days={days} />
    </>
  );
}
