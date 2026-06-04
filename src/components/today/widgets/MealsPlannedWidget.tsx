import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { UtensilsCrossed, ArrowRight, Plus, BookOpen, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";
import { RecipeDrawer } from "@/components/meals/RecipeDrawer";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const SLOTS: Meal["slot"][] = ["Breakfast", "Lunch", "Dinner"];

function checkKey(mealId: string, date: string) {
  return `careflow:meal-ingredients:${mealId}:${date}`;
}

function useIngredientChecks(mealId: string | undefined, date: string) {
  const key = mealId ? checkKey(mealId, date) : null;
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    if (!key) return {};
    try { return JSON.parse(localStorage.getItem(key) ?? "{}"); } catch { return {}; }
  });
  useEffect(() => {
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(checks)); } catch { /* ignore */ }
  }, [key, checks]);
  return [checks, setChecks] as const;
}

function IngredientChecklist({ meal }: { meal: Meal }) {
  const { updateMeal } = useStore();
  const [checks, setChecks] = useIngredientChecks(meal.id, meal.date);
  const ingredients = meal.ingredients ?? [];
  const [newIng, setNewIng] = useState("");

  const setIngredient = async (idx: number, value: string) => {
    const next = [...ingredients];
    if (!value.trim()) next.splice(idx, 1);
    else next[idx] = value.trim();
    await updateMeal(meal.id, { ingredients: next });
  };

  const addIngredient = async () => {
    const v = newIng.trim();
    if (!v) return;
    await updateMeal(meal.id, { ingredients: [...ingredients, v] });
    setNewIng("");
  };

  return (
    <div className="mt-1.5 space-y-1 rounded-lg bg-muted/30 px-2 py-1.5">
      {ingredients.length === 0 && (
        <p className="text-[11px] italic text-muted-foreground">No ingredients yet — add some below.</p>
      )}
      {ingredients.map((ing, idx) => {
        const key = `${idx}::${ing}`;
        const checked = !!checks[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              checked={checked}
              onCheckedChange={(c) => setChecks(s => ({ ...s, [key]: !!c }))}
              aria-label={`Mark ${ing}`}
              className="h-3.5 w-3.5"
            />
            <input
              defaultValue={ing}
              onBlur={(e) => {
                const v = e.target.value;
                if (v.trim() !== ing) void setIngredient(idx, v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none",
                checked && "text-muted-foreground line-through",
              )}
            />
            <button
              type="button"
              onClick={() => void setIngredient(idx, "")}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
              title="Remove"
              aria-label="Remove ingredient"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <form
        onSubmit={(e) => { e.preventDefault(); void addIngredient(); }}
        className="flex items-center gap-2 pt-0.5"
      >
        <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
        <input
          value={newIng}
          onChange={(e) => setNewIng(e.target.value)}
          placeholder="Add ingredient…"
          className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/70"
        />
      </form>
    </div>
  );
}

/** Quick view of today's planned meals with inline add. */
export function MealsPlannedWidget({ date }: { date: Date }) {
  const { state, addMeal, updateMeal } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const meals = useMemo(
    () => Object.fromEntries(state.meals.filter(m => m.date === iso).map(m => [m.slot, m])),
    [state.meals, iso],
  ) as Partial<Record<Meal["slot"], Meal>>;

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [quickMeal, setQuickMeal] = useState<Meal | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<Record<string, boolean>>({});

  const submit = async (slot: Meal["slot"]) => {
    const name = (draft[slot] ?? "").trim();
    if (!name) return;
    if (meals[slot]) await updateMeal(meals[slot]!.id, { name });
    else await addMeal({ name, date: iso, slot });
    setDraft(d => ({ ...d, [slot]: "" }));
  };

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
      <ul className="space-y-1.5">
        {SLOTS.map(slot => {
          const m = meals[slot];
          const isOpen = m ? !!expanded[m.id] : false;
          const isRenaming = m ? !!renaming[m.id] : false;
          return (
            <li key={slot} className="rounded-lg border border-border/40 bg-background/60 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{slot}</span>
                {m ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpanded(e => ({ ...e, [m.id]: !e[m.id] }))}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label={isOpen ? "Hide ingredients" : "Show ingredients"}
                    >
                      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                    {isRenaming ? (
                      <input
                        autoFocus
                        defaultValue={m.name}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== m.name) void updateMeal(m.id, { name: v });
                          setRenaming(r => ({ ...r, [m.id]: false }));
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                        className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQuickMeal(m)}
                        className="min-w-0 flex-1 truncate text-left text-xs text-foreground hover:text-primary"
                        title="Open recipe"
                      >
                        {m.name}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRenaming(r => ({ ...r, [m.id]: !r[m.id] }))}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      title="Rename"
                      aria-label="Rename meal"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {((m.ingredients?.length ?? 0) > 0 || (m.steps?.length ?? 0) > 0) && (
                      <button
                        type="button"
                        onClick={() => setQuickMeal(m)}
                        title="View recipe"
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      >
                        <BookOpen className="h-3 w-3" />
                      </button>
                    )}
                  </>
                ) : (
                  <form
                    onSubmit={(e) => { e.preventDefault(); void submit(slot); }}
                    className="flex min-w-0 flex-1 items-center gap-1"
                  >
                    <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <input
                      value={draft[slot] ?? ""}
                      onChange={(e) => setDraft(d => ({ ...d, [slot]: e.target.value }))}
                      placeholder="Add…"
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
                    />
                  </form>
                )}
              </div>
              {m && isOpen && <IngredientChecklist meal={m} />}
            </li>
          );
        })}
      </ul>
      <RecipeDrawer meal={quickMeal} onClose={() => setQuickMeal(null)} onChanged={() => {}} />
    </section>
  );
}