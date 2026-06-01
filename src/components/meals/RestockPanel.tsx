import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, ShoppingCart, Sparkles, CheckCheck } from "lucide-react";
import {
  listRestockItems, dueForRestock, addRestockToGrocery,
  setRestockCadence, type RestockRow,
} from "@/lib/inventory-restock";
import { LOCATION_META } from "@/lib/inventory-seed";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RestockPanel({ compact = false, onChanged }: { compact?: boolean; onChanged?: () => void }) {
  const { user, reloadAll } = useStore();
  const [rows, setRows] = useState<RestockRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    setRows(await listRestockItems(user.id));
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user]);

  const due = dueForRestock(rows);
  const byLocation = due.reduce<Record<string, RestockRow[]>>((acc, r) => {
    (acc[r.location] = acc[r.location] ?? []).push(r); return acc;
  }, {});

  const addAll = async () => {
    if (!user || !due.length) return;
    setBusy(true);
    try {
      const r = await addRestockToGrocery(user.id, due);
      await reloadAll();
      await load();
      onChanged?.();
      if (r.inserted) toast.success(`Added ${r.inserted} restock item${r.inserted === 1 ? "" : "s"} to grocery list.`);
      else toast.info("Already on your grocery list.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add restock items");
    } finally { setBusy(false); }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        <Sparkles className="mx-auto mb-1 h-4 w-4 text-primary/70" />
        No restock items yet. Tap the <span className="mx-1 font-medium text-foreground">↻ restock</span> chip on any inventory item to add it here.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", compact && "text-sm")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {due.length === 0
            ? <span className="inline-flex items-center gap-1 text-primary"><CheckCheck className="h-3.5 w-3.5" />Everything stocked.</span>
            : <>{due.length} restock item{due.length === 1 ? "" : "s"} ready to add</>}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={load}>
            <RefreshCcw className="mr-1 h-3 w-3" />Refresh
          </Button>
          <Button size="sm" className="h-8 rounded-full text-xs" disabled={!due.length || busy} onClick={addAll}>
            <ShoppingCart className="mr-1 h-3 w-3" />Add all to grocery list
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {Object.keys(byLocation).sort().map(loc => (
          <li key={loc} className="rounded-xl border border-border/50 bg-card/40 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>{LOCATION_META[loc as keyof typeof LOCATION_META]?.emoji ?? "📦"}</span>
              <span>{loc}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/70">{byLocation[loc].length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {byLocation[loc].map(r => (
                <Badge key={r.id} variant="outline" className="rounded-full break-words whitespace-normal text-[11px] font-normal">
                  {r.name}
                  <span className="ml-1.5 text-[9px] uppercase tracking-wider text-muted-foreground/70">
                    · {r.restock_cadence === "weekly" ? "wk" : "bi-wk"}
                  </span>
                  <button
                    onClick={async () => { await setRestockCadence(r.id, "none"); await load(); }}
                    className="ml-1 text-muted-foreground/60 hover:text-destructive"
                    title="Remove from restock list"
                  >×</button>
                </Badge>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}