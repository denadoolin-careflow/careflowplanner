/**
 * WellFlow insights — descriptive patterns only.
 * Compares what you logged on GLP-1 injection days vs other days and lines
 * that up with weight and energy check-ins. This is a personal log summary,
 * never a diagnosis, dose suggestion, or outcome promise.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "./types";

export type InsightWindow = 30 | 60 | 90;

export interface DayRow {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  weight: number | null;
  energy: number | null;
  hunger: number | null;
  nausea: number | null;
  injection: boolean;
  /** Days since the most recent injection on or before this date. */
  sinceInjection: number | null;
}

export interface GroupStats {
  days: number;
  calories: number;
  protein: number;
  water: number;
  fiber: number;
  energy: number | null;
  hunger: number | null;
  nausea: number | null;
}

export interface InsightSummary {
  rows: DayRow[];
  injectionDays: GroupStats;
  otherDays: GroupStats;
  /** Averages bucketed by days since the last injection (0..6). */
  byDayAfter: { day: number; calories: number; water: number; energy: number | null; count: number }[];
  weightStart: number | null;
  weightEnd: number | null;
  weightChange: number | null;
  injectionCount: number;
  hasData: boolean;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const daysAgoISO = (days: number) => {
  const d = new Date(`${todayISO()}T12:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const avgOrNull = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? avg(v) : null;
};

function group(rows: DayRow[]): GroupStats {
  return {
    days: rows.length,
    calories: avg(rows.map(r => r.calories)),
    protein: avg(rows.map(r => r.protein)),
    water: avg(rows.map(r => r.water)),
    fiber: avg(rows.map(r => r.fiber)),
    energy: avgOrNull(rows.map(r => r.energy)),
    hunger: avgOrNull(rows.map(r => r.hunger)),
    nausea: avgOrNull(rows.map(r => r.nausea)),
  };
}

/** Either a rolling window in days, or an explicit inclusive date range. */
export type InsightRange = InsightWindow | { from: string; to: string };

export async function fetchInsights(range: InsightRange): Promise<InsightSummary> {
  const from = typeof range === "number" ? daysAgoISO(range) : range.from;
  const to = typeof range === "number" ? todayISO() : range.to;


  const [food, water, weights, injections, checkins] = await Promise.all([
    supabase.from("food_entries").select("date,calories,protein,carbs,fat,fiber").gte("date", from).lte("date", to),
    supabase.from("water_entries").select("date,ounces").gte("date", from).lte("date", to),
    supabase.from("weight_logs").select("date,weight_lb").gte("date", from).lte("date", to).order("date"),
    supabase.from("glp1_injections").select("date").gte("date", from).lte("date", to).order("date"),
    supabase.from("wellness_checkins").select("date,energy,hunger,nausea").gte("date", from).lte("date", to),
  ]);

  const map = new Map<string, DayRow>();
  const ensure = (date: string) => {
    let r = map.get(date);
    if (!r) {
      r = {
        date, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0,
        weight: null, energy: null, hunger: null, nausea: null,
        injection: false, sinceInjection: null,
      };
      map.set(date, r);
    }
    return r;
  };

  (food.data ?? []).forEach((r: any) => {
    const row = ensure(r.date);
    row.calories += n(r.calories);
    row.protein += n(r.protein);
    row.carbs += n(r.carbs);
    row.fat += n(r.fat);
    row.fiber += n(r.fiber);
  });
  (water.data ?? []).forEach((r: any) => { ensure(r.date).water += n(r.ounces); });
  (weights.data ?? []).forEach((r: any) => { ensure(r.date).weight = n(r.weight_lb); });
  (checkins.data ?? []).forEach((r: any) => {
    const row = ensure(r.date);
    row.energy = r.energy ?? null;
    row.hunger = r.hunger ?? null;
    row.nausea = r.nausea ?? null;
  });
  const injectionDates = new Set<string>((injections.data ?? []).map((r: any) => r.date));
  injectionDates.forEach(d => { ensure(d).injection = true; });

  const rows = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Days since the most recent injection, walking forward.
  let last: string | null = null;
  for (const r of rows) {
    if (r.injection) last = r.date;
    if (last) {
      const diff = Math.round(
        (new Date(`${r.date}T12:00:00`).getTime() - new Date(`${last}T12:00:00`).getTime()) / 86_400_000,
      );
      r.sinceInjection = diff;
    }
  }

  const logged = rows.filter(r => r.calories > 0 || r.water > 0 || r.energy != null);
  const inj = logged.filter(r => r.injection);
  const other = logged.filter(r => !r.injection);

  const byDayAfter = Array.from({ length: 7 }, (_, day) => {
    const bucket = logged.filter(r => r.sinceInjection === day);
    return {
      day,
      calories: avg(bucket.map(r => r.calories)),
      water: avg(bucket.map(r => r.water)),
      energy: avgOrNull(bucket.map(r => r.energy)),
      count: bucket.length,
    };
  });

  const weightRows = rows.filter(r => r.weight != null);
  const weightStart = weightRows[0]?.weight ?? null;
  const weightEnd = weightRows[weightRows.length - 1]?.weight ?? null;

  return {
    rows,
    injectionDays: group(inj),
    otherDays: group(other),
    byDayAfter,
    weightStart,
    weightEnd,
    weightChange: weightStart != null && weightEnd != null ? +(weightEnd - weightStart).toFixed(1) : null,
    injectionCount: injectionDates.size,
    hasData: logged.length > 0,
  };
}

export function useInsights(range: InsightRange) {
  const [data, setData] = useState<InsightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const key = typeof range === "number" ? String(range) : `${range.from}..${range.to}`;

  const load = useCallback(async () => {
    setLoading(true);
    const r: InsightRange = key.includes("..")
      ? { from: key.split("..")[0], to: key.split("..")[1] }
      : (Number(key) as InsightWindow);
    try { setData(await fetchInsights(r)); } finally { setLoading(false); }
  }, [key]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, reload: load };
}


/** Plain-language observations. Descriptive only — no advice. */
export function observations(s: InsightSummary): string[] {
  const out: string[] = [];
  const { injectionDays: a, otherDays: b } = s;
  if (a.days >= 2 && b.days >= 2) {
    const dc = a.calories - b.calories;
    if (Math.abs(dc) >= 75) {
      out.push(`On injection days you logged about ${Math.abs(Math.round(dc))} ${dc < 0 ? "fewer" : "more"} calories than on other days.`);
    }
    const dw = a.water - b.water;
    if (Math.abs(dw) >= 6) {
      out.push(`Hydration ran about ${Math.abs(Math.round(dw))} oz ${dw < 0 ? "lower" : "higher"} on injection days.`);
    }
    const dp = a.protein - b.protein;
    if (Math.abs(dp) >= 8) {
      out.push(`Protein averaged ${Math.abs(Math.round(dp))}g ${dp < 0 ? "lower" : "higher"} on injection days.`);
    }
    if (a.energy != null && b.energy != null && Math.abs(a.energy - b.energy) >= 0.6) {
      out.push(`Energy check-ins averaged ${a.energy.toFixed(1)} on injection days vs ${b.energy.toFixed(1)} on other days.`);
    }
    if (a.nausea != null && b.nausea != null && a.nausea - b.nausea >= 0.6) {
      out.push(`You noted more nausea on injection days (${a.nausea.toFixed(1)} vs ${b.nausea.toFixed(1)}).`);
    }
  }
  if (s.weightChange != null) {
    const dir = s.weightChange === 0 ? "held steady" : s.weightChange < 0 ? "went down" : "went up";
    out.push(`Weight ${dir} ${Math.abs(s.weightChange)} lb across this window.`);
  }
  if (!out.length) out.push("Keep logging for a few more days and patterns will start to show up here.");
  return out;
}
