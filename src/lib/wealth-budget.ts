export type BudgetCategory = { id: string; name: string; monthly_limit: number | null; kind: string | null; color: string | null };
export type BudgetTx = { date: string; amount: number; kind: string; category_id: string | null };
export type BudgetStatus = "ok" | "near" | "over" | "unset";

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const shiftMonth = (key: string, by: number) => {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
};

/** Near the limit at 80% spent, over once spending passes the limit. */
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (!limit || limit <= 0) return "unset";
  const r = spent / limit;
  if (r > 1) return "over";
  if (r >= 0.8) return "near";
  return "ok";
}

export type CategoryRow = BudgetCategory & { spent: number; limit: number; left: number; status: BudgetStatus; pct: number; custom: boolean };
export type MonthTarget = { category_id: string; month: string; amount: number };

/** A month's own target wins; otherwise the category's default monthly amount applies. */
export function targetFor(cat: BudgetCategory, month: string, targets: MonthTarget[] = []) {
  const t = targets.find((x) => x.category_id === cat.id && x.month === month);
  return t ? { amount: Number(t.amount) || 0, custom: true } : { amount: Number(cat.monthly_limit) || 0, custom: false };
}

export function summarizeBudget(cats: BudgetCategory[], txs: BudgetTx[], month: string, targets: MonthTarget[] = []) {
  const inMonth = txs.filter((t) => t.date?.startsWith(month));
  const byCat = new Map<string, number>();
  let income = 0, expenses = 0, uncategorized = 0;
  for (const t of inMonth) {
    const a = Math.abs(Number(t.amount) || 0);
    if (t.kind === "income") income += a;
    else {
      expenses += a;
      if (t.category_id) byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) + a);
      else uncategorized += a;
    }
    if (t.kind === "income" && t.category_id) byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) + a);
  }
  const rows: CategoryRow[] = cats.map((c) => {
    const { amount: limit, custom } = targetFor(c, month, targets);
    const spent = byCat.get(c.id) ?? 0;
    return { ...c, custom, limit, spent, left: limit - spent, status: c.kind === "income" ? "ok" : budgetStatus(spent, limit), pct: limit ? Math.min(100, (spent / limit) * 100) : 0 };
  });
  const expenseRows = rows.filter((r) => r.kind !== "income");
  const incomeRows = rows.filter((r) => r.kind === "income");
  const plannedIncome = incomeRows.reduce((s, r) => s + r.limit, 0);
  const budgeted = expenseRows.reduce((s, r) => s + r.limit, 0);
  return {
    rows, expenseRows, incomeRows, income, expenses, uncategorized,
    plannedIncome, budgeted,
    leftToBudget: plannedIncome - budgeted,
    net: income - expenses,
    savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
  };
}

/** Spending per expense category for the `count` months ending at `endMonth` (oldest first). */
export function spendingTrends(cats: BudgetCategory[], txs: BudgetTx[], endMonth: string, count = 6) {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(endMonth, i - count + 1));
  const rows = cats.filter((c) => c.kind !== "income").map((c) => {
    const values = months.map((m) => txs.filter((t) => t.kind !== "income" && t.category_id === c.id && t.date?.startsWith(m)).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0));
    const prev = values[count - 2] ?? 0, last = values[count - 1] ?? 0;
    const average = values.reduce((a, b) => a + b, 0) / count;
    return { ...c, values, average, change: last - prev, changePct: prev > 0 ? Math.round(((last - prev) / prev) * 100) : null };
  });
  const totals = months.map((_, i) => rows.reduce((s, r) => s + r.values[i], 0));
  return { months, rows, totals };
}
