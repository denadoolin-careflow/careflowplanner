/**
 * Eating-style plans — Balanced, Keto, Atkins-style, GLP-1 friendly, and more.
 *
 * Targets are suggestions you review and edit. Nothing here diagnoses, changes
 * medication, or promises a result. Talk to your own clinician before making
 * big changes, especially while on a GLP-1 medication.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FoodEntry, Goals } from "./types";

export type PlanStyle =
  | "balanced" | "keto" | "atkins" | "glp1" | "points" | "high_protein" | "custom";

export type PlanPace = "gentle" | "steady";

export interface DietStyle {
  key: PlanStyle;
  label: string;
  blurb: string;
  /** Percentage of calories: protein / carbs / fat. */
  split: { protein: number; carbs: number; fat: number };
  /** Hard carb ceiling in grams, when the style defines one. */
  carbCap?: number;
  leanOn: string[];
  goesAgainst: string[];
  dayShape: { slot: string; idea: string }[];
  movement: string[];
}

export const DIET_STYLES: DietStyle[] = [
  {
    key: "balanced",
    label: "Balanced",
    blurb: "Steady mix of protein, carbs, and fat. Flexible and easy to keep up.",
    split: { protein: 30, carbs: 40, fat: 30 },
    leanOn: ["Lean protein at every meal", "Vegetables and fruit", "Whole grains", "Olive oil, nuts, avocado"],
    goesAgainst: ["Skipping meals then over-hungry evenings", "Drinking most of your calories"],
    dayShape: [
      { slot: "Breakfast", idea: "Protein + fruit — eggs and berries, or Greek yogurt with oats." },
      { slot: "Lunch", idea: "A big salad or grain bowl with a palm of protein." },
      { slot: "Dinner", idea: "Protein, a starch, and a vegetable that fills half the plate." },
      { slot: "Snack", idea: "Something with protein or fiber so it actually holds you." },
    ],
    movement: ["A 20–30 minute walk most days", "Strength work twice a week", "Gentle stretching before bed"],
  },
  {
    key: "keto",
    label: "Keto",
    blurb: "Very low carb, higher fat. Carbs kept tight, protein moderate.",
    split: { protein: 25, carbs: 5, fat: 70 },
    carbCap: 30,
    leanOn: ["Eggs and meat", "Leafy greens", "Cheese and full-fat dairy", "Avocado, olive oil, nuts"],
    goesAgainst: ["Bread, rice, pasta", "Most fruit", "Sweetened drinks", "Starchy vegetables"],
    dayShape: [
      { slot: "Breakfast", idea: "Eggs cooked in butter with spinach, or a full-fat yogurt bowl." },
      { slot: "Lunch", idea: "Salad with chicken or salmon, olive oil dressing, no croutons." },
      { slot: "Dinner", idea: "Steak or fish with roasted low-carb vegetables." },
      { slot: "Snack", idea: "Cheese, olives, or a handful of nuts." },
    ],
    movement: ["Easy walks while adapting", "Strength twice a week", "Extra electrolytes and water"],
  },
  {
    key: "atkins",
    label: "Low-carb / Atkins",
    blurb: "Low carb with more protein than keto, and carbs that widen over time.",
    split: { protein: 35, carbs: 15, fat: 50 },
    carbCap: 60,
    leanOn: ["Meat, fish, eggs", "Non-starchy vegetables", "Berries in small portions", "Cheese and nuts"],
    goesAgainst: ["Sugary snacks", "Large pasta or rice portions", "Fruit juice"],
    dayShape: [
      { slot: "Breakfast", idea: "Eggs with sausage or a protein shake." },
      { slot: "Lunch", idea: "Lettuce-wrapped burger or a chef salad." },
      { slot: "Dinner", idea: "Roast chicken with broccoli and butter." },
      { slot: "Snack", idea: "Beef stick, string cheese, or a few berries." },
    ],
    movement: ["Daily walking", "Two strength sessions", "Mobility on rest days"],
  },
  {
    key: "glp1",
    label: "GLP-1 friendly",
    blurb: "Protein and fluids first, smaller portions, foods that sit easily.",
    split: { protein: 40, carbs: 35, fat: 25 },
    leanOn: ["Protein first at every meal", "Soft, easy-to-digest foods", "Steady fluids and electrolytes", "Fiber added slowly"],
    goesAgainst: ["Very greasy or fried meals", "Large portions in one sitting", "Carbonated drinks when nauseous"],
    dayShape: [
      { slot: "Breakfast", idea: "Greek yogurt or a protein shake — small and early." },
      { slot: "Lunch", idea: "Half a portion of protein with soft vegetables." },
      { slot: "Dinner", idea: "Protein first, then a small starch if you still have room." },
      { slot: "Snack", idea: "Cottage cheese, broth, or fruit if appetite allows." },
    ],
    movement: ["Short walks after meals", "Strength twice weekly to protect muscle", "Rest without guilt on rough days"],
  },
  {
    key: "points",
    label: "Points-style portions",
    blurb: "Weight Watchers style: portion awareness, plenty of zero-fuss foods.",
    split: { protein: 30, carbs: 45, fat: 25 },
    leanOn: ["Lean proteins", "Fruit and vegetables in any amount", "Beans and lentils", "Measured fats"],
    goesAgainst: ["Untracked grazing", "Big restaurant portions", "Liquid sugar"],
    dayShape: [
      { slot: "Breakfast", idea: "Egg whites with fruit, or oats measured out." },
      { slot: "Lunch", idea: "Soup or salad loaded with free vegetables plus protein." },
      { slot: "Dinner", idea: "Protein, plenty of vegetables, a measured starch." },
      { slot: "Snack", idea: "Fruit or yogurt — the ones that don't cost you much." },
    ],
    movement: ["Aim for a daily step target", "Two activity sessions you enjoy", "Track movement like you track food"],
  },
  {
    key: "high_protein",
    label: "High protein",
    blurb: "Protein-led, useful when you want to hold on to muscle.",
    split: { protein: 40, carbs: 35, fat: 25 },
    leanOn: ["Chicken, fish, lean beef", "Greek yogurt and cottage cheese", "Eggs and egg whites", "Protein shakes"],
    goesAgainst: ["Carb-only meals", "Skipping protein at breakfast"],
    dayShape: [
      { slot: "Breakfast", idea: "30g of protein before anything else." },
      { slot: "Lunch", idea: "Protein bowl with rice and vegetables." },
      { slot: "Dinner", idea: "Large protein portion with a vegetable side." },
      { slot: "Snack", idea: "Shake, cottage cheese, or a protein bar." },
    ],
    movement: ["Strength three times a week", "Walking on off days", "Protein within a few hours of lifting"],
  },
  {
    key: "custom",
    label: "Custom",
    blurb: "Set every number yourself. Nothing suggested, nothing assumed.",
    split: { protein: 30, carbs: 40, fat: 30 },
    leanOn: [],
    goesAgainst: [],
    dayShape: [],
    movement: [],
  },
];

