import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarDays, ChevronUp, Minus, Plus, Trash2, Pencil } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { haptics } from "@/lib/haptics";
import { SNAP_MIN } from "@/lib/planner-metrics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

const PRIORITIES: Task["priority"][] = ["low", "medium", "high"];
const NONE = "__none__";

function hmToMin(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}
const minToHM = (m: number) =>
  `${String(Math.floor((m + 1440) % 1440 / 60)).padStart(2, "0")}:${String((m + 1440) % 60).padStart(2, "0")}`;
const label12 = (m: number) => format(new Date(2000, 0, 1, Math.floor(m / 60) % 24, m % 60), "h:mm a");

/**
 * Compact mobile editor for a task tapped on the planner grid.
 * Peek height covers time/duration/date; drag (or tap) the handle for
 * area, project and tags. Every change saves immediately with undo.
 */
export function MobileBlockSheet({ task, open, onOpenChange }: {
  task: Task | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { state, updateTask, toggleTask, deleteTask, addTask } = useStore() as any;
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [tagText, setTagText] = useState("");
  const [dragY, setDragY] = useState<number | null>(null);

  useEffect(() => {
    if (!open) { setExpanded(false); return; }
    setTitle(task?.title ?? "");
    setTagText((task?.tags ?? []).join(", "));
  }, [open, task?.id]);

  const startMin = hmToMin(task?.startTime);
  const dur = task?.estMinutes && task.estMinutes > 0 ? task.estMinutes : 30;
  const endLabel = useMemo(
    () => (startMin === null ? null : label12(startMin + dur)),
    [startMin, dur],
  );

  if (!task) return null;

  const save = async (patch: Partial<Task>, msg?: string) => {
    haptics.tap?.();
    await updateTask(task.id, patch as any);
    if (msg) toast.success(msg);
  };

  const setDuration = (next: number) =>
    save({ estMinutes: Math.max(SNAP_MIN, Math.min(next, 12 * 60)) } as any);

  const setDate = (d: Date) =>
    save({ dueDate: format(d, "yyyy-MM-dd"), inbox: false } as any, `Moved to ${format(d, "MMM d")}`);

  const commitTags = () => {
    const next = tagText.split(",").map(t => t.trim()).filter(Boolean);
    if (JSON.stringify(next) !== JSON.stringify(task.tags ?? [])) void save({ tags: next } as any);
  };

  const remove = async () => {
    const snapshot = { ...task } as any;
    haptics.delete?.();
    onOpenChange(false);
    await deleteTask(task.id);
    toast("Deleted", {
      description: task.title,
      duration: 6000,
      action: { label: "Undo", onClick: () => { const { id, createdAt, ...rest } = snapshot; void addTask(rest); } },
    });
  };

  const todayISO = format(new Date(), "yyyy-MM-dd");
  const tomorrowISO = format(addDays(new Date(), 1), "yyyy-MM-dd");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-3xl border-border/60 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 transition-[height]",
          expanded ? "h-[88vh]" : "h-[46vh]",
        )}
      >
        {/* Drag handle — swipe up / tap to reveal the rest */}
        <button
          type="button"
          aria-label={expanded ? "Collapse editor" : "Expand editor"}
          onClick={() => setExpanded(e => !e)}
          onPointerDown={(e) => setDragY(e.clientY)}
          onPointerUp={(e) => {
            if (dragY !== null && dragY - e.clientY > 24) setExpanded(true);
            else if (dragY !== null && e.clientY - dragY > 24) setExpanded(false);
            setDragY(null);
          }}
          className="mx-auto mb-2 flex w-full touch-none flex-col items-center gap-1 py-1"
        >
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </button>

        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain pb-2">
          {/* Title + status */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              aria-label={task.done ? "Reopen task" : "Complete task"}
              onClick={() => { haptics.success?.(); void toggleTask(task.id); }}
              className="pt-1.5"
            >
              <Checkbox checked={task.done} className="h-6 w-6 rounded-full" />
            </button>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && void save({ title: title.trim() } as any)}
              aria-label="Task title"
              className={cn("h-10 border-0 bg-transparent px-0 text-[16px] font-medium focus-visible:ring-0", task.done && "line-through text-muted-foreground")}
            />
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="w-16 text-[11px] uppercase tracking-wide text-muted-foreground">Priority</span>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  type="button"
                  aria-label={`Set priority ${p}`}
                  aria-pressed={task.priority === p}
                  onClick={() => void save({ priority: p } as any)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] capitalize",
                    task.priority === p ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Time + duration */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/50 p-2.5">
            <Input
              type="time"
              step={900}
              value={task.startTime ?? ""}
              aria-label="Start time"
              onChange={(e) => void save({ startTime: e.target.value || null, inbox: false } as any)}
              className="h-9 w-[118px] text-[13px]"
            />
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label="Decrease duration 15 minutes" onClick={() => void setDuration(dur - SNAP_MIN)}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-14 text-center text-[13px] font-medium tabular-nums">{dur}m</span>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label="Increase duration 15 minutes" onClick={() => void setDuration(dur + SNAP_MIN)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {startMin !== null && (
              <span className="ml-auto text-[12px] text-muted-foreground">
                {label12(startMin)} – {endLabel}
              </span>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[{ label: "Today", iso: todayISO }, { label: "Tomorrow", iso: tomorrowISO }].map(d => (
              <button
                key={d.iso}
                type="button"
                aria-pressed={task.dueDate === d.iso}
                onClick={() => void setDate(parseISO(d.iso))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px]",
                  task.dueDate === d.iso ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full text-[12px]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {task.dueDate && task.dueDate !== todayISO && task.dueDate !== tomorrowISO
                    ? format(parseISO(task.dueDate), "MMM d")
                    : "Pick a day"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.dueDate ? parseISO(task.dueDate) : undefined}
                  onSelect={(d) => d && void setDate(d)}
                  weekStartsOn={1}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mx-auto flex items-center gap-1 text-[11.5px] text-muted-foreground"
            >
              <ChevronUp className="h-3.5 w-3.5" /> Drag up for area, project & tags
            </button>
          )}

          {expanded && (
            <div className="space-y-2.5 border-t border-border/50 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <Select value={task.area} onValueChange={(v) => void save({ area: v } as any)}>
                  <SelectTrigger className="h-9 text-[13px]" aria-label="Area"><SelectValue placeholder="Area" /></SelectTrigger>
                  <SelectContent>
                    {(state.areas ?? []).map((a: any) => (
                      <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={task.projectId ?? NONE}
                  onValueChange={(v) => void save({ projectId: v === NONE ? null : v } as any)}
                >
                  <SelectTrigger className="h-9 text-[13px]" aria-label="Project"><SelectValue placeholder="Project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No project</SelectItem>
                    {(state.projects ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                onBlur={commitTags}
                placeholder="Tags, comma separated"
                aria-label="Tags"
                className="h-9 text-[13px]"
              />
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => void remove()}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => { onOpenChange(false); openTaskEditor(task.id); }}
            >
              <Pencil className="h-4 w-4" /> Full editor
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
