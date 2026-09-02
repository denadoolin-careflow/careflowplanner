/** Log a walk, a workout, or any movement — minutes, intensity, and a note. */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ACTIVITIES, INTENSITIES, logMovement } from "@/lib/wellflow/movement";
import { todayISO } from "@/lib/wellflow/types";

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const QUICK = [10, 20, 30, 45, 60];

export function MovementSheet({
  open, onOpenChange, date = todayISO(),
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date?: string;
}) {
  const [activity, setActivity] = useState<string>("walk");
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState<string>("easy");
  const [time, setTime] = useState(nowTime());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setActivity("walk"); setMinutes(30); setIntensity("easy"); setTime(nowTime()); setNote(""); }
  }, [open]);

  const save = async () => {
    if (minutes <= 0) { toast.error("Add how many minutes"); return; }
    setSaving(true);
    try {
      await logMovement({ activity, minutes, intensity, date, time, note });
      toast.success("Movement logged");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that");
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Log movement</SheetTitle>
          <SheetDescription>Anything counts — a walk around the block is movement.</SheetDescription>
        </SheetHeader>

        <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What</p>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITIES.map(a => (
            <button
              key={a.key} type="button" onClick={() => setActivity(a.key)} aria-pressed={activity === a.key}
              className={cn(
                "min-h-[2.5rem] rounded-full border px-3 text-xs transition-colors",
                activity === a.key ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Minutes</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map(m => (
            <button
              key={m} type="button" onClick={() => setMinutes(m)} aria-pressed={minutes === m}
              className={cn(
                "min-h-[2.5rem] min-w-[3.25rem] rounded-full border text-xs transition-colors",
                minutes === m ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground",
              )}
            >
              {m}m
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="mv-min">Minutes</Label>
            <Input id="mv-min" type="number" inputMode="numeric" min="0" max="600" className="h-11"
                   value={minutes} onChange={e => setMinutes(Math.min(Math.max(Number(e.target.value) || 0, 0), 600))} />
          </div>
          <div>
            <Label htmlFor="mv-time">Time</Label>
            <Input id="mv-time" type="time" className="h-11" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">How it felt</p>
        <div className="flex gap-1.5">
          {INTENSITIES.map(i => (
            <button
              key={i.key} type="button" onClick={() => setIntensity(i.key)} aria-pressed={intensity === i.key}
              className={cn(
                "min-h-[2.5rem] flex-1 rounded-full border text-xs transition-colors",
                intensity === i.key ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground",
              )}
            >
              {i.label}
            </button>
          ))}
        </div>

        <Textarea className="mt-4" rows={2} placeholder="Anything worth remembering?"
                  value={note} onChange={e => setNote(e.target.value.slice(0, 300))} aria-label="Note" />

        <div className="mt-4 flex gap-2 pb-6">
          <Button className="flex-1" onClick={save} disabled={saving}>Save</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
