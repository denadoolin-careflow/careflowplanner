import { supabase } from "@/integrations/supabase/client";
import type { Location } from "./inventory-seed";

export interface RestockRow {
  id: string;
  name: string;
  location: Location;
  stock_status: string;
  restock_cadence: "weekly" | "biweekly" | "none";
  last_restocked_at: string | null;
}

/** All items marked for repeat restock that aren't currently in stock. */
export async function listRestockItems(userId: string): Promise<RestockRow[]> {
  const { data } = await supabase.from("pantry_items")
    .select("id,name,location,stock_status,restock_cadence,last_restocked_at,in_stock")
    .eq("user_id", userId)
    .neq("restock_cadence", "none")
    .order("location", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as any;
}

/** Restock rows that are Low/Out (or status need_soon) — ready to add to grocery list. */
export function dueForRestock(rows: RestockRow[]): RestockRow[] {
  return rows.filter(r => r.stock_status === "out" || r.stock_status === "low" || r.stock_status === "need_soon");
}

/** Add the given restock rows to grocery_items (dedupe by case-insensitive name). */
export async function addRestockToGrocery(userId: string, rows: RestockRow[]) {
  if (!rows.length) return { inserted: 0, skipped: 0 };
  const { data: existing } = await supabase.from("grocery_items")
    .select("name").eq("user_id", userId).eq("bought", false);
  const have = new Set((existing ?? []).map((r: any) => String(r.name).toLowerCase().trim()));
  const toInsert = rows
    .filter(r => !have.has(r.name.toLowerCase().trim()))
    .map(r => ({
      user_id: userId,
      name: r.name,
      category: r.location === "Freezer" ? "Frozen"
              : r.location === "Fridge"  ? "Dairy"
              : r.location === "Cabinets" ? "Pantry"
              : "Pantry",
      stock_status: "out",
      bought: false,
      tags: ["restock"],
    }));
  if (toInsert.length) {
    const { error } = await supabase.from("grocery_items").insert(toInsert as any);
    if (error) throw error;
    const now = new Date().toISOString();
    await supabase.from("pantry_items")
      .update({ last_restocked_at: now } as any)
      .in("id", toInsert.length === rows.length ? rows.map(r => r.id) : rows.filter(r => !have.has(r.name.toLowerCase().trim())).map(r => r.id));
  }
  return { inserted: toInsert.length, skipped: rows.length - toInsert.length };
}

export async function setRestockCadence(id: string, cadence: "weekly" | "biweekly" | "none") {
  await supabase.from("pantry_items").update({ restock_cadence: cadence } as any).eq("id", id);
}

export async function runWeeklyRestock(userId: string) {
  const all = await listRestockItems(userId);
  const due = dueForRestock(all);
  return addRestockToGrocery(userId, due);
}