import { useState, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { Utensils } from "lucide-react";
import { statusVar, statusLabel } from "@/lib/pantry-colors";
import { ShopMenu } from "./ShopMenu";

type Status = "in" | "low" | "out";
const dbToUi: Record<string, Status> = { in_stock: "in", low: "low", out: "out" };
const uiToDb: Record<Status, string> = { in: "in_stock", low: "low", out: "out" };

export function IngredientPopover({
  ingredient, mealName, trigger,
}: {
  ingredient: string;
  mealName?: string;
  trigger: React.ReactNode;
}) {
  const { state, user } = useStore();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("out");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [pantryId, setPantryId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("pantry_items").select("*").eq("user_id", user.id).ilike("name", ingredient).maybeSingle();
      if (data) {
        setPantryId(data.id);
        setStatus(dbToUi[data.stock_status as string] ?? (data.in_stock ? "in" : "out"));
        setQty(data.qty ?? "");
        setNotes(data.notes ?? "");
      } else {
        setPantryId(null); setStatus("out"); setQty(""); setNotes("");
      }
    })();
  }, [open, user?.id, ingredient]);

  const norm = (s: string) => s.toLowerCase().trim();
  const linked = state.meals.filter(m => (m.ingredients ?? []).some(i => norm(i).includes(norm(ingredient))));
  const groceryItem = state.grocery.find(g => norm(g.name) === norm(ingredient));

  const save = async () => {
    if (!user?.id) return;
    const payload = {
      user_id: user.id, name: ingredient, qty: qty || null, notes: notes || null,
      stock_status: uiToDb[status], in_stock: status === "in",
    };
    if (pantryId) await supabase.from("pantry_items").update(payload).eq("id", pantryId);
    else {
      const { data } = await supabase.from("pantry_items").insert(payload).select().single();
      if (data) setPantryId(data.id);
    }
    if (groceryItem) await supabase.from("grocery_items").update({ stock_status: status }).eq("id", groceryItem.id);
    setOpen(false);
  };

  const Dot = ({ s }: { s: Status }) => (
    <button onClick={() => setStatus(s)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition
        ${status === s ? "border-foreground/30 shadow-[0_0_8px_hsl(var(--primary)/0.3)]" : "border-border/60 opacity-70 hover:opacity-100"}`}
      style={{ background: status === s ? `hsl(${statusVar(s).slice(4,-1)} / 0.18)` : undefined }}>
      <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${statusVar(s).slice(4,-1)})` }} />
      {statusLabel(s)}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="mb-2">
          <div className="font-display text-sm font-semibold">{ingredient}</div>
          {mealName && <div className="text-[11px] text-muted-foreground">From: {mealName}</div>}
        </div>

        <div className="mb-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Pantry status</div>
          <div className="flex gap-1"><Dot s="in" /><Dot s="low" /><Dot s="out" /></div>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Qty</label>
            <Input value={qty} onChange={e => setQty(e.target.value)} className="h-7 text-xs" placeholder="2 lbs" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</label>
            <div className="flex h-7 items-center px-2 text-xs text-muted-foreground">{groceryItem?.category ?? "—"}</div>
          </div>
        </div>

        <div className="mb-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" placeholder="brand, prep notes…" />
        </div>

        {linked.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Used in</div>
            <div className="space-y-0.5">
              {linked.slice(0, 4).map(m => (
                <div key={m.id} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Utensils className="h-2.5 w-2.5" />{m.name} <span className="ml-auto">{m.slot}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={save}>Save</Button>
          <ShopMenu items={ingredient} size="sm" variant="outline" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
