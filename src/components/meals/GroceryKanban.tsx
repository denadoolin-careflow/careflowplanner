import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { useGroceryCategories } from "@/lib/grocery-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ChevronDown, ChevronRight, Trash2, ShoppingCart, X, Eraser } from "lucide-react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { IngredientPopover } from "./IngredientPopover";
import { statusVar, statusLabel } from "@/lib/pantry-colors";
import type { GroceryItem } from "@/lib/types";
import { EmptyState } from "@/components/cards/EmptyState";

export function GroceryKanban() {
  const { state, toggleGrocery, deleteGrocery, setGroceryStock, updateGroceryItem, addGrocery, reloadAll } = useStore();
  const { cats, create: createCat, update: updateCat, remove: removeCat } = useGroceryCategories();
  const [shoppingMode, setShoppingMode] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const items = state.grocery;
  const grouped = useMemo(() => {
    const out: Record<string, GroceryItem[]> = {};
    cats.forEach(c => { out[c.name] = []; });
    items.forEach(i => {
      const k = i.category && out[i.category] !== undefined ? i.category : (cats[0]?.name ?? "Pantry");
      (out[k] = out[k] ?? []).push(i);
    });
    return out;
  }, [items, cats]);

  const total = items.length;
  const bought = items.filter(i => i.bought).length;

  const onDragEnd = async (e: DragEndEvent) => {
    const fromId = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId || !fromId.startsWith("g-")) return;
    const itemId = fromId.slice(2);
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    if (overId.startsWith("col-")) {
      const newCat = overId.slice(4);
      if (item.category !== newCat) await updateGroceryItem(itemId, { category: newCat });
    }
  };

  const Column = ({ name, color, collapsed, id }: { name: string; color: string | null; collapsed: boolean; id: string }) => {
    const { setNodeRef, isOver } = useDroppable({ id: `col-${name}` });
    const list = grouped[name] ?? [];
    const visible = shoppingMode ? list.filter(i => !i.bought) : list;
    const colDone = list.filter(i => i.bought).length;
    const clearAll = async () => {
      if (list.length === 0) return;
      if (!confirm(`Remove all ${list.length} item${list.length === 1 ? "" : "s"} from ${name}?`)) return;
      await Promise.all(list.map(i => deleteGrocery(i.id)));
    };
    return (
      <div ref={setNodeRef}
        className={`group flex w-64 shrink-0 flex-col rounded-2xl border p-3 transition
          ${isOver ? "border-primary/50 bg-primary/5 shadow-[0_0_16px_hsl(var(--primary)/0.2)]" : "border-border/60 bg-card/40"}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <button onClick={() => updateCat(id, { collapsed: !collapsed })} className="flex items-center gap-1.5 text-sm font-medium">
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span style={color ? { color: `hsl(${color})` } : undefined}>{name}</span>
            <span className="text-[10px] text-muted-foreground">{colDone}/{list.length}</span>
          </button>
          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button onClick={clearAll} disabled={list.length === 0} title={`Clear all items in ${name}`}
              className="text-muted-foreground/70 transition hover:text-destructive disabled:opacity-30">
              <Eraser className="h-3 w-3" />
            </button>
            <button onClick={() => { if (confirm(`Remove ${name} category?`)) removeCat(id); }}
              title={`Remove ${name} category`}
              className="text-muted-foreground/70 transition hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
        {!collapsed && (
          <>
            <div className="h-1 mb-2 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full bg-primary"
                animate={{ width: list.length ? `${(colDone / list.length) * 100}%` : "0%" }}
                transition={{ duration: 0.4 }} />
            </div>
            <ul className="space-y-1">
              <AnimatePresence>
                {visible.map(i => <KanbanItem key={i.id} item={i}
                  onToggle={() => toggleGrocery(i.id)}
                  onDelete={() => deleteGrocery(i.id)}
                  onStock={(s) => setGroceryStock(i.id, s)}
                  onRename={(name) => updateGroceryItem(i.id, { name })}
                  shoppingMode={shoppingMode}
                />)}
              </AnimatePresence>
            </ul>
            <AddItemRow onAdd={(name) => addGrocery(name, name === "" ? undefined : name)
              .then(async () => {
                // assign category to the just-added latest manual item
                const { data } = await supabase.from("grocery_items").select("id").order("created_at", { ascending: false }).limit(1);
                if (data?.[0]) await supabase.from("grocery_items").update({ category: name === "" ? null : name }).eq("id", data[0].id);
                await reloadAll();
              })} categoryName={name} />
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {total === 0 ? "Empty list" : `${bought} of ${total} bought`}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={shoppingMode ? "default" : "outline"} className="h-7 rounded-full text-xs"
            onClick={() => setShoppingMode(s => !s)}>
            <ShoppingCart className="mr-1 h-3 w-3" />Shopping mode
          </Button>
          {showAdd ? (
            <form className="flex gap-1" onSubmit={async (e) => { e.preventDefault(); if (newCat.trim()) { await createCat(newCat.trim()); setNewCat(""); setShowAdd(false); } }}>
              <Input autoFocus value={newCat} onChange={e => setNewCat(e.target.value)} onBlur={() => !newCat && setShowAdd(false)} className="h-7 w-32 text-xs" placeholder="Category…" />
            </form>
          ) : (
            <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-3 w-3" />Category
            </Button>
          )}
        </div>
      </div>

      {total > 0 && (
        <div className="mb-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div className="h-full bg-primary"
            animate={{ width: `${(bought / total) * 100}%` }}
            transition={{ duration: 0.4 }} />
        </div>
      )}

      {total === 0 ? (
        <EmptyState title="Nothing planned yet." hint="Drag meals here when ready. Your future self will thank you." />
      ) : (
        <DndContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cats.map(c => <Column key={c.id} id={c.id} name={c.name} color={c.color} collapsed={c.collapsed} />)}
          </div>
        </DndContext>
      )}
    </div>
  );
}

function AddItemRow({ onAdd, categoryName }: { onAdd: (name: string) => void; categoryName: string }) {
  const [v, setV] = useState("");
  return (
    <form className="mt-1.5" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }}>
      <Input value={v} onChange={e => setV(e.target.value)} placeholder={`+ Add to ${categoryName}`}
        className="h-7 border-dashed text-xs placeholder:text-muted-foreground/60" />
    </form>
  );
}

function KanbanItem({ item, onToggle, onDelete, onStock, onRename, shoppingMode }: {
  item: GroceryItem;
  onToggle: () => void; onDelete: () => void;
  onStock: (s: "in" | "low" | "out") => void;
  onRename: (n: string) => void;
  shoppingMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `g-${item.id}` });
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.name);
  const next = item.stockStatus === "in" ? "low" : item.stockStatus === "low" ? "out" : "in";
  const varName = statusVar(item.stockStatus).slice(4, -1);
  const dotColor = `hsl(${varName})`;
  const dotBg = `hsl(${varName} / 0.18)`;
  return (
    <motion.li ref={setNodeRef} {...attributes} {...listeners}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
      className={`group flex items-center gap-1.5 rounded-md bg-background/60 px-2 py-1 text-xs transition cursor-grab
        ${shoppingMode ? "py-1.5 text-sm" : ""} hover:bg-primary/10`}>
      <Checkbox checked={item.bought} onCheckedChange={onToggle} onPointerDown={(e) => e.stopPropagation()} />
      {editing ? (
        <Input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onBlur={() => { setEditing(false); if (val.trim() && val !== item.name) onRename(val.trim()); }}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setVal(item.name); setEditing(false); } }}
          onPointerDown={e => e.stopPropagation()}
          className="h-6 border-0 bg-transparent px-1 text-xs focus-visible:ring-0" />
      ) : (
        <IngredientPopover ingredient={item.name} mealName={item.sourceMealName ?? undefined}
          trigger={
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { if (e.detail === 2) { setEditing(true); e.stopPropagation(); } }}
              className={`flex-1 truncate text-left ${item.bought ? "text-muted-foreground line-through" : ""}`}
              title="Click for details · double-click to rename">
              {item.name}
              {item.qty && <span className="ml-1 text-[10px] text-muted-foreground">· {item.qty}</span>}
            </button>
          } />
      )}
      <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onStock(next)} title={`Mark ${next}`}
        className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider transition hover:opacity-80"
        style={{ background: dotBg, color: dotColor }}>
        {statusLabel(item.stockStatus)}
      </button>
      <button onPointerDown={(e) => e.stopPropagation()} onClick={onDelete}
        className="opacity-0 transition hover:text-destructive group-hover:opacity-70">
        <Trash2 className="h-3 w-3" />
      </button>
    </motion.li>
  );
}
