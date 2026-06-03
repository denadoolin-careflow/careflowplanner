import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ResetChecklist } from "@/lib/reset-checklists";
import { computeNextRun, describeRecurrence } from "@/lib/reset-recurrence";

const DAYS = [
  { v: 0, l: "S" }, { v: 1, l: "M" }, { v: 2, l: "T" }, { v: 3, l: "W" },
  { v: 4, l: "T" }, { v: 5, l: "F" }, { v: 6, l: "S" },
];

interface Props {
  list: ResetChecklist;
  onSave: (patch: Partial<ResetChecklist>) => Promise<void> | void;
  trigger?: React.ReactNode;
}

export function ResetScheduleDialog({ list, onSave, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"none" | "daily" | "weekly">((list.recurrence_type as any) ?? "none");
  const [days, setDays] = useState<number[]>(list.recurrence_days ?? []);
  const [time, setTime] = useState<string>((list.recurrence_time ?? "06:00").slice(0, 5));
  const [autoReset, setAutoReset] = useState<boolean>(list.auto_reset ?? true);

  const toggleDay = (d: number) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());

  const save = async () => {
    const rec = { recurrence_type: type, recurrence_days: days, recurrence_time: time };
    const next = computeNextRun(rec, new Date());
    await onSave({
      recurrence_type: type,
      recurrence_days: days,
      recurrence_time: type === "none" ? null : time,
      auto_reset: autoReset,
      next_run_at: next ? next.toISOString() : null,
    } as Partial<ResetChecklist>);
    toast.success(type === "none" ? "Schedule cleared" : describeRecurrence(rec));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1 text-xs font-medium text-foreground/70 ring-1 ring-white/60 hover:text-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Schedule</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Schedule "{list.name}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            {(["none", "daily", "weekly"] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-sm capitalize transition-all",
                  type === t
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {type === "weekly" && (
            <div>
              <Label className="text-xs">Days</Label>
              <div className="mt-1.5 flex gap-1.5">
                {DAYS.map(d => (
                  <button
                    key={d.v}
                    onClick={() => toggleDay(d.v)}
                    className={cn(
                      "h-9 w-9 rounded-full text-xs font-semibold transition-all",
                      days.includes(d.v)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type !== "none" && (
            <div>
              <Label htmlFor="reset-time" className="text-xs">Time</Label>
              <Input
                id="reset-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1.5"
              />
            </div>
          )}

          {type !== "none" && (
            <div className="flex items-start justify-between rounded-xl bg-muted/40 p-3">
              <div className="pr-3">
                <p className="text-sm font-medium">Auto-reset checklist</p>
                <p className="text-xs text-muted-foreground">
                  Uncheck all items and log the reset to history when the schedule fires.
                </p>
              </div>
              <Switch checked={autoReset} onCheckedChange={setAutoReset} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save schedule</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
