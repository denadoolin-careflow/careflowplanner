/**
 * Food-feel tracking — how a food felt afterwards, and the patterns that show
 * up over time. Private to the signed-in user. Purely descriptive: it reports
 * what you recorded and never diagnoses anything.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "./types";

export const FEEL_SYMPTOMS = [
  "Bloating", "Nausea", "Heartburn", "Gas", "Sluggish", "Headache",
  "Cravings", "Jittery", "Satisfied", "Focused", "Light", "Energized",
] as const;

/** Symptoms that read as a good sign rather than an unwanted one. */
export const POSITIVE_SYMPTOMS = new Set(["Satisfied", "Focused", "Light", "Energized"]);

export const DELAY_OPTIONS = [
  { value: 15, label: "Right away" },
  { value: 60, label: "About an hour" },
  { value: 180, label: "A few hours" },
  { value: 480, label: "Later that day" },
];

export interface FoodFeelLog {
  id: string;
  entry_id: string | null;
  food_name: string;
  date: string;
  logged_at: string;
  /** 1 (drained me) … 5 (great) */
  rating: number;
  symptoms: string[];
  delay_minutes: number | null;
  note: string | null;
}

export interface FoodFeelDraft {
  entry_id?: string | null;
  food_name: string;
  date?: string;
  rating: number;
  symptoms?: string[];
  delay_minutes?: number | null;
  note?: string | null;
}

const map = (r: any): FoodFeelLog => ({
  id: r.id,
  entry_id: r.entry_id ?? null,
  food_name: r.food_name,
  date: r.date,
  logged_at: r.logged_at,
  rating: Number(r.rating) || 3,
  symptoms: Array.isArray(r.symptoms) ? r.symptoms.map(String) : [],
  delay_minutes: r.delay_minutes ?? null,
  note: r.note ?? null,
});

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());

export async function logFoodFeel(draft: FoodFeelDraft) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in");
  const { error } = await supabase.from("food_feel_logs").insert({
    user_id: user.id,
    entry_id: draft.entry_id ?? null,
    food_name: draft.food_name.slice(0, 160),
    date: draft.date ?? todayISO(),
    rating: Math.min(5, Math.max(1, Math.round(draft.rating))),
    symptoms: draft.symptoms ?? [],
    delay_minutes: draft.delay_minutes ?? null,
    note: draft.note?.trim() || null,
  });
  if (error) throw error;
  emit();
}

export async function deleteFoodFeel(id: string) {
  await supabase.from("food_feel_logs").delete().eq("id", id);
  emit();
}

/** Feel logs from the last `days` days, newest first. */
export function useFoodFeel(days = 90) {
  const [logs, setLogs] = useState<FoodFeelLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const { data } = await supabase.from("food_feel_logs")
      .select("*").gte("date", since).order("logged_at", { ascending: false }).limit(500);
    setLogs((data ?? []).map(map));
    setLoading(false);
  }, [days]);

  useEffect(() => { setLoading(true); void load(); }, [load]);
  useEffect(() => {
    const cb = () => void load();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, [load]);

  return { logs, loading, reload: load };
}

/* ------------------------------------------------------------- patterns */

export interface FoodFeelSummary {
  food: string;
  count: number;
  avgRating: number;
  /** Most common unwanted symptoms for this food, with how often. */
  topSymptoms: { symptom: string; count: number }[];
}

/** Strip a brand suffix so "Greek yogurt (Chobani)" groups with "Greek yogurt". */
const baseName = (name: string) =>
  name.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();

export function summarizeByFood(logs: FoodFeelLog[]): FoodFeelSummary[] {
  const buckets = new Map<string, { label: string; ratings: number[]; symptoms: Map<string, number> }>();
  for (const l of logs) {
    const key = baseName(l.food_name);
    if (!key) continue;
    const b = buckets.get(key) ?? { label: l.food_name.replace(/\s*\([^)]*\)\s*$/, "").trim(), ratings: [], symptoms: new Map() };
    b.ratings.push(l.rating);
    for (const s of l.symptoms) b.symptoms.set(s, (b.symptoms.get(s) ?? 0) + 1);
    buckets.set(key, b);
  }
  return Array.from(buckets.values())
    .map(b => ({
      food: b.label,
      count: b.ratings.length,
      avgRating: b.ratings.reduce((s, r) => s + r, 0) / b.ratings.length,
      topSymptoms: Array.from(b.symptoms.entries())
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a, b2) => b2.count - a.count)
        .slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count);
}

export interface FeelPatterns {
  helpers: FoodFeelSummary[];
  drainers: FoodFeelSummary[];
  symptomCounts: { symptom: string; count: number }[];
  notes: string[];
  total: number;
}

/** Foods need at least this many observations before we call them a pattern. */
const MIN_OBSERVATIONS = 2;

export function findFeelPatterns(logs: FoodFeelLog[]): FeelPatterns {
  const all = summarizeByFood(logs);
  const repeated = all.filter(f => f.count >= MIN_OBSERVATIONS);

  const helpers = repeated.filter(f => f.avgRating >= 4).sort((a, b) => b.avgRating - a.avgRating).slice(0, 6);
  const drainers = repeated.filter(f => f.avgRating <= 2.5).sort((a, b) => a.avgRating - b.avgRating).slice(0, 6);

  const counts = new Map<string, number>();
  for (const l of logs) for (const s of l.symptoms) if (!POSITIVE_SYMPTOMS.has(s)) counts.set(s, (counts.get(s) ?? 0) + 1);
  const symptomCounts = Array.from(counts.entries())
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((a, b) => b.count - a.count);

  const notes: string[] = [];
  for (const f of repeated.slice(0, 12)) {
    const top = f.topSymptoms.find(s => !POSITIVE_SYMPTOMS.has(s.symptom));
    if (top && top.count >= 2) {
      notes.push(`${f.food} was followed by ${top.symptom.toLowerCase()} ${top.count} of ${f.count} times.`);
    }
  }
  for (const f of helpers.slice(0, 3)) {
    notes.push(`${f.food} felt good ${f.count} times in a row — a reliable one for you.`);
  }

  return { helpers, drainers, symptomCounts, notes: notes.slice(0, 6), total: logs.length };
}

export function useFeelPatterns(days = 90) {
  const { logs, loading } = useFoodFeel(days);
  const patterns = useMemo(() => findFeelPatterns(logs), [logs]);
  return { logs, patterns, loading };
}
