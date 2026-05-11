import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LibraryMeal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slot: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  ingredients: string[];
  steps: string[];
  tags: string[];
  notes: string | null;
  image_url: string | null;
  icon: string | null;
  color: string | null;
  energy_level: "low" | "medium" | "high";
  family_rating: number | null;
  is_favorite: boolean;
  is_archived: boolean;
  sort_order: number;
}

function row(r: any): LibraryMeal {
  return { ...r, ingredients: r.ingredients ?? [], steps: r.steps ?? [], tags: r.tags ?? [] };
}

export function useMealsLibrary() {
  const [items, setItems] = useState<LibraryMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("meals_library")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data ?? []).map(row));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (m: Partial<LibraryMeal> & { title: string }) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return null;
    const payload: any = {
      user_id: uid,
      title: m.title,
      description: m.description ?? null,
      slot: m.slot ?? null,
      prep_minutes: m.prep_minutes ?? null,
      cook_minutes: m.cook_minutes ?? null,
      servings: m.servings ?? null,
      ingredients: m.ingredients ?? [],
      steps: m.steps ?? [],
      tags: m.tags ?? [],
      notes: m.notes ?? null,
      icon: m.icon ?? null,
      color: m.color ?? null,
      energy_level: m.energy_level ?? "medium",
      family_rating: m.family_rating ?? null,
      is_favorite: m.is_favorite ?? false,
      is_archived: false,
    };
    const { data } = await supabase.from("meals_library").insert(payload).select().single();
    if (data) setItems(prev => [row(data), ...prev]);
    return data ? row(data) : null;
  };

  const update = async (id: string, patch: Partial<LibraryMeal>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
    await supabase.from("meals_library").update(patch as any).eq("id", id);
  };

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from("meals_library").delete().eq("id", id);
  };

  const duplicate = async (id: string) => {
    const src = items.find(i => i.id === id);
    if (!src) return;
    return create({ ...src, title: `${src.title} (copy)`, is_favorite: false });
  };

  return { items, loading, refresh, create, update, remove, duplicate };
}

/** Insert one or more library meals into the meals plan. Optionally generate grocery rows. */
export async function addLibraryMealsToWeek(
  meals: LibraryMeal[],
  targets: { date: string; slot: "Breakfast" | "Lunch" | "Dinner" | "Snack" }[],
  opts: { mode: "fill_empty" | "replace"; addGroceries: boolean },
): Promise<{ inserted: number; grocery: number }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid || meals.length === 0 || targets.length === 0) return { inserted: 0, grocery: 0 };

  const dates = Array.from(new Set(targets.map(t => t.date)));
  const { data: existing } = await supabase
    .from("meals").select("id,date,slot")
    .eq("user_id", uid).in("date", dates);
  const occupied = new Map<string, string>(); // `${date}|${slot}` -> existing id
  (existing ?? []).forEach((e: any) => occupied.set(`${e.date}|${e.slot}`, e.id));

  // Pair each target with a meal (cycle through meals).
  const rows: any[] = [];
  const replaceIds: string[] = [];
  targets.forEach((t, i) => {
    const key = `${t.date}|${t.slot}`;
    const exists = occupied.get(key);
    if (exists) {
      if (opts.mode === "fill_empty") return;
      replaceIds.push(exists);
    }
    const m = meals[i % meals.length];
    rows.push({
      user_id: uid,
      date: t.date, slot: t.slot,
      name: m.title,
      prep_minutes: m.prep_minutes ?? null,
      ingredients: m.ingredients ?? [],
      steps: m.steps ?? [],
      tags: m.tags ?? [],
    });
  });

  if (replaceIds.length) {
    await supabase.from("grocery_items").delete().in("source_meal_id", replaceIds);
    await supabase.from("meals").delete().in("id", replaceIds);
  }
  if (rows.length === 0) return { inserted: 0, grocery: 0 };
  const { data: inserted } = await supabase.from("meals").insert(rows).select();

  let groceryCount = 0;
  if (opts.addGroceries && inserted?.length) {
    const { data: pantry } = await supabase
      .from("pantry_items").select("name").eq("user_id", uid).eq("in_stock", true);
    const stocked = new Set((pantry ?? []).map((p: any) => String(p.name).toLowerCase().trim()));
    const { data: existingG } = await supabase
      .from("grocery_items").select("name").eq("user_id", uid).eq("bought", false);
    const have = new Set((existingG ?? []).map((g: any) => String(g.name).toLowerCase().trim()));
    const gRows: any[] = [];
    for (const meal of inserted) {
      for (const ingRaw of (meal.ingredients ?? []) as string[]) {
        const ing = String(ingRaw).trim();
        if (!ing) continue;
        const key = ing.toLowerCase();
        if (stocked.has(key) || have.has(key)) continue;
        have.add(key);
        gRows.push({
          user_id: uid, name: ing.slice(0, 120), category: null, bought: false,
          source_meal_id: meal.id, source_meal_name: meal.name,
          source_slot: meal.slot, source_date: meal.date,
        });
      }
    }
    if (gRows.length) {
      await supabase.from("grocery_items").insert(gRows);
      groceryCount = gRows.length;
    }
  }
  return { inserted: rows.length, grocery: groceryCount };
}
