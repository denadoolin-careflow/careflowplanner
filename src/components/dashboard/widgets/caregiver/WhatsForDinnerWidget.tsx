import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore, todayISO } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Soup, Refresh, Sparkles, ShoppingBasket, Plus, Loader2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { suggestDinners, type DinnerSuggestion, type DinnerFilter } from "@/lib/dinner-suggester";
import { listPantry, type PantryItem, saveFavorite, applyFavoriteToSlot } from "@/lib/meal-ai";
import { retailerSearchUrl, RETAILER_LABEL, type Retailer } from "@/lib/retailer-links";
import { loadCheckin } from "@/lib/caregiver-checkins";
import { energyBanner } from "@/lib/caregiver-checkin-copy";
import { toast } from "sonner";

// lucide doesn't export Refresh on all versions — use a tiny shim if needed
const RefreshIcon = (Refresh as any) ?? Sparkles;

const FILTERS: { id: DinnerFilter; label: string; emoji: string }[] = [
  { id: "toddler",    label: "Toddler",    emoji: "👶" },
  { id: "sensory",    label: "Sensory",    emoji: "🧩" },
  { id: "low-energy", label: "Low Energy", emoji: "⚡" },
  { id: "15-min",     label: "15 min",     emoji: "⏱" },
  { id: "freezer",    label: "Freezer",    emoji: "🥶" },
  { id: "healthy",    label: "Healthy",    emoji: "🥗" },
  { id: "budget",     label: "Budget",     emoji: "💰" },
];

function pantryHitRate(ingredients: string[], pantry: string[]): number {
  if (!ingredients.length) return 0;
  const lc = pantry.map((p) => p.toLowerCase());
  const hits = ingredients.filter((i) =>
    lc.some((p) => p.includes(i.toLowerCase()) || i.toLowerCase().includes(p)),
  ).length;
  return Math.round((hits / ingredients.length) * 100);
}

function missingIngredients(ingredients: string[], pantry: string[]): string[] {
  const lc = pantry.map((p) => p.toLowerCase());
  return ingredients.filter(
    (i) => !lc.some((p) => p.includes(i.toLowerCase()) || i.toLowerCase().includes(p)),
  );
}

