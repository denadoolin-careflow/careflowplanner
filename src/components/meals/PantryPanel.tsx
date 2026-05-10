import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { addPantry, listPantry, PantryItem, removePantry, togglePantry } from "@/lib/meal-ai";

export function PantryPanel() {
  const { user } = useStore();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [name, setName] = useState("");

  useEffect(() => { if (user) listPantry(user.id).then(setItems); }, [user]);

  const add = async () => {
    if (!user || !name.trim()) return;
    const it = await addPantry(user.id, name.trim());
    if (it) setItems(prev => [...prev, it]);
    setName("");
  };

  const toggle = async (it: PantryItem) => {
    setItems(prev => prev.map(p => p.id === it.id ? { ...p, in_stock: !p.in_stock } : p));
    await togglePantry(it.id, !it.in_stock);
  };
  const remove = async (id: string) => {
    setItems(prev => prev.filter(p => p.id !== id));
    await removePantry(id);
  };

  return (
    <div>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Input placeholder="Add staple…" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Add</Button>
      </form>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Track what's already in the pantry — the AI will avoid adding it to your grocery list.</p>
      ) : (
        <ul className="space-y-1">
          {items.map(it => (
            <li key={it.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/40">
              <Checkbox checked={it.in_stock} onCheckedChange={() => toggle(it)} />
              <span className={it.in_stock ? "" : "text-muted-foreground line-through"}>{it.name}</span>
              <button onClick={() => remove(it.id)} className="ml-auto opacity-0 transition group-hover:opacity-60"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}