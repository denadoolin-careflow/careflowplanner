import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BlockCheckbox } from "@/components/planner/BlockCheckbox";
import { resolveTaskIcon } from "@/lib/task-icons";

const FRAMES = [
  { id: "morning", label: "Morning", start: "09:00", range: [5 * 60, 12 * 60] },
  { id: "afternoon", label: "Afternoon", start: "13:00", range: [12 * 60, 17 * 60] },
  { id: "evening", label: "Evening", start: "18:00", range: [17 * 60, 24 * 60] },
] as const;

const DURATIONS = [15, 30, 45, 60, 90, 120];

const toMin = (t?: string) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
};
const toHHMM = (min: number) => {
  const v = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
const label12 = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const period = h >= 12 ? "p" : "a";
  const h12 = ((h + 11) % 12) + 1;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
};

/** Compact inline editor for title, due date, and notes — used in popovers/dialogs. */
export function QuickTaskInlineEditor({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose?: () => void;
}) {
  const { state, updateTask, toggleTask } = useStore();
  const task = state.tasks.find((t) => t.id === taskId);
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [dueDate, setDueDate] = useState<string | undefined>(task?.dueDate);
  const [startTime, setStartTime] = useState<string | undefined>(task?.startTime);
  const [durMin, setDurMin] = useState<number>(task?.estMinutes ?? 30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes ?? "");
    setDueDate(task.dueDate);
    setStartTime(task.startTime);
    setDurMin(task.estMinutes ?? 30);
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const icon = useMemo(() => (task ? resolveTaskIcon(task) : null), [task?.icon, task?.title, task?.notes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;

  const startMin = toMin(startTime);
  const endMin = startMin === null ? null : startMin + durMin;
  const activeFrame = startMin === null ? null : FRAMES.find(f => startMin >= f.range[0] && startMin < f.range[1])?.id ?? null;

  const save = async () => {
    setSaving(true);
    try {
      await updateTask(taskId, {
        title: title.trim() || task.title,
        notes: notes.trim() ? notes : undefined,
        dueDate,
        startTime: startTime || undefined,
        endTime: startMin === null ? undefined : toHHMM(startMin + durMin),
        estMinutes: durMin,
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-card/60 p-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <BlockCheckbox done={task.done} title={task.title} onToggle={() => void toggleTask(taskId)} className="h-4 w-4" />
        {icon && (icon.kind === "lucide"
          ? <icon.Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          : <span className="shrink-0 text-sm" aria-hidden>{icon.char}</span>)}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className={cn("h-8 flex-1 text-sm", task.done && "line-through opacity-60")}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {FRAMES.map(f => (
          <button
            key={f.id}
            type="button"
            aria-pressed={activeFrame === f.id}
            onClick={() => setStartTime(activeFrame === f.id ? undefined : f.start)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              activeFrame === f.id ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[11px] text-muted-foreground">
          {startMin === null ? "Unscheduled" : `${label12(startMin)}–${label12(endMin!)}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="time"
          value={startTime ?? ""}
          aria-label="Start time"
          onChange={(e) => setStartTime(e.target.value || undefined)}
          className="h-8 flex-1 text-xs"
        />
        <Input
          type="time"
          value={endMin === null ? "" : toHHMM(endMin)}
          aria-label="End time"
          disabled={startMin === null}
          onChange={(e) => {
            const em = toMin(e.target.value);
            if (em === null || startMin === null) return;
            const diff = em - startMin;
            setDurMin(Math.max(5, diff > 0 ? diff : diff + 1440));
          }}
          className="h-8 flex-1 text-xs"
        />
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Decrease duration by 15 minutes"
          onClick={() => setDurMin(d => Math.max(5, d - 15))}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-1">
          {DURATIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDurMin(d)}
              aria-pressed={durMin === d}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                durMin === d ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {d < 60 ? `${d}m` : d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h${d % 60}`}
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Increase duration by 15 minutes"
          onClick={() => setDurMin(d => Math.min(720, d + 15))}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 flex-1 justify-start text-xs font-normal", !dueDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-1.5 h-3 w-3" />
              {dueDate ? format(parseISO(dueDate), "EEE, MMM d") : "No due date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate ? parseISO(dueDate) : undefined}
              onSelect={(d) => setDueDate(d ? format(d, "yyyy-MM-dd") : undefined)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {dueDate && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => setDueDate(undefined)}>
            Clear
          </Button>
        )}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={2}
        className="min-h-[48px] resize-none text-xs"
      />
      <div className="flex items-center justify-end gap-1">
        {onClose && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button size="sm" className="h-7 text-xs" onClick={save} disabled={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}