import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Repeat } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useWeekMealTemplates, type WeekMealTemplateEntry } from "@/lib/planner/week-meal-templates";
import type { Meal } from "@/lib/types";

export function WeekMealTemplatesDialog({
  open, onOpenChange, days,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  days: string[];
}) {
  const { state, addMeal, updateMeal } = useStore();
  const { templates, save, remove } = useWeekMealTemplates();
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("4");
  const [busy, setBusy] = useState(false);

  const saveCurrentWeek = () => {
    const entries: WeekMealTemplateEntry[] = [];
    days.forEach((iso, dayIndex) => {
      for (const m of state.meals.filter(x => x.date === iso)) {
        entries.push({ dayIndex, slot: m.slot, name: m.name, ingredients: m.ingredients ?? [], prepMinutes: m.prepMinutes ?? null });
      }
    });
    if (!entries.length) { toast.info("Plan a few meals this week first."); return; }
    save(name.trim() || `Week of ${format(parseISO(days[0]), "MMM d")}`, entries);
    setName("");
    toast.success("Meal pattern saved.");
  };

  const apply = async (entries: WeekMealTemplateEntry[]) => {
    const count = Math.max(1, Math.min(12, Number(weeks) || 1));
    setBusy(true);
    let written = 0;
    try {
      const start = parseISO(days[0]);
      for (let w = 0; w < count; w++) {
        for (const e of entries) {
          const iso = format(addDays(start, w * 7 + e.dayIndex), "yyyy-MM-dd");
          const existing = state.meals.find(m => m.date === iso && m.slot === e.slot);
          const patch = {
            name: e.name,
            ingredients: e.ingredients ?? [],
            prepMinutes: e.prepMinutes ?? undefined,
          };
          if (existing) await updateMeal(existing.id, patch);
          else await addMeal({ ...patch, date: iso, slot: e.slot as Meal["slot"] });
          written++;
        }
      }
      toast.success(`Applied ${written} meals across ${count} week${count > 1 ? "s" : ""}.`);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Repeating meal patterns</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Save this week as a pattern</Label>
            <div className="flex gap-2">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Busy school week" />
              <Button type="button" variant="outline" onClick={saveCurrentWeek}>Save</Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Apply to how many weeks (starting this one)</Label>
            <Input type="number" min={1} max={12} inputMode="numeric" value={weeks} onChange={e => setWeeks(e.target.value)} />
          </div>

          <div className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved patterns yet.</p>
            ) : templates.map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.entries.length} meals</p>
                </div>
                <Button type="button" size="sm" disabled={busy} onClick={() => void apply(t.entries)}>
                  <Repeat className="mr-1 h-3.5 w-3.5" /> Apply
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
