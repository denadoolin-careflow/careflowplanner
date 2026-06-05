import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, GripVertical, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import {
  addPantry, listPantry, PantryItem, removePantry, togglePantry, updatePantryCategory,
  reorderPantry,
} from "@/lib/meal-ai";
import {
  DndContext, DragOverlay, closestCenter, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buzz, usePantrySensors } from "./dnd-shared";
import type { Location } from "@/lib/inventory-seed";

export const PANTRY_CATEGORIES = [
  "Fridge", "Frozen", "Snacks", "Canned Goods", "Pasta & Grains",
  "Vegetables", "Fruits", "Meat & Seafood", "Dairy", "Bakery",
  "Condiments & Sauces", "Spices & Baking", "Beverages", "Other",
] as const;

type PantryCategory = typeof PANTRY_CATEGORIES[number];

const KEYWORDS: Record<string, PantryCategory> = {
  // Fridge
  milk: "Fridge", butter: "Fridge", egg: "Fridge", yogurt: "Fridge",
  cheese: "Dairy", cream: "Dairy",
  // Frozen
  frozen: "Frozen", "ice cream": "Frozen", popsicle: "Frozen",
  // Snacks
  chip: "Snacks", cracker: "Snacks", cookie: "Snacks", granola: "Snacks",
  pretzel: "Snacks", popcorn: "Snacks", candy: "Snacks", chocolate: "Snacks",
  // Canned
  canned: "Canned Goods", soup: "Canned Goods", bean: "Canned Goods",
  tuna: "Canned Goods", "tomato sauce": "Canned Goods",
  // Pasta & grains
  pasta: "Pasta & Grains", spaghetti: "Pasta & Grains", rice: "Pasta & Grains",
  noodle: "Pasta & Grains", quinoa: "Pasta & Grains", oat: "Pasta & Grains",
  flour: "Pasta & Grains", cereal: "Pasta & Grains",
  // Veggies
  lettuce: "Vegetables", spinach: "Vegetables", carrot: "Vegetables",
  onion: "Vegetables", potato: "Vegetables", garlic: "Vegetables",
  pepper: "Vegetables", broccoli: "Vegetables", cucumber: "Vegetables",
  tomato: "Vegetables", celery: "Vegetables", kale: "Vegetables",
  // Fruits
  apple: "Fruits", banana: "Fruits", berry: "Fruits", grape: "Fruits",
  orange: "Fruits", lemon: "Fruits", lime: "Fruits", melon: "Fruits",
  peach: "Fruits", pear: "Fruits", mango: "Fruits", pineapple: "Fruits",
  // Meat
  chicken: "Meat & Seafood", beef: "Meat & Seafood", pork: "Meat & Seafood",
  fish: "Meat & Seafood", salmon: "Meat & Seafood", shrimp: "Meat & Seafood",
  turkey: "Meat & Seafood", bacon: "Meat & Seafood",
  // Bakery
  bread: "Bakery", bagel: "Bakery", tortilla: "Bakery", bun: "Bakery", muffin: "Bakery",
  // Condiments
  ketchup: "Condiments & Sauces", mustard: "Condiments & Sauces",
  mayo: "Condiments & Sauces", sauce: "Condiments & Sauces",
  dressing: "Condiments & Sauces", oil: "Condiments & Sauces", vinegar: "Condiments & Sauces",
  // Spices
  salt: "Spices & Baking", sugar: "Spices & Baking", spice: "Spices & Baking",
  baking: "Spices & Baking", cinnamon: "Spices & Baking",
  // Beverages
  coffee: "Beverages", tea: "Beverages", juice: "Beverages",
  soda: "Beverages", water: "Beverages", wine: "Beverages", beer: "Beverages",
};

function guessCategory(name: string): PantryCategory {
  const n = name.toLowerCase();
  for (const [kw, cat] of Object.entries(KEYWORDS)) {
    if (n.includes(kw)) return cat;
  }
  return "Other";
}

