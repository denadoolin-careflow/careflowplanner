import { useState } from "react";
import { Sunrise, Sun, Sunset, Moon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { DayPart, Task } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

const PARTS: { value: DayPart; icon: typeof Sun; tint: string }[] = [
  { value: "Morning",    icon: Sunrise, tint: "text-amber-500" },
  { value: "Afternoon",  icon: Sun,     tint: "text-orange-500" },
  { value: "Evening",    icon: Sunset,  tint: "text-rose-500" },
  { value: "Late Night", icon: Moon,    tint: "text-indigo-400" },
];

const activeIcon = (dp?: DayPart) => PARTS.find(p => p.value === dp)?.icon ?? Sun;

export function QuickDayPartButton({ task, className }: { task: Task; className?: string }) {
  const { updateTask } = useStore();
  const [open, setOpen] = useState(false);
  const Icon = activeIcon(task.dayPart);

  const apply = async (next?: DayPart) => {
    haptics.snap?.();
    await updateTask(task.id, { dayPart: next });
    toast(next ? `Set time of day · ${next}` : "Cleared time of day");
    setOpen(false);
  };

  const hasValue = !!task.dayPart;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Time of day"
          title={task.dayPart ? `Time of day: ${task.dayPart}` : "Set time of day"}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full transition-all",
            "hover:bg-primary/10 hover:text-primary hover:scale-110 focus:opacity-100",
            hasValue
              ? "text-foreground opacity-100"
              : "text-muted-foreground opacity-0 group-hover:opacity-100",
            open && "opacity-100 bg-primary/10 text-primary",
            className,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", hasValue && PARTS.find(p => p.value === task.dayPart)?.tint)} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-auto rounded-2xl border-border/60 bg-card/95 p-1.5 shadow-xl backdrop-blur animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-0.5">
          {PARTS.map(p => {
            const I = p.icon;
            const selected = task.dayPart === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => apply(p.value)}
                title={p.value}
                aria-label={p.value}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl transition-all hover:bg-primary/10 hover:text-primary hover:scale-110",
                  selected && "bg-primary/15 text-primary",
                )}
              >
                <I className={cn("h-4 w-4", !selected && p.tint)} />
              </button>
            );
          })}
          {hasValue && (
            <>
              <div className="mx-1 h-6 w-px bg-border/60" />
              <button
                type="button"
                onClick={() => apply(undefined)}
                title="Clear"
                aria-label="Clear time of day"
                className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}