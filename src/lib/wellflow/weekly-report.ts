/**
 * Weekly progress report — the last 7 days next to the 7 before them.
 * Everything is a plain readback of your own logs. No diagnosis, no
 * predictions, no promises about results.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "./types";
import { findFeelPatterns, type FoodFeelLog } from "./food-feel";

export interface WeekStats {
  from: string;
  to: string;
  daysLogged: number;
  calories: number;      // daily average across logged days
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  movementMinutes: number;
  movementDays: number;
  injections: number;
  energy: number | null;
  weightStart: number | null;
  weightEnd: number | null;
  proteinTargetHits: number;
  calorieTargetHits: number;
}

export interface WeeklyReport {
  current: WeekStats;
  previous: WeekStats;
  weightChange: number | null;
  highlights: string[];
  bestFoods: { food: string; avgRating: number; count: number }[];
  hardestFoods: { food: string; avgRating: number; count: number }[];
  hasData: boolean;
}

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

interface Raw {
  food: { date: string; calories: number; protein: number; carbs: number; fat: number; fiber: number }[];
  water: { date: string; ounces: number }[];
  weight: { date: string; weight_lb: number }[];
  moves: { date: string; minutes: number }[];
  shots: { date: string }[];
  checks: { date: string; energy: number | null }[];
  feels: FoodFeelLog[];
}

function statsFor(raw: Raw, from: string, to: string, targets: { calories: number | null; protein: number | null }): WeekStats {
  const within = (d: string) => d >= from && d <= to;

  const byDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number }>();
  for (const f of raw.food) {
    if (!within(f.date)) continue;
    const b = byDay.get(f.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    b.calories += f.calories; b.protein += f.protein; b.carbs += f.carbs; b.fat += f.fat; b.fiber += f.fiber;
    byDay.set(f.date, b);
  }
  const days = Array.from(byDay.values());

  const waterByDay = new Map<string, number>();
  for (const w of raw.water) if (within(w.date)) waterByDay.set(w.date, (waterByDay.get(w.date) ?? 0) + w.ounces);

  const moves = raw.moves.filter(m => within(m.date));
  const weights = raw.weight.filter(w => within(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  const energies = raw.checks.filter(c => within(c.date) && c.energy).map(c => Number(c.energy));

  return {
    from, to,
    daysLogged: days.length,
    calories: avg(days.map(d => d.calories)),
    protein: avg(days.map(d => d.protein)),
    carbs: avg(days.map(d => d.carbs)),
    fat: avg(days.map(d => d.fat)),
    fiber: avg(days.map(d => d.fiber)),
    water: avg(Array.from(waterByDay.values())),
    movementMinutes: moves.reduce((s, m) => s + m.minutes, 0),
    movementDays: new Set(moves.filter(m => m.minutes > 0).map(m => m.date)).size,
    injections: raw.shots.filter(s => within(s.date)).length,
    energy: energies.length ? avg(energies) : null,
    weightStart: weights[0]?.weight_lb ?? null,
    weightEnd: weights[weights.length - 1]?.weight_lb ?? null,
    proteinTargetHits: targets.protein ? days.filter(d => d.protein >= targets.protein!).length : 0,
    calorieTargetHits: targets.calories ? days.filter(d => d.calories <= targets.calories!).length : 0,
  };
}

export async function fetchWeeklyReport(
  targets: { calories: number | null; protein: number | null } = { calories: null, protein: null },
): Promise<WeeklyReport> {
  const to = todayISO();
  const from = shift(to, -6);
  const prevTo = shift(from, -1);
  const prevFrom = shift(prevTo, -6);

  const [food, water, weight, moves, shots, checks, feels] = await Promise.all([
    supabase.from("food_entries").select("date,calories,protein,carbs,fat,fiber").gte("date", prevFrom),
    supabase.from("water_entries").select("date,ounces").gte("date", prevFrom),
    supabase.from("weight_logs").select("date,weight_lb").gte("date", prevFrom),
    supabase.from("wellflow_movement_logs").select("date,minutes").gte("date", prevFrom),
    supabase.from("glp1_injections").select("date").gte("date", prevFrom),
    supabase.from("wellness_checkins").select("date,energy").gte("date", prevFrom),
    supabase.from("food_feel_logs").select("*").gte("date", from),
  ]);

  const raw: Raw = {
    food: (food.data ?? []).map((r: any) => ({
      date: r.date, calories: Number(r.calories) || 0, protein: Number(r.protein) || 0,
      carbs: Number(r.carbs) || 0, fat: Number(r.fat) || 0, fiber: Number(r.fiber) || 0,
    })),
    water: (water.data ?? []).map((r: any) => ({ date: r.date, ounces: Number(r.ounces) || 0 })),
    weight: (weight.data ?? []).map((r: any) => ({ date: r.date, weight_lb: Number(r.weight_lb) || 0 })),
    moves: (moves.data ?? []).map((r: any) => ({ date: r.date, minutes: Number(r.minutes) || 0 })),
    shots: (shots.data ?? []).map((r: any) => ({ date: r.date })),
    checks: (checks.data ?? []).map((r: any) => ({ date: r.date, energy: r.energy == null ? null : Number(r.energy) })),
    feels: (feels.data ?? []).map((r: any) => ({
      id: r.id, entry_id: r.entry_id ?? null, food_name: r.food_name, date: r.date,
      logged_at: r.logged_at, rating: Number(r.rating) || 3,
      symptoms: Array.isArray(r.symptoms) ? r.symptoms.map(String) : [],
      severities: (r.severities ?? {}) as Record<string, number>,
      delay_minutes: r.delay_minutes ?? null, note: r.note ?? null,
    })),
  };

  const current = statsFor(raw, from, to, targets);
  const previous = statsFor(raw, prevFrom, prevTo, targets);

  const weightChange =
    current.weightEnd != null && current.weightStart != null
      ? Math.round((current.weightEnd - current.weightStart) * 10) / 10
      : null;

  const patterns = findFeelPatterns(raw.feels);

  const highlights: string[] = [];
  if (current.daysLogged) highlights.push(`You logged food on ${current.daysLogged} of the last 7 days.`);
  if (targets.protein && current.daysLogged)
    highlights.push(`Protein target met on ${current.proteinTargetHits} of ${current.daysLogged} logged days.`);
  if (current.movementDays)
    highlights.push(`Movement on ${current.movementDays} day${current.movementDays === 1 ? "" : "s"}, ${Math.round(current.movementMinutes)} minutes total.`);
  if (current.water) highlights.push(`Water averaged ${Math.round(current.water)} oz a day.`);
  if (weightChange != null)
    highlights.push(`Weight moved ${weightChange > 0 ? "up" : "down"} ${Math.abs(weightChange)} lb across the week's entries.`);
  if (current.energy != null && previous.energy != null) {
    const d = current.energy - previous.energy;
    if (Math.abs(d) >= 0.3)
      highlights.push(`Average energy was ${d > 0 ? "higher" : "lower"} than the week before (${current.energy.toFixed(1)} vs ${previous.energy.toFixed(1)}).`);
  }
  if (current.injections) highlights.push(`${current.injections} injection${current.injections === 1 ? "" : "s"} logged.`);

  return {
    current,
    previous,
    weightChange,
    highlights,
    bestFoods: patterns.helpers.map(f => ({ food: f.food, avgRating: f.avgRating, count: f.count })).slice(0, 4),
    hardestFoods: patterns.drainers.map(f => ({ food: f.food, avgRating: f.avgRating, count: f.count })).slice(0, 4),
    hasData: current.daysLogged > 0 || current.movementDays > 0 || current.injections > 0,
  };
}

export function useWeeklyReport(targets: { calories: number | null; protein: number | null }) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const cal = targets.calories;
  const pro = targets.protein;

  const load = useCallback(async () => {
    setLoading(true);
    try { setReport(await fetchWeeklyReport({ calories: cal, protein: pro })); }
    finally { setLoading(false); }
  }, [cal, pro]);

  useEffect(() => { void load(); }, [load]);
  return { report, loading, reload: load };
}
