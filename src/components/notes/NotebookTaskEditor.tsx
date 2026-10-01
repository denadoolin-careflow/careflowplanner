import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { AREAS, type Area, type Task } from "@/lib/types";

export function NotebookTaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const { updateTask } = useStore();
  const [draft, setDraft] = useState(() => ({
    title: task.title,
    dueDate: task.dueDate ?? "",
    startTime: task.startTime ?? "",
    estMinutes: task.estMinutes ? String(task.estMinutes) : "",
    area: task.area,
    notes: task.notes ?? "",
    done: task.done,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      title: task.title,
      dueDate: task.dueDate ?? "",
      startTime: task.startTime ?? "",
      estMinutes: task.estMinutes ? String(task.estMinutes) : "",
      area: task.area,
      notes: task.notes ?? "",
      done: task.done,
    });
  }, [task]);

  const save = async () => {
    const title = draft.title.trim();
    if (!title) { toast.error("Add a task title"); return; }
    setSaving(true);
    try {
      await updateTask(task.id, {
        title,
        dueDate: draft.dueDate || undefined,
        startTime: draft.startTime || undefined,
        estMinutes: draft.estMinutes ? Math.max(1, Number(draft.estMinutes)) : undefined,
        area: draft.area,
        notes: draft.notes.trim() || undefined,
        done: draft.done,
      });
      toast.success("Task updated");
      onClose();
    } catch {
      toast.error("Could not update that task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-background/90 p-2 shadow-sm" onClick={event => event.stopPropagation()}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.done}
          onChange={event => setDraft(value => ({ ...value, done: event.target.checked }))}
          aria-label="Task complete"
          className="h-4 w-4 accent-primary"
        />
        <input
          autoFocus
          value={draft.title}
          onChange={event => setDraft(value => ({ ...value, title: event.target.value }))}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
          aria-label="Task title"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="space-y-0.5 text-[10px] text-muted-foreground">Date
          <input type="date" value={draft.dueDate} onChange={event => setDraft(value => ({ ...value, dueDate: event.target.value }))} className="block h-8 w-full rounded-md border border-border bg-background px-1.5 text-xs text-foreground" />
        </label>
        <label className="space-y-0.5 text-[10px] text-muted-foreground">Time
          <input type="time" value={draft.startTime} onChange={event => setDraft(value => ({ ...value, startTime: event.target.value }))} className="block h-8 w-full rounded-md border border-border bg-background px-1.5 text-xs text-foreground" />
        </label>
        <label className="space-y-0.5 text-[10px] text-muted-foreground">Minutes
          <input type="number" min="1" step="5" value={draft.estMinutes} onChange={event => setDraft(value => ({ ...value, estMinutes: event.target.value }))} className="block h-8 w-full rounded-md border border-border bg-background px-1.5 text-xs text-foreground" />
        </label>
        <label className="space-y-0.5 text-[10px] text-muted-foreground">Area
          <select value={draft.area} onChange={event => setDraft(value => ({ ...value, area: event.target.value as Area }))} className="block h-8 w-full rounded-md border border-border bg-background px-1.5 text-xs text-foreground">
            {AREAS.map(area => <option key={area} value={area}>{area}</option>)}
          </select>
        </label>
      </div>
      <textarea value={draft.notes} onChange={event => setDraft(value => ({ ...value, notes: event.target.value }))} placeholder="Task details" rows={2} className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClose}><X className="h-3.5 w-3.5" />Cancel</Button>
        <Button type="button" size="sm" className="h-8 px-2 text-xs" disabled={saving} onClick={() => void save()}><Check className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}