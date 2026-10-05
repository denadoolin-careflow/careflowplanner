import { useMemo, useState } from "react";
import { format, subMinutes, set } from "date-fns";
import { ChefHat, Clock, Flame, UtensilsCrossed, ChevronDown, ShoppingCart, Check } from "lucide-react";
import { useStore, todayISO } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Meal } from "@/lib/types";
import { PlanDinnerSheet } from "@/components/meals/PlanDinnerSheet";
import { useMealPeople } from "@/lib/meal-people";
import { usePeopleDirectory } from "@/lib/people-directory";

const DINNER_HOUR_KEY = "meals.dinnerTime";

export function TonightDinnerHero({ onOpen }: { onOpen: (m: Meal) => void }) {
  const { state, addGrocery } = useStore();
  const [dinnerAt, setDinnerAt] = useState(() => localStorage.getItem(DINNER_HOUR_KEY) || "18:00");
  const [showSteps, setShowSteps] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const dinners: Meal[] = useMemo(() => (state.meals ?? []).filter((m: Meal) => m.date === todayISO() && m.slot === "Dinner"), [state.meals]);
  const { links } = useMealPeople(dinners.map((d) => d.id));
  const people = usePeopleDirectory();
  const linkedIds = new Set(links.map((l) => l.mealId));
  const meal: Meal | undefined = dinners.find((d) => !linkedIds.has(d.id)) ?? dinners[0];
  const plates = dinners.filter((d) => d.id !== meal?.id && linkedIds.has(d.id)).map((d) => {
    const l = links.find((x) => x.mealId === d.id);
    const p = people.find((x) => x.id === l?.personId);
    return { id: d.id, meal: d, who: p ? `${p.emoji ? p.emoji + " " : ""}${p.name}` : "Someone" };
  });

  const [h, m] = dinnerAt.split(":").map(Number);
  const serve = set(new Date(), { hours: h, minutes: m, seconds: 0 });
  const startCook = meal?.prepMinutes ? subMinutes(serve, meal.prepMinutes) : null;

  const ingredients = useMemo(() => (meal?.ingredients ?? []).filter((i) => i.trim()), [meal]);
  const onList = useMemo(() => {
    const names = new Set((state.grocery ?? []).filter((g) => !g.bought).map((g) => g.name.trim().toLowerCase()));
    return ingredients.filter((i) => names.has(i.trim().toLowerCase()));
  }, [state.grocery, ingredients]);

  const openShop = () => {
    const next: Record<string, boolean> = {};
    const names = new Set((state.grocery ?? []).filter((g) => !g.bought).map((g) => g.name.trim().toLowerCase()));
    ingredients.forEach((i) => { next[i] = !names.has(i.trim().toLowerCase()); });
    setChecked(next);
    setShopOpen(true);
  };

  const addSelected = async () => {
    const selected = ingredients.filter((i) => checked[i]);
    if (!selected.length) { setShopOpen(false); return; }
    setAdding(true);
    try {
      for (const name of selected) await addGrocery(name);
      toast.success(`Added ${selected.length} ingredient${selected.length === 1 ? "" : "s"} to your shopping list`, {
        description: meal ? `From ${meal.name}` : undefined,
      });
      setShopOpen(false);
    } finally {
      setAdding(false);
    }
  };

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
          {plates.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {plates.map((p) => (
                <button key={p.id} type="button" onClick={() => onOpen(p.meal)}
                  className="rounded-full bg-kitchen-terracotta/10 px-2.5 py-1 text-xs font-medium ring-1 ring-kitchen-terracotta/25">
                  {p.who} · {p.meal.name}
                </button>
              ))}
            </div>
          )}
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => setPlanOpen(true)}
              className="gap-1.5 rounded-full bg-kitchen-terracotta text-kitchen-cream hover:bg-kitchen-terracotta/90">
              <UtensilsCrossed className="h-4 w-4" /> Edit dinner
            </Button>
            {!!ingredients.length && (
              <Button type="button" size="sm" variant="outline" onClick={openShop}
                className="gap-1.5 rounded-full border-kitchen-terracotta/40 bg-transparent text-kitchen-terracotta">
                <ShoppingCart className="h-4 w-4" /> Shop
              </Button>
            )}
            {!!meal.steps?.length && (
              <button type="button" onClick={() => setShowSteps((v) => !v)}
                className="flex items-center gap-1 text-sm font-semibold text-kitchen-terracotta">
                <ChefHat className="h-4 w-4" /> {meal.steps.length} recipe steps
                <ChevronDown className={cn("h-4 w-4 transition-transform", showSteps && "rotate-180")} />
              </button>
            )}
          </div>
          {showSteps && !!meal.steps?.length && (
            <ol className="mt-3 space-y-2">
              {meal.steps.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-background/60 p-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-kitchen-terracotta/15 text-xs font-bold text-kitchen-terracotta">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}
          {!meal.steps?.length && (
            <button type="button" onClick={() => onOpen(meal)} className="mt-3 text-sm font-semibold text-kitchen-terracotta">Add recipe & steps →</button>
          )}
        </>
      ) : (
        <div className="mt-1">
          <h2 className="font-display text-2xl font-semibold">Nothing planned yet</h2>
          <p className="mt-1 text-sm opacity-70">Write one in or pick from your library.</p>
          <Button type="button" size="sm" onClick={() => setPlanOpen(true)}
            className="mt-4 gap-1.5 rounded-full bg-kitchen-terracotta text-kitchen-cream hover:bg-kitchen-terracotta/90">
            <UtensilsCrossed className="h-4 w-4" /> Plan a meal
          </Button>
        </div>
      )}

      <PlanDinnerSheet open={planOpen} onOpenChange={setPlanOpen} dinners={dinners} links={links} />

      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Shop for {meal?.name}</DialogTitle>
            <DialogDescription>
              Pick the ingredients you need — anything already on your shopping list is unchecked.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto py-1">
            {ingredients.map((ing) => {
              const isChecked = !!checked[ing];
              return (
                <li key={ing}>
                  <button type="button" onClick={() => setChecked((c) => ({ ...c, [ing]: !c[ing] }))}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm ring-1 transition",
                      isChecked ? "bg-kitchen-terracotta/10 ring-kitchen-terracotta/30" : "bg-background/60 ring-border/40 opacity-60",
                    )}>
                    <span className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1",
                      isChecked ? "bg-kitchen-terracotta text-kitchen-cream ring-kitchen-terracotta" : "ring-border",
                    )}>
                      {isChecked && <Check className="h-3.5 w-3.5" />}
                    </span>
                    {ing}
                  </button>
                </li>
              );
            })}
          </ul>
          <Button type="button" onClick={addSelected} disabled={adding}
            className="w-full gap-1.5 rounded-full bg-kitchen-terracotta text-kitchen-cream hover:bg-kitchen-terracotta/90">
            <ShoppingCart className="h-4 w-4" />
            {adding ? "Adding…" : `Add ${ingredients.filter((i) => checked[i]).length} to shopping list`}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
