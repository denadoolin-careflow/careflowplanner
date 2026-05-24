import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PriorityItem { id: string; title: string; done: boolean; linked_task_id?: string | null; }
export interface OutingItem { id: string; title: string; date?: string | null; notes?: string | null; linked_appt_id?: string | null; }
export interface ActivityItem {
  id: string;
  title: string;
  notes?: string | null;
  done?: boolean;
  date?: string | null;
  linked_appt_id?: string | null;
}
export interface MoonPhaseItem {
  id: string;
  iso: string;            // date YYYY-MM-DD
  label: string;          // e.g. "Full Moon"
  glyph: string;
  element?: string | null;
  prompt: string;
  reflection?: string | null;
  done?: boolean;
}
export interface CyclePhaseItem {
  id: string;
  phase: string;          // "menstrual" | "follicular" | "ovulation" | "luteal"
  label: string;
  prompt: string;
  reflection?: string | null;
  done?: boolean;
}

export interface MonthlyPlan {
  id: string;
  user_id: string;
  month: string;          // YYYY-MM-01
  word: string | null;
  theme: string | null;
  intention: string | null;
  season: string | null;
  season_notes: string | null;
  priorities: PriorityItem[];
  outings: OutingItem[];
  activities: ActivityItem[];
  moon_notes: string | null;
  cycle_notes: string | null;
  moon_phase_items: MoonPhaseItem[];
  cycle_phase_items: CyclePhaseItem[];
  ai_generated_at: string | null;
}

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function mapRow(r: any): MonthlyPlan {
  return {
    id: r.id,
    user_id: r.user_id,
    month: r.month,
    word: r.word ?? null,
    theme: r.theme ?? null,
    intention: r.intention ?? null,
    season: r.season ?? null,
    season_notes: r.season_notes ?? null,
    priorities: Array.isArray(r.priorities) ? r.priorities : [],
    outings: Array.isArray(r.outings) ? r.outings : [],
    activities: Array.isArray(r.activities) ? r.activities : [],
    moon_notes: r.moon_notes ?? null,
    cycle_notes: r.cycle_notes ?? null,
    moon_phase_items: Array.isArray(r.moon_phase_items) ? r.moon_phase_items : [],
    cycle_phase_items: Array.isArray(r.cycle_phase_items) ? r.cycle_phase_items : [],
    ai_generated_at: r.ai_generated_at ?? null,
  };
}

export const monthlyPlans = {
  async load(month: string): Promise<MonthlyPlan | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("monthly_plans" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle();
    return data ? mapRow(data) : null;
  },

  async upsert(month: string, patch: Partial<Omit<MonthlyPlan, "id" | "user_id" | "month">>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const existing = await monthlyPlans.load(month);
    const row = {
      user_id: user.id,
      month,
      word: patch.word ?? existing?.word ?? null,
      theme: patch.theme ?? existing?.theme ?? null,
      intention: patch.intention ?? existing?.intention ?? null,
      season: patch.season ?? existing?.season ?? null,
      season_notes: patch.season_notes ?? existing?.season_notes ?? null,
      priorities: patch.priorities ?? existing?.priorities ?? [],
      outings: patch.outings ?? existing?.outings ?? [],
      activities: patch.activities ?? existing?.activities ?? [],
      moon_notes: patch.moon_notes ?? existing?.moon_notes ?? null,
      cycle_notes: patch.cycle_notes ?? existing?.cycle_notes ?? null,
      moon_phase_items: patch.moon_phase_items ?? existing?.moon_phase_items ?? [],
      cycle_phase_items: patch.cycle_phase_items ?? existing?.cycle_phase_items ?? [],
      ai_generated_at: patch.ai_generated_at ?? existing?.ai_generated_at ?? null,
    };
    const { data } = await supabase
      .from("monthly_plans" as any)
      .upsert(row as any, { onConflict: "user_id,month" })
      .select()
      .single();
    return data ? mapRow(data) : null;
  },

  async generate(month: string, context?: string) {
    const { data, error } = await supabase.functions.invoke("ai-month-plan", {
      body: { month, context },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const priorities: PriorityItem[] = (data.priorities ?? []).map((t: string) => ({ id: uid(), title: t, done: false }));
    const outings: OutingItem[] = (data.outings ?? []).map((o: any) => ({ id: uid(), title: o.title, notes: o.notes ?? null }));
    const activities: ActivityItem[] = (data.activities ?? []).map((o: any) => ({ id: uid(), title: o.title, notes: o.notes ?? null, done: false }));
    return await monthlyPlans.upsert(month, {
      word: data.word,
      theme: data.theme,
      intention: data.intention,
      season: data.season,
      season_notes: data.season_notes,
      priorities, outings, activities,
      ai_generated_at: new Date().toISOString(),
    });
  },

  newItemId: uid,
};

export function useMonthlyPlan(month: string) {
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    monthlyPlans.load(month).then(p => {
      if (cancelled) return;
      setPlan(p);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [month]);
  return { plan, loaded, setPlan };
}