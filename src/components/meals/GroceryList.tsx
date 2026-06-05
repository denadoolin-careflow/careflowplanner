import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Copy, Download, Pencil, Check, X, BookmarkPlus, Utensils, ListTree, ArrowDownAZ, Package, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { SavedListsDialog } from "./SavedListsDialog";
import { PANTRY_TAG } from "@/lib/automations/engine";
import type { GroceryItem } from "@/lib/types";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

const CAT_ORDER = ["Produce", "Protein", "Dairy", "Bakery", "Frozen", "Pantry", "Other"];

type FilterMode = "all" | "in" | "low" | "out";
type SortMode = "default" | "low_first" | "out_first" | "az";
type GroupMode = "category" | "meal" | "pantry";

const LS = {
  filter: "meals.groceryList.filter",
  sort: "meals.groceryList.sort",
  group: "meals.groceryList.group",
  hideBought: "meals.groceryList.hideBought",
};

function usePersistedState<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (localStorage.getItem(key) as T) || initial);
  useEffect(() => { localStorage.setItem(key, v); }, [key, v]);
  return [v, setV];
}

export function GroceryList() {
  const { state, user, addGrocery, toggleGrocery, deleteGrocery, setGroceryStock, updateGroceryItem, reloadAll } = useStore();
  const [g, setG] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [savedOpen, setSavedOpen] = useState(false);
  const [groupBy, setGroupBy] = usePersistedState<GroupMode>(LS.group, "category");
  const [highlightMealId, setHighlightMealId] = useState<string | null>(null);
  const [filter, setFilter] = usePersistedState<FilterMode>(LS.filter, "all");
  const [sortMode, setSortMode] = usePersistedState<SortMode>(LS.sort, "default");
  const [hideBought, setHideBought] = useState<boolean>(() => localStorage.getItem(LS.hideBought) === "1");
  useEffect(() => { localStorage.setItem(LS.hideBought, hideBought ? "1" : "0"); }, [hideBought]);

  const stockRank = (s: GroceryItem["stockStatus"]) => (s === "low" ? 0 : s === "out" ? 1 : 2);
  const filteredAll = state.grocery.filter(i =>
    (filter === "all" || i.stockStatus === filter) && (!hideBought || !i.bought)
  );
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

  const pantryGroups = sorted.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const isPantry = (item.tags ?? []).includes(PANTRY_TAG) || item.stockStatus === "in";
    const k = isPantry ? "Pantry / In stock" : "To buy";
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {});
  const pantryGroupKeys = ["To buy", "Pantry / In stock"].filter(k => pantryGroups[k]?.length);

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
    const draggable = groupBy === "category" && !isEditing;
    return (
      <DraggableRow key={item.id} id={item.id} enabled={draggable} dim={!!dim}>
        <Checkbox checked={item.bought} onCheckedChange={() => toggleGrocery(item.id)} />
        {isEditing ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9 min-w-[8rem] flex-1 text-sm" autoFocus />
            <Input value={editQty} onChange={e => setEditQty(e.target.value)} placeholder="qty" className="h-7 w-20 text-sm" />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(item.id)}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(null)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <>
            <span className={cn("min-w-0 flex-1 whitespace-normal break-words leading-snug", item.bought && "text-muted-foreground line-through")}>
              {item.name}
              {item.qty && <span className="ml-1 text-[11px] text-muted-foreground">· {item.qty}</span>}
            </span>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setGroceryStock(item.id, next)} title={`Mark ${next}`}>
              <Badge variant={status === "out" ? "outline" : "secondary"}
                className={`ml-1 cursor-pointer rounded-full text-[10px] ${stockClass}`}>
                {stockLabel}
              </Badge>
            </button>
            {item.sourceMealName && groupBy === "category" && (
              <button
                onMouseEnter={() => setHighlightMealId(item.sourceMealId ?? null)}
                onMouseLeave={() => setHighlightMealId(null)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => { setGroupBy("meal"); setHighlightMealId(item.sourceMealId ?? null); }}
                title={`From ${item.sourceMealName}${item.sourceSlot ? " · " + item.sourceSlot : ""}${item.sourceDate ? " · " + item.sourceDate : ""}`}
                className="ml-1 hidden sm:inline-flex"
              >
                <Badge variant="outline" className="max-w-[10rem] truncate rounded-full text-[10px] text-muted-foreground hover:bg-muted">
                  <Utensils className="mr-0.5 h-2.5 w-2.5" />{item.sourceMealName}
                </Badge>
              </button>
            )}
            <div className="ml-1 flex shrink-0 items-center gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-70">
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => startEdit(item.id, item.name, item.qty)} title="Edit"
                className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground sm:h-7 sm:w-7"><Pencil className="h-3.5 w-3.5" /></button>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteGrocery(item.id)} title="Delete"
                className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-destructive sm:h-7 sm:w-7"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </>
        )}
      </DraggableRow>
    );
  };

  const sortLabel: Record<SortMode, string> = {
    default: "default",
    low_first: "low first",
    out_first: "out first",
    az: "A–Z",
  };
  const groupLabel: Record<GroupMode, string> = {
    category: "category",
    meal: "meal",
    pantry: "pantry",
  };
  const summary = `Showing ${sorted.length} of ${state.grocery.length} · sorted ${sortLabel[sortMode]} · grouped by ${groupLabel[groupBy]}${hideBought ? " · bought hidden" : ""}`;

  return (
    <div>
      <form className="mb-3 flex gap-2" onSubmit={e => { e.preventDefault(); if (!g.trim()) return; addGrocery(g); setG(""); }}>
        <Input placeholder="Add item…" value={g} onChange={e => setG(e.target.value)} />
        <Button type="submit">Add</Button>
      </form>

      <SavedListsDialog open={savedOpen} onOpenChange={setSavedOpen} />

      {state.grocery.length > 0 && (
        <div className="mb-3 space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="w-14 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Filter</span>
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
            <button onClick={() => setHideBought(!hideBought)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 transition ${hideBought ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
              <EyeOff className="h-3 w-3" />Hide bought
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="w-14 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><ArrowDownAZ className="mr-1 inline h-3 w-3" />Sort</span>
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

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="w-14 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Group</span>
            {([
              { v: "category", label: "Category", icon: ListTree },
              { v: "meal",     label: "Meal",     icon: Utensils },
              { v: "pantry",   label: "Pantry",   icon: Package },
            ] as const).map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.v} onClick={() => setGroupBy(opt.v)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 transition ${groupBy === opt.v ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                  <Icon className="h-3 w-3" />{opt.label}
                </button>
              );
            })}

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => setSavedOpen(true)}>
                <BookmarkPlus className="mr-1 h-3.5 w-3.5" />Saved
              </Button>
              <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={onCopy}>
                <Copy className="mr-1 h-3.5 w-3.5" />Copy
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 rounded-full text-xs">
                    <Download className="mr-1 h-3.5 w-3.5" />Export
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1">
                  <Button size="sm" variant="ghost" className="w-full justify-start" onClick={onExportTxt}>Plain text (.txt)</Button>
                  <Button size="sm" variant="ghost" className="w-full justify-start" onClick={onExportCsv}>Spreadsheet (.csv)</Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <p className="pt-0.5 text-[10px] text-muted-foreground">{summary}</p>
        </div>
      )}

      {state.grocery.length === 0 ? (
        <p className="text-xs text-muted-foreground">Your grocery list will fill in when you plan a week.</p>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">No items match this filter.</p>
      ) : groupBy === "category" ? (
        <DndContext
          onDragEnd={async (e: DragEndEvent) => {
            const fromId = String(e.active.id);
            const overId = e.over?.id ? String(e.over.id) : null;
            if (!overId || !fromId.startsWith("gl-") || !overId.startsWith("cat-")) return;
            const itemId = fromId.slice(3);
            const newCat = overId.slice(4);
            const item = state.grocery.find(i => i.id === itemId);
            if (!item || item.category === newCat) return;
            await updateGroceryItem(itemId, { category: newCat });
            toast.success(`Moved to ${newCat}`);
          }}
        >
          <div className="space-y-3">
            {sortedCats.map(cat => (
              <CategoryDropZone key={cat} cat={cat} count={groceryByCat[cat].length}>
                {groceryByCat[cat].map(renderItem)}
              </CategoryDropZone>
            ))}
          </div>
        </DndContext>
      ) : groupBy === "meal" ? (
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
      ) : (
        <div className="space-y-3">
          {pantryGroupKeys.map(key => (
            <div key={key}>
              <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {key === "Pantry / In stock" ? <Package className="h-3 w-3" /> : null}
                {key} <span className="text-muted-foreground/60">({pantryGroups[key].length})</span>
              </div>
              <ul className="space-y-0.5">{pantryGroups[key].map(renderItem)}</ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DraggableRow({
  id, enabled, dim, children,
}: { id: string; enabled: boolean; dim: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `gl-${id}`, disabled: !enabled });
  return (
    <li
      ref={setNodeRef}
      {...(enabled ? attributes : {})}
      {...(enabled ? listeners : {})}
      className={cn(
        "group flex min-h-11 items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted/40 sm:min-h-0 sm:items-center",
        enabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        dim && "opacity-30",
      )}
    >
      {children}
    </li>
  );
}

function CategoryDropZone({
  cat, count, children,
}: { cat: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cat-${cat}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-transparent p-1 transition",
        isOver && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="mb-1 flex items-center gap-1 px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {cat} <span className="text-muted-foreground/60">({count})</span>
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}
