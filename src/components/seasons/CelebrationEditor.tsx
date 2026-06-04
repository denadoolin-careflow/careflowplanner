import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Celebration, CelebrationKind } from "@/lib/seasons/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Celebration> | null;
  onSave: (input: Partial<Celebration> & { title: string; date: string; kind?: CelebrationKind }) => Promise<void> | void;
}

const KIND_OPTIONS: Array<{ value: CelebrationKind; label: string }> = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "graduation", label: "Graduation" },
  { value: "family_milestone", label: "Family Milestone" },
  { value: "care_milestone", label: "Care Milestone" },
  { value: "therapy_win", label: "Therapy Win" },
  { value: "adoption", label: "Adoption Day" },
  { value: "special_event", label: "Special Event" },
  { value: "custom", label: "Custom" },
];

export function CelebrationEditor({ open, onOpenChange, initial, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<CelebrationKind>("custom");
  const [theme, setTheme] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [recurs, setRecurs] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDate(initial?.date ?? new Date().toISOString().slice(0, 10));
    setKind(initial?.kind ?? "custom");
    setTheme(initial?.theme ?? "");
    setBudget(initial?.budgetCents ? String((initial.budgetCents ?? 0) / 100) : "");
    setNotes(initial?.notes ?? "");
    setRecurs(initial?.recursYearly ?? false);
  }, [open, initial]);

  const save = async () => {
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      date,
      kind,
      theme: theme || null,
      budgetCents: budget ? Math.round(parseFloat(budget) * 100) : 0,
      notes: notes || null,
      recursYearly: recurs,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit celebration" : "New celebration"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Aerie's birthday" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as CelebrationKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Theme</Label>
              <Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Garden party" />
            </div>
            <div>
              <Label>Budget ($)</Label>
              <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="250" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <label className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <span className="text-sm">Repeats yearly</span>
            <Switch checked={recurs} onCheckedChange={setRecurs} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!title.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}