/**
 * "How did that feel?" — record energy and any symptoms after a food.
 * Descriptive tracking only; it never diagnoses anything.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DELAY_OPTIONS, FEEL_SYMPTOMS, POSITIVE_SYMPTOMS, logFoodFeel } from "@/lib/wellflow/food-feel";

const RATINGS = [
  { value: 1, emoji: "😖", label: "Rough" },
  { value: 2, emoji: "😕", label: "Drained" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

export function FoodFeelSheet({
  open, onOpenChange, foodName, entryId, date,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  foodName: string;
  entryId?: string | null;
  date?: string;
}) {
  const [rating, setRating] = useState(3);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [delay, setDelay] = useState<number | null>(60);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setRating(3); setSymptoms([]); setDelay(60); setNote(""); }
  }, [open, foodName]);

  const toggle = (s: string) =>
    setSymptoms(list => (list.includes(s) ? list.filter(x => x !== s) : [...list, s]));

  const save = async () => {
    setSaving(true);
    try {
      await logFoodFeel({ food_name: foodName, entry_id: entryId ?? null, date, rating, symptoms, delay_minutes: delay, note });
      toast.success("Noted — patterns build up over time");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that");
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">How did that feel?</SheetTitle>
          <SheetDescription className="truncate">{foodName}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex justify-between gap-1.5">
          {RATINGS.map(r => (
            <button
              key={r.value} type="button" onClick={() => setRating(r.value)}
              aria-pressed={rating === r.value} aria-label={r.label}
              className={cn(
                "flex min-h-[3.75rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border text-[10px] transition-transform active:scale-95",
                rating === r.value
                  ? "border-primary bg-primary/15 font-semibold text-foreground"
                  : "border-border/50 bg-card/50 text-muted-foreground",
              )}
            >
              <span className="text-xl leading-none">{r.emoji}</span>
              {r.label}
            </button>
          ))}
        </div>

        <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Anything you noticed
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FEEL_SYMPTOMS.map(s => {
            const on = symptoms.includes(s);
            const good = POSITIVE_SYMPTOMS.has(s);
            return (
              <button
                key={s} type="button" onClick={() => toggle(s)} aria-pressed={on}
                className={cn(
                  "min-h-[2.25rem] rounded-full border px-3 text-xs transition-colors",
                  on
                    ? good ? "border-primary bg-primary/20 font-medium" : "border-destructive/60 bg-destructive/15 font-medium"
                    : "border-border/60 bg-card/50 text-muted-foreground",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>

        <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          When
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DELAY_OPTIONS.map(d => (
            <button
              key={d.value} type="button" onClick={() => setDelay(d.value)} aria-pressed={delay === d.value}
              className={cn(
                "min-h-[2.25rem] rounded-full border px-3 text-xs transition-colors",
                delay === d.value ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <Textarea
          className="mt-4"
          rows={2}
          placeholder="Anything else worth remembering?"
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 400))}
          aria-label="Note"
        />

        <div className="mt-4 flex gap-2 pb-6">
          <Button className="flex-1" onClick={save} disabled={saving}>Save</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Skip</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
