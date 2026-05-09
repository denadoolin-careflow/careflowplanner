import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Meal } from "@/lib/types";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; meal: Meal | null; defaultDate?: string; defaultSlot?: Meal["slot"] };
const SLOTS: Meal["slot"][] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export function MealEditor({ open, onOpenChange, meal, defaultDate, defaultSlot }: Props) {
  const { addMeal, updateMeal, deleteMeal } = useStore();
  const [draft, setDraft] = useState<Meal>({ id: "", date: defaultDate ?? "", slot: defaultSlot ?? "Dinner", name: "", notes: "", kidSafe: false });

  useEffect(() => {
    if (meal) setDraft(meal);
    else setDraft({ id: "", date: defaultDate ?? "", slot: defaultSlot ?? "Dinner", name: "", notes: "", kidSafe: false });
  }, [meal, defaultDate, defaultSlot, open]);

  const isNew = !meal;

  const save = async () => {
    if (!draft.name.trim()) { toast.error("What's cooking?"); return; }
    if (isNew) await addMeal({ name: draft.name, date: draft.date, slot: draft.slot, notes: draft.notes, kidSafe: draft.kidSafe });
    else await updateMeal(meal!.id, { name: draft.name, slot: draft.slot, date: draft.date, notes: draft.notes, kidSafe: draft.kidSafe });
    toast.success("Saved.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{isNew ? "Add a meal" : "Edit meal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Soup, leftovers, anything…" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Slot</Label>
              <Select value={draft.slot} onValueChange={v => setDraft({ ...draft, slot: v as Meal["slot"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={draft.notes ?? ""} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Quick notes…" />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
            <div className="text-sm">Kid-safe</div>
            <Switch checked={!!draft.kidSafe} onCheckedChange={v => setDraft({ ...draft, kidSafe: v })} />
          </div>
        </div>
        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
          {!isNew ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => { await deleteMeal(meal!.id); toast("Removed."); onOpenChange(false); }}>Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}