import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { UtensilsCrossed, ArrowRight, Check, Circle, Pencil, Plus, ChefHat, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useMealsLibrary } from "@/lib/meals-library";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import type { Meal } from "@/lib/types";

const SLOTS: Meal["slot"][] = ["Breakfast", "Lunch", "Dinner"];

const DONE_KEY = "careflow:meals-done:v1";
function readDone(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(DONE_KEY) || "{}"); } catch { return {}; }
}
function writeDone(v: Record<string, boolean>) {
  try { localStorage.setItem(DONE_KEY, JSON.stringify(v)); } catch { /* */ }
}
function useMealDone() {
  const [done, setDone] = useState<Record<string, boolean>>(() => readDone());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === DONE_KEY) setDone(readDone()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const toggle = (id: string) => {
    setDone(prev => { const next = { ...prev, [id]: !prev[id] }; writeDone(next); return next; });
  };
  return { done, toggle };
}

function EditPopover({ date, slot, meal }: { date: string; slot: Meal["slot"]; meal?: Meal }) {
  const { addMeal, updateMeal, deleteMeal } = useStore();
  const { items: library } = useMealsLibrary();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = library.filter(m => !m.slot || m.slot === slot || (slot === "Dinner" && m.slot === "Snack"));
    if (!q) return base.slice(0, 6);
    return library.filter(m => m.title.toLowerCase().includes(q)).slice(0, 6);
  }, [library, query, slot]);

  const apply = async (name: string) => {
    if (meal) await updateMeal(meal.id, { name });
    else await addMeal({ name, date, slot });
    toast.success(`${meal ? "Updated" : "Added"} ${slot.toLowerCase()}: ${name}`);
    setQuery(""); setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={meal ? `Edit ${slot}` : `Add ${slot}`}
          title={meal ? "Edit meal" : "Add meal"}
          onClick={(e) => e.stopPropagation()}
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/15 hover:text-primary"
        >
          {meal ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 rounded-2xl p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium">
          <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
          {meal ? `Edit ${slot.toLowerCase()}` : `Plan ${slot.toLowerCase()}`}
        </div>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={meal?.name ?? "Search or type a meal…"}
          className="h-8 rounded-lg text-xs"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && query.trim()) { e.preventDefault(); await apply(query.trim()); }
          }}
        />
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="rounded-lg bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
              {query ? "Press Enter to save as a new meal." : "Your library is empty — type a name."}
            </p>
          )}
          {filtered.map(lib => (
            <button
              key={lib.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-primary/10"
              onClick={() => void apply(lib.title)}
            >
              <ChefHat className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{lib.title}</span>
              {lib.is_favorite && <Sparkles className="h-3 w-3 text-amber-400" />}
            </button>
          ))}
        </div>
        {query.trim() && (
          <Button size="sm" className="mt-2 h-7 w-full rounded-full text-xs" onClick={() => void apply(query.trim())}>
            <Plus className="mr-1 h-3 w-3" /> {meal ? `Change to "${query.trim()}"` : `Add "${query.trim()}"`}
          </Button>
        )}
        {meal && (
          <button
            type="button"
            onClick={async () => { await deleteMeal(meal.id); toast.success(`Cleared ${slot.toLowerCase()}`); setOpen(false); }}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" /> Clear meal
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

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
  const { done, toggle } = useMealDone();
  const plannedCount = SLOTS.filter(s => meals[s]).length;
  const completedCount = SLOTS.filter(s => meals[s] && done[meals[s]!.id]).length;

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
        {plannedCount} of {SLOTS.length} planned · {completedCount} done
      </p>
      <ul className="space-y-1">
        {SLOTS.map(slot => {
          const meal = meals[slot];
          const isDone = meal ? !!done[meal.id] : false;
          return (
            <li
              key={slot}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/60 px-2 py-1.5",
                isDone && "opacity-70",
              )}
            >
              <button
                type="button"
                onClick={() => { if (!meal) return; haptics.tap?.(); toggle(meal.id); }}
                disabled={!meal}
                aria-label={isDone ? `Mark ${slot} incomplete` : `Mark ${slot} complete`}
                title={meal ? (isDone ? "Mark incomplete" : "Mark complete") : "Plan a meal first"}
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full transition",
                  meal ? "hover:bg-primary/15" : "cursor-not-allowed opacity-40",
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5 text-primary" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />}
              </button>
              <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {slot}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-xs",
                  meal ? "text-foreground/90" : "italic text-muted-foreground",
                  isDone && "line-through",
                )}
                title={meal?.name}
              >
                {meal?.name ?? "Not planned"}
              </span>
              <EditPopover date={iso} slot={slot} meal={meal} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}