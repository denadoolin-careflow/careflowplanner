import { useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, TrendingUp, Target } from "lucide-react";
import { format } from "date-fns";
import {
  useProgressEntries, useProgressGoals, progressStore,
  PROGRESS_CATEGORIES, CATEGORY_LABEL, type ProgressCategory,
} from "@/lib/person-progress";
import type { CareRecipient } from "@/lib/types";

export function PersonProgressSection({ recipient }: { recipient: CareRecipient }) {
  const entries = useProgressEntries();
  const goals = useProgressGoals();
  const [open, setOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const recent = useMemo(
    () => entries.filter(e => e.recipient_id === recipient.id).slice(0, 8),
    [entries, recipient.id]
  );
  const activeGoals = useMemo(
    () => goals.filter(g => g.recipient_id === recipient.id && g.status !== "paused"),
    [goals, recipient.id]
  );

  return (
    <SectionCard
      title="Progress"
      subtitle="Track milestones, skills & growth"
      accent="calm"
      action={
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setGoalOpen(true)}>
            <Target className="mr-1 h-3.5 w-3.5" /> Goal
          </Button>
          <Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Log
          </Button>
        </div>
      }
    >
      {activeGoals.length === 0 && recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No entries yet — log a milestone, mood shift, or new skill to start a timeline.
        </p>
      ) : (
        <div className="space-y-4">
          {activeGoals.length > 0 && (
            <div className="space-y-2">
              {activeGoals.map(g => {
                const pct = g.target_value ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
                return (
                  <div key={g.id} className="rounded-xl border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{g.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {g.target_value ? `${g.current_value}/${g.target_value}${g.unit ? " " + g.unit : ""}` : g.status}
                      </span>
                    </div>
                    {g.target_value ? (
                      <div className="mt-2 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    ) : null}
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{CATEGORY_LABEL[g.category]}</span>
                      <button onClick={() => progressStore.deleteGoal(g.id)} className="hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Recent
              </div>
              <ul className="space-y-1.5">
                {recent.map(e => (
                  <li key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-muted/30 p-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-medium">{e.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{CATEGORY_LABEL[e.category]}</span>
                        {e.value_numeric != null && (
                          <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">{e.value_numeric}</span>
                        )}
                      </div>
                      {e.value_text && <p className="text-xs text-muted-foreground">{e.value_text}</p>}
                      {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                      <p className="text-[10px] text-muted-foreground">{format(new Date(e.recorded_at), "MMM d")}</p>
                    </div>
                    <button onClick={() => progressStore.deleteEntry(e.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <LogEntryDialog open={open} onOpenChange={setOpen} recipientId={recipient.id} />
      <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} recipientId={recipient.id} />
    </SectionCard>
  );
}

function CategorySelect({ value, onChange }: { value: ProgressCategory; onChange: (c: ProgressCategory) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ProgressCategory)}
      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
    >
      {PROGRESS_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
    </select>
  );
}

function LogEntryDialog({ open, onOpenChange, recipientId }: { open: boolean; onOpenChange: (o: boolean) => void; recipientId: string }) {
  const [category, setCategory] = useState<ProgressCategory>("milestone");
  const [label, setLabel] = useState("");
  const [num, setNum] = useState("");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");

  async function save() {
    if (!label.trim()) return;
    await progressStore.addEntry(recipientId, {
      category, label: label.trim(),
      value_numeric: num ? Number(num) : null,
      value_text: text.trim() || null,
      notes: notes.trim() || null,
    });
    setLabel(""); setNum(""); setText(""); setNotes("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log progress</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Category</Label><CategorySelect value={category} onChange={setCategory} /></div>
          <div><Label>What happened?</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Said first sentence, slept through night…" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Number (optional)</Label><Input type="number" inputMode="decimal" value={num} onChange={e => setNum(e.target.value)} /></div>
            <div><Label>Detail</Label><Input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. 8h, 'mama'" /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!label.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalDialog({ open, onOpenChange, recipientId }: { open: boolean; onOpenChange: (o: boolean) => void; recipientId: string }) {
  const [category, setCategory] = useState<ProgressCategory>("skill");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [unit, setUnit] = useState("");

  async function save() {
    if (!title.trim()) return;
    await progressStore.upsertGoal({
      recipient_id: recipientId,
      title: title.trim(),
      category,
      target_value: target ? Number(target) : null,
      current_value: current ? Number(current) : 0,
      unit: unit.trim() || null,
    });
    setTitle(""); setTarget(""); setCurrent("0"); setUnit("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Read 20 books, drink 8 cups…" />
          </div>
          <div><Label>Category</Label><CategorySelect value={category} onChange={setCategory} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Current</Label><Input type="number" value={current} onChange={e => setCurrent(e.target.value)} /></div>
            <div><Label>Target</Label><Input type="number" value={target} onChange={e => setTarget(e.target.value)} /></div>
            <div><Label>Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="books" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!title.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}