import { describe, it, expect } from "vitest";
import { budgetStatus, summarizeBudget, shiftMonth, targetFor, spendingTrends, savingsRate } from "./wealth-budget";

describe("wealth budget", () => {
  it("flags near at 80% and over past 100%", () => {
    expect(budgetStatus(79, 100)).toBe("ok");
    expect(budgetStatus(80, 100)).toBe("near");
    expect(budgetStatus(101, 100)).toBe("over");
    expect(budgetStatus(5, 0)).toBe("unset");
  });
  it("only counts the chosen month", () => {
    const s = summarizeBudget(
      [{ id: "g", name: "Groceries", monthly_limit: 600, kind: "expense", color: null }],
      [
        { date: "2026-10-03", amount: 200, kind: "expense", category_id: "g" },
        { date: "2026-09-30", amount: 999, kind: "expense", category_id: "g" },
        { date: "2026-10-01", amount: 3000, kind: "income", category_id: null },
      ],
      "2026-10",
    );
    expect(s.expenseRows[0].spent).toBe(200);
    expect(s.expenseRows[0].left).toBe(400);
    expect(s.net).toBe(2800);
  });
  it("shifts months across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("uses a month's own target, else the default", () => {
    const cat = { id: "g", name: "Groceries", monthly_limit: 600, kind: "expense", color: null };
    const targets = [{ category_id: "g", month: "2026-12", amount: 900 }];
    expect(targetFor(cat, "2026-12", targets)).toEqual({ amount: 900, custom: true });
    expect(targetFor(cat, "2026-11", targets)).toEqual({ amount: 600, custom: false });
    expect(summarizeBudget([cat], [], "2026-12", targets).budgeted).toBe(900);
  });
  it("tracks six months of category spending and month-over-month change", () => {
    const cat = { id: "g", name: "Groceries", monthly_limit: 0, kind: "expense", color: null };
    const t = spendingTrends([cat], [
      { date: "2026-09-10", amount: 400, kind: "expense", category_id: "g" },
      { date: "2026-10-02", amount: 500, kind: "expense", category_id: "g" },
      { date: "2026-04-01", amount: 999, kind: "expense", category_id: "g" },
    ], "2026-10");
    expect(t.months).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(t.rows[0].values).toEqual([0, 0, 0, 0, 400, 500]);
    expect(t.rows[0].change).toBe(100);
    expect(t.rows[0].changePct).toBe(25);
  });
});
