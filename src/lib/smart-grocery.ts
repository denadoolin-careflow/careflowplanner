/**
 * Smart grocery list auto-populate.
 *
 * Pulls candidate items from three sources and merges them into a single
 * de-duplicated set of new grocery rows:
 *   1. Home Inventory (pantry_items) that are low/out
 *   2. Upcoming meal-plan needs — ingredients on meals_library rows whose
 *      titles appear in `meals` scheduled in the next `mealHorizonDays` days,
 *      excluding ingredients that are currently in_stock in the pantry
 *      (i.e. the meal "reserves" them and we don't re-buy)
 *   3. Recurring household items (pantry_items with a non-"none" restock cadence)
 *
 * Existing un-bought grocery items are skipped (case-insensitive name match).
 */

import { supabase } from "@/integrations/supabase/client";
import { categorizeGroceryItem } from "./grocery-categorize";

export interface SmartGroceryCandidate {
  name: string;
  category: string;
  source: "low_stock" | "meal_plan" | "recurring";
  sourceLabel: string;
  qty?: string | null;
}

export interface SmartGroceryResult {
  inserted: number;
  skipped: number;
  bySource: Record<SmartGroceryCandidate["source"], number>;
  candidates: SmartGroceryCandidate[];
}

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

/** Strip qty markers like "2 cups flour" → "flour". */
function cleanIngredient(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\s*\d+[\d/.\s]*\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|grams?|g|kg|ml|l|cloves?|pieces?|slices?)\b\.?\s*/i, "")
    .replace(/^\s*\d+\s+/, "")
    .replace(/\(.*?\)/g, "")
    .replace(/,.*$/, "")
    .trim();
}

export async function collectSmartCandidates(
  userId: string,
  opts: { mealHorizonDays?: number } = {},
): Promise<SmartGroceryCandidate[]> {
  const horizon = opts.mealHorizonDays ?? 7;
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + horizon * 86400000).toISOString().slice(0, 10);

  const [pantryRes, recurringRes, mealsRes, libRes, existingRes] = await Promise.all([
    supabase.from("pantry_items")
      .select("name,location,stock_status,in_stock")
      .eq("user_id", userId),
    supabase.from("pantry_items")
      .select("name,location,restock_cadence,in_stock")
      .eq("user_id", userId)
      .neq("restock_cadence", "none"),
    supabase.from("meals")
      .select("name,date")
      .eq("user_id", userId)
      .gte("date", today)
      .lte("date", end),
    supabase.from("meals_library")
      .select("title,ingredients")
      .eq("user_id", userId),
    supabase.from("grocery_items")
      .select("name")
      .eq("user_id", userId)
      .eq("bought", false),
  ]);

  const pantry = (pantryRes.data ?? []) as Array<{ name: string; stock_status?: string | null; in_stock?: boolean | null; location?: string | null }>;
  const recurring = (recurringRes.data ?? []) as Array<{ name: string; in_stock?: boolean | null; location?: string | null }>;
  const meals = (mealsRes.data ?? []) as Array<{ name: string; date: string }>;
  const library = (libRes.data ?? []) as Array<{ title: string; ingredients: string[] | null }>;
  const existing = (existingRes.data ?? []) as Array<{ name: string }>;

  const haveOnList = new Set(existing.map(e => norm(e.name)));
  const inStockPantry = new Set(
    pantry.filter(p => p.in_stock === true || p.stock_status === "in").map(p => norm(p.name)),
  );

  const out: SmartGroceryCandidate[] = [];
  const seen = new Set<string>(haveOnList);

  const push = (c: SmartGroceryCandidate) => {
    const key = norm(c.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  // 1. Low/out pantry items
  pantry
    .filter(p => p.stock_status === "low" || p.stock_status === "out" || p.in_stock === false)
    .forEach(p => push({
      name: p.name,
      category: categorizeGroceryItem(p.name),
      source: "low_stock",
      sourceLabel: "Low in pantry",
    }));

  // 2. Upcoming meal ingredients
  const libByTitle = new Map<string, string[]>();
  for (const m of library) libByTitle.set(norm(m.title), (m.ingredients ?? []));
  for (const meal of meals) {
    const ings = libByTitle.get(norm(meal.name));
    if (!ings?.length) continue;
    for (const raw of ings) {
      const cleaned = cleanIngredient(raw);
      if (!cleaned) continue;
      if (inStockPantry.has(norm(cleaned))) continue; // reserved from pantry
      push({
        name: cleaned,
        category: categorizeGroceryItem(cleaned),
        source: "meal_plan",
        sourceLabel: `For ${meal.name}`,
      });
    }
  }

  // 3. Recurring household items (only if not currently in stock)
  recurring
    .filter(p => !(p.in_stock === true))
    .forEach(p => push({
      name: p.name,
      category: categorizeGroceryItem(p.name),
      source: "recurring",
      sourceLabel: "Recurring",
    }));

  return out;
}

export async function applySmartGroceryFill(userId: string): Promise<SmartGroceryResult> {
  const candidates = await collectSmartCandidates(userId);
  const bySource = { low_stock: 0, meal_plan: 0, recurring: 0 } as Record<SmartGroceryCandidate["source"], number>;
  if (!candidates.length) {
    return { inserted: 0, skipped: 0, bySource, candidates: [] };
  }
  const rows = candidates.map(c => {
    bySource[c.source]++;
    return {
      user_id: userId,
      name: c.name,
      category: c.category,
      stock_status: "out",
      bought: false,
      tags: [c.source],
    };
  });
  const { error } = await supabase.from("grocery_items").insert(rows as any);
  if (error) throw error;
  return { inserted: rows.length, skipped: 0, bySource, candidates };
}