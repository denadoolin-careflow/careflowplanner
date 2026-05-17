import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface DailyIntention {
  id?: string;
  date: string;
  word: string | null;
  intention: string | null;
  theme: string | null;
  emotional_focus: string | null;
  priorities: string[];
  top_three: string[];
  notes: string | null;
  mood: string | null;
  energy: string | null;
  gratitude: string[];
  weather_note: string | null;
}

export interface DailyReview {
  id?: string;
  date: string;
  wins: string | null;
  challenges: string | null;
  gratitude: string | null;
  lessons: string | null;
  tomorrow_focus: string | null;
  rating: number | null;
}

const emptyIntention = (d: string): DailyIntention => ({
  date: d, word: "", intention: "", theme: "", emotional_focus: "",
  priorities: [], top_three: [], notes: "", mood: "", energy: "",
  gratitude: [], weather_note: "",
});
const emptyReview = (d: string): DailyReview => ({
  date: d, wins: "", challenges: "", gratitude: "", lessons: "",
  tomorrow_focus: "", rating: null,
});

export function useDailyPlan(day: Date) {
  const dateISO = format(day, "yyyy-MM-dd");
  const [intention, setIntention] = useState<DailyIntention>(emptyIntention(dateISO));
  const [review, setReview] = useState<DailyReview>(emptyReview(dateISO));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) { setLoading(false); return; }
    const [iRes, rRes] = await Promise.all([
      supabase.from("daily_intentions").select("*").eq("user_id", uid).eq("date", dateISO).maybeSingle(),
      supabase.from("daily_reviews").select("*").eq("user_id", uid).eq("date", dateISO).maybeSingle(),
    ]);
    setIntention(iRes.data ? {
      ...emptyIntention(dateISO),
      ...iRes.data,
      priorities: (iRes.data.priorities as any) ?? [],
      top_three: (iRes.data.top_three as any) ?? [],
      gratitude: (iRes.data.gratitude as any) ?? [],
    } : emptyIntention(dateISO));
    setReview(rRes.data ? { ...emptyReview(dateISO), ...rRes.data } : emptyReview(dateISO));
    setLoading(false);
  }, [dateISO]);

  useEffect(() => { void load(); }, [load]);

  const saveIntention = useCallback(async (patch: Partial<DailyIntention>) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const next = { ...intention, ...patch, date: dateISO };
    setIntention(next);
    await supabase.from("daily_intentions").upsert({
      user_id: uid, date: dateISO,
      word: next.word || null,
      intention: next.intention || null,
      theme: next.theme || null,
      emotional_focus: next.emotional_focus || null,
      priorities: next.priorities ?? [],
      top_three: next.top_three ?? [],
      notes: next.notes || null,
      mood: next.mood || null,
      energy: next.energy || null,
      gratitude: next.gratitude ?? [],
      weather_note: next.weather_note || null,
    }, { onConflict: "user_id,date" });
  }, [intention, dateISO]);

  const saveReview = useCallback(async (patch: Partial<DailyReview>) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const next = { ...review, ...patch, date: dateISO };
    setReview(next);
    await supabase.from("daily_reviews").upsert({
      user_id: uid, date: dateISO,
      wins: next.wins || null,
      challenges: next.challenges || null,
      gratitude: next.gratitude || null,
      lessons: next.lessons || null,
      tomorrow_focus: next.tomorrow_focus || null,
      rating: next.rating ?? null,
    }, { onConflict: "user_id,date" });
  }, [review, dateISO]);

  return { dateISO, intention, review, loading, saveIntention, saveReview, reload: load };
}