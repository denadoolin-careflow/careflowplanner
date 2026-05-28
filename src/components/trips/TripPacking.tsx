import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  bulkCreatePacking,
  createPacking,
  deletePacking,
  updatePacking,
  type PackingItem,
} from "@/lib/trips/api";
import { PACKING_TEMPLATES } from "@/lib/trips/packingTemplates";

const CATS = ["Clothing", "Toiletries", "Documents", "Electronics", "Other"];

export function TripPacking({
  tripId,
  items,
  onChanged,
}: {
  tripId: string;
  items: PackingItem[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");

  async function add() {
    if (!name.trim()) return;
    await createPacking({ trip_id: tripId, name: name.trim(), category });
    setName("");
    onChanged();
  }

  async function applyTemplate(t: string) {
    await bulkCreatePacking(tripId, PACKING_TEMPLATES[t]);
    onChanged();
  }

  const packed = items.filter((i) => i.packed).length;
  const grouped = CATS.map((c) => ({ c, items: items.filter((i) => i.category === c) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Templates:</span>
        {Object.keys(PACKING_TEMPLATES).map((t) => (
          <Button key={t} variant="outline" size="sm" onClick={() => applyTemplate(t)}>
            {t}
          </Button>
        ))}
      </div>

      <Card className="p-3 flex gap-2 items-end">
        <div className="flex-1">
          <Input
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={add}><Plus className="h-4 w-4" /></Button>
      </Card>

      {items.length > 0 && (
        <p className="text-sm text-muted-foreground">{packed} of {items.length} packed</p>
      )}

      {grouped.map(({ c, items: gi }) => gi.length > 0 && (
        <div key={c}>
          <h3 className="font-semibold mb-2">{c}</h3>
          <div className="space-y-1">
            {gi.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-accent/30">
                <Checkbox
                  checked={i.packed}
                  onCheckedChange={(v) => {
                    updatePacking(i.id, { packed: !!v }).then(onChanged);
                  }}
                />
                <span className={i.packed ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                  {i.name}{i.quantity > 1 && <span className="text-muted-foreground"> × {i.quantity}</span>}
                </span>
                <Button size="icon" variant="ghost" onClick={() => deletePacking(i.id).then(onChanged)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No items yet. Use a template or add manually.</p>
      )}
    </div>
  );
}