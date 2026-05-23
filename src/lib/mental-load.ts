import { supabase } from "@/integrations/supabase/client";

export type BrainDump = {
  id: string;
  user_id: string;
  content: string;
  ai_category: string | null;
  ai_title: string | null;
  status: "inbox" | "sorted" | "promoted" | "archived";
  promoted_task_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MentalLoadCheckin = {
  id: string;
  user_id: string;
  date: string;
  energy: number;
  emotional: number;
  caregiving: number;
  note: string | null;
  minimum_mode: boolean;
};

export type MinimumViableDay = {
  id: string;
  user_id: string;
  items: string[];
};

export const DUMP_CATEGORIES = [
  { value: "task",        label: "Task",        tone: "bg-primary/15 text-primary" },
  { value: "appointment", label: "Appointment", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-200" },
  { value: "errand",      label: "Errand",      tone: "bg-sky-500/15 text-sky-700 dark:text-sky-200" },
  { value: "worry",       label: "Worry",       tone: "bg-rose-400/15 text-rose-700 dark:text-rose-200" },
  { value: "idea",        label: "Idea",        tone: "bg-violet-500/15 text-violet-700 dark:text-violet-200" },
  { value: "someday",     label: "Someday",     tone: "bg-muted text-muted-foreground" },
  { value: "routine",     label: "Routine",     tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" },
] as const;

export const categoryTone = (v: string | null) =>
  DUMP_CATEGORIES.find((c) => c.value === v)?.tone ?? "bg-muted text-muted-foreground";
export const categoryLabel = (v: string | null) =>
  DUMP_CATEGORIES.find((c) => c.value === v)?.label ?? "Unsorted";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export async function loadTodayCheckin(uid: string): Promise<MentalLoadCheckin | null> {
  const { data } = await supabase.from("mental_load_checkins")
    .select("*").eq("user_id", uid).eq("date", todayISO()).maybeSingle();
  return data as any;
}

export async function saveCheckin(uid: string, patch: Partial<MentalLoadCheckin>) {
  const payload = { user_id: uid, date: todayISO(), ...patch };
  const { data, error } = await supabase.from("mental_load_checkins")
    .upsert(payload, { onConflict: "user_id,date" })
    .select("*").single();
  if (error) throw error;
  return data as MentalLoadCheckin;
}

export async function loadRecentCheckins(uid: string, days = 14): Promise<MentalLoadCheckin[]> {
  const start = new Date(); start.setDate(start.getDate() - (days - 1));
  const startISO = start.toISOString().slice(0, 10);
  const { data } = await supabase.from("mental_load_checkins")
    .select("*").eq("user_id", uid).gte("date", startISO).order("date", { ascending: true });
  return (data ?? []) as any;
}

export async function loadOrCreateMVD(uid: string): Promise<MinimumViableDay> {
  const { data } = await supabase.from("minimum_viable_day")
    .select("*").eq("user_id", uid).maybeSingle();
  if (data) return data as any;
  const { data: created } = await supabase.from("minimum_viable_day")
    .insert({ user_id: uid }).select("*").single();
  return created as any;
}

export async function saveMVD(uid: string, items: string[]) {
  const { error } = await supabase.from("minimum_viable_day")
    .upsert({ user_id: uid, items }, { onConflict: "user_id" });
  if (error) throw error;
}

export const loadTone = (score: number) => {
  // 1 (heavy) → rose, 5 (light) → sage
  if (score >= 4) return "bg-emerald-500/30";
  if (score === 3) return "bg-amber-400/30";
  if (score === 2) return "bg-orange-400/35";
  return "bg-rose-400/35";
};

export const loadWord = (score: number) => {
  if (score >= 4) return "spacious";
  if (score === 3) return "moderate";
  if (score === 2) return "heavy";
  return "very heavy";
};