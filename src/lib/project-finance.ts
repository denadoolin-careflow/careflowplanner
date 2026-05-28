import { supabase } from "@/integrations/supabase/client";

export interface WealthTx {
  id: string;
  date: string;
  amount: number;
  kind: string;
  note: string | null;
  category_id: string | null;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  color: string | null;
}

export async function loadProjectFinance(opts: {
  uid: string;
  transactionIds: string[];
  savingsGoalIds: string[];
}): Promise<{ transactions: WealthTx[]; goals: SavingsGoal[] }> {
  const txP = opts.transactionIds.length
    ? supabase
        .from("transactions")
        .select("id,date,amount,kind,note,category_id")
        .eq("user_id", opts.uid)
        .in("id", opts.transactionIds)
        .order("date", { ascending: false })
    : Promise.resolve({ data: [], error: null });
  const goalP = opts.savingsGoalIds.length
    ? supabase
        .from("savings_goals")
        .select("id,name,target_amount,current_amount,target_date,color")
        .eq("user_id", opts.uid)
        .in("id", opts.savingsGoalIds)
    : Promise.resolve({ data: [], error: null });
  const [{ data: tx }, { data: goals }] = await Promise.all([txP, goalP]);
  return {
    transactions: ((tx ?? []) as any[]).map(r => ({ ...r, amount: Number(r.amount) })),
    goals: ((goals ?? []) as any[]).map(g => ({
      ...g,
      target_amount: Number(g.target_amount),
      current_amount: Number(g.current_amount),
    })),
  };
}

export async function listAllTransactions(uid: string, limit = 200): Promise<WealthTx[]> {
  const { data } = await supabase
    .from("transactions")
    .select("id,date,amount,kind,note,category_id")
    .eq("user_id", uid)
    .order("date", { ascending: false })
    .limit(limit);
  return ((data ?? []) as any[]).map(r => ({ ...r, amount: Number(r.amount) }));
}

export async function listAllSavingsGoals(uid: string): Promise<SavingsGoal[]> {
  const { data } = await supabase
    .from("savings_goals")
    .select("id,name,target_amount,current_amount,target_date,color")
    .eq("user_id", uid)
    .order("sort_order");
  return ((data ?? []) as any[]).map(g => ({
    ...g,
    target_amount: Number(g.target_amount),
    current_amount: Number(g.current_amount),
  }));
}

export function projectSpend(transactions: WealthTx[]): number {
  return transactions
    .filter(t => t.kind === "expense")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

export const centsToDollars = (c?: number) => (c == null ? 0 : c / 100);
export const dollarsToCents = (d: number) => Math.round(d * 100);
export const fmtUSD = (n: number) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;