/**
 * Weekly consistency score for WellFlow.
 *
 * This measures how consistently you *logged* — food, water, movement,
 * symptoms and marked doses — against the targets you set yourself.
 * It is a descriptive readback of your own data. It is not a health score,
 * not a diagnosis, and it never suggests or changes a medication dose.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "./types";

export interface AdherencePart {
  key: string;
  label: string;
  /** Days that counted this week. */
  hit: number;
  /** Days that could have counted. */
  of: number;
  /** 0–1 */
  ratio: number;
}

export interface AdherenceWeek {
  from: string;
  to: string;
  /** 0–100, average of the active parts. */
  score: number;
  parts: AdherencePart[];
  /** Consecutive days ending today with any WellFlow log. */
  loggingStreak: number;
  bestStreak: number;
  /** Weakest active part, for a gentle nudge. */
  weakest: AdherencePart | null;
  hasData: boolean;
}

export interface AdherenceSummary {
  current: AdherenceWeek;
  previous: AdherenceWeek;
  loading: boolean;
}

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const uniqDays = (rows: { date: string }[], from: string, to: string) =>
  new Set(rows.filter(r => r.date >= from && r.date <= to).map(r => r.date));

interface Raw {
  food: { date: string; calories: number; protein: number }[];
  water: { date: string; ounces: number }[];
  moves: { date: string; minutes: number }[];
  feels: { date: string }[];
  doses: { scheduled_date: string }[];
  weights: { date: string }[];
}

export interface AdherenceTargets {
  calories: number | null;
  protein: number | null;
  water: number | null;
  movementDays: number;
  /** Number of scheduled dose slots per day, if any. */
  doseSlotsPerDay: number;
}

function weekFor(raw: Raw, from: string, to: string, t: AdherenceTargets): AdherenceWeek {
  const totalDays = 7;

  const foodDays = new Map<string, { cal: number; pro: number }>();
  for (const f of raw.food) {
    if (f.date < from || f.date > to) continue;
    const d = foodDays.get(f.date) ?? { cal: 0, pro: 0 };
    d.cal += f.calories; d.pro += f.protein;
    foodDays.set(f.date, d);
  }

  const onTarget = Array.from(foodDays.values()).filter(d =>
    (t.calories == null || d.cal <= t.calories * 1.05) &&
    (t.protein == null || d.pro >= t.protein * 0.9)).length;

  const waterByDay = new Map<string, number>();
  for (const w of raw.water) {
    if (w.date < from || w.date > to) continue;
    waterByDay.set(w.date, (waterByDay.get(w.date) ?? 0) + w.ounces);
  }
  const waterDays = t.water
    ? Array.from(waterByDay.values()).filter(v => v >= t.water! * 0.8).length
    : waterByDay.size;

  const moveDays = uniqDays(raw.moves.filter(m => m.minutes > 0), from, to).size;
  const feelDays = uniqDays(raw.feels, from, to).size;
  const doseDays = uniqDays(raw.doses.map(d => ({ date: d.scheduled_date })), from, to).size;

  const parts: AdherencePart[] = [
    { key: "food", label: "Food logged", hit: foodDays.size, of: totalDays, ratio: foodDays.size / totalDays },
    { key: "target", label: "On target", hit: onTarget, of: Math.max(foodDays.size, 1), ratio: onTarget / Math.max(foodDays.size, 1) },
    { key: "water", label: "Water", hit: waterDays, of: totalDays, ratio: waterDays / totalDays },
    {
      key: "movement", label: "Movement",
      hit: moveDays, of: Math.max(t.movementDays, 1),
      ratio: Math.min(1, moveDays / Math.max(t.movementDays, 1)),
    },
    { key: "symptoms", label: "Check-ins", hit: feelDays, of: totalDays, ratio: feelDays / totalDays },
  ];

  if (t.doseSlotsPerDay > 0) {
    parts.push({ key: "doses", label: "Doses marked", hit: doseDays, of: totalDays, ratio: doseDays / totalDays });
  }

  const score = Math.round(100 * parts.reduce((s, p) => s + Math.min(1, p.ratio), 0) / parts.length);

  const anyDay = new Set<string>([
    ...foodDays.keys(),
    ...waterByDay.keys(),
    ...uniqDays(raw.moves, from, to),
    ...uniqDays(raw.feels, from, to),
    ...uniqDays(raw.weights, from, to),
  ]);

  return {
    from, to, score, parts,
    loggingStreak: 0,
    bestStreak: 0,
    weakest: parts.slice().sort((a, b) => a.ratio - b.ratio)[0] ?? null,
    hasData: anyDay.size > 0,
  };
}

/** Consecutive days (ending today or yesterday) with any WellFlow log. */
function streaks(all: Set<string>) {
  const today = todayISO();
  let current = 0;
  for (let i = 0; i < 400; i++) {
    const d = shift(today, -i);
    if (all.has(d)) current++;
    else if (i === 0) continue; // today still open
    else break;
  }

  const sorted = Array.from(all).sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of sorted) {
    run = prev && shift(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best };
}

export async function fetchAdherence(t: AdherenceTargets): Promise<{ current: AdherenceWeek; previous: AdherenceWeek }> {
  const to = todayISO();
  const from = shift(to, -6);
  const prevTo = shift(from, -1);
  const prevFrom = shift(prevTo, -6);
  const since = shift(prevFrom, -60);

  const [food, water, moves, feels, doses, weights] = await Promise.all([
    supabase.from("food_entries").select("date,calories,protein").gte("date", since),
    supabase.from("water_entries").select("date,ounces").gte("date", since),
    supabase.from("wellflow_movement_logs").select("date,minutes").gte("date", since),
    supabase.from("food_feel_logs").select("date").gte("date", since),
    supabase.from("medication_logs").select("scheduled_date").gte("scheduled_date", since),
    supabase.from("weight_logs").select("date").gte("date", since),
  ]);

  const raw: Raw = {
    food: (food.data ?? []).map((r: any) => ({
      date: r.date, calories: Number(r.calories) || 0, protein: Number(r.protein) || 0,
    })),
    water: (water.data ?? []).map((r: any) => ({ date: r.date, ounces: Number(r.ounces) || 0 })),
    moves: (moves.data ?? []).map((r: any) => ({ date: r.date, minutes: Number(r.minutes) || 0 })),
    feels: (feels.data ?? []).map((r: any) => ({ date: r.date })),
    doses: (doses.data ?? []).map((r: any) => ({ scheduled_date: r.scheduled_date })),
    weights: (weights.data ?? []).map((r: any) => ({ date: r.date })),
  };

  const allDays = new Set<string>([
    ...raw.food.map(r => r.date),
    ...raw.water.map(r => r.date),
    ...raw.moves.map(r => r.date),
    ...raw.feels.map(r => r.date),
    ...raw.weights.map(r => r.date),
  ]);
  const s = streaks(allDays);

  const current = weekFor(raw, from, to, t);
  const previous = weekFor(raw, prevFrom, prevTo, t);
  current.loggingStreak = s.current;
  current.bestStreak = s.best;
  return { current, previous };
}

export function useAdherence(t: AdherenceTargets): AdherenceSummary | null {
  const [data, setData] = useState<{ current: AdherenceWeek; previous: AdherenceWeek } | null>(null);
  const [loading, setLoading] = useState(true);
  const key = `${t.calories}|${t.protein}|${t.water}|${t.movementDays}|${t.doseSlotsPerDay}`;

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    void fetchAdherence(t)
      .then(d => { if (!cancel) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return data ? { ...data, loading } : null;
}
