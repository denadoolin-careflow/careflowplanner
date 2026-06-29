import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { BellRing, Bell, X } from "lucide-react";
import { addHours, addDays, addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

type Props = {
  value?: string | null;
  note?: string | null;
  onChange: (next: { followUpAt: string | null; followUpNote?: string | null }) => void | Promise<void>;
  /** Render the trigger as a small icon button (default) or a wider pill. */
  variant?: "icon" | "pill";
  className?: string;
};

/**
 * Follow-up reminder picker. Stores an ISO timestamp on the task; the
 * Notification Center surfaces it once `followUpAt <= now`.
 */
export function FollowUpPopover({ value, note, onChange, variant = "icon", className }: Props) {
  const [open, setOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(note ?? "");
  const [customDate, setCustomDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const [customTime, setCustomTime] = useState<string>(value ? format(new Date(value), "HH:mm") : "09:00");

  const setAt = async (d: Date, label: string) => {
    await onChange({ followUpAt: d.toISOString(), followUpNote: draftNote.trim() || null });
    haptics.snap?.();
    toast.success(`Follow-up · ${label}`, { description: format(d, "EEE MMM d · h:mm a") });
    setOpen(false);
  };

  const clear = async () => {
    await onChange({ followUpAt: null, followUpNote: null });
    setDraftNote("");
    haptics.tap?.();
    toast("Follow-up cleared");
    setOpen(false);
  };

  const now = new Date();
  const presets: { label: string; date: Date }[] = [
    { label: "In 1 hour", date: addHours(now, 1) },
    { label: "Tonight", date: setMinutes(setHours(startOfDay(now), 19), 0) },
    { label: "Tomorrow morning", date: setMinutes(setHours(addDays(startOfDay(now), 1), 9), 0) },
    { label: "In 3 days", date: setMinutes(setHours(addDays(startOfDay(now), 3), 9), 0) },
    { label: "Next week", date: setMinutes(setHours(addDays(startOfDay(now), 7), 9), 0) },
  ];

  const hasValue = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "pill" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1.5 rounded-full border-border/60 px-2.5 text-[11.5px]",
              hasValue && "border-primary/40 bg-primary/10 text-foreground",
              className,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <BellRing className="h-3 w-3" />
            {hasValue ? format(new Date(value!), "MMM d · h:mm a") : "Follow up"}
          </Button>
        ) : (
          <button
            type="button"
            aria-label={hasValue ? "Edit follow-up reminder" : "Add follow-up reminder"}
            title={hasValue ? `Follow-up · ${format(new Date(value!), "EEE MMM d · h:mm a")}` : "Follow up later"}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full transition-colors",
              hasValue ? "text-primary" : "text-muted-foreground/60 hover:text-foreground",
              className,
            )}
          >
            {hasValue ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-2"
        align="end"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Follow up
        </div>
        <div className="grid grid-cols-1 gap-0.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setAt(p.date, p.label)}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
            >
              <span>{p.label}</span>
              <span className="text-[10px] text-muted-foreground">{format(p.date, "EEE h:mm a")}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-md border border-border/50 bg-muted/30 p-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Custom</div>
          <Calendar
            mode="single"
            selected={customDate}
            onSelect={(d) => setCustomDate(d ?? undefined)}
            weekStartsOn={1}
            className="p-0"
          />
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="h-8 flex-1 text-xs"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 text-[11px]"
              disabled={!customDate}
              onClick={() => {
                if (!customDate) return;
                const [h, m] = customTime.split(":").map(Number);
                const d = setMinutes(setHours(startOfDay(customDate), h || 9), m || 0);
                void setAt(d, "Custom");
              }}
            >
              Set
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Note (optional)</div>
          <Input
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="e.g. check in about insurance"
            className="h-8 text-xs"
          />
        </div>
        {hasValue && (
          <button
            type="button"
            onClick={clear}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" /> Clear follow-up
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
