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
