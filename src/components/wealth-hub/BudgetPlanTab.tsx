import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";
import { monthKey, shiftMonth, summarizeBudget, type BudgetCategory, type BudgetTx, type CategoryRow } from "@/lib/wealth-budget";

export function useBudgetData(uid: string) {
  const [cats, setCats] = useState<BudgetCategory[]>([]);
  const [txs, setTxs] = useState<(BudgetTx & { id: string; note: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const since = shiftMonth(monthKey(new Date()), -12) + "-01";
    const [c, t] = await Promise.all([
      supabase.from("budget_categories").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("transactions").select("id,date,amount,kind,category_id,note").eq("user_id", uid).gte("date", since).order("date", { ascending: false }),
    ]);
    setCats((c.data as any) ?? []);
    setTxs((t.data as any) ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);
  return { cats, txs, loading, reload: load };
}

export const barTone = (s: CategoryRow["status"]) =>
  s === "over" ? "bg-destructive" : s === "near" ? "bg-accent" : "bg-secondary";

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const [y, m] = month.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
      <span className="min-w-[9rem] text-center font-display text-lg">{label}</span>
      <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
      {month !== monthKey(new Date()) && <Button variant="outline" size="sm" onClick={() => onChange(monthKey(new Date()))}>This month</Button>}
    </div>
  );
}

function LimitEditor({ row, onSave }: { row: CategoryRow; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(row.limit || ""));
  if (!editing)
    return (
      <button className="tabular-nums text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={() => { setVal(String(row.limit || "")); setEditing(true); }}>
        {row.limit ? fmtMoney(row.limit) : "Set budget"}
      </button>
    );
  const commit = () => { setEditing(false); const n = Number(val); if (isFinite(n) && n !== row.limit) onSave(Math.max(0, n)); };
  return (
    <Input autoFocus inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} className="h-8 w-24 text-right" />
  );
}

function Row({ row, onSave }: { row: CategoryRow; onSave: (v: number) => void }) {
  const income = row.kind === "income";
  return (
    <div className="space-y-1.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" style={row.color ? { background: row.color } : undefined} />
          <span className="truncate text-sm font-medium">{row.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="tabular-nums">{fmtMoney(row.spent)}</span>
          <span className="text-muted-foreground">of</span>
          <LimitEditor row={row} onSave={onSave} />
        </div>
      </div>
      {row.limit > 0 && (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", income ? "bg-secondary" : barTone(row.status))} style={{ width: `${row.pct}%` }} />
          </div>
          <p className={cn("text-right text-xs tabular-nums", row.status === "over" ? "text-destructive" : "text-muted-foreground")}>
            {income ? `${fmtMoney(Math.max(0, row.left))} still expected` : row.left >= 0 ? `${fmtMoney(row.left)} left` : `${fmtMoney(-row.left)} over`}
          </p>
        </>
      )}
    </div>
  );
}

export function BudgetPlanTab({ uid }: { uid: string }) {
  const { cats, txs, loading, reload } = useBudgetData(uid);
  const [month, setMonth] = useState(monthKey(new Date()));
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"expense" | "income">("expense");
  const s = useMemo(() => summarizeBudget(cats, txs, month), [cats, txs, month]);

  const saveLimit = async (id: string, v: number) => {
    const { error } = await supabase.from("budget_categories").update({ monthly_limit: v }).eq("id", id);
    if (error) return toast.error("Couldn't save that budget");
    reload();
  };
  const addCat = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("budget_categories").insert({ user_id: uid, name: newName.trim(), kind: newKind, monthly_limit: 0, sort_order: cats.length } as any);
    if (error) return toast.error("Couldn't add that category");
    setNewName(""); reload();
  };

  const spentPct = s.budgeted ? Math.min(100, (s.expenses / s.budgeted) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="cozy-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Income</p>
          <p className="font-display text-2xl tabular-nums">{fmtMoney(s.income)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">of {fmtMoney(s.plannedIncome)} planned</p>
        </div>
        <div className="cozy-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Spent</p>
          <p className="font-display text-2xl tabular-nums">{fmtMoney(s.expenses)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${spentPct}%` }} /></div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">of {fmtMoney(s.budgeted)} budgeted</p>
        </div>
        <div className="cozy-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.leftToBudget >= 0 ? "Left to budget" : "Over-budgeted"}</p>
          <p className={cn("font-display text-2xl tabular-nums", s.leftToBudget < 0 && "text-destructive")}>{fmtMoney(Math.abs(s.leftToBudget))}</p>
          <p className="text-xs text-muted-foreground">Planned income minus budgets</p>
        </div>
      </div>

      {loading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="cozy-card p-4">
            <h2 className="font-display text-lg">Expenses</h2>
            <div className="divide-y divide-border/60">
              {s.expenseRows.map((r) => <Row key={r.id} row={r} onSave={(v) => saveLimit(r.id, v)} />)}
              {s.expenseRows.length === 0 && <p className="py-3 text-sm text-muted-foreground">No spending categories yet. Add one below.</p>}
              {s.uncategorized > 0 && (
                <div className="flex justify-between py-3 text-sm"><span className="text-muted-foreground">Uncategorized</span><span className="tabular-nums">{fmtMoney(s.uncategorized)}</span></div>
              )}
            </div>
          </section>
          <section className="cozy-card space-y-4 p-4">
            <div>
              <h2 className="font-display text-lg">Income</h2>
              <div className="divide-y divide-border/60">
                {s.incomeRows.map((r) => <Row key={r.id} row={r} onSave={(v) => saveLimit(r.id, v)} />)}
                {s.incomeRows.length === 0 && <p className="py-3 text-sm text-muted-foreground">Add an income category to plan what you expect to earn.</p>}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="mb-2 text-sm font-medium">Add a category</p>
              <div className="flex flex-wrap gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} placeholder="e.g. Groceries" className="h-9 flex-1 min-w-[8rem]" />
                <div className="flex rounded-md border border-border/60 p-0.5">
                  {(["expense", "income"] as const).map((k) => (
                    <button key={k} onClick={() => setNewKind(k)} className={cn("rounded px-2.5 text-xs capitalize", newKind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{k}</button>
                  ))}
                </div>
                <Button size="sm" onClick={addCat}><Plus className="mr-1 h-4 w-4" />Add</Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
