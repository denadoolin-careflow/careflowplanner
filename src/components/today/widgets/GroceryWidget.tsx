import { useState } from "react";
import { ShoppingBasket, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";

/** Quick grocery list view for Today sidebar. */
export function GroceryWidget() {
  const { state, addGrocery, toggleGrocery } = useStore();
  const items = state.grocery.filter(g => !g.bought).slice(0, 6);
  const [draft, setDraft] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    await addGrocery(name);
    setDraft("");
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <ShoppingBasket className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Grocery</h3>
        </div>
        <Link to="/meals" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Open <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Nothing on the list.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map(g => (
            <li key={g.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/40">
              <Checkbox checked={g.bought} onCheckedChange={() => void toggleGrocery(g.id)} />
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{g.name}</span>
              {g.qty && <span className="text-[10px] text-muted-foreground">{g.qty}</span>}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border/60 bg-background/50 px-2 py-1">
        <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add item…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
        />
      </form>
    </section>
  );
}