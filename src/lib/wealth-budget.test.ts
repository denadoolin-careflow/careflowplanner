import { describe, it, expect } from "vitest";
import { budgetStatus, summarizeBudget, shiftMonth } from "./wealth-budget";

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
});
