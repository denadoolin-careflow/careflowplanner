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
import {
  DELAY_OPTIONS, FEEL_SYMPTOMS, POSITIVE_SYMPTOMS, deleteFoodFeel, findFeelForEntry,
  logFoodFeel, updateFoodFeel, type Severities,
} from "@/lib/wellflow/food-feel";

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
  const [severities, setSeverities] = useState<Severities>({});
  const [delay, setDelay] = useState<number | null>(60);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  /* Reopening for an entry loads what you already saved, so it can be edited. */
  useEffect(() => {
    if (!open) return;
    setRating(3); setSymptoms([]); setSeverities({}); setDelay(60); setNote(""); setExistingId(null);
    if (!entryId) return;
    let cancel = false;
    void findFeelForEntry(entryId).then(log => {
      if (cancel || !log) return;
      setExistingId(log.id);
      setRating(log.rating);
      setSymptoms(log.symptoms);
      setSeverities(log.severities ?? {});
      setDelay(log.delay_minutes);
      setNote(log.note ?? "");
    });
    return () => { cancel = true; };
  }, [open, foodName, entryId]);

  const toggle = (s: string) =>
    setSymptoms(list => {
      const on = list.includes(s);
      setSeverities(sev => {
        const next = { ...sev };
        if (on) delete next[s];
        else next[s] = next[s] ?? 2;
        return next;
      });
      return on ? list.filter(x => x !== s) : [...list, s];
    });

  const setSeverity = (s: string, value: number) =>
    setSeverities(sev => ({ ...sev, [s]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { rating, symptoms, severities, delay_minutes: delay, note };
      if (existingId) {
        await updateFoodFeel(existingId, payload);
        toast.success("Updated");
      } else {
        await logFoodFeel({ food_name: foodName, entry_id: entryId ?? null, date, ...payload });
        toast.success("Noted — patterns build up over time");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that");
    } finally { setSaving(false); }
  };

  const removeLog = async () => {
    if (!existingId) return;
    await deleteFoodFeel(existingId);
    toast.success("Entry removed");
    onOpenChange(false);
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

        {symptoms.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              How strong
            </p>
            {symptoms.map(s => (
              <div key={s} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs">{s}</span>
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3].map(v => (
                    <button
                      key={v} type="button" onClick={() => setSeverity(s, v)}
                      aria-label={`${s} strength ${v} of 3`}
                      aria-pressed={(severities[s] ?? 2) === v}
                      className={cn(
                        "min-h-[2.25rem] flex-1 rounded-full border text-[11px] transition-colors",
                        (severities[s] ?? 2) === v
                          ? POSITIVE_SYMPTOMS.has(s)
                            ? "border-primary bg-primary/20 font-medium"
                            : "border-destructive/60 bg-destructive/15 font-medium"
                          : "border-border/60 bg-card/50 text-muted-foreground",
                      )}
                    >
                      {v === 1 ? "Mild" : v === 2 ? "Medium" : "Strong"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
          <Button className="flex-1" onClick={save} disabled={saving}>
            {existingId ? "Update" : "Save"}
          </Button>
          {existingId && (
            <Button variant="ghost" onClick={removeLog}>Delete</Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {existingId ? "Close" : "Skip"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
