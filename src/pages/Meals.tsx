import { useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { startOfWeek, addDays, format } from "date-fns";
import { Sparkles, Settings2, Clock } from "lucide-react";
import { toast } from "sonner";
import { planWeek, fillWeekFromFavorites } from "@/lib/meal-ai";
import { MealPrefsDialog } from "@/components/meals/MealPrefsDialog";
import { RecipeDrawer } from "@/components/meals/RecipeDrawer";
import { PantryPanel } from "@/components/meals/PantryPanel";
import { FavoritesPanel } from "@/components/meals/FavoritesPanel";
import { GroceryList } from "@/components/meals/GroceryList";
import type { Meal } from "@/lib/types";

export default function Meals() {
  const { state, user, addMeal, deleteMeal, reloadAll } = useStore();
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const slots = ["Breakfast","Lunch","Dinner","Snack"] as const;
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null);
  const [planning, setPlanning] = useState(false);
  const [filling, setFilling] = useState(false);

  const onPlanWeek = async () => {
    setPlanning(true);
    try {
      const startISO = start.toISOString().slice(0, 10);
      const res = await planWeek(startISO);
      await reloadAll();
      toast.success(`Planned ${res.meals} meals · added ${res.grocery} grocery items.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't plan the week");
    } finally {
      setPlanning(false);
    }
  };

  const onFillFromFavorites = async (replace: boolean) => {
    if (!user?.id) return;
    setFilling(true);
    try {
      const startISO = start.toISOString().slice(0, 10);
      const res = await fillWeekFromFavorites(user.id, startISO, {
        replace, onlyEmpty: !replace, addGroceries: true,
      });
      await reloadAll();
      if (res.filled === 0) toast.info("No favorites yet — add a recipe first.");
      else toast.success(`Filled ${res.filled} slots from favorites.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fill from favorites");
    } finally { setFilling(false); }
  };

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-warm flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold">Meals this week</h2>
          <p className="mt-1 text-sm text-muted-foreground">Simple, kid-safe, no decisions at 5pm.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setPrefsOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />Preferences
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => onFillFromFavorites(false)} disabled={filling}>
            {filling ? "Filling…" : "Fill from favorites"}
          </Button>
          <Button onClick={onPlanWeek} disabled={planning} className="rounded-full">
            <Sparkles className={`mr-2 h-4 w-4 ${planning ? "animate-pulse" : ""}`} />
            {planning ? "Planning…" : "Plan my week"}
          </Button>
        </div>
      </div>

      <SectionCard title="Weekly meal plan" accent="warm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="p-2"></th>
                {days.map(d => <th key={d.toISOString()} className="p-2">{format(d, "EEE d")}</th>)}
              </tr>
            </thead>
            <tbody>
              {slots.map(s => (
                <tr key={s} className="border-t border-border/60">
                  <td className="p-2 text-xs uppercase text-muted-foreground">{s}</td>
                  {days.map(d => {
                    const m = state.meals.find(x => x.date === d.toISOString().slice(0,10) && x.slot === s);
                    return (
                      <td key={d.toISOString()} className="p-1 align-top">
                        {m ? (
                          <button
                            onClick={() => setActiveMeal(m)}
                            className="group w-full rounded-lg bg-muted/40 px-2 py-1.5 text-left text-xs transition hover:bg-primary/15 hover:ring-1 hover:ring-primary/30"
                          >
                            <div className="line-clamp-2">{m.name}</div>
                            {m.prepMinutes ? (
                              <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />{m.prepMinutes}m
                              </div>
                            ) : null}
                          </button>
                        ) : (
                          <button onClick={() => { const name = prompt(`${s} for ${format(d,"EEE")}:`); if (name) addMeal({ name, date: d.toISOString().slice(0,10), slot: s }); }}
                            className="w-full rounded-lg border border-dashed border-border/60 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">+</button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="Grocery list" subtitle="Auto-updated by your meal plan" accent="sage">
          <GroceryList />
        </SectionCard>

        <SectionCard title="Saved favorites" accent="warm">
          <FavoritesPanel />
        </SectionCard>

        <SectionCard title="Pantry staples" subtitle="Skipped from grocery generation" accent="sage">
          <PantryPanel />
        </SectionCard>

        <SectionCard title="How AI planning works" accent="calm">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>Set your preferences once — diets, allergies, picky eaters, budget.</li>
            <li>Tap <strong>Plan my week</strong> and AI fills all 7 days.</li>
            <li>Click any meal for the full recipe, or to regenerate it.</li>
            <li>Pantry items are skipped from the grocery list.</li>
          </ul>
        </SectionCard>
      </div>

      <MealPrefsDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
      <RecipeDrawer meal={activeMeal} onClose={() => setActiveMeal(null)} onChanged={reloadAll} />
    </div>
  );
}
