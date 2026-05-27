import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Compact inline editor for title, due date, and notes — used in popovers/dialogs. */
export function QuickTaskInlineEditor({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose?: () => void;
}) {
  const { state, updateTask } = useStore();
  const task = state.tasks.find((t) => t.id === taskId);
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [dueDate, setDueDate] = useState<string | undefined>(task?.dueDate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes ?? "");
    setDueDate(task.dueDate);
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;

  const save = async () => {
    setSaving(true);
    try {
      await updateTask(taskId, {
        title: title.trim() || task.title,
        notes: notes.trim() ? notes : undefined,
        dueDate,
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-card/60 p-2" onClick={(e) => e.stopPropagation()}>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="h-8 text-sm"
      />
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