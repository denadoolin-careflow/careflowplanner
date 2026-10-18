import { useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { CyclePhase } from "@/lib/cycle";
import { PHASE_GROCERIES, missingGroceries } from "@/lib/rhythm-guidance";

/** Shows phase-friendly foods and adds the missing ones to the grocery list. */
export function PhaseGroceryButton({ phase, className }: { phase: CyclePhase; className?: string }) {
  const { grocery, addGrocery } = useStore() as unknown as {
    grocery: { name: string; bought?: boolean }[];
    addGrocery: (n: string, c?: string) => Promise<void>;
  };
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const todo = missingGroceries(phase, (grocery ?? []).filter(g => !g.bought).map(g => g.name));
    if (!todo.length) { toast("These are already on your grocery list"); return; }
    setBusy(true);
    try {
      for (const g of todo) await addGrocery(g.name, g.category);
      toast.success(`Added ${todo.length} item${todo.length > 1 ? "s" : ""} to your grocery list`);
    } catch { toast.error("Couldn't add to the grocery list"); }
    finally { setBusy(false); }
  };
  return (
    <div className={className}>
      <p className="text-[11.5px] text-muted-foreground">
        Foods for this phase: {PHASE_GROCERIES[phase].map(g => g.name).join(", ")}
      </p>
      <Button size="sm" variant="outline" className="mt-2 min-h-9" onClick={add} disabled={busy}>
        <ShoppingBasket className="mr-1.5 h-4 w-4" aria-hidden /> Add to grocery list
      </Button>
    </div>
  );
}
