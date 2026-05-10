import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { FavoriteMeal, saveFavorite, updateFavorite } from "@/lib/meal-ai";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipe?: FavoriteMeal | null;
  onSaved: () => void;
};

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

export function RecipeEditor({ open, onOpenChange, recipe, onSaved }: Props) {
  const { user } = useStore();
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<string>("Dinner");
  const [prep, setPrep] = useState<string>("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(recipe?.name ?? "");
      setSlot(recipe?.slot ?? "Dinner");
      setPrep(recipe?.prep_minutes ? String(recipe.prep_minutes) : "");
      setIngredients((recipe?.ingredients ?? []).join("\n"));
      setSteps((recipe?.steps ?? []).join("\n"));
      setTags((recipe?.tags ?? []).join(", "));
      setNotes(recipe?.notes ?? "");
    }
  }, [open, recipe]);

  const onSave = async () => {
    if (!user || !name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      slot: slot || null,
      prep_minutes: prep ? Number(prep) : null,
      ingredients: ingredients.split("\n").map(s => s.trim()).filter(Boolean),
      steps: steps.split("\n").map(s => s.trim()).filter(Boolean),
      tags: tags.split(",").map(s => s.trim()).filter(Boolean),
      notes: notes.trim() || null,
    };
    try {
      if (recipe) await updateFavorite(recipe.id, payload);
      else await saveFavorite(user.id, payload);
      toast.success(recipe ? "Recipe updated" : "Recipe saved");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{recipe ? "Edit recipe" : "New recipe"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Sheet-pan chicken & veg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Slot</Label>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prep (min)</Label>
              <Input type="number" inputMode="numeric" value={prep} onChange={e => setPrep(e.target.value)} placeholder="25" />
            </div>
          </div>
          <div>
            <Label>Ingredients <span className="text-xs text-muted-foreground">(one per line)</span></Label>
            <Textarea rows={5} value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="2 chicken breasts&#10;1 cup rice&#10;Olive oil" />
          </div>
          <div>
            <Label>Steps <span className="text-xs text-muted-foreground">(one per line)</span></Label>
            <Textarea rows={5} value={steps} onChange={e => setSteps(e.target.value)} placeholder="Preheat oven&#10;Season chicken&#10;Roast 25 min" />
          </div>
          <div>
            <Label>Tags <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="kid-safe, freezer-friendly" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save recipe"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
