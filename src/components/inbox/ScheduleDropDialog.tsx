import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DayPart } from "@/components/inbox/WhenPopover";

export interface SchedulePick {
  date: string;      // yyyy-MM-dd
  time?: string;     // HH:mm
  dayPart: DayPart;
}

const DAY_PARTS: DayPart[] = ["Morning", "Afternoon", "Evening"];

/**
 * Date + time picker shown when a task is dragged into "Needs a date".
 */
export function ScheduleDropDialog({
  open, onOpenChange, taskTitle, initial, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskTitle?: string;
  initial?: Partial<SchedulePick>;
  onConfirm: (pick: SchedulePick) => void;
}) {
  const [date, setDate] = useState<Date | undefined>(initial?.date ? new Date(`${initial.date}T00:00:00`) : new Date());
  const [time, setTime] = useState(initial?.time ?? "");
  const [dayPart, setDayPart] = useState<DayPart>(initial?.dayPart ?? "Morning");

  useEffect(() => {
    if (!open) return;
    setDate(initial?.date ? new Date(`${initial.date}T00:00:00`) : new Date());
    setTime(initial?.time ?? "");
    setDayPart(initial?.dayPart ?? "Morning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
              onChange={(e) => setTime(e.target.value)}
              aria-label="Start time"
              className="h-9 w-36"
            />
            <div className="ml-auto flex gap-1">
              {DAY_PARTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDayPart(p)}
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
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!date) return;
              onConfirm({ date: format(date, "yyyy-MM-dd"), time: time || undefined, dayPart });
              onOpenChange(false);
            }}
          >
            <CalendarIcon className="mr-1.5 h-4 w-4" /> Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