export const styleByKey = (k: string) => DIET_STYLES.find(s => s.key === k) ?? DIET_STYLES[0];

/* -------------------------------------------------------------- targets */

export interface PlanTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water_oz: number;
}

/**
 * Suggested daily targets. A rough maintenance estimate from body weight, then
 * a gentle or steady deficit. Always shown for review before it's applied.
 */
export function suggestTargets(
  style: PlanStyle, pace: PlanPace, currentWeightLb: number | null, goalWeightLb: number | null,
): PlanTargets {
  const s = styleByKey(style);
  const weight = currentWeightLb && currentWeightLb > 60 ? currentWeightLb : 170;
  const maintenance = Math.round(weight * 13);
  const losing = goalWeightLb == null || goalWeightLb < weight;
  const deficit = losing ? (pace === "gentle" ? 300 : 550) : 0;
  const calories = Math.max(1200, Math.round((maintenance - deficit) / 10) * 10);

  const protein = Math.round((calories * s.split.protein) / 100 / 4);
  let carbs = Math.round((calories * s.split.carbs) / 100 / 4);
  if (s.carbCap != null) carbs = Math.min(carbs, s.carbCap);
  const fat = Math.round((calories * s.split.fat) / 100 / 9);
  const fiber = s.carbCap != null ? 20 : Math.max(22, Math.round(calories / 1000 * 14));
  const water_oz = Math.max(64, Math.round(weight * 0.5 / 8) * 8);

  return { calories, protein, carbs, fat, fiber, water_oz };
}

