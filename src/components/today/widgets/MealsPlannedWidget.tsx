import { useMemo, useState } from "react";
import { format } from "date-fns";
import { UtensilsCrossed, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";

const SLOTS: Meal["slot"][] = ["Breakfast", "Lunch", "Dinner"];

/** Quick view of today's planned meals with inline add. */
export function MealsPlannedWidget({ date }: { date: Date }) {
  const { state, addMeal, updateMeal } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const meals = useMemo(
    () => Object.fromEntries(state.meals.filter(m => m.date === iso).map(m => [m.slot, m])),
    [state.meals, iso],
  ) as Partial<Record<Meal["slot"], Meal>>;

  const [draft, setDraft] = useState<Record<string, string>>({});

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
          return (
            <li key={slot} className="rounded-lg border border-border/40 bg-background/60 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{slot}</span>
                {m ? (
                  <input
                    defaultValue={m.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== m.name) void updateMeal(m.id, { name: v });
                    }}
                    className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                  />
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}