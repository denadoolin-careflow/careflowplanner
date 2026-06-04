import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useHolidayPlans, useHolidaySteps } from "@/lib/seasons/hooks";
import { format, parseISO, subDays } from "date-fns";

export default function SeasonsHolidayDetail() {
  const { id } = useParams();
  const { plans, update, remove } = useHolidayPlans();
  const { steps, add, toggle, remove: removeStep } = useHolidaySteps(id ?? null);
  const [d, setD] = useState("");
  const [t, setT] = useState("");

  const plan = plans.find(p => p.id === id);
  if (!plan) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const date = plan.customDate ? parseISO(plan.customDate) : null;
  const total = steps.length;
  const done = steps.filter(s => s.done).length;
  const pct = total ? Math.round((done/total)*100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Link to="/seasons/holidays" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All holidays
      </Link>

      <Card className="p-6">
        <h1 className="font-display text-3xl">{plan.customName}</h1>
        {date && <p className="text-sm text-muted-foreground">{format(date, "EEEE, MMMM d, yyyy")}</p>}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Prep progress</span>
            <span>{done}/{total}</span>
          </div>
          <Progress value={pct} />
        </div>
        <Button variant="ghost" size="sm" className="mt-3 text-destructive" onClick={async () => { await remove(plan.id); window.history.back(); }}>
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete plan
        </Button>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Prep timeline</h3>
        <form className="flex gap-2 mb-4" onSubmit={async e => { e.preventDefault(); const n = parseInt(d, 10); if (!Number.isFinite(n) || !t.trim()) return; await add(n, t.trim()); setD(""); setT(""); }}>
          <Input className="w-24" type="number" placeholder="Days before" value={d} onChange={e => setD(e.target.value)} />
          <Input placeholder="Task" value={t} onChange={e => setT(e.target.value)} />
          <Button size="sm" type="submit"><Plus className="h-3.5 w-3.5" /></Button>
        </form>
        <div className="space-y-2">
          {steps.map(s => {
            const stepDate = date ? subDays(date, s.daysBefore) : null;
            return (
              <div key={s.id} className="flex items-center gap-3 group">
                <input type="checkbox" checked={s.done} onChange={e => toggle(s.id, e.target.checked)} />
                <div className="flex-1">
                  <div className={`text-sm ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.daysBefore} days before{stepDate ? ` · ${format(stepDate, "MMM d")}` : ""}</div>
                </div>
                <button onClick={() => removeStep(s.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {steps.length === 0 && <p className="text-sm text-muted-foreground">No steps yet.</p>}
        </div>
      </Card>
    </div>
  );
}