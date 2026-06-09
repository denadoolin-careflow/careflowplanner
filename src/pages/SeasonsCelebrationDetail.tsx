import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, ClipboardList, RefreshCw, CheckCircle2 } from "lucide-react";
import { useCelebrations, useCelebrationTasks } from "@/lib/seasons/hooks";
import { CelebrationEditor } from "@/components/seasons/CelebrationEditor";
import type { CelebrationTaskCategory } from "@/lib/seasons/types";
import { ageOn, daysUntilDate } from "@/lib/seasons/season-utils";
import { format, parseISO } from "date-fns";

const CATEGORIES: Array<{ value: CelebrationTaskCategory; label: string }> = [
  { value: "decor", label: "Decorations" },
  { value: "cake", label: "Cake" },
  { value: "gifts", label: "Gifts" },
  { value: "food", label: "Food" },
  { value: "invitations", label: "Invitations" },
  { value: "other", label: "Other" },
];

export default function SeasonsCelebrationDetail() {
  const { id } = useParams();
  const { celebrations, update, remove } = useCelebrations();
  const { tasks, add, toggle, remove: removeTask } = useCelebrationTasks(id ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCat, setNewCat] = useState<CelebrationTaskCategory>("other");

  const celebration = celebrations.find(c => c.id === id);
  const grouped = useMemo(() => {
    const m = new Map<CelebrationTaskCategory, typeof tasks>();
    for (const t of tasks) {
      const arr = m.get(t.category) ?? [];
      arr.push(t);
      m.set(t.category, arr);
    }
    return m;
  }, [tasks]);

  if (!celebration) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const days = daysUntilDate(celebration.date);
  const age = celebration.personAgeAnchor ? ageOn(`${celebration.personAgeAnchor}-${celebration.date.slice(5)}`) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <Link to="/seasons/celebrations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All celebrations
      </Link>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2">{celebration.kind.replace("_", " ")}</Badge>
            <h1 className="font-display text-3xl">{celebration.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{format(parseISO(celebration.date), "EEEE, MMMM d, yyyy")}</p>
            {celebration.theme && <p className="text-sm mt-1">Theme: <span className="font-medium">{celebration.theme}</span></p>}
          </div>
          <div className="text-right">
            <div className="text-4xl font-display">{days >= 0 ? days : `${Math.abs(days)}`}</div>
            <div className="text-xs text-muted-foreground">{days >= 0 ? "days to go" : "days ago"}</div>
            {age !== null && <div className="mt-2 text-sm">Turning {age + 1}</div>}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>Edit</Button>
          <Select value={celebration.status} onValueChange={async (v) => { await update(celebration.id, { status: v as any }); }}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="planning" icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}>Planning</SelectItem>
              <SelectItem value="in_progress" icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />}>In progress</SelectItem>
              <SelectItem value="done" icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}>Done</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={async () => { await remove(celebration.id); window.history.back(); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Planning progress</div>
          <div className="text-2xl font-display mt-1">{pct}%</div>
          <Progress className="mt-2" value={pct} />
          <div className="text-xs text-muted-foreground mt-1">{doneCount}/{totalCount} tasks</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Budget</div>
          <div className="text-2xl font-display mt-1">${((celebration.spentCents ?? 0)/100).toFixed(0)} <span className="text-base text-muted-foreground">/ ${((celebration.budgetCents ?? 0)/100).toFixed(0)}</span></div>
          <Progress className="mt-2" value={Math.min(100, Math.round(((celebration.spentCents ?? 0)/Math.max(1, celebration.budgetCents ?? 1))*100))} />
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Notes</div>
          <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-5">{celebration.notes || "—"}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Checklist</h3>
        <form onSubmit={async e => { e.preventDefault(); if (!newTitle.trim()) return; await add(newTitle.trim(), newCat); setNewTitle(""); }}
              className="flex gap-2 mb-4">
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Add a task…" />
          <Select value={newCat} onValueChange={(v) => setNewCat(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" /></Button>
        </form>
        <div className="space-y-4">
          {CATEGORIES.map(c => {
            const list = grouped.get(c.value) ?? [];
            if (list.length === 0) return null;
            return (
              <div key={c.value}>
                <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{c.label}</div>
                <div className="space-y-1">
                  {list.map(t => (
                    <div key={t.id} className="flex items-center gap-2 group">
                      <input type="checkbox" checked={t.done} onChange={e => toggle(t.id, e.target.checked)} />
                      <span className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                      <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet — add some above.</p>}
        </div>
      </Card>

      <CelebrationEditor open={editorOpen} onOpenChange={setEditorOpen} initial={celebration} onSave={async (input) => { await update(celebration.id, input as any); }} />
    </div>
  );
}