import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GroceryCategory {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  is_default: boolean;
  collapsed: boolean;
}

export const DEFAULT_CATEGORIES = [
  "Produce", "Dairy", "Frozen", "Pantry", "Meat", "Snacks", "Household",
];

export function useGroceryCategories() {
  const [cats, setCats] = useState<GroceryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    let { data } = await supabase
      .from("grocery_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!data || data.length === 0) {
      const seed = DEFAULT_CATEGORIES.map((name, i) => ({
        user_id: uid, name, sort_order: i, is_default: true,
      }));
      await supabase.from("grocery_categories").insert(seed);
      const r = await supabase.from("grocery_categories").select("*").order("sort_order");
      data = r.data;
    }
    setCats((data ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (name: string, color?: string) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const sort_order = (cats[cats.length - 1]?.sort_order ?? 0) + 1;
    const { data } = await supabase
      .from("grocery_categories")
      .insert({ user_id: uid, name, color: color ?? null, sort_order })
      .select().single();
    if (data) setCats(prev => [...prev, data as any]);
  };
  const update = async (id: string, patch: Partial<GroceryCategory>) => {
    setCats(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    await supabase.from("grocery_categories").update(patch as any).eq("id", id);
  };
  const remove = async (id: string) => {
    setCats(prev => prev.filter(c => c.id !== id));
    await supabase.from("grocery_categories").delete().eq("id", id);
  };

  return { cats, loading, refresh, create, update, remove };
}
