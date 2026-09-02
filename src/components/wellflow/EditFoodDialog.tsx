import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface EditableFood {
  name: string;
  serving_size: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  servings?: number;
}

/** Shared editor for a saved library food or an already-logged meal. */
export function EditFoodDialog({
  open, onOpenChange, title = "Edit food", value, withServings, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  value: EditableFood | null;
  withServings?: boolean;
  onSave: (next: EditableFood) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<EditableFood | null>(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value); }, [value, open]);

  if (!draft) return null;
  const set = (patch: Partial<EditableFood>) => setDraft(d => (d ? { ...d, ...patch } : d));
  const num = (v: string) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 ? x : 0;
  };

  const save = async () => {
    if (!draft.name.trim()) { toast("Give the food a name first."); return; }
    setSaving(true);
    try {
      await onSave({ ...draft, name: draft.name.trim() });
      toast.success("Saved");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="wf-name">Name</Label>
            <Input id="wf-name" value={draft.name} onChange={e => set({ name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wf-serving">Serving size</Label>
              <Input id="wf-serving" value={draft.serving_size ?? ""} placeholder="1 cup"
                     onChange={e => set({ serving_size: e.target.value })} />
            </div>
            {withServings && (
              <div>
                <Label htmlFor="wf-servings">Servings</Label>
                <Input id="wf-servings" type="number" min="0.1" step="0.1" inputMode="decimal"
                       value={draft.servings ?? 1}
                       onChange={e => {
                         const next = Math.max(num(e.target.value), 0.1);
                         const prev = draft.servings ?? 1;
                         const k = next / prev;
                         // Keep macros in step with the portion you actually ate.
                         set({
                           servings: next,
                           calories: Math.round(draft.calories * k * 10) / 10,
                           protein: Math.round(draft.protein * k * 10) / 10,
                           carbs: Math.round(draft.carbs * k * 10) / 10,
                           fat: Math.round(draft.fat * k * 10) / 10,
                           fiber: Math.round(draft.fiber * k * 10) / 10,
                         });
                       }} />
              </div>
            )}

          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ["Calories", "calories"], ["Protein (g)", "protein"], ["Carbs (g)", "carbs"],
              ["Fat (g)", "fat"], ["Fiber (g)", "fiber"],
            ] as const).map(([label, key]) => (
              <div key={key}>
                <Label htmlFor={`wf-${key}`}>{label}</Label>
                <Input id={`wf-${key}`} type="number" min="0" inputMode="decimal"
                       value={draft[key]}
                       onChange={e => set({ [key]: num(e.target.value) } as Partial<EditableFood>)} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
