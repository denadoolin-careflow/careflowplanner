/**
 * Gentle movement suggestions from your own history. Editable before you
 * accept them, and only ever a plan you choose — not a prescription.
 */
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { ACTIVITIES } from "@/lib/wellflow/movement";
import { useMovementSuggestion } from "@/lib/wellflow/movement-suggest";
import { WEEKDAYS, useWellflowReminders } from "@/lib/wellflow/reminders";

export function MovementSuggestions({
  onAccept,
}: {
  /** Persist the accepted preference into the plan. */
  onAccept?: (v: { activity: string; minutes: number; days: number[] }) => Promise<void> | void;
}) {
  const { suggestion, loading } = useMovementSuggestion();
  const { settings, save } = useWellflowReminders();

  const [activity, setActivity] = useState(suggestion.activity);
  const [minutes, setMinutes] = useState(suggestion.minutes);
  const [days, setDays] = useState<number[]>(suggestion.days);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActivity(suggestion.activity);
    setMinutes(suggestion.minutes);
    setDays(suggestion.days);
  }, [suggestion]);

  const toggle = (d: number) =>
    setDays(p => (p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort()));

  const accept = async () => {
    if (!days.length) { toast.error("Pick at least one day"); return; }
    setBusy(true);
    try {
      await onAccept?.({ activity, minutes, days });
      await save({ ...settings, movement_days: days });
      toast.success("Added to your plan");
    } catch {
      toast.error("Could not save that just now");
    } finally { setBusy(false); }
  };

  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-muted/50" />;

  return (
    <SectionCard title="A movement idea for you" subtitle="Built from what you've already been doing">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {suggestion.reason}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ms-activity">Activity</Label>
          <select id="ms-activity" value={activity} onChange={e => setActivity(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {ACTIVITIES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ms-minutes">Minutes</Label>
          <Input id="ms-minutes" type="number" min={5} max={180} value={minutes}
                 onChange={e => setMinutes(Number(e.target.value) || 0)} />
        </div>
      </div>

      <div className="mt-3">
        <Label>Days</Label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => toggle(i)} aria-pressed={days.includes(i)}
                    className={cn("rounded-full border px-3 py-1 text-xs",
                      days.includes(i) ? "border-primary bg-primary/15 font-medium"
                                       : "border-border/60 text-muted-foreground hover:bg-muted/50")}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <Button className="mt-4 w-full" disabled={busy} onClick={accept}>
        Add to my plan
      </Button>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        A suggestion based on your own logs — adjust it freely, and check with your care team
        before starting anything new.
      </p>
    </SectionCard>
  );
}
