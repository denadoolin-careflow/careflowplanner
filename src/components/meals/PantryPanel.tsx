import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import {
  addPantry, listPantry, PantryItem, removePantry, togglePantry, updatePantryCategory,
} from "@/lib/meal-ai";

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
  pepper: "Spices & Baking" as PantryCategory, baking: "Spices & Baking",
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

export function PantryPanel() {
  const { user } = useStore();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PantryCategory>("Other");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => { if (user) listPantry(user.id).then(setItems); }, [user]);

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
    for (const it of items) {
      const key = it.category && (PANTRY_CATEGORIES as readonly string[]).includes(it.category)
        ? it.category
        : "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return PANTRY_CATEGORIES
      .filter(c => map.has(c))
      .map(c => [c, map.get(c)!.sort((a, b) => a.name.localeCompare(b.name))] as const);
  }, [items]);

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
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Track what's already in the pantry — the AI will avoid adding it to your grocery list.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(([cat, list]) => {
            const isCollapsed = !!collapsed[cat];
            return (
              <section key={cat} className="rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  className="flex w-full items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium hover:bg-muted/40"
                >
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  <span>{cat}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{list.length}</span>
                </button>
                {!isCollapsed && (
                  <ul className="space-y-1 px-2 pb-2">
                    {list.map(it => (
                      <li key={it.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/40">
                        <Checkbox checked={it.in_stock} onCheckedChange={() => toggle(it)} />
                        <span className={it.in_stock ? "" : "text-muted-foreground line-through"}>{it.name}</span>
                        <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <Select value={(it.category as PantryCategory) ?? "Other"} onValueChange={(v) => changeCat(it, v as PantryCategory)}>
                            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PANTRY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}