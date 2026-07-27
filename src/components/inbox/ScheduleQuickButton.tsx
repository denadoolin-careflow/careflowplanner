import { useState } from "react";
import { format, startOfDay } from "date-fns";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

const PRESETS: { label: string; time: string; hint: string }[] = [
  { label: "Morning", time: "09:00", hint: "9:00 am" },
  { label: "Afternoon", time: "13:00", hint: "1:00 pm" },
  { label: "Evening", time: "18:00", hint: "6:00 pm" },
];

/** One-tap scheduling for an inbox row — mobile-friendly alternative to dragging. */
export function ScheduleQuickButton({ task, date }: { task: Task; date?: Date }) {
  const { updateTask } = useStore();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(task.startTime?.slice(0, 5) ?? "");
  const target = date ?? startOfDay(new Date());
  const iso = format(target, "yyyy-MM-dd");

  const schedule = async (time: string) => {
    if (!time) return;
    await updateTask(task.id, { dueDate: iso, startTime: time, inbox: false } as any);
    haptics.drop();
    setOpen(false);
    toast.success(`Scheduled for ${format(target, "MMM d")}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Schedule this item"
          onClick={(e) => e.stopPropagation()}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Clock className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-2xl p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Schedule · {format(target, "EEE, MMM d")}
        </p>
        <div className="space-y-1">
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => void schedule(p.time)}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13px] text-foreground transition-colors hover:bg-muted/60"
            >
              <span className="font-medium">{p.label}</span>
              <span className="text-[11.5px] text-muted-foreground">{p.hint}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-border/50 pt-2">
          <Input
            type="time"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-8 flex-1 rounded-xl text-[13px]"
          />
          <Button size="sm" className="h-8 rounded-xl px-3" onClick={() => void schedule(custom)} disabled={!custom}>
            Set
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}