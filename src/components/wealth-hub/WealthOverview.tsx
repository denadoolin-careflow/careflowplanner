import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fmtMoney, advanceDate, todayISO } from "@/lib/wealth-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { monthKey, netWorthChange, summarizeBudget } from "@/lib/wealth-budget";
import { barTone, useBudgetData } from "./BudgetPlanTab";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Check, Minus } from "lucide-react";


export function WealthOverview({ uid, onOpen }: { uid: string; onOpen: (tab: "plan" | "transactions" | "bills" | "goals") => void }) {
  const { cats, txs, targets, reload } = useBudgetData(uid);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [bills, setBills] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  useEffect(() => {
    const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    Promise.all([
      supabase.from("recurring_bills").select("id,name,amount,next_due_date,status,cadence,category_id,last_paid_at").eq("user_id", uid).lte("next_due_date", in14).order("next_due_date").limit(12),
      supabase.from("savings_goals").select("id,name,target_amount,current_amount,status").eq("user_id", uid).order("sort_order"),
      supabase.from("debts").select("id,name,balance").eq("user_id", uid),
    ]).then(([b, g, d]) => { setBills(b.data ?? []); setGoals(g.data ?? []); setDebts(d.data ?? []); });
  }, [uid, tick]);

  const markPaid = async (b: any) => {
    setBusy(b.id);
    const prev = { next_due_date: b.next_due_date, last_paid_at: b.last_paid_at };
    const next = b.next_due_date ? advanceDate(b.next_due_date, b.cadence || "monthly") : null;
    const { data: tx, error: txErr } = await supabase.from("transactions").insert({
      user_id: uid, date: todayISO(), amount: Number(b.amount) || 0, kind: "expense",
      category_id: b.category_id, note: `Paid: ${b.name}`, linked_bill_id: b.id,
    } as any).select("id").single();
    const { error } = await supabase.from("recurring_bills").update({ next_due_date: next, last_paid_at: new Date().toISOString() }).eq("id", b.id);
    setBusy(null);
    if (txErr || error) return toast.error("Couldn't mark that bill paid");
    setTick((t) => t + 1); reload();
    toast.success(`Paid ${b.name}${next ? ` · next due ${new Date(next + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}`, {
      action: { label: "Undo", onClick: async () => {
        await supabase.from("recurring_bills").update(prev).eq("id", b.id);
        if (tx?.id) await supabase.from("transactions").delete().eq("id", tx.id);
        setTick((t) => t + 1); reload();
      } },
    });
  };

  const s = useMemo(() => summarizeBudget(cats, txs, monthKey(new Date()), targets), [cats, txs, targets]);
  const assets = goals.reduce((a, g) => a + (Number(g.current_amount) || 0), 0);
  const liabilities = debts.reduce((a, d) => a + (Number(d.balance) || 0), 0);
  const top = [...s.expenseRows].filter((r) => r.limit > 0).sort((a, b) => b.spent / b.limit - a.spent / a.limit).slice(0, 5);
  const flowMax = Math.max(s.income, s.expenses, 1);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="cozy-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Net worth</p>
        <p className="font-display text-3xl tabular-nums">{fmtMoney(assets - liabilities)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-xs text-muted-foreground">Savings</p><p className="tabular-nums">{fmtMoney(assets)}</p></div>
          <div><p className="text-xs text-muted-foreground">Debts</p><p className="tabular-nums">{fmtMoney(liabilities)}</p></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">From your savings goals and debts.</p>
      </section>

      <section className="cozy-card p-5 lg:col-span-2">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cash flow this month</p>
          <span className={cn("text-sm tabular-nums", s.net < 0 ? "text-destructive" : "text-secondary")}>
            {s.net >= 0 ? "+" : "−"}{fmtMoney(Math.abs(s.net))}{s.income > 0 && ` · ${s.savingsRate}% saved`}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {[{ label: "Income", v: s.income, tone: "bg-secondary", Icon: ArrowUpRight }, { label: "Expenses", v: s.expenses, tone: "bg-primary", Icon: ArrowDownRight }].map(({ label, v, tone, Icon }) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-sm"><span className="flex items-center gap-1"><Icon className="h-4 w-4" />{label}</span><span className="tabular-nums">{fmtMoney(v)}</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", tone)} style={{ width: `${(v / flowMax) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="cozy-card p-5 lg:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg">Budget</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpen("plan")}>Open plan</Button>
        </div>
        {top.length === 0 ? <p className="text-sm text-muted-foreground">Set monthly budgets in the Plan tab to track them here.</p> : top.map((r) => (
          <div key={r.id} className="py-2">
            <div className="mb-1 flex justify-between text-sm"><span>{r.name}</span><span className="tabular-nums text-muted-foreground">{fmtMoney(r.spent)} / {fmtMoney(r.limit)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", barTone(r.status))} style={{ width: `${r.pct}%` }} /></div>
          </div>
        ))}
      </section>

      <section className="cozy-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg">Upcoming bills</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpen("bills")}>All</Button>
        </div>
        {bills.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due in the next two weeks.</p> : (
          <ul className="space-y-2">
            {bills.map((b) => {
              const late = b.next_due_date < today;
              return (
                <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{b.name}</span></span>
                  <span className="ml-auto shrink-0 text-right">
                    <span className="block tabular-nums">{fmtMoney(Number(b.amount) || 0)}</span>
                    <span className={cn("text-xs", late ? "text-destructive" : "text-muted-foreground")}>
                      {late ? "Overdue" : new Date(b.next_due_date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </span>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label={`Mark ${b.name} paid`} title="Mark paid"
                    disabled={busy === b.id} onClick={() => markPaid(b)}>
                    <Check className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cozy-card p-5 lg:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg">Recent transactions</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpen("transactions")}>All</Button>
        </div>
        {txs.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : (
          <ul className="divide-y divide-border/60">
            {txs.slice(0, 6).map((t) => {
              const cat = cats.find((c) => c.id === t.category_id);
              return (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{t.note || cat?.name || "Transaction"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}{cat && ` · ${cat.name}`}</p>
                  </div>
                  <span className={cn("tabular-nums", t.kind === "income" && "text-secondary")}>{t.kind === "income" ? "+" : "−"}{fmtMoney(Math.abs(Number(t.amount)))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cozy-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg">Goals</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpen("goals")}>All</Button>
        </div>
        {goals.length === 0 ? <p className="text-sm text-muted-foreground">No savings goals yet.</p> : goals.slice(0, 4).map((g) => {
          const pct = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
          return (
            <div key={g.id} className="py-2">
              <div className="mb-1 flex justify-between text-sm"><span className="truncate">{g.name}</span><span className="tabular-nums text-muted-foreground">{Math.round(pct)}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