export function WhatsForDinnerWidget() {
  const { state, addGrocery } = useStore();
  const T = todayISO();
  const planned = state.meals.find((m) => m.date === T && m.slot === "Dinner");

  const [uid, setUid] = useState<string | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [pantryOnly, setPantryOnly] = useState(false);
  const [filters, setFilters] = useState<DinnerFilter[]>([]);
  const [energy, setEnergy] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<DinnerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggester, setShowSuggester] = useState(!planned);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      if (cancelled) return;
      setUid(id);
      if (id) {
        const [pi, ci] = await Promise.all([listPantry(id), loadCheckin(id, T)]);
        if (cancelled) return;
        setPantry(pi);
        setEnergy(ci.energy ?? null);
      }
    });
    return () => { cancelled = true; };
  }, [T]);

  const pantryNames = useMemo(
    () => pantry.filter((p) => p.in_stock).map((p) => p.name),
    [pantry],
  );

  async function regenerate() {
    setLoading(true);
    try {
      const res = await suggestDinners({
        energy,
        filters,
        mode: pantryOnly ? "pantry_only" : "smart",
        family_size: 2,
        pantry: pantryNames,
        avoid: planned ? [planned.name] : [],
      });
      setSuggestions(res);
      setShowSuggester(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fetch suggestions");
    } finally {
      setLoading(false);
    }
  }

  function toggleFilter(f: DinnerFilter) {
    setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  async function addMissingToGrocery(items: string[]) {
    for (const it of items.slice(0, 12)) {
      await addGrocery(it);
    }
    toast.success(`Added ${Math.min(items.length, 12)} to grocery list`);
  }

  async function saveFav(s: DinnerSuggestion) {
    if (!uid) return;
    await saveFavorite(uid, {
      name: s.name,
      slot: "Dinner",
      prep_minutes: s.prep_minutes ?? null,
      ingredients: s.ingredients ?? [],
      steps: [],
      tags: [s.easy_tag].filter(Boolean),
      notes: s.reason ?? null,
    });
    toast.success("Saved to favorites");
  }

  async function addToWeek(s: DinnerSuggestion) {
    if (!uid) return;
    await applyFavoriteToSlot(uid, {
      id: "",
      name: s.name,
      slot: "Dinner",
      prep_minutes: s.prep_minutes,
      ingredients: s.ingredients,
      steps: [],
      tags: [s.easy_tag].filter(Boolean),
      notes: s.reason ?? null,
    }, T, "Dinner", { addGroceries: false, replace: true });
    toast.success("Added to today's plan");
  }

  const banner = energyBanner(energy);

  return (
    <div className="space-y-3">
      {banner && (
        <div className="rounded-xl border border-secondary/30 bg-secondary-soft/40 p-2.5 text-xs">
          <p className="font-medium">{banner.headline}</p>
          <p className="text-muted-foreground">{banner.body}</p>
        </div>
      )}

      {planned && !showSuggester ? (
        <div className="rounded-2xl bg-muted/40 p-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-foreground">
              <Soup className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tonight</p>
              <p className="truncate text-sm font-medium">{planned.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {planned.prepMinutes ? `${planned.prepMinutes} min prep` : "Quick plan"}
                {planned.ingredients?.length
                  ? ` · ${pantryHitRate(planned.ingredients, pantryNames)}% in pantry`
                  : ""}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => toast.message(planned.name, { description: planned.notes ?? "Time to cook!" })}>
              Cook This
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowSuggester(true); void regenerate(); }}>
              <RefreshIcon className="mr-1 h-3.5 w-3.5" /> Swap Meal
            </Button>
            {planned.ingredients?.length ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addMissingToGrocery(missingIngredients(planned.ingredients!, pantryNames))}
              >
                <ShoppingBasket className="mr-1 h-3.5 w-3.5" /> Add Missing
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                  filters.includes(f.id)
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-card/60 text-muted-foreground",
                )}
              >
                <span className="mr-0.5">{f.emoji}</span>{f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={pantryOnly}
                onChange={(e) => setPantryOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Use what I have
            </label>
            <Button size="sm" onClick={regenerate} disabled={loading} className="h-7 rounded-full">
              {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
              {suggestions.length ? "Regenerate" : "Suggest"}
            </Button>
          </div>

          {suggestions.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">Tap Suggest to get three caregiver-friendly ideas for tonight.</p>
          )}

          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const hit = pantryHitRate(s.ingredients, pantryNames);
              const missing = missingIngredients(s.ingredients, pantryNames);
              return (
                <div key={i} className="rounded-xl border border-border/50 bg-card/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        ⏱ {(s.prep_minutes ?? 0) + (s.cook_minutes ?? 0)} min · {hit}% in pantry
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 rounded-full px-2 py-0 text-[10px]">⭐ {s.easy_tag}</Badge>
                  </div>
                  {s.reason && <p className="mt-1 line-clamp-2 text-[11px] italic text-foreground/65">{s.reason}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" className="h-7 rounded-full text-xs" onClick={() => addToWeek(s)}>
                      <Plus className="mr-1 h-3 w-3" /> Use Tonight
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => saveFav(s)}>
                      <Heart className="mr-1 h-3 w-3" /> Save
                    </Button>
                    {missing.length > 0 && (
                      <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs" onClick={() => addMissingToGrocery(missing)}>
                        <ShoppingBasket className="mr-1 h-3 w-3" /> +{missing.length} to grocery
                      </Button>
                    )}
                  </div>
                  {missing.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                      {(["instacart", "walmart", "kroger"] as Retailer[]).map((r) => (
                        <a
                          key={r}
                          href={retailerSearchUrl(r, missing)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-border/50 px-2 py-0.5 text-muted-foreground hover:text-foreground"
                        >
                          Shop {RETAILER_LABEL[r]}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {planned && (
            <button
              type="button"
              onClick={() => setShowSuggester(false)}
              className="text-xs text-primary hover:underline"
            >
              ← Back to tonight's plan
            </button>
          )}
        </>
      )}
    </div>
  );
}