/**
 * WellFlow trends — plain averages over a recent window.
 * Descriptive only: no projections, no targets implied.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { n } from "./types";

export interface TrendSummary {
  days: number;
  daysLogged: number;
  avgCalories: number;
  avgProtein: number;
  avgFiber: number;
  avgWater: number;
  weightChange: number | null;
  injections: number;
}

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
};

export interface TrendRows {
  food: { date: string; calories: number; protein: number; fiber: number }[];
  water: { date: string; ounces: number }[];
  weights: { date: string; weight_lb: number }[];
  injections: { date: string }[];
}

export function summarize(rows: TrendRows, days: number): TrendSummary {
  const from = isoDaysAgo(days);
  const food = rows.food.filter(r => r.date >= from);
  const water = rows.water.filter(r => r.date >= from);
  const weights = rows.weights.filter(r => r.date >= from);
  const injections = rows.injections.filter(r => r.date >= from);

  const loggedDays = new Set(food.map(f => f.date));
  const divisor = Math.max(loggedDays.size, 1);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  return {
    days,
    daysLogged: loggedDays.size,
    avgCalories: Math.round(sum(food.map(f => f.calories)) / divisor),
    avgProtein: Math.round(sum(food.map(f => f.protein)) / divisor),
    avgFiber: Math.round(sum(food.map(f => f.fiber)) / divisor),
    avgWater: Math.round(sum(water.map(w => w.ounces)) / Math.max(new Set(water.map(w => w.date)).size, 1)),
    weightChange: weights.length >= 2
      ? Math.round((weights[weights.length - 1].weight_lb - weights[0].weight_lb) * 10) / 10
      : null,
    injections: injections.length,
  };
}

export async function fetchTrendRows(days = 30): Promise<TrendRows> {
  const from = isoDaysAgo(days);
  const [food, water, weights, injections] = await Promise.all([
    supabase.from("food_entries").select("date,calories,protein,fiber").gte("date", from),
    supabase.from("water_entries").select("date,ounces").gte("date", from),
    supabase.from("weight_logs").select("date,weight_lb").gte("date", from).order("date", { ascending: true }),
    supabase.from("glp1_injections").select("date").gte("date", from),
  ]);
  return {
    food: (food.data ?? []).map((r: any) => ({
      date: r.date, calories: n(r.calories), protein: n(r.protein), fiber: n(r.fiber),
    })),
    water: (water.data ?? []).map((r: any) => ({ date: r.date, ounces: n(r.ounces) })),
    weights: (weights.data ?? []).map((r: any) => ({ date: r.date, weight_lb: n(r.weight_lb) })),
    injections: (injections.data ?? []).map((r: any) => ({ date: r.date })),
  };
}

/** Loads 30 days once and derives both the 7-day and 30-day summaries. */
export function useTrends() {
  const [rows, setRows] = useState<TrendRows | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setRows(await fetchTrendRows(30)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return {
    loading,
    reload: load,
    week: rows ? summarize(rows, 7) : null,
    month: rows ? summarize(rows, 30) : null,
  };
}
