import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext, DragOverlay, closestCenter, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShopMenu } from "./ShopMenu";
import { statusVar, statusLabel, type StockStatus } from "@/lib/pantry-colors";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { reorderPantry, bulkSetPantryStatus } from "@/lib/meal-ai";
import { buzz, usePantrySensors } from "./dnd-shared";
import { setRestockCadence } from "@/lib/inventory-restock";
import type { Location } from "@/lib/inventory-seed";

type PantryRow = {
  id: string;
  name: string;
  qty: string | null;
  unit: string | null;
  category: string | null;
  stock_status: string;
  in_stock: boolean;
  sort_order: number;
  location?: string | null;
  restock_cadence?: string | null;
};

const COLUMNS: { key: StockStatus; db: string }[] = [
  { key: "in", db: "in_stock" },
  { key: "low", db: "low" },
  { key: "need_soon", db: "need_soon" },
  { key: "out", db: "out" },
];

const uiFromDb = (db: string): StockStatus => {
  if (db === "in_stock") return "in";
  if (db === "low") return "low";
  if (db === "need_soon") return "need_soon";
  return "out";
};

export function PantryKanban({ location }: { location?: Location | "All" } = {}) {
  const { user } = useStore();
  const [rows, setRows] = useState<PantryRow[]>([]);
  const [newName, setNewName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<StockStatus | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const sensors = usePantrySensors();
  const lastDropAt = useRef<number>(0);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("pantry_items")
      .select("id,name,qty,unit,category,stock_status,in_stock,sort_order,location,restock_cadence")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setRows((data ?? []) as any);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const filteredRows = useMemo(
    () => (!location || location === "All") ? rows : rows.filter(r => (r.location ?? "Pantry") === location),
    [rows, location],
  );

  const grouped = useMemo(() => {
    const out: Record<StockStatus, PantryRow[]> = { in: [], low: [], need_soon: [], out: [] };
    filteredRows.forEach(r => { out[uiFromDb(r.stock_status)].push(r); });
    (Object.keys(out) as StockStatus[]).forEach(k => {
      out[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
    });
    return out;
  }, [filteredRows]);

  const add = async () => {
    if (!user || !newName.trim()) return;
    const out = grouped.out;
    const nextOrder = out.length ? Math.max(...out.map(r => r.sort_order ?? 0)) + 1 : 1;
    const insertLoc = (!location || location === "All") ? "Pantry" : location;
    const { data } = await supabase.from("pantry_items").insert({
      user_id: user.id, name: newName.trim(), stock_status: "out", in_stock: false,
      sort_order: nextOrder, location: insertLoc,
    } as any).select().single();
    if (data) setRows(prev => [...prev, data as any]);
    setNewName("");
  };

  const toggleRestock = async (id: string) => {
    const cur = rows.find(r => r.id === id);
    const next = cur?.restock_cadence === "weekly" ? "biweekly"
               : cur?.restock_cadence === "biweekly" ? "none"
               : "weekly";
    setRows(prev => prev.map(r => r.id === id ? { ...r, restock_cadence: next } : r));
    await setRestockCadence(id, next);
    toast.success(next === "none" ? "Removed from restock" : `Restock ${next === "weekly" ? "every week" : "every 2 weeks"}`);
  };

  const remove = async (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    await supabase.from("pantry_items").delete().eq("id", id);
  };

  const findRow = useCallback((id: string) => rows.find(r => r.id === id), [rows]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault(); e.stopPropagation();
      setSelectedIds(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
      return;
    }
    if (e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      const row = findRow(id); if (!row) return;
      const col = uiFromDb(row.stock_status);
      const list = grouped[col];
      const anchorId = [...selectedIds].find(sid => {
        const r = findRow(sid); return r && uiFromDb(r.stock_status) === col;
      });
      if (!anchorId) { setSelectedIds(new Set([id])); return; }
      const a = list.findIndex(r => r.id === anchorId);
      const b = list.findIndex(r => r.id === id);
      if (a === -1 || b === -1) return;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const range = list.slice(lo, hi + 1).map(r => r.id);
      setSelectedIds(prev => new Set([...prev, ...range]));
    }
  };

  // Clear selection on Escape or background click
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedIds(new Set()); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const activeRow = activeId ? findRow(activeId) : null;
  const activeIsMulti = activeId ? selectedIds.has(activeId) && selectedIds.size > 1 : false;
  const dragCount = activeIsMulti ? selectedIds.size : 1;

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (!id.startsWith("pk-")) return;
    setActiveId(id.slice(3));
    document.body.classList.add("pantry-dragging");
    buzz(8);
  };

  const onDragOver = (e: { over: { id: string | number } | null }) => {
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) { setOverColumn(null); return; }
    if (overId.startsWith("col-")) setOverColumn(overId.slice(4) as StockStatus);
    else if (overId.startsWith("pk-")) {
      const r = findRow(overId.slice(3));
      setOverColumn(r ? uiFromDb(r.stock_status) : null);
    }
  };

  const cleanupDragState = () => {
    setActiveId(null);
    setOverColumn(null);
    document.body.classList.remove("pantry-dragging");
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const now = Date.now();
    if (now - lastDropAt.current < 600) { cleanupDragState(); return; }
    lastDropAt.current = now;
    try {
      const activeRaw = String(e.active.id);
      const overRaw = e.over?.id ? String(e.over.id) : null;
      if (!activeRaw.startsWith("pk-") || !overRaw) return;
      const activeRowId = activeRaw.slice(3);
      const src = findRow(activeRowId);
      if (!src) return;
      const srcCol = uiFromDb(src.stock_status);

      // Determine drop target column + target index
      let targetCol: StockStatus;
      let targetIndex: number;
      if (overRaw.startsWith("col-")) {
        targetCol = overRaw.slice(4) as StockStatus;
        targetIndex = grouped[targetCol].length;
      } else {
        const overRow = findRow(overRaw.slice(3));
        if (!overRow) return;
        targetCol = uiFromDb(overRow.stock_status);
        targetIndex = grouped[targetCol].findIndex(r => r.id === overRow.id);
      }

      const movingIds = activeIsMulti
        ? [activeRowId, ...[...selectedIds].filter(id => id !== activeRowId)]
        : [activeRowId];
      const movingSet = new Set(movingIds);
      const dbVal = COLUMNS.find(c => c.key === targetCol)!.db;
      const inStock = targetCol === "in";

      // Snapshot for rollback
      const snapshot = rows;

      // Build the new ordering of target column
      const targetList = grouped[targetCol].filter(r => !movingSet.has(r.id));
      const insertAt = Math.min(targetIndex, targetList.length);
      const movedRows = movingIds
        .map(id => findRow(id))
        .filter((r): r is PantryRow => !!r)
        .map(r => ({ ...r, stock_status: dbVal, in_stock: inStock }));
      targetList.splice(insertAt, 0, ...movedRows);

      // Source column re-pack (if different)
      const sourceList = srcCol !== targetCol
        ? grouped[srcCol].filter(r => !movingSet.has(r.id))
        : null;

      // Optimistic update
      setRows(prev => {
        const idxMap = new Map<string, PantryRow>();
        targetList.forEach((r, i) => idxMap.set(r.id, { ...r, sort_order: i + 1 }));
        if (sourceList) sourceList.forEach((r, i) => idxMap.set(r.id, { ...r, sort_order: i + 1 }));
        return prev.map(r => idxMap.get(r.id) ?? r);
      });

      try {
        if (movingIds.length === 1 && srcCol === targetCol) {
          // Pure reorder, single item
          await reorderPantry(targetList.map(r => r.id));
        } else {
          await bulkSetPantryStatus(movingIds, dbVal, inStock);
          await reorderPantry(targetList.map(r => r.id));
          if (sourceList) await reorderPantry(sourceList.map(r => r.id));
        }
        buzz(12);
        const count = movingIds.length;
        toast.success(
          srcCol === targetCol
            ? `Reordered`
            : `${count > 1 ? `${count} items` : "Moved"} → ${statusLabel(targetCol)}`,
        );
        if (activeIsMulti) setSelectedIds(new Set());
      } catch (err) {
        console.warn(err);
        setRows(snapshot);
        toast.error("Couldn't save — reverted");
      }
    } finally {
      cleanupDragState();
    }
  };

  return (
    <div>
      <form className="mb-3 flex gap-2" onSubmit={e => { e.preventDefault(); add(); }}>
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Quick add ingredient…" />
        <Button type="submit" size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>
      </form>

      {selectedIds.size > 1 && (
        <div className="mb-2 flex items-center justify-between rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          <span>{selectedIds.size} selected — drag any to move together</span>
          <button onClick={() => setSelectedIds(new Set())} className="opacity-70 hover:opacity-100">Clear</button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={cleanupDragState}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map(col => (
            <Column
              key={col.key}
              status={col.key}
              count={grouped[col.key].length}
              isDropTarget={overColumn === col.key && !!activeId}
              dragging={!!activeId}
            >
              <SortableContext
                items={grouped[col.key].map(r => `pk-${r.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {grouped[col.key].map(r => (
                  <SortablePantryCard
                    key={r.id}
                    row={r}
                    column={col.key}
                    selected={selectedIds.has(r.id)}
                    onSelectClick={(e) => toggleSelection(r.id, e)}
                    onRemove={() => remove(r.id)}
                    onToggleRestock={() => toggleRestock(r.id)}
                  />
                ))}
              </SortableContext>
              {grouped[col.key].length === 0 && (
                <p className={cn(
                  "px-2 py-3 text-center text-[11px] transition",
                  overColumn === col.key && !!activeId
                    ? "rounded-lg border border-dashed border-primary/50 text-primary"
                    : "text-muted-foreground",
                )}>
                  {overColumn === col.key && !!activeId ? "Drop here" : "Drag items here"}
                </p>
              )}
            </Column>
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.18, 0.67, 0.4, 1)" }}>
          {activeRow ? (
            <FloatingCard row={activeRow} count={dragCount} column={uiFromDb(activeRow.stock_status)} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  status, count, children, isDropTarget, dragging,
}: {
  status: StockStatus; count: number; children: React.ReactNode;
  isDropTarget: boolean; dragging: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `col-${status}` });
  const accent = `hsl(${statusVar(status).slice(4, -1)})`;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border border-border/60 bg-muted/20 p-2 transition-all duration-150",
        dragging && "border-border/40",
        isDropTarget && "scale-[1.01] border-transparent shadow-lg",
      )}
      style={isDropTarget ? {
        boxShadow: `0 0 0 2px ${accent}66, 0 8px 24px -10px ${accent}aa`,
        background: `linear-gradient(180deg, ${accent}14, transparent 70%)`,
      } : undefined}
    >
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
        <span>{statusLabel(status)}</span>
        <span className="ml-auto text-muted-foreground/60">{count}</span>
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function SortablePantryCard({
  row, column, selected, onSelectClick, onRemove,
}: {
  row: PantryRow;
  column: StockStatus;
  selected: boolean;
  onSelectClick: (e: React.MouseEvent) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `pk-${row.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const accent = `hsl(${statusVar(column).slice(4, -1)})`;
  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onSelectClick}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 shadow-sm transition",
        isDragging
          ? "border-dashed border-primary/40 bg-muted/40 opacity-40"
          : "border-border/40 hover:-translate-y-0.5 hover:shadow",
        selected && !isDragging && "ring-2 ring-primary/60 ring-offset-1 ring-offset-background",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag handle"
        className="touch-none -ml-1 grid h-7 w-5 shrink-0 cursor-grab place-items-center rounded text-muted-foreground/60 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 active:cursor-grabbing md:opacity-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{row.name}</div>
        {(row.qty || row.unit || row.category) && (
          <div className="truncate text-[10px] text-muted-foreground">
            {[row.qty, row.unit, row.category].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <ShopMenu items={row.name} size="icon" variant="ghost" />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="text-muted-foreground hover:text-destructive"
        title="Remove"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}

function FloatingCard({ row, count, column }: { row: PantryRow; count: number; column: StockStatus }) {
  const accent = `hsl(${statusVar(column).slice(4, -1)})`;
  return (
    <div className="relative">
      {count > 1 && (
        <>
          <div className="absolute inset-0 -translate-x-1 translate-y-1 rounded-lg border border-border/40 bg-background/80 shadow" />
          <div className="absolute inset-0 -translate-x-0.5 translate-y-0.5 rounded-lg border border-border/40 bg-background/90 shadow" />
        </>
      )}
      <div
        className="relative flex w-64 rotate-2 items-center gap-2 rounded-lg border bg-background px-2 py-2 shadow-2xl"
        style={{ borderColor: accent, boxShadow: `0 16px 40px -12px ${accent}cc` }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{row.name}</div>
          {count > 1 && (
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
              + {count - 1} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}