import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Star, Heart, X } from "lucide-react";
import type { LibraryMeal } from "@/lib/meals-library";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MealLibraryEditor({
  meal, open, onClose, onSave,
}: {
  meal: Partial<LibraryMeal> | null;
  open: boolean;
  onClose: () => void;
  onSave: (m: Partial<LibraryMeal>) => Promise<void>;
}) {
  const [m, setM] = useState<Partial<LibraryMeal>>({});
  useEffect(() => { setM(meal ?? { title: "", energy_level: "medium" }); }, [meal, open]);

  const set = <K extends keyof LibraryMeal>(k: K, v: LibraryMeal[K]) => setM(prev => ({ ...prev, [k]: v }));
  const ingredients = (m.ingredients ?? []) as string[];
  const steps = (m.steps ?? []) as string[];
  const tags = (m.tags ?? []) as string[];

  const save = async () => {
    if (!m.title?.trim()) return;
    await onSave(m);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{m.id ? "Edit recipe" : "New recipe"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={m.title ?? ""} onChange={e => set("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea rows={2} value={m.description ?? ""} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Slot</Label>
              <Select value={m.slot ?? "any"} onValueChange={v => set("slot", v === "any" ? null : v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="Breakfast">Breakfast</SelectItem>
                  <SelectItem value="Lunch">Lunch</SelectItem>
                  <SelectItem value="Dinner">Dinner</SelectItem>
                  <SelectItem value="Snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prep min</Label>
              <Input type="number" value={m.prep_minutes ?? ""} onChange={e => set("prep_minutes", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cook min</Label>
              <Input type="number" value={m.cook_minutes ?? ""} onChange={e => set("cook_minutes", e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Servings</Label>
              <Input type="number" value={m.servings ?? ""} onChange={e => set("servings", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Energy</Label>
              <Select value={m.energy_level ?? "medium"} onValueChange={v => set("energy_level", v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rating</Label>
              <div className="flex h-9 items-center gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => set("family_rating", n)}>
                    <Star className={`h-4 w-4 ${(m.family_rating ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ListField label="Ingredients" items={ingredients} onChange={(v) => set("ingredients", v)} placeholder="2 cups rice" />
          <ListField label="Steps" items={steps} onChange={(v) => set("steps", v)} placeholder="Step description…" />
          <TagsField items={tags} onChange={(v) => set("tags", v)} />

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea rows={2} value={m.notes ?? ""} onChange={e => set("notes", e.target.value)} />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={() => set("is_favorite", !m.is_favorite)}>
              <Heart className={`mr-1 h-4 w-4 ${m.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} />
              {m.is_favorite ? "Favorited" : "Favorite"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={!m.title?.trim()}>Save</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ListField({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [v, setV] = useState("");
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="space-y-1">
        {items.map((it, idx) => (
          <div key={idx} className="flex gap-1">
            <Input value={it} onChange={e => onChange(items.map((x, i) => i === idx ? e.target.value : x))} className="h-8 text-xs" />
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onChange(items.filter((_, i) => i !== idx))}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onChange([...items, v.trim()]); setV(""); } }}>
          <Input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
          <Button size="sm" type="submit" variant="outline" className="h-8">Add</Button>
        </form>
      </div>
    </div>
  );
}

function TagsField({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState("");
  const presets = ["freezer", "low-energy", "sensory-safe", "quick", "kid-friendly", "budget"];
  return (
    <div>
      <Label className="text-xs text-muted-foreground">Tags</Label>
      <div className="mb-1 flex flex-wrap gap-1">
        {items.map(t => (
          <button key={t} onClick={() => onChange(items.filter(x => x !== t))}
            className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
            {t} ×
          </button>
        ))}
      </div>
      <div className="mb-1 flex flex-wrap gap-1">
        {presets.filter(p => !items.includes(p)).map(p => (
          <button key={p} onClick={() => onChange([...items, p])}
            className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/40">
            + {p}
          </button>
        ))}
      </div>
      <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (v.trim() && !items.includes(v.trim())) { onChange([...items, v.trim()]); setV(""); } }}>
        <Input value={v} onChange={e => setV(e.target.value)} placeholder="add tag" className="h-8 text-xs" />
        <Button size="sm" type="submit" variant="outline" className="h-8">Add</Button>
      </form>
    </div>
  );
}
