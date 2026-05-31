import { SectionCard } from "@/components/cards/SectionCard";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGroceryPrefs } from "@/lib/grocery-prefs";
import { RETAILERS, RETAILER_LABEL, type Retailer } from "@/lib/retailer-links";

export function GroceryPrefsSection() {
  const { prefs, save, loading } = useGroceryPrefs();
  if (loading) return null;

  return (
    <SectionCard title="Grocery preferences" subtitle="Used for the Shop button on ingredients" accent="warm">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs text-muted-foreground">Preferred store</Label>
          <Select value={prefs.preferred_store} onValueChange={(v) => save({ preferred_store: v as Retailer })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RETAILERS.map(r => <SelectItem key={r} value={r}>{RETAILER_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Backup store</Label>
          <Select
            value={prefs.backup_store ?? "__none__"}
            onValueChange={(v) => save({ backup_store: v === "__none__" ? null : (v as Retailer) })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {RETAILERS.map(r => <SelectItem key={r} value={r}>{RETAILER_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Delivery or pickup</Label>
          <Select value={prefs.delivery_mode} onValueChange={(v) => save({ delivery_mode: v as "delivery" | "pickup" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="pickup">Pickup</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Shop buttons across meals, the grocery list, and the pantry open your preferred store first. You can pick a different store from the Shop dropdown any time.
      </p>
    </SectionCard>
  );
}