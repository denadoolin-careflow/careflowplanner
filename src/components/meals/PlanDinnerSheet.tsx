import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Plus, Salad, Trash2, Users } from "lucide-react";
import { useDietaryMap, mealConflicts, hasDietary } from "@/lib/dietary";
import { DietaryDialog } from "@/components/meals/DietaryDialog";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MealPickerPopover } from "@/components/meals/MealPickerPopover";
import { useStore, todayISO } from "@/lib/store";
import { usePeopleDirectory } from "@/lib/people-directory";
import { linkMealPerson, unlinkMealPerson, type MealPerson } from "@/lib/meal-people";
import type { Meal } from "@/lib/types";

interface Plate {
  mealId?: string;
  personId?: string;
  name: string;
  prep: string;
  ingredients: string;
  steps?: string[];
  notes: string;
}

const blank = (): Plate => ({ name: "", prep: "", ingredients: "", notes: "" });
const fromMeal = (m: Meal, personId?: string): Plate => ({
  mealId: m.id, personId, name: m.name,
  prep: m.prepMinutes != null ? String(m.prepMinutes) : "",
  ingredients: (m.ingredients ?? []).join("\n"), steps: m.steps, notes: m.notes ?? "",
});
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function PlanDinnerSheet({
  open, onOpenChange, dinners, links,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Today's Dinner meals. */
  dinners: Meal[];
  links: MealPerson[];
}) {
  const { state, addMeal, updateMeal, deleteMeal, addGrocery } = useStore();
  const people = usePeopleDirectory();
  const [main, setMain] = useState<Plate>(blank());
  const [extras, setExtras] = useState<Plate[]>([]);
  const [split, setSplit] = useState(false);
  const [shop, setShop] = useState(true);
  const [saving, setSaving] = useState(false);
  const diet = useDietaryMap();
  const [dietFor, setDietFor] = useState<string | null>(null);
  const dietPerson = people.find((x) => x.id === dietFor) ?? null;

  useEffect(() => {
    if (!open) return;
    const linkOf = (id: string) => links.find((l) => l.mealId === id);
    const unlinked = dinners.filter((d) => !linkOf(d.id));
    const linked = dinners.filter((d) => linkOf(d.id));
    const mainMeal = unlinked[0];
    setMain(mainMeal ? fromMeal(mainMeal) : blank());
    const ex = linked.map((d) => fromMeal(d, linkOf(d.id)!.personId));
    setExtras(ex);
    setSplit(ex.length > 0);
  }, [open, dinners, links]);

  const save = async () => {
    const all = [main, ...(split ? extras : [])].filter((p) => p.name.trim());
    if (!main.name.trim()) { toast.error("Give tonight's dinner a name."); return; }
    setSaving(true);
    try {
      const today = todayISO();
      const keptIds = new Set<string>();
      for (const p of all) {
        const patch: Partial<Meal> = {
          name: p.name.trim(),
          prepMinutes: p.prep ? Number(p.prep) : undefined,
          ingredients: lines(p.ingredients),
          steps: p.steps ?? [],
          notes: p.notes.trim() || undefined,
        };
        let id = p.mealId;
        if (id) await updateMeal(id, patch);
        else id = await addMeal({ ...patch, name: patch.name!, date: today, slot: "Dinner" });
        if (!id) continue;
        keptIds.add(id);
        const prev = links.find((l) => l.mealId === id);
        const person = p.personId ? people.find((x) => x.id === p.personId) : undefined;
        if (prev && prev.personId !== p.personId) await unlinkMealPerson(id, prev.personId);
        if (person && prev?.personId !== person.id) {
          await linkMealPerson({ mealId: id, personId: person.id, personKind: person.kind });
        }
      }
      for (const d of dinners) if (!keptIds.has(d.id)) await deleteMeal(d.id);
      if (shop) {
        const have = new Set((state.grocery ?? []).filter((g) => !g.bought).map((g) => g.name.trim().toLowerCase()));
        const need = Array.from(new Set(all.flatMap((p) => lines(p.ingredients))))
          .filter((i) => !have.has(i.toLowerCase()));
        for (const n of need) await addGrocery(n);
        if (need.length) toast.success(`Added ${need.length} ingredient${need.length === 1 ? "" : "s"} to your shopping list`);
      }
      toast.success("Tonight's dinner is planned");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save dinner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">{dinners.length ? "Edit tonight's dinner" : "Plan tonight's dinner"}</DialogTitle>
          <DialogDescription>Write in a meal or pick one from your library.</DialogDescription>
        </DialogHeader>

        <PlateEditor plate={main} onChange={setMain} label="Main dinner" />

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Different meals for different people</span>
          <Switch checked={split} onCheckedChange={(v) => { setSplit(v); if (v && !extras.length) setExtras([blank()]); }} />
        </label>

        {split && (
          <div className="space-y-3">
            {extras.map((p, i) => (
              <div key={i} className="space-y-2 rounded-2xl p-3 ring-1 ring-border/60">
                <div className="flex items-center gap-2">
                  <Select value={p.personId ?? ""} onValueChange={(v) => setExtras((xs) => xs.map((x, j) => j === i ? { ...x, personId: v } : x))}>
                    <SelectTrigger className="h-9 flex-1 rounded-full"><SelectValue placeholder="Who is this for?" /></SelectTrigger>
                    <SelectContent>
                      {people.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Add loved ones or care recipients first.</div>}
                      {people.map((x) => (
                        <SelectItem key={x.id} value={x.id}>{x.emoji ? `${x.emoji} ` : ""}{x.name}{x.relation ? ` · ${x.relation}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="ghost" aria-label="Remove plate"
                    onClick={() => setExtras((xs) => xs.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {p.personId && (
                  <button type="button" onClick={() => setDietFor(p.personId!)}
                    className="flex items-center gap-1 text-xs font-semibold text-kitchen-terracotta">
                    <Salad className="h-3.5 w-3.5" /> {hasDietary(diet[p.personId]) ? "Diet & allergies: " + [...(diet[p.personId].diets ?? []), ...(diet[p.personId].allergies ?? []).map((a) => `no ${a.toLowerCase()}`)].join(", ") || "notes" : "Add diet & allergies"}
                  </button>
                )}
                <PlateEditor plate={p} onChange={(np) => setExtras((xs) => xs.map((x, j) => j === i ? np : x))} compact />
                <ConflictNote plate={p} d={p.personId ? diet[p.personId] : undefined} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 rounded-full"
              onClick={() => setExtras((xs) => [...xs, blank()])}>
              <Plus className="h-4 w-4" /> Add a plate for someone
            </Button>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={shop} onCheckedChange={(v) => setShop(!!v)} /> Add missing ingredients to my shopping list
        </label>

        <Button type="button" onClick={save} disabled={saving}
          className="w-full rounded-full bg-kitchen-terracotta text-kitchen-cream hover:bg-kitchen-terracotta/90">
          {saving ? "Saving…" : "Save dinner"}
        </Button>
      </DialogContent>
      <DietaryDialog person={dietPerson} value={dietFor ? diet[dietFor] : undefined} open={!!dietFor} onOpenChange={(v) => !v && setDietFor(null)} />
    </Dialog>
  );
}

function ConflictNote({ plate, d }: { plate: Plate; d?: import("@/lib/dietary").Dietary }) {
  if (!plate.name.trim()) return null;
  const c = mealConflicts({ name: plate.name, ingredients: lines(plate.ingredients), tags: [] }, d);
  if (!c.length) return null;
  return (
    <p className="flex items-start gap-1.5 rounded-xl bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>Doesn't match: {c.map((x) => `${x.rule} (${x.word})`).join(", ")}</span>
    </p>
  );
}

function PlateEditor({ plate, onChange, label, compact }: {
  plate: Plate; onChange: (p: Plate) => void; label?: string; compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>}
      <div className="flex gap-2">
        <Input value={plate.name} placeholder="Write in a meal…" onChange={(e) => onChange({ ...plate, name: e.target.value })} className="rounded-full" />
        <MealPickerPopover slot="Dinner"
          trigger={<Button type="button" variant="outline" className="shrink-0 gap-1.5 rounded-full"><BookOpen className="h-4 w-4" /> Library</Button>}
          onPick={(m) => onChange({
            ...plate, name: m.name,
            prep: m.prep_minutes != null ? String(m.prep_minutes) : plate.prep,
            ingredients: (m.ingredients ?? []).join("\n") || plate.ingredients,
            steps: m.steps ?? plate.steps,
          })} />
      </div>
      <div className="flex gap-2">
        <Input type="number" inputMode="numeric" min={0} value={plate.prep} placeholder="Prep min"
          onChange={(e) => onChange({ ...plate, prep: e.target.value })} className="w-28 rounded-full" />
      </div>
      <Textarea value={plate.ingredients} rows={compact ? 2 : 3} placeholder="Ingredients, one per line"
        onChange={(e) => onChange({ ...plate, ingredients: e.target.value })} />
      {!compact && (
        <Textarea value={plate.notes} rows={2} placeholder="Notes (optional)"
          onChange={(e) => onChange({ ...plate, notes: e.target.value })} />
      )}
    </div>
  );
}
