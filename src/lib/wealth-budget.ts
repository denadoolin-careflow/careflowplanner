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

export type CategoryRow = BudgetCategory & { spent: number; limit: number; left: number; status: BudgetStatus; pct: number };

export function summarizeBudget(cats: BudgetCategory[], txs: BudgetTx[], month: string) {
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
    const limit = Number(c.monthly_limit) || 0;
    const spent = byCat.get(c.id) ?? 0;
    return { ...c, limit, spent, left: limit - spent, status: c.kind === "income" ? "ok" : budgetStatus(spent, limit), pct: limit ? Math.min(100, (spent / limit) * 100) : 0 };
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
