import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addLibraryMealsToWeek, type LibraryMeal } from "@/lib/meals-library";
import { addDays, format, startOfWeek } from "date-fns";

export interface MealTheme {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  weekday: number | null; // 0=Sun … 6=Sat
  default_slot: string | null;
  meal_ids: string[];
  notes: string | null;
  sort_order: number;
}

function row(r: any): MealTheme {
  return { ...r, meal_ids: r.meal_ids ?? [] };
}

export function useMealThemes() {
  const [items, setItems] = useState<MealTheme[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("meal_themes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data ?? []).map(row));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (t: Partial<MealTheme> & { name: string }) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return null;
    const payload: any = {
      user_id: uid,
      name: t.name,
      emoji: t.emoji ?? null,
      color: t.color ?? null,
      weekday: t.weekday ?? null,
      default_slot: t.default_slot ?? null,
      meal_ids: t.meal_ids ?? [],
      notes: t.notes ?? null,
    };
    const { data } = await supabase.from("meal_themes").insert(payload).select().single();
    if (data) setItems(prev => [row(data), ...prev]);
    return data ? row(data) : null;
  };

  const update = async (id: string, patch: Partial<MealTheme>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
    await supabase.from("meal_themes").update(patch as any).eq("id", id);
  };

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from("meal_themes").delete().eq("id", id);
  };

  return { items, loading, refresh, create, update, remove };
}

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
type Slot = typeof SLOTS[number];

/** Pick a recipe at random from the theme pool, insert into the given date+slot. */
export async function applyThemeToDate(
  theme: MealTheme,
  date: string,
  slot: Slot | undefined,
  opts: { mode: "fill_empty" | "replace"; addGroceries: boolean },
): Promise<{ inserted: number; grocery: number; meal?: LibraryMeal }> {
  if (!theme.meal_ids.length) return { inserted: 0, grocery: 0 };
  const { data: pool } = await supabase
    .from("meals_library").select("*").in("id", theme.meal_ids);
  const list = (pool ?? []) as unknown as LibraryMeal[];
  if (!list.length) return { inserted: 0, grocery: 0 };
  const pick = list[Math.floor(Math.random() * list.length)];
  const targetSlot: Slot = (slot ?? (theme.default_slot as Slot) ?? (pick.slot as Slot) ?? "Dinner");
  const res = await addLibraryMealsToWeek([pick], [{ date, slot: targetSlot }], opts);
  return { ...res, meal: pick };
}

/** Apply theme to its preferred weekday in the given week (defaults to current week). */
export async function applyThemeToWeek(
  theme: MealTheme,
  weekStartDate: Date | undefined,
  opts: { mode: "fill_empty" | "replace"; addGroceries: boolean },
): Promise<{ inserted: number; grocery: number; date?: string }> {
  if (theme.weekday == null) return { inserted: 0, grocery: 0 };
  const start = startOfWeek(weekStartDate ?? new Date(), { weekStartsOn: 0 });
  const target = addDays(start, theme.weekday);
  const date = format(target, "yyyy-MM-dd");
  const r = await applyThemeToDate(theme, date, undefined, opts);
  return { inserted: r.inserted, grocery: r.grocery, date };
}