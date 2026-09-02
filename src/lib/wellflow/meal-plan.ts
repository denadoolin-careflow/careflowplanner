/**
 * Bridge between WellFlow and the meal planner / grocery list.
 * Reads planned meals, logs one as a food entry, suggests meals that fit
 * what's left in the day, and pushes ingredients to the grocery list.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FoodCandidate } from "./types";
import { logFood, parseFoodText, rememberFood } from "./data";
import type { MealType } from "./types";

export type PlanSlot = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface PlannedMeal {
  id: string;
  date: string;
  slot: PlanSlot;
  name: string;
  ingredients: string[];
}

export const slotToMealType = (slot: string): MealType => {
  const s = slot.toLowerCase();
  return (["breakfast", "lunch", "dinner", "snack"].includes(s) ? s : "other") as MealType;
};

/** Meals planned for a given date in the meal planner. */
export function usePlannedMeals(date: string) {
  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("meals").select("id,date,slot,name,ingredients").eq("date", date);
    setMeals((data ?? []).map((r: any) => ({
      id: r.id, date: r.date, slot: r.slot as PlanSlot, name: r.name,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
    })));
    setLoading(false);
  }, [date]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  return { meals, loading, reload: load };
}

/**
 * Nutrition for a planned meal: use the saved food of the same name when we
 * have one, otherwise ask for an estimate the user can review before saving.
 */
export async function candidateForMeal(name: string): Promise<FoodCandidate> {
  const { data } = await supabase.from("custom_foods").select("*").ilike("name", name).limit(1).maybeSingle();
  if (data) {
    return {
      id: data.id, name: data.name, brand: data.brand ?? null,
      servingSize: data.serving_size ?? null,
      calories: Number(data.calories) || 0, protein: Number(data.protein) || 0,
      carbs: Number(data.carbs) || 0, fat: Number(data.fat) || 0, fiber: Number(data.fiber) || 0,
      source: "saved", savedId: data.id,
    };
  }
  const items = await parseFoodText(name).catch(() => []);
  if (items.length) return { ...items[0], name };
  return {
    id: `plan-${name}`, name, servingSize: "1 serving",
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, source: "plan",
  };
}

/** Log a planned meal straight into the day. */
export async function logPlannedMeal(meal: PlannedMeal, date: string) {
  const candidate = await candidateForMeal(meal.name);
  await logFood({ date, candidate, servings: 1, mealType: slotToMealType(meal.slot) });
  await rememberFood(candidate);
}

/* ---------------------------------------------------------- suggestions */

export interface MealSuggestion {
  id: string;
  title: string;
  reason: string;
  calories: number;
  protein: number;
  ingredients: string[];
  prepMinutes: number | null;
}

/** Library meals that fit what's left in today's calories/protein. */
export async function suggestMeals(remaining: { calories: number | null; protein: number | null }) {
  const [{ data: lib }, { data: saved }] = await Promise.all([
    supabase.from("meals_library").select("id,title,ingredients,prep_minutes,tags").limit(60),
    supabase.from("custom_foods").select("name,calories,protein").limit(200),
  ]);
  const macros = new Map<string, { calories: number; protein: number }>();
  (saved ?? []).forEach((s: any) =>
    macros.set(String(s.name).toLowerCase(), { calories: Number(s.calories) || 0, protein: Number(s.protein) || 0 }));

  const rows: MealSuggestion[] = (lib ?? []).map((m: any) => {
    const known = macros.get(String(m.title).toLowerCase());
    return {
      id: m.id,
      title: m.title,
      calories: known?.calories ?? 0,
      protein: known?.protein ?? 0,
      ingredients: Array.isArray(m.ingredients) ? m.ingredients.map(String) : [],
      prepMinutes: m.prep_minutes ?? null,
      reason: "",
    };
  });

  const scored = rows.map(r => {
    let reason = "From your meal library";
    let score = 0;
    if (remaining.protein != null && remaining.protein > 0 && r.protein > 0) {
      const gap = Math.abs(r.protein - remaining.protein);
      score += Math.max(0, 40 - gap);
      reason = `About ${Math.round(remaining.protein)}g protein left today`;
    }
    if (remaining.calories != null && remaining.calories > 0 && r.calories > 0) {
      const gap = Math.abs(r.calories - remaining.calories);
      score += Math.max(0, 400 - gap) / 10;
      reason = `Fits the ~${Math.round(remaining.calories)} calories you have left`;
    }
    if (r.prepMinutes != null && r.prepMinutes <= 20) score += 5;
    return { ...r, reason, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

/** Add a planned or suggested meal into the meal planner. */
export async function addMealToPlan(title: string, date: string, slot: PlanSlot, ingredients: string[] = []) {
  const { data: u } = await supabase.auth.getUser();
  const user_id = u.user?.id;
  if (!user_id) throw new Error("Please sign in");
  const { error } = await supabase.from("meals").insert({
    user_id, date, slot, name: title, ingredients,
  });
  if (error) throw error;
}

/**
 * Push ingredients onto the grocery list, skipping anything already stocked
 * in the pantry or already on the list — the same rules the meal planner uses.
 */
export async function addIngredientsToGroceries(
  ingredients: string[],
  meal?: { name: string; slot?: string; date?: string },
): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  const user_id = u.user?.id;
  if (!user_id || ingredients.length === 0) return 0;

  const [{ data: pantry }, { data: existing }] = await Promise.all([
    supabase.from("pantry_items").select("name").eq("user_id", user_id).eq("in_stock", true),
    supabase.from("grocery_items").select("name").eq("user_id", user_id).eq("bought", false),
  ]);
  const skip = new Set([
    ...(pantry ?? []).map((p: any) => String(p.name).toLowerCase().trim()),
    ...(existing ?? []).map((g: any) => String(g.name).toLowerCase().trim()),
  ]);

  const rows: any[] = [];
  for (const raw of ingredients) {
    const name = String(raw).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (skip.has(key)) continue;
    skip.add(key);
    rows.push({
      user_id, name: name.slice(0, 120), bought: false,
      source_meal_name: meal?.name ?? null,
      source_slot: meal?.slot ?? null,
      source_date: meal?.date ?? null,
    });
  }
  if (!rows.length) return 0;
  const { error } = await supabase.from("grocery_items").insert(rows);
  if (error) throw error;
  return rows.length;
}
