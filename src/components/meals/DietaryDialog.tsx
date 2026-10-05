import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ALLERGENS, DIETS, saveDietary, type Dietary } from "@/lib/dietary";
import type { DirectoryPerson } from "@/lib/people-directory";

export function DietaryDialog({ person, value, open, onOpenChange }: {
  person: DirectoryPerson | null; value?: Dietary; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDiets(value?.diets ?? []);
    setAllergies(value?.allergies ?? []);
    setNotes(value?.notes ?? "");
    setCustom("");
  }, [open, value]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    if (!person) return;
    setSaving(true);
    try {
      const extra = custom.split(",").map((s) => s.trim()).filter(Boolean);
      await saveDietary(person.id, person.kind, { diets, allergies: Array.from(new Set([...allergies, ...extra])), notes: notes.trim() });
      toast.success(`Saved ${person.name}'s food notes`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
    } finally { setSaving(false); }
  };

  const chip = (on: boolean) => cn("rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
    on ? "bg-kitchen-terracotta text-kitchen-cream ring-kitchen-terracotta" : "bg-background ring-border");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">{person?.name}'s diet & allergies</DialogTitle>
          <DialogDescription>Dinner plans that don't fit will be flagged.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eats</p>
          <div className="flex flex-wrap gap-1.5">
            {DIETS.map((d) => <button key={d} type="button" className={chip(diets.includes(d))} onClick={() => toggle(diets, setDiets, d)}>{d}</button>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allergies</p>
          <div className="flex flex-wrap gap-1.5">
            {[...ALLERGENS, ...allergies.filter((a) => !(ALLERGENS as readonly string[]).includes(a))].map((a) => (
              <button key={a} type="button" className={chip(allergies.includes(a))} onClick={() => toggle(allergies, setAllergies, a)}>{a}</button>
            ))}
          </div>
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Other allergies, comma separated (e.g. mushrooms)" className="rounded-full" />
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes — textures, dislikes, 'cut food small'…" />
        <Button type="button" onClick={save} disabled={saving}
          className="w-full rounded-full bg-kitchen-terracotta text-kitchen-cream hover:bg-kitchen-terracotta/90">
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
