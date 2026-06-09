import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChefHat, Plus, Sparkles, UtensilsCrossed, X, Sunrise, Sun, Moon, ChevronDown, ChevronRight, Pencil, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RecipeDrawer } from "@/components/meals/RecipeDrawer";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useMealsLibrary } from "@/lib/meals-library";
import { toast } from "sonner";

type MealSlot = "Breakfast" | "Lunch" | "Dinner";
const SLOT_ICON: Record<MealSlot, typeof Sunrise> = {
  Breakfast: Sunrise,
  Lunch: Sun,
  Dinner: Moon,
};
const SLOT_EMOJI: Record<MealSlot, string> = {
  Breakfast: "🥞",
  Lunch: "🥗",
  Dinner: "🍽️",
};

/**
 * Compact meal selector for a single slot, intended to live inside a
 * morning/afternoon/evening column on the Today view.
 */
export function MealSlotCard({ date, slot }: { date: Date; slot: MealSlot }) {
  const iso = format(date, "yyyy-MM-dd");
  const { state, addMeal, deleteMeal, updateMeal } = useStore();
  const { items: library } = useMealsLibrary();
  const meal = useMemo(
    () => state.meals.find(m => m.date === iso && m.slot === slot),
    [state.meals, iso, slot],
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newIng, setNewIng] = useState("");
  const Icon = SLOT_ICON[slot];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = library.filter(m =>
      !m.slot || m.slot === slot || (slot === "Dinner" && m.slot === "Snack"));
    if (!q) return base.slice(0, 8);
    return library.filter(m => m.title.toLowerCase().includes(q)).slice(0, 8);
  }, [library, query, slot]);

  const add = async (name: string) => {
    await addMeal({ name, date: iso, slot });
    toast.success(`Added ${slot.toLowerCase()}: ${name}`);
  };

  const ingredients = meal?.ingredients ?? [];
  const hasRecipe = (ingredients.length + (meal?.steps?.length ?? 0)) > 0;

  const setIngredient = async (idx: number, value: string) => {
    if (!meal) return;
    const next = [...ingredients];
    if (!value.trim()) next.splice(idx, 1);
    else next[idx] = value.trim();
    await updateMeal(meal.id, { ingredients: next });
  };

  const addIngredient = async () => {
    const v = newIng.trim();
    if (!v || !meal) return;
    await updateMeal(meal.id, { ingredients: [...ingredients, v] });
    setNewIng("");
  };

  return (
    <div className="mt-2 rounded-xl border border-border/50 bg-background/60 px-2 py-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {meal ? (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={expanded ? "Hide details" : "Show details"}
            title={expanded ? "Hide details" : "Show details"}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <Icon className="h-3 w-3 shrink-0 text-accent" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {slot}
        </span>
        {meal ? (
          renaming ? (
            <input
              autoFocus
              defaultValue={meal.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== meal.name) void updateMeal(meal.id, { name: v });
                setRenaming(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
              className="ml-1 min-w-0 flex-1 basis-full bg-transparent text-xs text-foreground outline-none sm:basis-auto"
            />
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="ml-1 inline-flex min-w-0 flex-1 basis-full items-center gap-1 whitespace-normal break-words text-left font-medium leading-snug text-foreground/90 hover:text-primary sm:basis-auto"
              title="Show details"
            >
              <span aria-hidden>{SLOT_EMOJI[slot]}</span>
              <span className="min-w-0 flex-1">{meal.name}</span>
            </button>
          )
        ) : (
          <span className="ml-1 min-w-0 flex-1 basis-full whitespace-normal italic text-muted-foreground sm:basis-auto">No {slot.toLowerCase()} planned</span>
        )}
        {meal && (
          <>
            <button
              type="button"
              onClick={() => setRenaming(v => !v)}
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Rename meal"
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground",
                hasRecipe && "text-primary",
              )}
              aria-label="Open recipe"
              title="Open recipe"
            >
              <BookOpen className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => void deleteMeal(meal.id)}
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear meal"
              title="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
              aria-label={`${meal ? "Change" : "Add"} ${slot.toLowerCase()}`}
              title={`${meal ? "Change" : "Add"} ${slot.toLowerCase()}`}
            >
              <Plus className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-2xl p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium">
              <UtensilsCrossed className="h-3.5 w-3.5 text-primary" /> Plan {slot.toLowerCase()}
            </div>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library or type a new meal…"
              className="h-8 rounded-lg text-xs"
              onKeyDown={async (e) => {
                if (e.key === "Enter" && query.trim()) {
                  e.preventDefault();
                  await add(query.trim());
                  setQuery(""); setOpen(false);
                }
              }}
            />
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <p className="rounded-lg bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                  {query ? "Press Enter to add as a new meal." : "Your library is empty — start by typing a name."}
                </p>
              )}
              {filtered.map(lib => (
                <button
                  key={lib.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-primary/10"
                  onClick={async () => { await add(lib.title); setOpen(false); }}
                >
                  <ChefHat className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{lib.title}</span>
                  {lib.is_favorite && <Sparkles className="h-3 w-3 text-amber-400" />}
                </button>
              ))}
            </div>
            {query.trim() && (
              <Button
                size="sm"
                className="mt-2 h-7 w-full rounded-full text-xs"
                onClick={async () => { await add(query.trim()); setQuery(""); setOpen(false); }}
              >
                <Plus className="mr-1 h-3 w-3" /> Add "{query.trim()}"
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>
      {meal && expanded && (
        <div className="mt-2 space-y-1 rounded-lg bg-muted/30 px-2 py-1.5">
          {ingredients.length === 0 && (
            <p className="text-[11px] italic text-muted-foreground">No ingredients yet — add some below.</p>
          )}
          {ingredients.map((ing, idx) => {
            return (
              <div key={`${idx}::${ing}`} className="flex items-center gap-2">
                <Checkbox aria-label={`Mark ${ing}`} className="h-3.5 w-3.5" />
                <input
                  defaultValue={ing}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v.trim() !== ing) void setIngredient(idx, v);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none"
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
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-primary hover:underline"
          >
            <BookOpen className="h-3 w-3" /> Full recipe
          </button>
        </div>
      )}
      <RecipeDrawer meal={drawerOpen ? meal ?? null : null} onClose={() => setDrawerOpen(false)} onChanged={() => {}} />
    </div>
  );
}