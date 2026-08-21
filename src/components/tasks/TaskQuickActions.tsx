import { Clock, Flag, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import type { Task, Priority, Energy } from "@/lib/types";
import { RecurrencePicker, recurrenceLabel } from "@/components/tasks/RecurrencePicker";

const TIME_PRESETS = ["08:00", "12:00", "15:00", "18:00"];

const PRIORITY_META: Record<Priority, { label: string; dot: string; text: string }> = {
  high: { label: "High", dot: "bg-rose-500", text: "text-rose-600" },
  medium: { label: "Medium", dot: "bg-amber-500", text: "text-amber-600" },
  low: { label: "Low", dot: "bg-sky-500", text: "text-sky-600" },
};

const ENERGY_META: Record<Energy, { label: string; text: string }> = {
  high: { label: "High", text: "text-emerald-600" },
  medium: { label: "Medium", text: "text-amber-600" },
  low: { label: "Low", text: "text-slate-500" },
};

function fmt12(hm?: string) {
  if (!hm) return null;
  const [h, m] = hm.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  const ampm = h < 12 ? "am" : "pm";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hh}:${String(m).padStart(2, "0")}${ampm}` : `${hh}${ampm}`;
}

const chipCls =
  "inline-flex min-h-[32px] items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground";

/** Compact inline controls: time, priority, energy — each writes immediately. */
export function TaskQuickActions({ task, className }: { task: Task; className?: string }) {
  const { updateTask } = useStore() as any;

  const apply = async (patch: Partial<Task>, message: string) => {
    await updateTask(task.id, patch);
    haptics.tap?.();
    toast(message, { description: task.title });
  };

  const timeLabel = fmt12(task.startTime);
  const prio = task.priority ? PRIORITY_META[task.priority as Priority] : null;
  const energy = task.energy ? ENERGY_META[task.energy as Energy] : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {/* Repeat */}
      <RecurrencePicker
        value={task}
        onChange={(v) => void apply(v as Partial<Task>, recurrenceLabel(v) ? `Repeats · ${recurrenceLabel(v)}` : "Repeat off")}
      />
      {/* Time */}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Set time" className={cn(chipCls, timeLabel && "text-foreground")}>
            <Clock className="h-3 w-3" />
            {timeLabel ?? "Time"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 space-y-2 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Start time</div>
          <div className="flex flex-wrap gap-1">
            {TIME_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => void apply({ startTime: t } as Partial<Task>, `Time set · ${fmt12(t)}`)}
                className={cn(
                  "rounded-full border border-border/60 px-2 py-1 text-[11px] transition-colors hover:bg-muted",
                  task.startTime === t && "border-primary/60 bg-primary/10 text-primary",
                )}
              >
                {fmt12(t)}
              </button>
            ))}
          </div>
          <input
            type="time"
            aria-label="Custom start time"
            value={task.startTime ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              void apply({ startTime: v || undefined } as Partial<Task>, v ? `Time set · ${fmt12(v)}` : "Time cleared");
            }}
            className="h-8 w-full rounded-md border border-border/60 bg-background px-2 text-xs"
          />
          {task.startTime && (
            <button
              type="button"
              onClick={() => void apply({ startTime: undefined } as Partial<Task>, "Time cleared")}
              className="w-full rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
            >
              Clear time
            </button>
          )}
        </PopoverContent>
      </Popover>

      {/* Priority */}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Set priority" className={cn(chipCls, prio && prio.text)}>
            {prio ? <span className={cn("h-2 w-2 rounded-full", prio.dot)} /> : <Flag className="h-3 w-3" />}
            {prio?.label ?? "Priority"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
          {(["high", "medium", "low"] as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void apply({ priority: p } as Partial<Task>, `Priority · ${PRIORITY_META[p].label}`)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                task.priority === p && "bg-muted/70 font-medium",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", PRIORITY_META[p].dot)} />
              {PRIORITY_META[p].label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Energy */}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Set energy level" className={cn(chipCls, energy && energy.text)}>
            <Zap className="h-3 w-3" />
            {energy?.label ?? "Energy"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
          {(["high", "medium", "low"] as Energy[]).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => void apply({ energy: e } as Partial<Task>, `Energy · ${ENERGY_META[e].label}`)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                task.energy === e && "bg-muted/70 font-medium",
              )}
            >
              <Zap className={cn("h-3 w-3", ENERGY_META[e].text)} />
              {ENERGY_META[e].label}
            </button>
          ))}
          {task.energy && (
            <button
              type="button"
              onClick={() => void apply({ energy: undefined } as Partial<Task>, "Energy cleared")}
              className="w-full rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted"
            >
              Clear
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}