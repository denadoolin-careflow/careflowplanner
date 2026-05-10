import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Copy, Download, Pencil, Check, X, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { SavedListsDialog } from "./SavedListsDialog";

const CAT_ORDER = ["Produce", "Protein", "Dairy", "Bakery", "Frozen", "Pantry", "Other"];

export function GroceryList() {
  const { state, addGrocery, toggleGrocery, deleteGrocery, setGroceryStock, updateGroceryItem } = useStore();
  const [g, setG] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [savedOpen, setSavedOpen] = useState(false);

  const groceryByCat = state.grocery.reduce<Record<string, typeof state.grocery>>((acc, item) => {
    const k = item.category ?? "Other";
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {});
  const sortedCats = Object.keys(groceryByCat).sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a); const bi = CAT_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const buildText = () => {
    const lines: string[] = [];
    sortedCats.forEach(cat => {
      lines.push(`## ${cat}`);
      groceryByCat[cat].forEach(item => {
        const tick = item.bought ? "[x]" : "[ ]";
        const stock = item.stockStatus === "in" ? " (in stock)" : "";
        const qty = item.qty ? ` — ${item.qty}` : "";
        lines.push(`- ${tick} ${item.name}${qty}${stock}`);
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      toast.success("Grocery list copied.");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const onExportTxt = () => {
    const blob = new Blob([buildText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `grocery-${new Date().toISOString().slice(0,10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const onExportCsv = () => {
    const rows = [["Category","Item","Qty","Bought","Stock"]];
    sortedCats.forEach(cat => {
      groceryByCat[cat].forEach(item => {
        rows.push([cat, item.name, item.qty ?? "", item.bought ? "yes" : "no", item.stockStatus === "in" ? "in stock" : "out of stock"]);
      });
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `grocery-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const startEdit = (id: string, name: string, qty?: string) => {
    setEditing(id); setEditName(name); setEditQty(qty ?? "");
  };
  const saveEdit = async (id: string) => {
    if (!editName.trim()) { setEditing(null); return; }
    await updateGroceryItem(id, { name: editName.trim(), qty: editQty.trim() || null });
    setEditing(null);
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

      {state.grocery.length === 0 ? (
        <p className="text-xs text-muted-foreground">Your grocery list will fill in when you plan a week.</p>
      ) : (
        <div className="space-y-3">
          {sortedCats.map(cat => (
            <div key={cat}>
              <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{cat}</div>
              <ul className="space-y-0.5">
                {groceryByCat[cat].map(item => {
                  const isEditing = editing === item.id;
                  const inStock = item.stockStatus === "in";
                  return (
                    <li key={item.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/40">
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
                          <button
                            onClick={() => setGroceryStock(item.id, inStock ? "out" : "in")}
                            title={inStock ? "Mark out of stock" : "Mark in stock"}
                          >
                            <Badge
                              variant={inStock ? "secondary" : "outline"}
                              className={`ml-1 cursor-pointer rounded-full text-[10px] ${inStock ? "bg-primary/15 text-primary hover:bg-primary/25" : "text-muted-foreground hover:bg-muted"}`}
                            >
                              {inStock ? "In stock" : "Out"}
                            </Badge>
                          </button>
                          <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-70">
                            <button onClick={() => startEdit(item.id, item.name, item.qty)} title="Edit"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => deleteGrocery(item.id)} title="Delete"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
