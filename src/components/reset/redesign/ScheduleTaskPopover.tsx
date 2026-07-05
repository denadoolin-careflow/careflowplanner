import { useState } from "react";
import { addDays, format, nextMonday, startOfWeek } from "date-fns";
import { CalendarClock, Sun, Sunrise, Sunset, CalendarRange, CalendarPlus, Infinity as InfinityIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import type { ResetItem, TimeBlock } from "@/lib/reset-checklists";

function iso(d: Date) { return format(d, "yyyy-MM-dd"); }

export function ScheduleTaskPopover({
  item, onUpdate, className, size = "sm",
}: {
  item: ResetItem;
  onUpdate: (id: string, patch: Partial<ResetItem>) => Promise<void> | void;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [pickDate, setPickDate] = useState(false);

  const apply = async (patch: Partial<ResetItem>, label: string) => {
    haptics.tap?.();
    await onUpdate(item.id, patch);
    toast(`Scheduled · ${label}`);
    setOpen(false);
    setPickDate(false);
  };

  const today = new Date();
  const dateOpts = [
    { icon: Sun, label: "Today", run: () => apply({ due_date: iso(today) }, "today") },
    { icon: Sunrise, label: "Tomorrow", run: () => apply({ due_date: iso(addDays(today, 1)) }, "tomorrow") },
    { icon: CalendarRange, label: "This week", run: () => apply({ due_date: iso(addDays(startOfWeek(today, { weekStartsOn: 1 }), 4)) }, "this week") },
    { icon: CalendarRange, label: "Next week", run: () => apply({ due_date: iso(nextMonday(today)) }, "next week") },
    { icon: InfinityIcon, label: "Someday", run: () => apply({ due_date: null }, "someday") },
  ];
  const blocks: { id: TimeBlock; icon: typeof Sun; label: string }[] = [
    { id: "morning", icon: Sunrise, label: "Morning" },
    { id: "afternoon", icon: Sun, label: "Afternoon" },
    { id: "evening", icon: Sunset, label: "Evening" },
  ];

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPickDate(false); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Schedule task"
          title="Schedule"
          className={cn(
            "grid place-items-center rounded-full text-[hsl(var(--reset-ink))]/60 transition-all",
            "hover:bg-[hsl(var(--reset-sage-soft))] hover:text-[hsl(var(--reset-sage-deep))]",
            size === "sm" ? "h-7 w-7" : "h-8 w-8",
            open && "bg-[hsl(var(--reset-sage-soft))] text-[hsl(var(--reset-sage-deep))]",
            className,
          )}
        >
          <CalendarClock className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-60 rounded-2xl border-[hsl(var(--reset-line))] bg-[hsl(var(--reset-cream))]/95 p-2 shadow-xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        {!pickDate ? (
          <div className="flex flex-col">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--reset-ink))]/55">Time block</p>
            <div className="grid grid-cols-3 gap-1 px-1 pb-2">
              {blocks.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => apply({ time_block: item.time_block === b.id ? null : b.id }, b.label)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                    item.time_block === b.id
                      ? "bg-[hsl(var(--reset-sage))] text-white"
                      : "bg-[hsl(var(--reset-cream-deep))] text-[hsl(var(--reset-ink))]/75 hover:bg-[hsl(var(--reset-sage-soft))]",
                  )}
                >
                  <b.icon className="h-3.5 w-3.5" />
                  {b.label}
                </button>
              ))}
            </div>
            <div className="my-1 h-px bg-[hsl(var(--reset-line))]/70" />
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--reset-ink))]/55">Due</p>
            {dateOpts.map(o => (
              <button
                key={o.label}
                type="button"
                onClick={o.run}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-[hsl(var(--reset-charcoal))] transition-colors hover:bg-[hsl(var(--reset-sage-soft))]"
              >
                <o.icon className="h-3.5 w-3.5 text-[hsl(var(--reset-sage-deep))]" />
                <span className="flex-1">{o.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPickDate(true)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-[hsl(var(--reset-charcoal))] transition-colors hover:bg-[hsl(var(--reset-sage-soft))]"
            >
              <CalendarPlus className="h-3.5 w-3.5 text-[hsl(var(--reset-sage-deep))]" />
              <span className="flex-1">Pick date…</span>
            </button>
          </div>
        ) : (
          <Calendar
            mode="single"
            selected={item.due_date ? new Date(item.due_date) : undefined}
            onSelect={(d) => d && apply({ due_date: iso(d) }, format(d, "MMM d"))}
            initialFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}