import { supabase } from "@/integrations/supabase/client";

export interface MealPreferences {
  family_size: number;
  diets: string[];
  allergies: string[];
  dislikes: string[];
  cuisines: string[];
  budget_level: "low" | "medium" | "high";
  max_prep_minutes: number;
  low_energy: boolean;
  picky_notes: string | null;
}

export const DEFAULT_PREFS: MealPreferences = {
  family_size: 2,
  diets: [],
  allergies: [],
  dislikes: [],
  cuisines: [],
  budget_level: "medium",
  max_prep_minutes: 30,
  low_energy: false,
  picky_notes: null,
};

export async function loadPrefs(userId: string): Promise<MealPreferences> {
  const { data } = await supabase.from("meal_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return DEFAULT_PREFS;
  return {
    family_size: data.family_size ?? 2,
    diets: data.diets ?? [],
    allergies: data.allergies ?? [],
    dislikes: data.dislikes ?? [],
    cuisines: data.cuisines ?? [],
    budget_level: (data.budget_level as MealPreferences["budget_level"]) ?? "medium",
    max_prep_minutes: data.max_prep_minutes ?? 30,
    low_energy: !!data.low_energy,
    picky_notes: data.picky_notes ?? null,
  };
}

export async function savePrefs(userId: string, prefs: MealPreferences) {
  await supabase.from("meal_preferences").upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });
}

export async function planWeek(startDate: string) {
  const { data, error } = await supabase.functions.invoke("ai-meal-plan", {
    body: { action: "plan_week", start_date: startDate, replace: true },
  });
  if (error) throw error;
  return data as { ok: boolean; meals: number; grocery: number };
}

export async function regenerateMeal(date: string, slot: string, avoid?: string) {
  const { data, error } = await supabase.functions.invoke("ai-meal-plan", {
    body: { action: "regenerate_meal", date, slot, avoid },
  });
  if (error) throw error;
  return data;
}

export interface PantryItem { id: string; name: string; category: string | null; in_stock: boolean; }

export async function listPantry(userId: string): Promise<PantryItem[]> {
  const { data } = await supabase.from("pantry_items").select("*").eq("user_id", userId).order("name");
  return (data ?? []) as PantryItem[];
}

export async function addPantry(userId: string, name: string, category?: string) {
  const { data } = await supabase.from("pantry_items").insert({ user_id: userId, name, category: category ?? null }).select().single();
  return data as PantryItem;
}

export async function togglePantry(id: string, in_stock: boolean) {
  await supabase.from("pantry_items").update({ in_stock }).eq("id", id);
}

export async function removePantry(id: string) {
  await supabase.from("pantry_items").delete().eq("id", id);
}

export interface FavoriteMeal {
  id: string;
  name: string;
  slot: string | null;
  prep_minutes: number | null;
  ingredients: string[];
  steps: string[];
  tags: string[];
  notes: string | null;
}

export async function listFavorites(userId: string): Promise<FavoriteMeal[]> {
  const { data } = await supabase.from("favorite_meals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, slot: r.slot, prep_minutes: r.prep_minutes,
    ingredients: r.ingredients ?? [], steps: r.steps ?? [], tags: r.tags ?? [], notes: r.notes,
  }));
}

export async function saveFavorite(userId: string, meal: Omit<FavoriteMeal, "id">) {
  const { data } = await supabase.from("favorite_meals").insert({ user_id: userId, ...meal }).select().single();
  return data as any;
}

export async function removeFavorite(id: string) {
  await supabase.from("favorite_meals").delete().eq("id", id);
}