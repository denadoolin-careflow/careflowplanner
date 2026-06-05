import { Link } from "react-router-dom";
import { SectionCard } from "@/components/cards/SectionCard";
import { GroceryList } from "@/components/meals/GroceryList";
import { useGroceryPrefs } from "@/lib/grocery-prefs";
import { RETAILER_LABEL, retailerSearchUrl } from "@/lib/retailer-links";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { ArrowLeft, ExternalLink, ShoppingCart, Sparkles } from "lucide-react";
import { applySmartGroceryFill } from "@/lib/smart-grocery";
import { toast } from "sonner";
import { useState } from "react";

export default function HomeGroceries() {
  const { prefs, loading } = useGroceryPrefs();
  const { state, user, reloadAll } = useStore();
  const [filling, setFilling] = useState(false);
  const unbought = state.grocery.filter(g => !g.bought);

  const openInStore = () => {
    if (!unbought.length) return;
    const url = retailerSearchUrl(prefs.preferred_store, unbought.map(i => i.name));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const onSmartFill = async () => {
    if (!user) return;
    setFilling(true);
    try {
      const r = await applySmartGroceryFill(user.id);
      if (r.inserted === 0) {
        toast.info("Nothing new to add — pantry, meal plan, and recurring items are covered.");
      } else {
        const parts: string[] = [];
        if (r.bySource.low_stock) parts.push(`${r.bySource.low_stock} low-stock`);
        if (r.bySource.meal_plan) parts.push(`${r.bySource.meal_plan} from meal plan`);
        if (r.bySource.recurring) parts.push(`${r.bySource.recurring} recurring`);
        toast.success(`Added ${r.inserted} item${r.inserted === 1 ? "" : "s"}${parts.length ? " · " + parts.join(", ") : ""}.`);
        await reloadAll();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't auto-fill list.");
    } finally {
      setFilling(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100/70 via-amber-50/60 to-rose-100/40 p-5 ring-1 ring-emerald-200/50 shadow-soft sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/70 text-emerald-700 ring-1 ring-white/60 shadow-sm">
              <ShoppingCart className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <Link to="/home" className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> HomeFlow
              </Link>
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Grocery list
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Everything to pick up — pulled from low pantry, meal plan, and recurring household needs.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={onSmartFill}
              disabled={filling || !user}
              variant="outline"
              className="rounded-full"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {filling ? "Filling…" : "Smart fill"}
            </Button>
            <Button
              onClick={openInStore}
              disabled={loading || !unbought.length}
              className="rounded-full"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in {RETAILER_LABEL[prefs.preferred_store]}
            </Button>
          </div>
        </div>
      </header>

      <SectionCard
        title={`${unbought.length} item${unbought.length === 1 ? "" : "s"} to buy`}
        subtitle="Group by category, meal, or pantry — items wrap to fit."
        accent="warm"
      >
        <GroceryList />
      </SectionCard>
    </div>
  );
}