/**
 * Symptom correlations — how the symptoms you recorded line up with the foods,
 * portion sizes, and movement sessions you logged.
 *
 * Everything here is descriptive aggregation of your own entries. Small samples
 * are flagged rather than hidden, and nothing here is medical advice.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFoodFeel, POSITIVE_SYMPTOMS, type FoodFeelLog } from "./food-feel";
import { useMovement, type MovementLog } from "./movement";

export const MIN_SAMPLE = 3;

const norm = (s: string) => s.trim().toLowerCase();

/** Severity of a symptom in a log: explicit 1–3, or 2 when only flagged. */
export const severityOf = (log: FoodFeelLog, symptom: string) =>
  log.symptoms.includes(symptom) ? Number(log.severities?.[symptom]) || 2 : 0;

/* ------------------------------------------------------- symptom by food */

export interface FoodSymptomRow {
  food: string;
  count: number;
  /** Times this symptom appeared with this food. */
  hits: number;
  /** Average severity across every log of this food (0 when never present). */
  avgSeverity: number;
  frequency: number;
  avgRating: number;
  lowSample: boolean;
}

export function symptomByFood(logs: FoodFeelLog[], symptom: string): FoodSymptomRow[] {
  const groups = new Map<string, FoodFeelLog[]>();
  for (const l of logs) {
    const k = norm(l.food_name);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }

  return Array.from(groups.entries())
    .map(([, ls]) => {
      const hits = ls.filter(l => l.symptoms.includes(symptom)).length;
      const sev = ls.reduce((s, l) => s + severityOf(l, symptom), 0) / ls.length;
      return {
        food: ls[0].food_name,
        count: ls.length,
        hits,
        avgSeverity: +sev.toFixed(2),
        frequency: hits / ls.length,
        avgRating: +(ls.reduce((s, l) => s + l.rating, 0) / ls.length).toFixed(2),
        lowSample: ls.length < MIN_SAMPLE,
      };
    })
    .sort((a, b) => b.avgSeverity - a.avgSeverity || b.count - a.count);
}

/* ------------------------------------------------------ portion vs symptom */

export interface PortionPoint {
  date: string;
  /** Calories logged for the matching food entry — the closest stand-in for portion size. */
  calories: number;
  servings: number;
  severity: number;
  rating: number;
}

/** Feel logs joined to their food entry, so portion size can be compared. */
export function usePortionEffect(logs: FoodFeelLog[]) {
  const [entries, setEntries] = useState<Record<string, { calories: number; servings: number }>>({});

  const ids = useMemo(
    () => Array.from(new Set(logs.map(l => l.entry_id).filter(Boolean))) as string[],
    [logs],
  );
  const key = ids.join(",");

  useEffect(() => {
    if (!ids.length) { setEntries({}); return; }
    let cancel = false;
    void supabase.from("food_entries").select("id,calories,servings").in("id", ids.slice(0, 400))
      .then(({ data }) => {
        if (cancel) return;
        const map: Record<string, { calories: number; servings: number }> = {};
        for (const r of (data ?? []) as any[]) {
          map[r.id] = { calories: Number(r.calories) || 0, servings: Number(r.servings) || 1 };
        }
        setEntries(map);
      });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => (food: string, symptom: string): PortionPoint[] =>
    logs
      .filter(l => norm(l.food_name) === norm(food) && l.entry_id && entries[l.entry_id])
      .map(l => ({
        date: l.date,
        calories: entries[l.entry_id!].calories,
        servings: entries[l.entry_id!].servings,
        severity: severityOf(l, symptom),
        rating: l.rating,
      }))
      .sort((a, b) => a.calories - b.calories),
  [logs, entries]);
}

/* ---------------------------------------------------- movement vs symptom */

export interface MovementSymptomRow {
  bucket: string;
  days: number;
  avgSeverity: number;
  avgRating: number;
}

/** Average symptom severity on days grouped by how much you moved. */
export function movementVsSymptom(
  feels: FoodFeelLog[], moves: MovementLog[], symptom: string,
): MovementSymptomRow[] {
  const minutesByDay = new Map<string, number>();
  for (const m of moves) minutesByDay.set(m.date, (minutesByDay.get(m.date) ?? 0) + m.minutes);

  const buckets: { label: string; test: (m: number) => boolean }[] = [
    { label: "No movement", test: m => m === 0 },
    { label: "1–20 min", test: m => m > 0 && m <= 20 },
    { label: "21–45 min", test: m => m > 20 && m <= 45 },
    { label: "45+ min", test: m => m > 45 },
  ];

  const byDay = new Map<string, FoodFeelLog[]>();
  for (const f of feels) byDay.set(f.date, [...(byDay.get(f.date) ?? []), f]);

  return buckets.map(b => {
    const days = Array.from(byDay.entries())
      .filter(([date]) => b.test(minutesByDay.get(date) ?? 0));
    const all = days.flatMap(([, ls]) => ls);
    return {
      bucket: b.label,
      days: days.length,
      avgSeverity: all.length ? +(all.reduce((s, l) => s + severityOf(l, symptom), 0) / all.length).toFixed(2) : 0,
      avgRating: all.length ? +(all.reduce((s, l) => s + l.rating, 0) / all.length).toFixed(2) : 0,
    };
  }).filter(r => r.days > 0);
}

/* ------------------------------------------------------------- over time */

export interface SymptomWeekPoint {
  week: string;
  label: string;
  severity: number;
  rating: number;
  logs: number;
}

const weekStart = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
};

export function symptomOverTime(logs: FoodFeelLog[], symptom: string): SymptomWeekPoint[] {
  const byWeek = new Map<string, FoodFeelLog[]>();
  for (const l of logs) {
    const w = weekStart(l.date);
    byWeek.set(w, [...(byWeek.get(w) ?? []), l]);
  }
  return Array.from(byWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, ls]) => ({
      week,
      label: week.slice(5).replace("-", "/"),
      severity: +(ls.reduce((s, l) => s + severityOf(l, symptom), 0) / ls.length).toFixed(2),
      rating: +(ls.reduce((s, l) => s + l.rating, 0) / ls.length).toFixed(2),
      logs: ls.length,
    }));
}

/* ------------------------------------------------------------------ hook */

export function useCorrelations(days = 90) {
  const { logs, loading } = useFoodFeel(days);
  const { logs: moves } = useMovement(days);
  const portionFor = usePortionEffect(logs);

  const foods = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const l of logs) {
      const k = norm(l.food_name);
      if (!k) continue;
      const cur = counts.get(k);
      counts.set(k, { label: l.food_name, count: (cur?.count ?? 0) + 1 });
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [logs]);

  return { logs, moves, loading, foods, portionFor, isPositive: (s: string) => POSITIVE_SYMPTOMS.has(s) };
}
