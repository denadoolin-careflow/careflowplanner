import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Task, AREAS, DayPart, Priority, Energy, RecurrenceType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; task: Task | null };

export function TaskEditor({ open, onOpenChange, task }: Props) {
  const { updateTask, deleteTask } = useStore();
  const [draft, setDraft] = useState<Task | null>(task);

  useEffect(() => { setDraft(task); }, [task]);
  if (!draft) return null;

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setDraft(d => d ? { ...d, [k]: v } : d);

  const save = async () => {
    if (!draft.title.trim()) { toast.error("Title is needed."); return; }
    await updateTask(draft.id, draft);
    toast.success("Saved.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={draft.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={3} value={draft.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Anything to remember…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Due date</Label>
              <Input type="date" value={draft.dueDate ?? ""} onChange={e => set("dueDate", e.target.value || undefined)} />
            </div>
            <div>
              <Label className="text-xs">Day part</Label>
              <Select value={draft.dayPart ?? "none"} onValueChange={v => set("dayPart", v === "none" ? undefined : v as DayPart)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Whenever</SelectItem>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Afternoon">Afternoon</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                  <SelectItem value="Late Night">Late Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Area</Label>
              <Select value={draft.area} onValueChange={v => set("area", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={draft.priority} onValueChange={v => set("priority", v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Energy</Label>
              <Select value={draft.energy ?? "none"} onValueChange={v => set("energy", v === "none" ? undefined : v as Energy)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estimated minutes</Label>
              <Input type="number" min={0} value={draft.estMinutes ?? ""} onChange={e => set("estMinutes", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div>
              <Label className="text-xs">Repeats</Label>
              <Select value={draft.recurrenceType ?? "none"} onValueChange={v => set("recurrenceType", v as RecurrenceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Doesn't repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Every</Label>
              <Input type="number" min={1} value={draft.recurrenceInterval ?? 1} onChange={e => set("recurrenceInterval", Number(e.target.value) || 1)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
            <div>
              <div className="text-sm">Top three today</div>
              <div className="text-xs text-muted-foreground">Hold space for what matters most.</div>
            </div>
            <Switch checked={!!draft.isTopThree} onCheckedChange={v => set("isTopThree", v)} />
          </div>
          <LinkedNotesPanel entityType="task" entityId={draft.id} contextTitle={draft.title} compact />
        </div>
        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => { await deleteTask(draft.id); toast("This can wait."); onOpenChange(false); }}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}