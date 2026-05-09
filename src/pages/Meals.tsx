import { useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { startOfWeek, addDays, format } from "date-fns";
import { Trash2 } from "lucide-react";

export default function Meals() {
  const { state, addMeal, deleteMeal, addGrocery, toggleGrocery, deleteGrocery } = useStore();
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const slots = ["Breakfast","Lunch","Dinner","Snack"] as const;
  const [g, setG] = useState("");

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-warm p-6">
        <h2 className="font-display text-3xl font-semibold">Meals this week</h2>
        <p className="mt-1 text-sm text-muted-foreground">Simple, kid-safe, no decisions at 5pm.</p>
      </div>

      <SectionCard title="Weekly meal plan" accent="warm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="p-2"></th>
                {days.map(d => <th key={d.toISOString()} className="p-2">{format(d, "EEE d")}</th>)}
              </tr>
            </thead>
            <tbody>
              {slots.map(s => (
                <tr key={s} className="border-t border-border/60">
                  <td className="p-2 text-xs uppercase text-muted-foreground">{s}</td>
                  {days.map(d => {
                    const m = state.meals.find(x => x.date === d.toISOString().slice(0,10) && x.slot === s);
                    return (
                      <td key={d.toISOString()} className="p-1 align-top">
                        {m ? (
                          <div className="group rounded-lg bg-muted/40 px-2 py-1.5 text-xs">
                            {m.name}
                            <button onClick={() => deleteMeal(m.id)} className="ml-1 opacity-0 group-hover:opacity-60">×</button>
                          </div>
                        ) : (
                          <button onClick={() => { const name = prompt(`${s} for ${format(d,"EEE")}:`); if (name) addMeal({ name, date: d.toISOString().slice(0,10), slot: s }); }}
                            className="w-full rounded-lg border border-dashed border-border/60 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">+</button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="Grocery list" accent="sage">
          <form className="mb-3 flex gap-2" onSubmit={e => { e.preventDefault(); if (!g.trim()) return; addGrocery(g); setG(""); }}>
            <Input placeholder="Add item…" value={g} onChange={e => setG(e.target.value)} />
            <Button type="submit">Add</Button>
          </form>
          <ul className="space-y-1">
            {state.grocery.map(item => (
              <li key={item.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/40">
                <Checkbox checked={item.bought} onCheckedChange={() => toggleGrocery(item.id)} />
                <span className={item.bought ? "text-muted-foreground line-through" : ""}>{item.name}</span>
                {item.category && <span className="ml-auto text-xs text-muted-foreground">{item.category}</span>}
                <button onClick={() => deleteGrocery(item.id)} className="opacity-0 group-hover:opacity-60"><Trash2 className="h-3 w-3" /></button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Kid-safe favorites" accent="warm">
          <ul className="grid grid-cols-2 gap-1.5 text-sm">
            {["Grilled cheese","Wraps","Chicken nuggets","Pasta","Snack plate","Tacos","Breakfast for dinner","PB&J","Quesadilla","Yogurt + fruit"].map(m => (
              <li key={m} className="rounded-lg bg-muted/40 px-3 py-2">{m}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Picky eater notes" accent="calm">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>Sam — beige foods, no sauces touching, no green flecks.</li>
            <li>Always offer a known-safe item alongside something new.</li>
            <li>Snack plates count as dinner. They do.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Pantry staples" accent="sage">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {["Pasta","Rice","Beans","Tortillas","Bread","Eggs","Cheese","Peanut butter","Frozen veg","Canned tomato","Oats","Crackers"].map(s => (
              <span key={s} className="rounded-full bg-muted px-3 py-1">{s}</span>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