export function PantryPanel({ location }: { location?: Location | "All" } = {}) {
  const { user } = useStore();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PantryCategory>("Other");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCategory, setOverCategory] = useState<string | null>(null);
  const sensors = usePantrySensors();

  useEffect(() => { if (user) listPantry(user.id).then(setItems); }, [user]);

  const visible = useMemo(() => {
    if (!location || location === "All") return items;
    return items.filter(it => ((it as any).location ?? "Pantry") === location);
  }, [items, location]);

  const add = async () => {
    if (!user || !name.trim()) return;
    const cat = category === "Other" ? guessCategory(name) : category;
    const it = await addPantry(user.id, name.trim(), cat);
    if (it) setItems(prev => [...prev, it]);
    setName("");
    setCategory("Other");
  };

  const toggle = async (it: PantryItem) => {
    setItems(prev => prev.map(p => p.id === it.id ? { ...p, in_stock: !p.in_stock } : p));
    await togglePantry(it.id, !it.in_stock);
  };
  const remove = async (id: string) => {
    setItems(prev => prev.filter(p => p.id !== id));
    await removePantry(id);
  };
  const changeCat = async (it: PantryItem, cat: PantryCategory) => {
    setItems(prev => prev.map(p => p.id === it.id ? { ...p, category: cat } : p));
    await updatePantryCategory(it.id, cat);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, PantryItem[]>();
    for (const it of visible) {
      const key = it.category && (PANTRY_CATEGORIES as readonly string[]).includes(it.category)
        ? it.category
        : "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return PANTRY_CATEGORIES
      .filter(c => map.has(c))
      .map(c => [
        c,
        map.get(c)!.sort(
          (a, b) => ((a.sort_order ?? 0) - (b.sort_order ?? 0)) || a.name.localeCompare(b.name),
        ),
      ] as const);
  }, [visible]);

  const findItem = useCallback((id: string) => items.find(i => i.id === id), [items]);
  const activeItem = activeId ? findItem(activeId) : null;

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (!id.startsWith("pl-")) return;
    setActiveId(id.slice(3));
    document.body.classList.add("pantry-dragging");
    buzz(8);
  };
  const onDragOver = (e: { over: { id: string | number } | null }) => {
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) { setOverCategory(null); return; }
    if (overId.startsWith("cat-")) setOverCategory(overId.slice(4));
    else if (overId.startsWith("pl-")) {
      const r = findItem(overId.slice(3));
      setOverCategory(r?.category ?? "Other");
    }
  };
  const cleanup = () => {
    setActiveId(null); setOverCategory(null);
    document.body.classList.remove("pantry-dragging");
  };

  const onDragEnd = async (e: DragEndEvent) => {
    try {
      const activeRaw = String(e.active.id);
      const overRaw = e.over?.id ? String(e.over.id) : null;
      if (!activeRaw.startsWith("pl-") || !overRaw) return;
      const id = activeRaw.slice(3);
      const src = findItem(id);
      if (!src) return;
      const srcCat = (src.category && (PANTRY_CATEGORIES as readonly string[]).includes(src.category)
        ? src.category : "Other") as PantryCategory;

      let targetCat: PantryCategory;
      let targetIndex: number;
      const targetListRaw = (cat: string) => (grouped.find(([c]) => c === cat)?.[1] ?? []) as PantryItem[];
      if (overRaw.startsWith("cat-")) {
        targetCat = overRaw.slice(4) as PantryCategory;
        targetIndex = targetListRaw(targetCat).length;
      } else {
        const overItem = findItem(overRaw.slice(3));
        if (!overItem) return;
        targetCat = ((overItem.category && (PANTRY_CATEGORIES as readonly string[]).includes(overItem.category)
          ? overItem.category : "Other") as PantryCategory);
        targetIndex = targetListRaw(targetCat).findIndex(i => i.id === overItem.id);
      }

      const snapshot = items;
      const targetList = targetListRaw(targetCat).filter(i => i.id !== id);
      targetList.splice(Math.min(targetIndex, targetList.length), 0, { ...src, category: targetCat });
      const sourceList = srcCat !== targetCat
        ? targetListRaw(srcCat).filter(i => i.id !== id)
        : null;

      setItems(prev => {
        const idxMap = new Map<string, PantryItem>();
        targetList.forEach((r, i) => idxMap.set(r.id, { ...r, sort_order: i + 1, category: targetCat }));
        if (sourceList) sourceList.forEach((r, i) => idxMap.set(r.id, { ...r, sort_order: i + 1 }));
        return prev.map(r => idxMap.get(r.id) ?? r);
      });

      try {
        if (srcCat !== targetCat) await updatePantryCategory(id, targetCat);
        await reorderPantry(targetList.map(r => r.id));
        if (sourceList) await reorderPantry(sourceList.map(r => r.id));
        buzz(12);
        if (srcCat !== targetCat) toast.success(`Moved to ${targetCat}`);
      } catch (err) {
        console.warn(err);
        setItems(snapshot);
        toast.error("Couldn't save — reverted");
      }
    } finally {
      cleanup();
    }
  };

  return (
    <div>
      <form className="mb-3 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Input placeholder="Add staple…" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Select value={category} onValueChange={(v) => setCategory(v as PantryCategory)}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PANTRY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="submit">Add</Button>
      </form>
      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">Track what's already in the pantry — the AI will avoid adding it to your grocery list.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={cleanup}
        >
          <div className="space-y-3">
            {grouped.map(([cat, list]) => (
              <DroppableSection
                key={cat}
                cat={cat}
                count={list.length}
                isOver={overCategory === cat && !!activeId}
                dragging={!!activeId}
                collapsed={!!collapsed[cat]}
                onToggle={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
              >
                {!collapsed[cat] && (
                  <SortableContext items={list.map(i => `pl-${i.id}`)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-1 px-2 pb-2">
                      {list.map(it => (
                        <SortablePantryItem
                          key={it.id}
                          item={it}
                          onToggle={() => toggle(it)}
                          onRemove={() => remove(it.id)}
                          onChangeCategory={(v) => changeCat(it, v)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                )}
              </DroppableSection>
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.4, 1)" }}>
            {activeItem ? (
              <div className="flex w-72 rotate-1 items-center gap-2 rounded-lg border border-primary/40 bg-background px-3 py-2 shadow-2xl">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="whitespace-normal break-words leading-snug text-sm font-medium">{activeItem.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function DroppableSection({
  cat, count, isOver, dragging, collapsed, onToggle, children,
}: {
  cat: string; count: number; isOver: boolean; dragging: boolean;
  collapsed: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: `cat-${cat}` });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border/60 transition-all",
        dragging && "border-border/40",
        isOver && "border-primary/50 bg-primary/5 shadow",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium hover:bg-muted/40"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        <span>{cat}</span>
        <span className="ml-auto text-xs text-muted-foreground">{count}</span>
        {isOver && (
          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
            Drop to move
          </span>
        )}
      </button>
      {children}
    </section>
  );
}

function SortablePantryItem({
  item, onToggle, onRemove, onChangeCategory,
}: {
  item: PantryItem;
  onToggle: () => void;
  onRemove: () => void;
  onChangeCategory: (v: PantryCategory) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `pl-${item.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-lg px-2 py-1 text-sm transition",
        isDragging
          ? "border border-dashed border-primary/40 bg-muted/40 opacity-40"
          : "hover:bg-muted/40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag handle"
        className="touch-none -ml-1 mt-0.5 grid h-7 w-5 shrink-0 cursor-grab place-items-center rounded text-muted-foreground/60 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox checked={item.in_stock} onCheckedChange={onToggle} className="mt-0.5" />
      <span className={cn("min-w-0 flex-1 whitespace-normal break-words leading-snug", !item.in_stock && "text-muted-foreground line-through")}>{item.name}</span>
      <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <Select value={(item.category as PantryCategory) ?? "Other"} onValueChange={(v) => onChangeCategory(v as PantryCategory)}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PANTRY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}