import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

export interface MonthlyIntention {
  id?: string;
  month: string; // YYYY-MM-DD (first of month)
  word: string | null;
  intention: string | null;
  emotional_focus: string | null;
  priorities: string[];
  vision: string | null;
  quote: string | null;
  mood_board: string[];
  focus_areas: string[];
}

export interface MonthlyReview {
  id?: string;
  month: string;
  wins: string | null;
  challenges: string | null;
  gratitude: string | null;
  lessons: string | null;
  next_month_focus: string | null;
  rating: number | null;
}

export interface MonthFinance {
  bills: { id: string; name: string; amount: number; next_due_date: string | null; cadence: string }[];
  budgetTotal: number;
  spentThisMonth: number;
}

const emptyIntention = (monthISO: string): MonthlyIntention => ({
  month: monthISO,
  word: "",
  intention: "",
  emotional_focus: "",
  priorities: [],
  vision: "",
  quote: "",
  mood_board: [],
  focus_areas: [],
});

const emptyReview = (monthISO: string): MonthlyReview => ({
  month: monthISO,
  wins: "",
  challenges: "",
  gratitude: "",
  lessons: "",
  next_month_focus: "",
  rating: null,
});

export function useMonthlyPlan(cursor: Date) {
  const monthISO = format(startOfMonth(cursor), "yyyy-MM-dd");
  const monthEndISO = format(endOfMonth(cursor), "yyyy-MM-dd");

  const [intention, setIntention] = useState<MonthlyIntention>(emptyIntention(monthISO));
  const [review, setReview] = useState<MonthlyReview>(emptyReview(monthISO));
  const [finance, setFinance] = useState<MonthFinance>({ bills: [], budgetTotal: 0, spentThisMonth: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) { setLoading(false); return; }

    const [iRes, rRes, billsRes, budgetRes, txRes] = await Promise.all([
      supabase.from("monthly_intentions").select("*").eq("user_id", uid).eq("month", monthISO).maybeSingle(),
      supabase.from("monthly_reviews").select("*").eq("user_id", uid).eq("month", monthISO).maybeSingle(),
      supabase.from("recurring_bills").select("id,name,amount,next_due_date,cadence").eq("user_id", uid),
      supabase.from("budget_categories").select("monthly_limit,kind").eq("user_id", uid),
      supabase.from("transactions").select("amount,date").eq("user_id", uid).gte("date", monthISO).lte("date", monthEndISO),
    ]);

    setIntention(iRes.data
      ? {
          ...emptyIntention(monthISO),
          ...iRes.data,
          priorities: (iRes.data.priorities as any) ?? [],
          mood_board: (iRes.data.mood_board as any) ?? [],
          focus_areas: (iRes.data.focus_areas as any) ?? [],
        }
      : emptyIntention(monthISO));

    setReview(rRes.data ? { ...emptyReview(monthISO), ...rRes.data } : emptyReview(monthISO));

    const bills = (billsRes.data ?? [])
      .filter(b => !b.next_due_date || (b.next_due_date >= monthISO && b.next_due_date <= monthEndISO))
      .map(b => ({ ...b, amount: Number(b.amount) }));
    const budgetTotal = (budgetRes.data ?? [])
      .filter(c => c.kind === "expense")
      .reduce((sum, c) => sum + Number(c.monthly_limit ?? 0), 0);
    const spentThisMonth = (txRes.data ?? []).reduce((sum, t) => sum + Math.abs(Number(t.amount ?? 0)), 0);
    setFinance({ bills, budgetTotal, spentThisMonth });

    setLoading(false);
  }, [monthISO, monthEndISO]);

  useEffect(() => { load(); }, [load]);

  const saveIntention = useCallback(async (patch: Partial<MonthlyIntention>) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const next = { ...intention, ...patch, month: monthISO };
    setIntention(next);
    await supabase.from("monthly_intentions").upsert({
      user_id: uid,
      month: monthISO,
      word: next.word || null,
      intention: next.intention || null,
      emotional_focus: next.emotional_focus || null,
      priorities: next.priorities ?? [],
      vision: next.vision || null,
      quote: next.quote || null,
      mood_board: next.mood_board ?? [],
      focus_areas: next.focus_areas ?? [],
    }, { onConflict: "user_id,month" });
  }, [intention, monthISO]);

  const saveReview = useCallback(async (patch: Partial<MonthlyReview>) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const next = { ...review, ...patch, month: monthISO };
    setReview(next);
    await supabase.from("monthly_reviews").upsert({
      user_id: uid,
      month: monthISO,
      wins: next.wins || null,
      challenges: next.challenges || null,
      gratitude: next.gratitude || null,
      lessons: next.lessons || null,
      next_month_focus: next.next_month_focus || null,
      rating: next.rating ?? null,
    }, { onConflict: "user_id,month" });
  }, [review, monthISO]);

  return { monthISO, monthEndISO, intention, review, finance, loading, saveIntention, saveReview, reload: load };
}