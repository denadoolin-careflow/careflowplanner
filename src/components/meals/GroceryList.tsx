import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Copy, Download, Pencil, Check, X, BookmarkPlus, Utensils, ListTree, ArrowDownAZ } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { SavedListsDialog } from "./SavedListsDialog";
import type { GroceryItem } from "@/lib/types";

const CAT_ORDER = ["Produce", "Protein", "Dairy", "Bakery", "Frozen", "Pantry", "Other"];

export function GroceryList() {
  const { state, user, addGrocery, toggleGrocery, deleteGrocery, setGroceryStock, updateGroceryItem, reloadAll } = useStore();
  const [g, setG] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [savedOpen, setSavedOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<"category" | "meal">("category");
  const [highlightMealId, setHighlightMealId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [sortMode, setSortMode] = useState<"default" | "low_first" | "out_first" | "az">("default");

  const stockRank = (s: GroceryItem["stockStatus"]) => (s === "low" ? 0 : s === "out" ? 1 : 2);
  const filteredAll = state.grocery.filter(i => filter === "all" || i.stockStatus === filter);
  const sorted = [...filteredAll].sort((a, b) => {
    if (sortMode === "az") return a.name.localeCompare(b.name);
    if (sortMode === "low_first") {
      const r = stockRank(a.stockStatus) - stockRank(b.stockStatus);
      if (r !== 0) return r;
    } else if (sortMode === "out_first") {
      const ar = a.stockStatus === "out" ? 0 : a.stockStatus === "low" ? 1 : 2;
      const br = b.stockStatus === "out" ? 0 : b.stockStatus === "low" ? 1 : 2;
      if (ar !== br) return ar - br;
    }
    return a.name.localeCompare(b.name);
  });

  const groceryByCat = sorted.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const k = item.category ?? "Other";
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {});
  const baseCatOrder = sortMode === "az" ? Object.keys(groceryByCat).sort() : Object.keys(groceryByCat).sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a); const bi = CAT_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const sortedCats = baseCatOrder;

  const mealGroups = sorted.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const k = item.sourceMealId ?? "__manual__";
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {});
  const mealGroupKeys = Object.keys(mealGroups).sort((a, b) => {
    if (a === "__manual__") return 1;
    if (b === "__manual__") return -1;
    const da = mealGroups[a][0]?.sourceDate ?? "";
    const db = mealGroups[b][0]?.sourceDate ?? "";
    return da.localeCompare(db);
  });

  const buildText = () => {
    const lines: string[] = [];
    sortedCats.forEach(cat => {
      lines.push(`## ${cat}`);
      groceryByCat[cat].forEach(item => {
        const tick = item.bought ? "[x]" : "[ ]";
        const stock = item.stockStatus === "in" ? " (in stock)" : "";
        const qty = item.qty ? ` — ${item.qty}` : "";
        const src = item.sourceMealName ? ` ← ${item.sourceMealName}` : "";
        lines.push(`- ${tick} ${item.name}${qty}${stock}${src}`);
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  };

  const onCopy = async () => {
    try { await navigator.clipboard.writeText(buildText()); toast.success("Grocery list copied."); }
    catch { toast.error("Couldn't copy"); }
  };
  const onExportTxt = () => download(buildText(), "txt", "text/plain");
  const onExportCsv = () => {
    const rows = [["Category","Item","Qty","Bought","Stock","From meal","Slot","Date"]];
    sortedCats.forEach(cat => groceryByCat[cat].forEach(item => {
      rows.push([cat, item.name, item.qty ?? "", item.bought ? "yes" : "no",
        item.stockStatus === "in" ? "in stock" : "out of stock",
        item.sourceMealName ?? "", item.sourceSlot ?? "", item.sourceDate ?? ""]);
    }));
    download(rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n"), "csv", "text/csv");
  };
  function download(content: string, ext: string, mime: string) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `grocery-${new Date().toISOString().slice(0,10)}.${ext}`;
    a.click(); URL.revokeObjectURL(url);
  }

  const startEdit = (id: string, name: string, qty?: string) => {
    setEditing(id); setEditName(name); setEditQty(qty ?? "");
  };
  const saveEdit = async (id: string) => {
    if (!editName.trim()) { setEditing(null); return; }
    await updateGroceryItem(id, { name: editName.trim(), qty: editQty.trim() || null });
    setEditing(null);
  };

  const removeByMeal = async (mealId: string | null) => {
    if (!user) return;
    const items = mealId ? mealGroups[mealId] : mealGroups["__manual__"];
    if (!items?.length) return;
    const label = mealId ? items[0].sourceMealName : "manually added";
    if (!confirm(`Remove ${items.length} item${items.length === 1 ? "" : "s"} from ${label}?`)) return;
    await supabase.from("grocery_items").delete().in("id", items.map(i => i.id));
    await reloadAll();
    toast.success(`Removed ${items.length} item${items.length === 1 ? "" : "s"}.`);
  };

  const renderItem = (item: GroceryItem) => {
    const isEditing = editing === item.id;
    const status = item.stockStatus;
    const next = status === "in" ? "low" : status === "low" ? "out" : "in";
    const stockLabel = status === "in" ? "In stock" : status === "low" ? "Low" : "Out";
    const stockClass = status === "in"
      ? "bg-primary/15 text-primary hover:bg-primary/25"
      : status === "low"
        ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
        : "text-muted-foreground hover:bg-muted";
    const dim = highlightMealId && highlightMealId !== item.sourceMealId;
    return (
      <li key={item.id} className={`group flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition hover:bg-muted/40 ${dim ? "opacity-30" : ""}`}>
        <Checkbox checked={item.bought} onCheckedChange={() => toggleGrocery(item.id)} />
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1.5">
            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm" autoFocus />
            <Input value={editQty} onChange={e => setEditQty(e.target.value)} placeholder="qty" className="h-7 w-20 text-sm" />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(item.id)}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(null)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <>
            <span className={item.bought ? "text-muted-foreground line-through" : ""}>{item.name}</span>
            {item.qty && <span className="text-[11px] text-muted-foreground">· {item.qty}</span>}
            <button onClick={() => setGroceryStock(item.id, next)} title={`Mark ${next}`}>
              <Badge variant={status === "out" ? "outline" : "secondary"}
                className={`ml-1 cursor-pointer rounded-full text-[10px] ${stockClass}`}>
                {stockLabel}
              </Badge>
            </button>
            {item.sourceMealName && groupBy === "category" && (
              <button
                onMouseEnter={() => setHighlightMealId(item.sourceMealId ?? null)}
                onMouseLeave={() => setHighlightMealId(null)}
                onClick={() => { setGroupBy("meal"); setHighlightMealId(item.sourceMealId ?? null); }}
                title={`From ${item.sourceMealName}${item.sourceSlot ? " · " + item.sourceSlot : ""}${item.sourceDate ? " · " + item.sourceDate : ""}`}
                className="ml-1"
              >
                <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground hover:bg-muted">
                  <Utensils className="mr-0.5 h-2.5 w-2.5" />{item.sourceMealName}
                </Badge>
              </button>
            )}
            <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-70">
              <button onClick={() => startEdit(item.id, item.name, item.qty)} title="Edit"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => deleteGrocery(item.id)} title="Delete"><Trash2 className="h-3 w-3" /></button>
            </div>
          </>
        )}
      </li>
    );
  };

  return (
    <div>
      <form className="mb-3 flex gap-2" onSubmit={e => { e.preventDefault(); if (!g.trim()) return; addGrocery(g); setG(""); }}>
        <Input placeholder="Add item…" value={g} onChange={e => setG(e.target.value)} />
        <Button type="submit">Add</Button>
      </form>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSavedOpen(true)}>
          <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" />Saved lists
        </Button>
        {state.grocery.length > 0 && <>
          <Button size="sm" variant="outline" className="rounded-full" onClick={onCopy}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />Copy
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full">
                <Download className="mr-1.5 h-3.5 w-3.5" />Export
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1">
              <Button size="sm" variant="ghost" className="w-full justify-start" onClick={onExportTxt}>Plain text (.txt)</Button>
              <Button size="sm" variant="ghost" className="w-full justify-start" onClick={onExportCsv}>Spreadsheet (.csv)</Button>
            </PopoverContent>
          </Popover>
        </>}
      </div>

      <SavedListsDialog open={savedOpen} onOpenChange={setSavedOpen} />

      {state.grocery.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Show:</span>
          {([
            { v: "all",  label: `All (${state.grocery.length})` },
            { v: "out",  label: `Out (${state.grocery.filter(i => i.stockStatus === "out").length})` },
            { v: "low",  label: `Low (${state.grocery.filter(i => i.stockStatus === "low").length})` },
            { v: "in",   label: `In stock (${state.grocery.filter(i => i.stockStatus === "in").length})` },
          ] as const).map(opt => (
            <button key={opt.v} onClick={() => setFilter(opt.v)}
              className={`rounded-full border px-2.5 py-0.5 transition ${filter === opt.v ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
              {opt.label}
            </button>
          ))}
          <span className="ml-2 text-muted-foreground"><ArrowDownAZ className="inline h-3 w-3" /> Sort:</span>
          {([
            { v: "default",   label: "Default" },
            { v: "low_first", label: "Low first" },
            { v: "out_first", label: "Out first" },
            { v: "az",        label: "A–Z" },
          ] as const).map(opt => (
            <button key={opt.v} onClick={() => setSortMode(opt.v)}
              className={`rounded-full border px-2.5 py-0.5 transition ${sortMode === opt.v ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {state.grocery.length > 0 && (
        <div className="mb-3 inline-flex rounded-full border border-border/60 p-0.5 text-xs">
          <button onClick={() => setGroupBy("category")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition ${groupBy === "category" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
            <ListTree className="h-3 w-3" />By category
          </button>
          <button onClick={() => setGroupBy("meal")}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition ${groupBy === "meal" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
            <Utensils className="h-3 w-3" />By meal
          </button>
        </div>
      )}

      {state.grocery.length === 0 ? (
        <p className="text-xs text-muted-foreground">Your grocery list will fill in when you plan a week.</p>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">No items match this filter.</p>
      ) : groupBy === "category" ? (
        <div className="space-y-3">
          {sortedCats.map(cat => (
            <div key={cat}>
              <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{cat}</div>
              <ul className="space-y-0.5">{groceryByCat[cat].map(renderItem)}</ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {mealGroupKeys.map(key => {
            const items = mealGroups[key];
            const isManual = key === "__manual__";
            const meal = items[0];
            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {isManual ? "Manually added" : (
                      <>
                        <Utensils className="mr-1 inline h-3 w-3" />
                        {meal.sourceMealName}
                        {meal.sourceSlot && <span className="ml-1 normal-case tracking-normal text-muted-foreground/70">· {meal.sourceSlot}</span>}
                        {meal.sourceDate && <span className="ml-1 normal-case tracking-normal text-muted-foreground/70">· {format(new Date(meal.sourceDate + "T00:00:00"), "EEE d")}</span>}
                      </>
                    )}
                  </div>
                  <button onClick={() => removeByMeal(isManual ? null : meal.sourceMealId!)}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive">
                    Remove all ({items.length})
                  </button>
                </div>
                <ul className="space-y-0.5">{items.map(renderItem)}</ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
