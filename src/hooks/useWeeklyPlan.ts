import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays } from "date-fns";

export interface WeeklyIntention {
  id?: string;
  week_start: string;
  word: string | null;
  intention: string | null;
  theme: string | null;
  emotional_focus: string | null;
  priorities: string[];
  top_three: string[];
  notes: string | null;
}

export interface WeeklyReview {
  id?: string;
  week_start: string;
  wins: string | null;
  challenges: string | null;
  gratitude: string | null;
  lessons: string | null;
  next_week_focus: string | null;
  rating: number | null;
  energy_avg: string | null;
}

const emptyIntention = (w: string): WeeklyIntention => ({
  week_start: w, word: "", intention: "", theme: "", emotional_focus: "",
  priorities: [], top_three: [], notes: "",
});
const emptyReview = (w: string): WeeklyReview => ({
  week_start: w, wins: "", challenges: "", gratitude: "", lessons: "",
  next_week_focus: "", rating: null, energy_avg: null,
});

export function useWeeklyPlan(weekStart: Date) {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekISO = format(monday, "yyyy-MM-dd");
  const weekEndISO = format(addDays(monday, 6), "yyyy-MM-dd");

  const [intention, setIntention] = useState<WeeklyIntention>(emptyIntention(weekISO));
  const [review, setReview] = useState<WeeklyReview>(emptyReview(weekISO));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) { setLoading(false); return; }
    const [iRes, rRes] = await Promise.all([
      supabase.from("weekly_intentions").select("*").eq("user_id", uid).eq("week_start", weekISO).maybeSingle(),
      supabase.from("weekly_reviews").select("*").eq("user_id", uid).eq("week_start", weekISO).maybeSingle(),
    ]);
    setIntention(iRes.data
      ? {
          ...emptyIntention(weekISO),
          ...iRes.data,
          priorities: (iRes.data.priorities as any) ?? [],
          top_three: (iRes.data.top_three as any) ?? [],
        }
      : emptyIntention(weekISO));
    setReview(rRes.data ? { ...emptyReview(weekISO), ...rRes.data } : emptyReview(weekISO));
    setLoading(false);
  }, [weekISO]);

  useEffect(() => { void load(); }, [load]);

  const saveIntention = useCallback(async (patch: Partial<WeeklyIntention>) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const next = { ...intention, ...patch, week_start: weekISO };
    setIntention(next);
    await supabase.from("weekly_intentions").upsert({
      user_id: uid,
      week_start: weekISO,
      word: next.word || null,
      intention: next.intention || null,
      theme: next.theme || null,
      emotional_focus: next.emotional_focus || null,
      priorities: next.priorities ?? [],
      top_three: next.top_three ?? [],
      notes: next.notes || null,
    }, { onConflict: "user_id,week_start" });
  }, [intention, weekISO]);

  const saveReview = useCallback(async (patch: Partial<WeeklyReview>) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const next = { ...review, ...patch, week_start: weekISO };
    setReview(next);
    await supabase.from("weekly_reviews").upsert({
      user_id: uid,
      week_start: weekISO,
      wins: next.wins || null,
      challenges: next.challenges || null,
      gratitude: next.gratitude || null,
      lessons: next.lessons || null,
      next_week_focus: next.next_week_focus || null,
      rating: next.rating ?? null,
      energy_avg: next.energy_avg || null,
    }, { onConflict: "user_id,week_start" });
  }, [review, weekISO]);

  return { weekISO, weekEndISO, intention, review, loading, saveIntention, saveReview, reload: load };
}