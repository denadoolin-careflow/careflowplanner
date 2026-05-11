import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarPlus } from "lucide-react";
import { startOfWeek, addDays, format } from "date-fns";
import type { LibraryMeal } from "@/lib/meals-library";
import { addLibraryMealsToWeek } from "@/lib/meals-library";
import { toast } from "sonner";

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

export function AddToWeekDialog({
  meals, open, onOpenChange, onDone,
}: {
  meals: LibraryMeal[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}) {
  const [weekOffset, setWeekOffset] = useState<"0" | "1">("0");
  const today = new Date();
  const start = useMemo(
    () => addDays(startOfWeek(today, { weekStartsOn: 1 }), Number(weekOffset) * 7),
    [weekOffset],
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const todayDow = (today.getDay() + 6) % 7;
  const [selectedDays, setSelectedDays] = useState<number[]>([todayDow]);
  const [defaultSlot, setDefaultSlot] = useState<typeof SLOTS[number]>("Dinner");
  const [mode, setMode] = useState<"fill_empty" | "replace">("fill_empty");
  const [addGroceries, setAddGroceries] = useState(true);
  const [busy, setBusy] = useState(false);

  const allHaveSlots = meals.every(m => m.slot && (SLOTS as readonly string[]).includes(m.slot));

  const submit = async () => {
    if (selectedDays.length === 0) {
      toast.error("Pick at least one day.");
      return;
    }
    setBusy(true);
    try {
      const targets: { date: string; slot: typeof SLOTS[number] }[] = [];
      meals.forEach((m, mi) => {
        const slot = (allHaveSlots ? m.slot : defaultSlot) as typeof SLOTS[number];
        const dow = selectedDays[mi % selectedDays.length];
        const d = days[dow].toISOString().slice(0, 10);
        targets.push({ date: d, slot });
      });
      const res = await addLibraryMealsToWeek(meals, targets, { mode, addGroceries });
      if (res.inserted === 0) {
        toast.info("No empty slots to fill — try replace mode.");
      } else {
        toast.success(`Added ${res.inserted} meal${res.inserted === 1 ? "" : "s"}${res.grocery ? ` · ${res.grocery} grocery items` : ""}.`);
        onDone?.();
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add meals");
    } finally { setBusy(false); }
  };

  const toggleDay = (i: number) => setSelectedDays(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i].sort());

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-amber-400" />
            Add to weekly plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-sm">
          <div className="text-xs text-muted-foreground">
            {meals.length === 1
              ? <>Adding <span className="text-foreground">{meals[0].title}</span></>
              : <>Adding <span className="text-foreground">{meals.length}</span> recipes</>}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Week</Label>
            <Select value={weekOffset} onValueChange={(v) => setWeekOffset(v as "0" | "1")}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">This week ({format(start, "MMM d")})</SelectItem>
                <SelectItem value="1">Next week ({format(addDays(start, 7), "MMM d")})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Days</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {days.map((d, i) => {
                const on = selectedDays.includes(i);
                return (
                  <button key={i} onClick={() => toggleDay(i)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                    {format(d, "EEE d")}
                  </button>
                );
              })}
            </div>
          </div>

          {!allHaveSlots && (
            <div>
              <Label className="text-xs text-muted-foreground">Slot</Label>
              <div className="mt-1 flex gap-1">
                {SLOTS.map(s => (
                  <button key={s} onClick={() => setDefaultSlot(s)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${defaultSlot === s ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">If a slot is taken</Label>
            <div className="mt-1 flex gap-1">
              <button onClick={() => setMode("fill_empty")}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${mode === "fill_empty" ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                Skip taken
              </button>
              <button onClick={() => setMode("replace")}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${mode === "replace" ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
                Replace
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <div>
              <div className="text-sm">Add ingredients to grocery list</div>
              <div className="text-[11px] text-muted-foreground">Skips items already in pantry or list.</div>
            </div>
            <Switch checked={addGroceries} onCheckedChange={setAddGroceries} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="rounded-full">
            {busy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Adding…</> : <><CalendarPlus className="mr-1 h-4 w-4" />Add</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}