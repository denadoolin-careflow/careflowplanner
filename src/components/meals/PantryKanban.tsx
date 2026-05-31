import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShopMenu } from "./ShopMenu";
import { statusVar, statusLabel, type StockStatus } from "@/lib/pantry-colors";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

type PantryRow = {
  id: string;
  name: string;
  qty: string | null;
  unit: string | null;
  category: string | null;
  stock_status: string;
  in_stock: boolean;
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

export function PantryKanban() {
  const { user } = useStore();
  const [rows, setRows] = useState<PantryRow[]>([]);
  const [newName, setNewName] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("pantry_items")
      .select("id,name,qty,unit,category,stock_status,in_stock")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    setRows((data ?? []) as any);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const grouped = useMemo(() => {
    const out: Record<StockStatus, PantryRow[]> = { in: [], low: [], need_soon: [], out: [] };
    rows.forEach(r => { out[uiFromDb(r.stock_status)].push(r); });
    return out;
  }, [rows]);

  const moveTo = async (id: string, target: StockStatus) => {
    const dbVal = COLUMNS.find(c => c.key === target)!.db;
    setRows(prev => prev.map(r => r.id === id ? { ...r, stock_status: dbVal, in_stock: target === "in" } : r));
    await supabase.from("pantry_items").update({ stock_status: dbVal, in_stock: target === "in" }).eq("id", id);
  };

  const add = async () => {
    if (!user || !newName.trim()) return;
    const { data } = await supabase.from("pantry_items").insert({
      user_id: user.id, name: newName.trim(), stock_status: "out", in_stock: false,
    }).select().single();
    if (data) setRows(prev => [...prev, data as any]);
    setNewName("");
  };

  const remove = async (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    await supabase.from("pantry_items").delete().eq("id", id);
  };

  return (
    <div>
      <form className="mb-3 flex gap-2" onSubmit={e => { e.preventDefault(); add(); }}>
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Quick add ingredient…" />
        <Button type="submit" size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>
      </form>

      <DndContext
        onDragEnd={async (e: DragEndEvent) => {
          const fromId = String(e.active.id);
          const overId = e.over?.id ? String(e.over.id) : null;
          if (!fromId.startsWith("pk-") || !overId?.startsWith("col-")) return;
          const target = overId.slice(4) as StockStatus;
          await moveTo(fromId.slice(3), target);
          toast.success(`Moved to ${statusLabel(target)}`);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map(col => (
            <Column key={col.key} status={col.key} count={grouped[col.key].length}>
              {grouped[col.key].map(r => (
                <DraggableCard key={r.id} id={r.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: `hsl(${statusVar(col.key).slice(4,-1)})` }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.name}</div>
                      {(r.qty || r.unit || r.category) && (
                        <div className="truncate text-[10px] text-muted-foreground">
                          {[r.qty, r.unit, r.category].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <ShopMenu items={r.name} size="icon" variant="ghost" />
                    <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive" title="Remove">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </DraggableCard>
              ))}
              {grouped[col.key].length === 0 && (
                <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">Drag items here</p>
              )}
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ status, count, children }: { status: StockStatus; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border border-border/60 bg-muted/20 p-2 transition",
        isOver && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full"
              style={{ background: `hsl(${statusVar(status).slice(4,-1)})` }} />
        <span>{statusLabel(status)}</span>
        <span className="ml-auto text-muted-foreground/60">{count}</span>
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `pk-${id}` });
  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab rounded-lg border border-border/40 bg-background px-2 py-1.5 shadow-sm transition active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {children}
    </li>
  );
}