import { useState } from "react";
import { addDays, format, nextMonday, startOfWeek, endOfMonth } from "date-fns";
import { CalendarClock, Sun, Sunrise, CalendarRange, CalendarDays, Infinity as InfinityIcon, CalendarPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

function iso(d: Date) { return format(d, "yyyy-MM-dd"); }

export function QuickScheduleButton({ task, className }: { task: Task; className?: string }) {
  const { updateTask } = useStore();
  const [open, setOpen] = useState(false);
  const [pickDate, setPickDate] = useState(false);

  const apply = async (patch: Partial<Task>, label: string) => {
    haptics.snap?.();
    await updateTask(task.id, { inbox: false, ...patch });
    toast(`Scheduled “${task.title}” · ${label}`);
    setOpen(false);
    setPickDate(false);
  };

  const today = new Date();
  const opts = [
    { icon: Sun, label: "Today", run: () => apply({ dueDate: iso(today), status: "active" }, "today") },
    { icon: Sunrise, label: "Tomorrow", run: () => apply({ dueDate: iso(addDays(today, 1)), status: "active" }, "tomorrow") },
    { icon: CalendarRange, label: "This week", run: () => apply({ dueDate: iso(addDays(startOfWeek(today, { weekStartsOn: 1 }), 4)), status: "this_week" }, "this week") },
    { icon: CalendarRange, label: "Next week", run: () => apply({ dueDate: iso(nextMonday(today)), status: "active" }, "next week") },
    { icon: CalendarDays, label: "This month", run: () => apply({ dueDate: iso(endOfMonth(today)), status: "active" }, "this month") },
    { icon: InfinityIcon, label: "Someday", run: () => apply({ dueDate: undefined, status: "someday" }, "someday") },
  ];

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPickDate(false); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); }}
          aria-label="Schedule"
          title="Schedule"
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-all",
            "opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary hover:scale-110",
            "focus:opacity-100",
            open && "opacity-100 bg-primary/10 text-primary",
            className,
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-56 rounded-2xl border-border/60 bg-card/90 p-1.5 shadow-xl backdrop-blur animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {!pickDate ? (
          <div className="flex flex-col">
            {opts.map(o => (
              <button
                key={o.label}
                type="button"
                onClick={o.run}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <o.icon className="h-3.5 w-3.5" />
                <span className="flex-1">{o.label}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-border/60" />
            <button
              type="button"
              onClick={() => setPickDate(true)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              <span className="flex-1">Pick date…</span>
            </button>
          </div>
        ) : (
          <Calendar
            mode="single"
            selected={task.dueDate ? new Date(task.dueDate) : undefined}
            onSelect={(d) => d && apply({ dueDate: iso(d), status: "active" }, format(d, "MMM d"))}
            initialFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}