import { supabase } from "@/integrations/supabase/client";
import type { GroceryItem } from "@/lib/types";

export interface SavedGroceryList {
  id: string;
  name: string;
  week_start: string | null;
  items: Array<Pick<GroceryItem, "name" | "qty" | "category" | "bought" | "stockStatus">>;
  created_at: string;
  updated_at: string;
}

export async function listSavedLists(userId: string): Promise<SavedGroceryList[]> {
  const { data } = await supabase.from("grocery_lists" as any)
    .select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as any;
}

export async function saveCurrentList(
  userId: string,
  name: string,
  items: GroceryItem[],
  weekStart?: string
): Promise<SavedGroceryList> {
  const snapshot = items.map(i => ({
    name: i.name, qty: i.qty ?? null, category: i.category ?? null,
    bought: i.bought, stockStatus: i.stockStatus,
  }));
  const { data, error } = await supabase.from("grocery_lists" as any)
    .insert({ user_id: userId, name, week_start: weekStart ?? null, items: snapshot })
    .select().single();
  if (error) throw error;
  return data as any;
}

export async function updateSavedList(id: string, patch: { name?: string; items?: SavedGroceryList["items"] }) {
  const { error } = await supabase.from("grocery_lists" as any).update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSavedList(id: string) {
  await supabase.from("grocery_lists" as any).delete().eq("id", id);
}

/** Replace current grocery_items with items from a saved list. */
export async function loadSavedListIntoCurrent(userId: string, list: SavedGroceryList, mode: "replace" | "merge" = "replace") {
  if (mode === "replace") {
    await supabase.from("grocery_items").delete().eq("user_id", userId);
  }
  const rows = list.items.map(i => ({
    user_id: userId,
    name: i.name,
    qty: i.qty ?? null,
    category: i.category ?? null,
    bought: !!i.bought,
    stock_status: i.stockStatus ?? "out",
  }));
  if (rows.length) await supabase.from("grocery_items").insert(rows);
}
