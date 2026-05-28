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

export async function updatePantryCategory(id: string, category: string | null) {
  await supabase.from("pantry_items").update({ category }).eq("id", id);
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

export async function updateFavorite(id: string, patch: Partial<Omit<FavoriteMeal, "id">>) {
  const { data } = await supabase.from("favorite_meals").update(patch).eq("id", id).select().single();
  return data as any;
}

function guessCategory(item: string): string {
  const s = item.toLowerCase();
  if (/(chicken|beef|pork|turkey|fish|salmon|tuna|shrimp|tofu|egg|bacon|sausage)/.test(s)) return "Protein";
  if (/(milk|cheese|yogurt|butter|cream)/.test(s)) return "Dairy";
  if (/(bread|bun|tortilla|bagel|roll)/.test(s)) return "Bakery";
  if (/(frozen|ice cream)/.test(s)) return "Frozen";
  if (/(rice|pasta|flour|sugar|oil|sauce|bean|lentil|spice|salt|pepper|broth|stock|vinegar)/.test(s)) return "Pantry";
  if (/(apple|banana|berry|berries|tomato|onion|garlic|pepper|lettuce|spinach|carrot|potato|broccoli|cucumber|lemon|lime|avocado|herb|cilantro|parsley|basil)/.test(s)) return "Produce";
  return "Other";
}

/** Insert a meal row from a favorite recipe (carrying ingredients/steps/tags/prep). */
export async function applyFavoriteToSlot(
  userId: string,
  fav: FavoriteMeal,
  date: string,
  slot: string,
  opts: { addGroceries?: boolean; replace?: boolean } = {}
) {
  if (opts.replace) {
    await supabase.from("meals").delete().eq("user_id", userId).eq("date", date).eq("slot", slot);
  }
  const { data: insertedMeal } = await supabase.from("meals").insert({
    user_id: userId, name: fav.name, date, slot,
    prep_minutes: fav.prep_minutes, ingredients: fav.ingredients,
    steps: fav.steps, tags: fav.tags, notes: fav.notes,
  }).select().single();
  if (opts.addGroceries && fav.ingredients?.length) {
    // Skip pantry items
    const pantry = await supabase.from("pantry_items").select("name").eq("user_id", userId).eq("in_stock", true);
    const stocked = new Set((pantry.data ?? []).map((p: any) => String(p.name).toLowerCase().trim()));
    const rows = fav.ingredients
      .map(i => String(i).trim())
      .filter(i => i && !stocked.has(i.toLowerCase()))
      .map(name => ({
        user_id: userId, name: name.slice(0, 120), category: guessCategory(name),
        source_meal_id: insertedMeal?.id ?? null,
        source_meal_name: fav.name,
        source_slot: slot,
        source_date: date,
      }));
    if (rows.length) await supabase.from("grocery_items").insert(rows);
  }
}

/** Fill the 7-day plan starting at startISO with random favorites matching each slot. */
export async function fillWeekFromFavorites(
  userId: string,
  startISO: string,
  opts: { replace?: boolean; addGroceries?: boolean; onlyEmpty?: boolean } = {}
): Promise<{ filled: number; skipped: number }> {
  const favs = await listFavorites(userId);
  if (!favs.length) return { filled: 0, skipped: 0 };

  const slots = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
  const start = new Date(startISO + "T00:00:00");
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  let existing: Set<string> = new Set();
  if (opts.onlyEmpty) {
    const { data } = await supabase.from("meals").select("date,slot")
      .eq("user_id", userId).in("date", dates);
    existing = new Set((data ?? []).map((m: any) => `${m.date}|${m.slot}`));
  } else if (opts.replace) {
    await supabase.from("meals").delete().eq("user_id", userId).in("date", dates);
  }

  const pickFor = (slot: string) => {
    const pool = favs.filter(f => !f.slot || f.slot === slot);
    const arr = pool.length ? pool : favs;
    return arr[Math.floor(Math.random() * arr.length)];
  };

  let filled = 0, skipped = 0;
  for (const date of dates) {
    for (const slot of slots) {
      if (opts.onlyEmpty && existing.has(`${date}|${slot}`)) { skipped++; continue; }
      const fav = pickFor(slot);
      await applyFavoriteToSlot(userId, fav, date, slot, { addGroceries: opts.addGroceries });
      filled++;
    }
  }
  return { filled, skipped };
}