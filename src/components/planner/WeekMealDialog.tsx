import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MealPickerPopover } from "@/components/meals/MealPickerPopover";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { BookOpen, ShoppingCart, Trash2 } from "lucide-react";
import type { Meal } from "@/lib/types";

const SLOTS: Meal["slot"][] = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink"];

export function WeekMealDialog({
  open, onOpenChange, meal, date, slot,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meal: Meal | null;
  date: string;
  slot: Meal["slot"];
}) {
  const { state, addMeal, updateMeal, deleteMeal, addGrocery } = useStore();
  const [name, setName] = useState("");
  const [mealSlot, setMealSlot] = useState<Meal["slot"]>(slot);
  const [mealDate, setMealDate] = useState(date);
  const [prep, setPrep] = useState<string>("");
  const [ingredients, setIngredients] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(meal?.name ?? "");
    setMealSlot(meal?.slot ?? slot);
    setMealDate(meal?.date ?? date);
    setPrep(meal?.prepMinutes != null ? String(meal.prepMinutes) : "");
    setIngredients((meal?.ingredients ?? []).join("\n"));
    setNotes(meal?.notes ?? "");
  }, [open, meal, date, slot]);

  const ingredientList = ingredients.split("\n").map(s => s.trim()).filter(Boolean);

  const save = async () => {
    if (!name.trim()) { toast.error("Give the meal a name."); return; }
    const patch = {
      name: name.trim(),
      slot: mealSlot,
      date: mealDate,
      notes: notes.trim() || undefined,
      prepMinutes: prep.trim() ? Number(prep) : undefined,
      ingredients: ingredientList,
    };
    if (meal) await updateMeal(meal.id, patch);
    else await addMeal(patch);
    onOpenChange(false);
  };

  const remove = async () => {
    if (!meal) return;
    await deleteMeal(meal.id);
    onOpenChange(false);
  };

  const toGroceries = async () => {
    if (!ingredientList.length) { toast.info("Add ingredients first."); return; }
    const have = new Set(state.grocery.filter(g => !g.bought).map(g => g.name.toLowerCase().trim()));
    let added = 0;
    for (const ing of ingredientList) {
      if (have.has(ing.toLowerCase())) continue;
      have.add(ing.toLowerCase());
      await addGrocery(ing);
      added++;
    }
    toast.success(added ? `Added ${added} to your grocery list.` : "Everything is already on the list.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {meal ? "Edit meal" : "Add meal"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {slot} · {format(parseISO(date), "EEE MMM d")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <div className="flex gap-2">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="What are we eating?" autoFocus />
              <MealPickerPopover
                slot={mealSlot === "Drink" ? "Snack" : mealSlot}
                onPick={(picked) => {
                  setName(picked.name);
                  if (picked.prep_minutes != null) setPrep(String(picked.prep_minutes));
                  if (picked.ingredients?.length) setIngredients(picked.ingredients.join("\n"));
                }}
                trigger={
                  <Button type="button" variant="outline" size="icon" aria-label="Pick from library">
                    <BookOpen className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Label className="text-xs">Slot</Label>
              <Select value={mealSlot} onValueChange={v => setMealSlot(v as Meal["slot"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={mealDate} onChange={e => setMealDate(e.target.value)} />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">Prep (min)</Label>
              <Input type="number" inputMode="numeric" value={prep} onChange={e => setPrep(e.target.value)} placeholder="20" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Ingredients (one per line)</Label>
            <Textarea rows={4} value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder={"chicken thighs\nrice\nbroccoli"} />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Leftovers, swaps, who's home…" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={toGroceries}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Add ingredients to grocery list
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {meal ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          ) : <span />}
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
