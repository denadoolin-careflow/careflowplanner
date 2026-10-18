import { useMemo, useState } from "react";
import { fmtMoney } from "@/lib/wealth-utils";
import { cn } from "@/lib/utils";
import { monthKey, savingsRate, spendingTrends } from "@/lib/wealth-budget";
import { MonthPicker, useBudgetData } from "./BudgetPlanTab";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

const short = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: "short" });
};

function Bars({ values, max, highlight = true }: { values: number[]; max: number; highlight?: boolean }) {
  return (
    <div className="flex h-12 items-end gap-1">
      {values.map((v, i) => (
        <div key={i} title={fmtMoney(v)} className={cn("flex-1 rounded-t", highlight && i === values.length - 1 ? "bg-primary" : "bg-primary/30")}
          style={{ height: `${max ? Math.max(4, (v / max) * 100) : 4}%` }} />
      ))}
    </div>
  );
}

function Change({ change, pct }: { change: number; pct: number | null }) {
  if (Math.abs(change) < 0.5) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" />No change</span>;
  const up = change > 0;
  return (
    <span className={cn("flex items-center gap-1 text-xs tabular-nums", up ? "text-destructive" : "text-secondary")}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {up ? "+" : "−"}{fmtMoney(Math.abs(change))}{pct != null && ` (${up ? "+" : ""}${pct}%)`}
    </span>
  );
}

export function SpendingTrendsTab({ uid }: { uid: string }) {
  const { cats, txs, loading } = useBudgetData(uid);
  const [end, setEnd] = useState(monthKey(new Date()));
  const t = useMemo(() => spendingTrends(cats, txs, end), [cats, txs, end]);
  const rows = [...t.rows].sort((a, b) => b.average - a.average);
  const totalMax = Math.max(...t.totals, 1);
  const last = t.totals[5], prev = t.totals[4];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker month={end} onChange={setEnd} />
        <p className="text-xs text-muted-foreground">Six months ending in the month shown</p>
      </div>

      <section className="cozy-card p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg">Total spending</h2>
          <Change change={last - prev} pct={prev > 0 ? Math.round(((last - prev) / prev) * 100) : null} />
        </div>
        <div className="flex h-36 items-end gap-2 sm:gap-4">
          {t.totals.map((v, i) => {
            const rate = savingsRate(t.incomes[i], v);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">{fmtMoney(v)}</span>
                <div className={cn("w-full rounded-t-md", i === 5 ? "bg-primary" : "bg-primary/30")} style={{ height: `${Math.max(3, (v / totalMax) * 100)}px` }} />
                <span className="text-xs text-muted-foreground">{short(t.months[i])}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">in {fmtMoney(t.incomes[i])}</span>
                <span className={cn("text-[10px] font-medium tabular-nums", rate != null ? (rate >= 0 ? "text-secondary" : "text-destructive") : "text-muted-foreground")}>
                  {rate != null ? `${rate}% saved` : "—"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Bars show spending. Under each month: income ("in") and the percent of income you kept.</p>
      </section>

      {loading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="cozy-card p-5 text-sm text-muted-foreground">Add spending categories in the Plan tab to see trends here.</p>
      ) : (
        <section className="cozy-card p-5">
          <h2 className="mb-1 font-display text-lg">By category</h2>
          <p className="mb-3 text-xs text-muted-foreground">Change compares the last month shown with the one before it.</p>
          <div className="divide-y divide-border/60">
            {rows.map((r) => {
              const max = Math.max(...r.values, 1);
              return (
                <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[12rem_1fr_9rem]">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" style={r.color ? { background: r.color } : undefined} />{r.name}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">Avg {fmtMoney(r.average)}/mo</p>
                  </div>
                  <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                    <Bars values={r.values} max={max} />
                    <div className="mt-1 flex gap-1">{t.months.map((m) => <span key={m} className="flex-1 text-center text-[10px] text-muted-foreground">{short(m)}</span>)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums">{fmtMoney(r.values[5])}</p>
                    <div className="flex justify-end"><Change change={r.change} pct={r.changePct} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
