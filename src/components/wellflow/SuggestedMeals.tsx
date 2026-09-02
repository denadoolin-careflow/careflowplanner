import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, ShoppingCart, CalendarPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  addIngredientsToGroceries, addMealToPlan, candidateForMeal, suggestMeals,
  type MealSuggestion, type PlanSlot,
} from "@/lib/wellflow/meal-plan";
import { logFood } from "@/lib/wellflow/data";
import { todayISO } from "@/lib/wellflow/types";

const SLOTS: PlanSlot[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export function SuggestedMeals({
  date = todayISO(), remaining,
}: { date?: string; remaining: { calories: number | null; protein: number | null } }) {
  const [items, setItems] = useState<MealSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [planFor, setPlanFor] = useState<MealSuggestion | null>(null);
  const [planDate, setPlanDate] = useState(date);
  const [planSlot, setPlanSlot] = useState<PlanSlot>("Dinner");

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await suggestMeals(remaining)); }
    catch { setItems([]); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining.calories, remaining.protein]);

  useEffect(() => { void load(); }, [load]);

  const logNow = async (m: MealSuggestion) => {
    setBusyId(m.id);
    try {
      const candidate = await candidateForMeal(m.title);
      await logFood({ date, candidate, servings: 1, mealType: "dinner" });
      toast.success(`${m.title} logged — edit it any time`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log that");
    } finally { setBusyId(null); }
  };

  const toGroceries = async (m: MealSuggestion) => {
    setBusyId(m.id);
    try {
      const added = await addIngredientsToGroceries(m.ingredients, { name: m.title, date });
      toast.success(added ? `${added} item${added === 1 ? "" : "s"} added to groceries`
                          : "Everything's already stocked or on the list");
    } catch {
      toast.error("Could not update your grocery list");
    } finally { setBusyId(null); }
  };

  const confirmPlan = async () => {
    if (!planFor) return;
    try {
      await addMealToPlan(planFor.title, planDate, planSlot, planFor.ingredients);
      toast.success(`${planFor.title} added to your meal plan`);
      setPlanFor(null);
    } catch {
      toast.error("Could not add that to the plan");
    }
  };

  if (!loading && items.length === 0) return null;

  return (
    <SectionCard title="Suggested meals" subtitle="From your meal library, matched to today"
                 collapsibleId="wellflow-suggestions">
      {loading ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
      ) : (
        <ul className="space-y-2">
          {items.map(m => (
            <li key={m.id} className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2.5">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">
                {m.reason}
                {m.calories ? ` · ~${Math.round(m.calories)} cal` : ""}
                {m.protein ? ` · ${Math.round(m.protein)}g protein` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" className="gap-1.5"
                        disabled={busyId === m.id} onClick={() => logNow(m)}>
                  {busyId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Log now
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5"
                        onClick={() => { setPlanFor(m); setPlanDate(date); }}>
                  <CalendarPlus className="h-3.5 w-3.5" /> Add to plan
                </Button>
                {m.ingredients.length > 0 && (
                  <Button size="sm" variant="ghost" className="gap-1.5"
                          disabled={busyId === m.id} onClick={() => toGroceries(m)}>
                    <ShoppingCart className="h-3.5 w-3.5" /> Ingredients to groceries
                  </Button>
                )}
              </div>

              {planFor?.id === m.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-muted/40 p-2">
                  <Input type="date" className="w-40" value={planDate}
                         aria-label="Plan date" onChange={e => setPlanDate(e.target.value)} />
                  <Select value={planSlot} onValueChange={v => setPlanSlot(v as PlanSlot)}>
                    <SelectTrigger className="w-32" aria-label="Meal slot"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={confirmPlan}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPlanFor(null)}>Cancel</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
