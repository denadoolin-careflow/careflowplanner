import { useState } from "react";
import { Plus, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Meal } from "@/lib/types";

export const MEAL_SLOTS: { slot: Meal["slot"]; label: string; atMin: number; band: string }[] = [
  { slot: "Breakfast", label: "Breakfast", atMin: 7 * 60 + 30, band: "morning" },
  { slot: "Lunch", label: "Lunch", atMin: 12 * 60, band: "afternoon" },
  { slot: "Dinner", label: "Dinner", atMin: 18 * 60, band: "evening" },
];

function MealChip({ iso, slot, label, style }: { iso: string; slot: Meal["slot"]; label: string; style: React.CSSProperties }) {
  const { state, addMeal, updateMeal } = useStore();
  const meal = state.meals.find(m => m.date === iso && m.slot === slot);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const save = async () => {
    const name = text.trim();
    if (!name) { setOpen(false); return; }
    if (meal) await updateMeal(meal.id, { name });
    else await addMeal({ name, date: iso, slot });
    setText(""); setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setText(meal?.name ?? ""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={style}
          aria-label={meal ? `${label}: ${meal.name}. Edit meal` : `Add ${label.toLowerCase()}`}
          className={cn(
            "absolute right-1 z-10 flex max-w-[46%] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] shadow-sm backdrop-blur",
            meal
              ? "border-yellow-300/70 bg-yellow-100/80 text-yellow-950 dark:border-yellow-800/60 dark:bg-yellow-900/50 dark:text-yellow-50"
              : "border-dashed border-border/70 bg-card/70 text-muted-foreground",
          )}
        >
          {meal ? <UtensilsCrossed className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
          <span className="truncate">{meal ? meal.name : label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Input
          autoFocus value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } if (e.key === "Escape") setOpen(false); }}
          placeholder="What's on the menu?" className="h-8 text-sm"
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Breakfast / lunch / dinner markers pinned to their day part on the grid.
 * `topFor` converts an absolute minute-of-day into a pixel offset.
 */
export function PlannerMealLane({ iso, topFor }: { iso: string; topFor: (absMin: number) => number | null }) {
  return (
    <>
      {MEAL_SLOTS.map(m => {
        const top = topFor(m.atMin);
        if (top === null) return null;
        return <MealChip key={m.slot} iso={iso} slot={m.slot} label={m.label} style={{ top: top + 2 }} />;
      })}
    </>
  );
}