/* ----------------------------------------------------------- stored plan */

export interface WellflowPlan {
  id: string;
  style: PlanStyle;
  pace: PlanPace;
  active: boolean;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  target_fiber: number | null;
  target_water_oz: number | null;
  movement_days: number;
  notes: string | null;
  started_on: string;
}

const map = (r: any): WellflowPlan => ({
  id: r.id,
  style: (r.style ?? "balanced") as PlanStyle,
  pace: (r.pace ?? "steady") as PlanPace,
  active: !!r.active,
  target_calories: r.target_calories ?? null,
  target_protein: r.target_protein ?? null,
  target_carbs: r.target_carbs ?? null,
  target_fat: r.target_fat ?? null,
  target_fiber: r.target_fiber ?? null,
  target_water_oz: r.target_water_oz ?? null,
  movement_days: Number(r.movement_days) || 3,
  notes: r.notes ?? null,
  started_on: r.started_on,
});

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());

export function useWellflowPlan() {
  const [plan, setPlan] = useState<WellflowPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("wellflow_plans")
      .select("*").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setPlan(data ? map(data) : null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const cb = () => void load();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, [load]);

  return { plan, loading, reload: load };
}

export async function savePlan(input: {
  id?: string;
  style: PlanStyle;
  pace: PlanPace;
  targets: PlanTargets;
  movement_days: number;
  /** Optional accepted movement idea: activity, minutes, weekday indexes. */
  movement_prefs?: { activity: string; minutes: number; days: number[] } | null;
  notes?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in");

  const row = {
    user_id: user.id,
    style: input.style,
    pace: input.pace,
    active: true,
    target_calories: input.targets.calories,
    target_protein: input.targets.protein,
    target_carbs: input.targets.carbs,
    target_fat: input.targets.fat,
    target_fiber: input.targets.fiber,
    target_water_oz: input.targets.water_oz,
    movement_days: input.movement_days,
    movement_prefs: input.movement_prefs ?? null,
    notes: input.notes ?? null,
  };

  if (input.id) {
    const { error } = await supabase.from("wellflow_plans").update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    await supabase.from("wellflow_plans").update({ active: false }).eq("user_id", user.id).eq("active", true);
    const { error } = await supabase.from("wellflow_plans").insert(row);
    if (error) throw error;
  }
  emit();
}

export async function endPlan(id: string) {
  await supabase.from("wellflow_plans").update({ active: false }).eq("id", id);
  emit();
}

/** Apply plan targets to the nutrition goals used by the rings and bars. */
export function targetsAsGoals(t: PlanTargets): Partial<Goals> {
  return {
    calories: t.calories, protein: t.protein, carbs: t.carbs,
    fat: t.fat, fiber: t.fiber, water_oz: t.water_oz,
  };
}

/* ----------------------------------------------------------- adherence */

export interface Adherence {
  days: number;
  loggedDays: number;
  onTargetDays: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
}

/** How the last `days` days compare to the plan. Descriptive only. */
export function computeAdherence(
  entries: Pick<FoodEntry, "date" | "calories" | "protein" | "carbs">[],
  targets: { calories: number | null; protein: number | null },
  days: number,
): Adherence {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const recent = entries.filter(e => e.date >= cutoff);
  const byDay = new Map<string, { cal: number; pro: number; carb: number }>();
  for (const e of recent) {
    const d = byDay.get(e.date) ?? { cal: 0, pro: 0, carb: 0 };
    d.cal += e.calories; d.pro += e.protein; d.carb += e.carbs;
    byDay.set(e.date, d);
  }
  const list = Array.from(byDay.values());
  const n = Math.max(list.length, 1);
  const onTarget = list.filter(d =>
    (targets.calories == null || d.cal <= targets.calories * 1.05) &&
    (targets.protein == null || d.pro >= targets.protein * 0.9)
  ).length;

  return {
    days,
    loggedDays: list.length,
    onTargetDays: onTarget,
    avgCalories: Math.round(list.reduce((s, d) => s + d.cal, 0) / n),
    avgProtein: Math.round(list.reduce((s, d) => s + d.pro, 0) / n),
    avgCarbs: Math.round(list.reduce((s, d) => s + d.carb, 0) / n),
  };
}
