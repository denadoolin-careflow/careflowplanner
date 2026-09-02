import { SuggestedMeals } from "@/components/wellflow/SuggestedMeals";
import { FoodLibrary } from "@/components/wellflow/FoodLibrary";
import { GoalBars } from "@/components/wellflow/GoalBars";
import { EditFoodDialog, type EditableFood } from "@/components/wellflow/EditFoodDialog";
import { useGoals } from "@/lib/wellflow/data";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteFoodEntry, logFood, savedToCandidate, sumEntries, updateFoodEntry,
  useFoodEntries, useSavedFoods,
} from "@/lib/wellflow/data";
import { MEAL_TYPES, todayISO, type FoodEntry, type MealType } from "@/lib/wellflow/types";

export function FoodTab({ date = todayISO(), onLogFood }: { date?: string; onLogFood: () => void }) {
  const { entries, loading } = useFoodEntries(date);
  const { foods } = useSavedFoods();
  const { goals } = useGoals();
  const totals = useMemo(() => sumEntries(entries), [entries]);
  const [editing, setEditing] = useState<FoodEntry | null>(null);

  const byMeal = useMemo(() => {
    const map: Record<MealType, typeof entries> = {
      breakfast: [], lunch: [], dinner: [], snack: [], other: [],
    };
    entries.forEach(e => map[e.meal_type]?.push(e));
    return map;
  }, [entries]);

  const favorites = foods.filter(f => f.favorite).slice(0, 8);
  const recents = foods.slice(0, 8);

  /** Rough per-meal share of the daily goal, so each meal gets its own bar. */
  const mealGoal = (g: number | null, meals: number) => (g == null ? null : g / Math.max(meals, 1));
  const activeMeals = MEAL_TYPES.filter(m => byMeal[m.key].length > 0).length || 1;

  const logAgain = async (id: string) => {
    const saved = foods.find(f => f.id === id);
    if (!saved) return;
    try {
      await logFood({ date, candidate: savedToCandidate(saved), servings: 1, mealType: guessMeal() });
      toast.success(`${saved.name} logged`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log that");
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Food"
        subtitle={format(new Date(`${date}T12:00:00`), "EEEE, MMMM d")}
        accent="sage"
        action={<Button size="sm" className="gap-1.5" onClick={onLogFood}><Plus className="h-4 w-4" /> Log</Button>}
      >
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <Mini label="Calories" v={totals.calories} />
          <Mini label="Protein" v={totals.protein} unit="g" />
          <Mini label="Carbs" v={totals.carbs} unit="g" />
          <Mini label="Fat" v={totals.fat} unit="g" />
        </div>

        <GoalBars
          className="mt-4"
          items={[
            { label: "Calories", value: totals.calories, goal: goals.calories },
            { label: "Protein", value: totals.protein, goal: goals.protein, unit: "g" },
            { label: "Fiber", value: totals.fiber, goal: goals.fiber, unit: "g" },
            { label: "Carbs", value: totals.carbs, goal: goals.carbs, unit: "g" },
            { label: "Fat", value: totals.fat, goal: goals.fat, unit: "g" },
          ]}
        />
      </SectionCard>

      <FoodLibrary date={date} />

      <SuggestedMeals
        date={date}
        remaining={{
          calories: goals.calories == null ? null : Math.max(goals.calories - totals.calories, 0),
          protein: goals.protein == null ? null : Math.max(goals.protein - totals.protein, 0),
        }}
      />

      {(favorites.length > 0 || recents.length > 0) && (
        <SectionCard title="Log again" subtitle="Your favorites and recent foods" collapsibleId="wellflow-again">
          <div className="flex flex-wrap gap-2">
            {(favorites.length ? favorites : recents).map(f => (
              <button key={f.id} type="button" onClick={() => logAgain(f.id)}
                      className="rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:bg-muted/60">
                {f.name} <span className="text-muted-foreground">{Math.round(f.calories)} cal</span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Today's meals">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
        ) : entries.length === 0 ? (
          <EmptyState title="No food logged today" hint="Search a food, scan a barcode, or just describe what you ate.">
            <Button size="sm" className="mt-2" onClick={onLogFood}>What did you eat?</Button>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {MEAL_TYPES.filter(m => byMeal[m.key].length > 0).map(m => {
              const mealTotals = sumEntries(byMeal[m.key]);
              return (
                <div key={m.key}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </p>
                  <ul className="space-y-1.5">
                    {byMeal[m.key].map(e => (
                      <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.food_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {e.servings !== 1 ? `${e.servings} × ` : ""}{e.serving_size || "1 serving"} ·{" "}
                            {Math.round(e.calories)} cal • {Math.round(e.protein)}g P • {Math.round(e.carbs)}g C • {Math.round(e.fat)}g F
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${e.food_name}`}
                                onClick={() => setEditing(e)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete ${e.food_name}`}
                                onClick={async () => { await deleteFoodEntry(e.id); toast.success("Entry removed"); }}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <GoalBars
                    compact
                    className="mt-2 rounded-2xl bg-muted/20 px-3 py-2"
                    items={[
                      { label: "Calories", value: mealTotals.calories, goal: mealGoal(goals.calories, activeMeals) },
                      { label: "Protein", value: mealTotals.protein, goal: mealGoal(goals.protein, activeMeals), unit: "g" },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <EditFoodDialog
        open={!!editing}
        onOpenChange={v => { if (!v) setEditing(null); }}
        title="Edit meal"
        withServings
        value={editing ? {
          name: editing.food_name,
          serving_size: editing.serving_size,
          calories: editing.calories,
          protein: editing.protein,
          carbs: editing.carbs,
          fat: editing.fat,
          fiber: editing.fiber,
          servings: editing.servings,
        } : null}
        onSave={async next => {
          if (!editing) return;
          await updateFoodEntry(editing.id, {
            food_name: next.name,
            serving_size: next.serving_size,
            servings: next.servings ?? editing.servings,
            calories: next.calories,
            protein: next.protein,
            carbs: next.carbs,
            fat: next.fat,
            fiber: next.fiber,
          });
        }}
      />
    </div>
  );
}

function guessMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function Mini({ label, v, unit = "" }: { label: string; v: number; unit?: string }) {
  return (
    <div className="rounded-2xl bg-muted/30 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{Math.round(v)}{unit}</p>
    </div>
  );
}
