import { useState } from "react";
import { format, subMinutes, set } from "date-fns";
import { ChefHat, Clock, Flame, UtensilsCrossed, ChevronDown } from "lucide-react";
import { useStore, todayISO } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Meal } from "@/lib/types";

const DINNER_HOUR_KEY = "meals.dinnerTime";

export function TonightDinnerHero({ onOpen }: { onOpen: (m: Meal) => void }) {
  const { state } = useStore();
  const [dinnerAt, setDinnerAt] = useState(() => localStorage.getItem(DINNER_HOUR_KEY) || "18:00");
  const [showSteps, setShowSteps] = useState(false);
  const meal: Meal | undefined = (state.meals ?? []).find((m: Meal) => m.date === todayISO() && m.slot === "Dinner");

  const [h, m] = dinnerAt.split(":").map(Number);
  const serve = set(new Date(), { hours: h, minutes: m, seconds: 0 });
  const startCook = meal?.prepMinutes ? subMinutes(serve, meal.prepMinutes) : null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-kitchen-cream p-5 text-kitchen-ink ring-1 ring-kitchen-terracotta/20 shadow-soft sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-kitchen-terracotta/15 blur-2xl" />
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-kitchen-terracotta">
        <UtensilsCrossed className="h-3.5 w-3.5" /> Tonight's dinner
      </p>
      {meal ? (
        <>
          <button type="button" onClick={() => onOpen(meal)} className="mt-1 block text-left">
            <h2 className="font-display text-3xl font-semibold leading-tight">{meal.name}</h2>
          </button>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
            {meal.prepMinutes != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-3 py-1.5"><Clock className="h-3.5 w-3.5" />{meal.prepMinutes} min</span>
            )}
            {startCook && (
              <span className="inline-flex items-center gap-1 rounded-full bg-kitchen-terracotta px-3 py-1.5 text-kitchen-cream"><Flame className="h-3.5 w-3.5" />Start at {format(startCook, "h:mm a")}</span>
            )}
            <label className="inline-flex items-center gap-1 rounded-full bg-background/70 px-3 py-1.5">
              Serve
              <input type="time" value={dinnerAt} aria-label="Dinner time"
                onChange={(e) => { setDinnerAt(e.target.value); localStorage.setItem(DINNER_HOUR_KEY, e.target.value); }}
                className="bg-transparent outline-none" />
            </label>
          </div>
          {!!meal.steps?.length && (
            <div className="mt-4">
              <button type="button" onClick={() => setShowSteps((v) => !v)}
                className="flex items-center gap-1 text-sm font-semibold text-kitchen-terracotta">
                <ChefHat className="h-4 w-4" /> {meal.steps.length} recipe steps
                <ChevronDown className={cn("h-4 w-4 transition-transform", showSteps && "rotate-180")} />
              </button>
              {showSteps && (
                <ol className="mt-2 space-y-2">
                  {meal.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 rounded-2xl bg-background/60 p-3 text-sm">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-kitchen-terracotta/15 text-xs font-bold text-kitchen-terracotta">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
          {!meal.steps?.length && (
            <button type="button" onClick={() => onOpen(meal)} className="mt-4 text-sm font-semibold text-kitchen-terracotta">Add recipe & steps →</button>
          )}
        </>
      ) : (
        <div className="mt-1">
          <h2 className="font-display text-2xl font-semibold">Nothing planned yet</h2>
          <p className="mt-1 text-sm opacity-70">Add a dinner to tonight's row in the week below, or pick one from your library.</p>
        </div>
      )}
    </section>
  );
}
