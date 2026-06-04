import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChefHat, Plus, Sparkles, UtensilsCrossed, X, Sunrise, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { useMealsLibrary } from "@/lib/meals-library";
import { toast } from "sonner";

type MealSlot = "Breakfast" | "Lunch" | "Dinner";
const SLOT_ICON: Record<MealSlot, typeof Sunrise> = {
  Breakfast: Sunrise,
  Lunch: Sun,
  Dinner: Moon,
};

/**
 * Compact meal selector for a single slot, intended to live inside a
 * morning/afternoon/evening column on the Today view.
 */
export function MealSlotCard({ date, slot }: { date: Date; slot: MealSlot }) {
  const iso = format(date, "yyyy-MM-dd");
  const { state, addMeal, deleteMeal } = useStore();
  const { items: library } = useMealsLibrary();
  const meal = useMemo(
    () => state.meals.find(m => m.date === iso && m.slot === slot),
    [state.meals, iso, slot],
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  return (
    <div className="mt-2 rounded-xl border border-border/50 bg-background/60 px-2 py-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0 text-accent" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {slot}
        </span>
        {meal ? (
          <span className="ml-1 min-w-0 flex-1 basis-full whitespace-normal break-words font-medium leading-snug text-foreground/90 sm:basis-auto">
            {meal.name}
          </span>
        ) : (
          <span className="ml-1 min-w-0 flex-1 basis-full whitespace-normal italic text-muted-foreground sm:basis-auto">No {slot.toLowerCase()} planned</span>
        )}
        {meal && (
          <button
            type="button"
            onClick={() => void deleteMeal(meal.id)}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear meal"
            title="Clear"
          >
            <X className="h-3 w-3" />
          </button>
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
    </div>
  );
}