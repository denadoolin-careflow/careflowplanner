import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { addLibraryMealsToWeek, type LibraryMeal } from "@/lib/meals-library";

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

export function AddToDayPopover({
  meals, onDone, trigger, align = "end",
}: {
  meals: LibraryMeal[];
  onDone?: () => void;
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [slot, setSlot] = useState<typeof SLOTS[number]>("Dinner");
  const [replace, setReplace] = useState(false);
  const [addGroceries, setAddGroceries] = useState(true);
  const [busy, setBusy] = useState(false);

  const allHaveSlots = meals.length > 0 && meals.every(m => m.slot && (SLOTS as readonly string[]).includes(m.slot));

  const submit = async () => {
    if (!meals.length) return;
    setBusy(true);
    try {
      const iso = date.toISOString().slice(0, 10);
      const targets = meals.map(m => ({
        date: iso,
        slot: (allHaveSlots ? (m.slot as typeof SLOTS[number]) : slot),
      }));
      const res = await addLibraryMealsToWeek(meals, targets, {
        mode: replace ? "replace" : "fill_empty",
        addGroceries,
      });
      if (res.inserted === 0) {
        toast.info("That slot is taken — flip Replace to overwrite.");
      } else {
        toast.success(`Added ${res.inserted} to ${format(date, "EEE MMM d")}${res.grocery ? ` · ${res.grocery} grocery items` : ""}.`);
        onDone?.();
        setOpen(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add");
    } finally { setBusy(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-[280px] p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-amber-400" />
          Add to a specific day
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          className="rounded-md border border-border/60 p-1"
        />
        {!allHaveSlots && (
          <div className="mt-2 flex flex-wrap gap-1">
            {SLOTS.map(s => (
              <button key={s} onClick={() => setSlot(s)}
                className={`rounded-full border px-2 py-0.5 text-[11px] transition ${slot === s ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-xs">
          <span>Replace if taken</span>
          <Switch checked={replace} onCheckedChange={setReplace} />
        </div>
        <div className="mt-1.5 flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-xs">
          <span>Add to grocery list</span>
          <Switch checked={addGroceries} onCheckedChange={setAddGroceries} />
        </div>
        <Button onClick={submit} disabled={busy} className="mt-3 w-full rounded-full" size="sm">
          {busy ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Adding…</> :
            <>Add {meals.length > 1 ? `${meals.length} meals` : "meal"} to {format(date, "EEE MMM d")}</>}
        </Button>
      </PopoverContent>
    </Popover>
  );
}