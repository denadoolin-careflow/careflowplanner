/**
 * Food details — nutrition breakdown, product info, store links, and quick
 * actions (log it, save it, add to groceries). Store links open a search on
 * the retailer's own site; nothing is purchased or shared from here.
 */
import { useState } from "react";
import { ExternalLink, Loader2, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RETAILER_LABEL, RETAILERS, retailerSearchUrl, type Retailer } from "@/lib/retailer-links";
import { useGroceryPrefs } from "@/lib/grocery-prefs";
import { addIngredientsToGroceries } from "@/lib/wellflow/meal-plan";
import type { FoodCandidate } from "@/lib/wellflow/types";

export function FoodDetailsSheet({
  food, onOpenChange, onLog, onSave,
}: {
  food: FoodCandidate | null;
  onOpenChange: (v: boolean) => void;
  onLog: (food: FoodCandidate, servings: number) => Promise<void> | void;
  onSave: (food: FoodCandidate) => Promise<void> | void;
}) {
  const { prefs } = useGroceryPrefs();
  const [servings, setServings] = useState(1);
  const [busy, setBusy] = useState(false);

  if (!food) return null;

  const scaled = (v: number) => Math.round(v * servings * 10) / 10;
  const stores: Retailer[] = [
    prefs.preferred_store,
    ...(prefs.backup_store ? [prefs.backup_store] : []),
    ...RETAILERS.filter(r => r !== prefs.preferred_store && r !== prefs.backup_store).slice(0, 3),
  ];

  const addToGroceries = async () => {
    setBusy(true);
    try {
      const added = await addIngredientsToGroceries([food.name]);
      toast.success(added ? `${food.name} added to groceries` : "Already on your list or in the pantry");
    } catch {
      toast.error("Could not add that to groceries");
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={!!food} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-display">{food.name}</SheetTitle>
          <SheetDescription>
            {[food.brand, food.servingSize || "1 serving", food.barcode ? `Barcode ${food.barcode}` : null]
              .filter(Boolean).join(" · ")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 max-w-[9rem]">
          <Label htmlFor="wf-detail-servings">Servings</Label>
          <Input id="wf-detail-servings" type="number" min="0.1" step="0.1" inputMode="decimal"
                 value={servings}
                 onChange={e => setServings(Math.max(Number(e.target.value) || 0.1, 0.1))} />
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-5">
          <Cell label="Calories" value={scaled(food.calories)} />
          <Cell label="Protein" value={`${scaled(food.protein)}g`} />
          <Cell label="Carbs" value={`${scaled(food.carbs)}g`} />
          <Cell label="Fat" value={`${scaled(food.fat)}g`} />
          <Cell label="Fiber" value={`${scaled(food.fiber)}g`} />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={async () => { await onLog(food, servings); onOpenChange(false); }}>Log this</Button>
          <Button variant="secondary" onClick={() => onSave(food)}>Save to library</Button>
          <Button variant="ghost" className="gap-1.5" onClick={addToGroceries} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Add to groceries
          </Button>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Find it at a store
          </p>
          <div className="flex flex-wrap gap-2">
            {stores.map(r => (
              <a key={r} href={retailerSearchUrl(r, food.name)} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:bg-muted/60">
                {RETAILER_LABEL[r]} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
            {food.barcode && (
              <a href={`https://world.openfoodfacts.org/product/${food.barcode}`} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:bg-muted/60">
                Product info <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <p className="mt-4 pb-6 text-xs text-muted-foreground">
          Nutrition comes from Open Food Facts or your own estimates and can vary by brand and portion.
        </p>
      </SheetContent>
    </Sheet>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-muted/30 px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
