import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, AlertTriangle, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DayPart } from "@/components/inbox/WhenPopover";
import {
  SNAP_STEPS, getSnapStep, setSnapStep, snapTime, toMinutes, toTime,
  findConflict, nextFreeSlot, busyLabel, suggestForDayPart,
  type BusyBlock, type SnapStep,
} from "@/lib/planner/time-snap";

export interface SchedulePick {
  date: string;      // yyyy-MM-dd
  time?: string;     // HH:mm
  dayPart: DayPart;
}

const DAY_PARTS: DayPart[] = ["Morning", "Afternoon", "Evening"];

/**
 * Date + time picker shown when a task is dragged into "Needs a date".
 * Times snap to the user's preferred step and conflicts with already
 * scheduled items are surfaced with a one-tap fix.
 */
export function ScheduleDropDialog({
  open, onOpenChange, taskTitle, initial, onConfirm,
  busyFor, duration = 30,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskTitle?: string;
  initial?: Partial<SchedulePick>;
  onConfirm: (pick: SchedulePick) => void;
  /** Busy blocks for a given yyyy-MM-dd, used for conflict warnings. */
  busyFor?: (dateISO: string) => BusyBlock[];
  /** Minutes the task is expected to take. */
  duration?: number;
}) {
  const [date, setDate] = useState<Date | undefined>(initial?.date ? new Date(`${initial.date}T00:00:00`) : new Date());
  const [time, setTime] = useState(initial?.time ?? "");
  const [dayPart, setDayPart] = useState<DayPart>(initial?.dayPart ?? "Morning");
  const [step, setStep] = useState<SnapStep>(() => getSnapStep());

  useEffect(() => {
    if (!open) return;
    setDate(initial?.date ? new Date(`${initial.date}T00:00:00`) : new Date());
    setTime(snapTime(initial?.time) ?? "");
    setDayPart(initial?.dayPart ?? "Morning");
    setStep(getSnapStep());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dateISO = date ? format(date, "yyyy-MM-dd") : "";
  const busy = useMemo(() => (dateISO && busyFor ? busyFor(dateISO) : []), [dateISO, busyFor]);

  const startMin = toMinutes(time);
  const conflict = startMin == null ? null : findConflict(startMin, duration, busy);
  const alternative = useMemo(() => {
    if (startMin == null || !conflict) return null;
    const free = nextFreeSlot(startMin, duration, busy, step);
    return free == null ? null : toTime(free);
  }, [startMin, conflict, busy, duration, step]);

  const suggestions = useMemo(() => {
    if (!dateISO) return [] as string[];
    return DAY_PARTS.map((p) => suggestForDayPart(p, duration, busy, step));
  }, [dateISO, busy, duration, step]);

  const chooseStep = (s: SnapStep) => {
    setStep(s);
    setSnapStep(s);
    if (time) setTime(snapTime(time, s) ?? time);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">Schedule this task</DialogTitle>
          <DialogDescription className="truncate">{taskTitle ?? "Pick a date and time"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className={cn("rounded-xl border p-3 pointer-events-auto")}
          />

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              type="time"
              value={time}
              step={step * 60}
              onChange={(e) => setTime(e.target.value)}
              onBlur={() => setTime((t) => snapTime(t, step) ?? t)}
              aria-label="Start time"
              className="h-9 w-36"
            />
            <div className="ml-auto flex gap-1">
              {DAY_PARTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setDayPart(p);
                    setTime(suggestForDayPart(p, duration, busy, step));
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11.5px] transition",
                    dayPart === p ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Snap step preference */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Snap to</span>
            {SNAP_STEPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => chooseStep(s)}
                aria-pressed={step === s}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] transition",
                  step === s ? "bg-primary/15 text-primary ring-1 ring-primary/40" : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {s === 60 ? "1 hr" : `${s}m`}
              </button>
            ))}
          </div>

          {/* Free-slot suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Free</span>
              {suggestions.map((s, i) => (
                <button
                  key={`${s}-${i}`}
                  type="button"
                  onClick={() => { setTime(s); setDayPart(DAY_PARTS[i]); }}
                  className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] transition hover:bg-muted"
                >
                  {DAY_PARTS[i]} · {s}
                </button>
              ))}
            </div>
          )}

          {conflict && (
            <div className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-2.5 text-[12px]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    Overlaps “{conflict.title}”
                  </p>
                  <p className="text-muted-foreground">{busyLabel(conflict)} is already booked.</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {alternative && (
                      <button
                        type="button"
                        onClick={() => setTime(alternative)}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
                      >
                        <Wand2 className="h-3 w-3" /> Move to {alternative}
                      </button>
                    )}
                    <span className="rounded-full bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      Or keep this time to double-book
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!date) return;
              onConfirm({ date: format(date, "yyyy-MM-dd"), time: snapTime(time, step) || undefined, dayPart });
              onOpenChange(false);
            }}
          >
            <CalendarIcon className="mr-1.5 h-4 w-4" /> {conflict ? "Schedule anyway" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
