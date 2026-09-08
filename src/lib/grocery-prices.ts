/**
 * Grocery price estimates.
 *
 * Two layers:
 *  1. A built-in table of typical US grocery prices, adjusted per store.
 *  2. Prices the user has typed in themselves (stored per item + store) — these win.
 *
 * Nothing here calls a retailer API; estimates are clearly labelled as estimates.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Retailer } from "@/lib/retailer-links";

/* ------------------------------------------------------------------ names */

/** Normalise an item name into a stable lookup key. */
export function itemKey(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const singular = (w: string) =>
  w.endsWith("ies") ? w.slice(0, -3) + "y"
  : w.endsWith("oes") ? w.slice(0, -2)
  : w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1)
  : w;

const words = (s: string) => itemKey(s).split(" ").map(singular).filter(Boolean);

/* --------------------------------------------------------------- catalog */

interface PriceRow {
  /** Canonical name plus alternates used for matching. */
  keys: string[];
  /** Typical national price in US dollars for the stated unit. */
  usd: number;
  unit: string;
  category: string;
}

const CATALOG: PriceRow[] = [
  // Produce
  { keys: ["banana", "bananas"], usd: 1.6, unit: "bunch", category: "Produce" },
  { keys: ["apple", "apples"], usd: 4.2, unit: "3 lb bag", category: "Produce" },
  { keys: ["orange", "oranges"], usd: 4.5, unit: "3 lb bag", category: "Produce" },
  { keys: ["grapes"], usd: 4.8, unit: "lb", category: "Produce" },
  { keys: ["strawberry", "strawberries"], usd: 4.0, unit: "1 lb", category: "Produce" },
  { keys: ["blueberry", "blueberries"], usd: 4.3, unit: "pint", category: "Produce" },
  { keys: ["avocado", "avocados"], usd: 1.4, unit: "each", category: "Produce" },
  { keys: ["lemon", "lemons"], usd: 0.8, unit: "each", category: "Produce" },
  { keys: ["lime", "limes"], usd: 0.6, unit: "each", category: "Produce" },
  { keys: ["tomato", "tomatoes"], usd: 2.6, unit: "lb", category: "Produce" },
  { keys: ["cherry tomatoes", "grape tomatoes"], usd: 3.5, unit: "pint", category: "Produce" },
  { keys: ["onion", "onions", "yellow onion"], usd: 3.0, unit: "3 lb bag", category: "Produce" },
  { keys: ["garlic"], usd: 1.0, unit: "head", category: "Produce" },
  { keys: ["potato", "potatoes", "russet potatoes"], usd: 4.5, unit: "5 lb bag", category: "Produce" },
  { keys: ["sweet potato", "sweet potatoes"], usd: 1.4, unit: "lb", category: "Produce" },
  { keys: ["carrot", "carrots", "baby carrots"], usd: 2.0, unit: "1 lb bag", category: "Produce" },
  { keys: ["celery"], usd: 2.3, unit: "bunch", category: "Produce" },
  { keys: ["broccoli"], usd: 2.5, unit: "crown", category: "Produce" },
  { keys: ["cauliflower"], usd: 3.4, unit: "head", category: "Produce" },
  { keys: ["green bean", "green beans"], usd: 2.6, unit: "lb", category: "Produce" },
  { keys: ["lettuce", "romaine", "iceberg lettuce"], usd: 2.6, unit: "head", category: "Produce" },
  { keys: ["spinach", "baby spinach"], usd: 3.6, unit: "5 oz", category: "Produce" },
  { keys: ["kale"], usd: 2.6, unit: "bunch", category: "Produce" },
  { keys: ["salad mix", "spring mix", "salad kit"], usd: 4.2, unit: "bag", category: "Produce" },
  { keys: ["cucumber", "cucumbers"], usd: 1.0, unit: "each", category: "Produce" },
  { keys: ["bell pepper", "bell peppers", "pepper", "peppers"], usd: 1.5, unit: "each", category: "Produce" },
  { keys: ["mushroom", "mushrooms"], usd: 2.8, unit: "8 oz", category: "Produce" },
  { keys: ["zucchini", "squash"], usd: 1.8, unit: "lb", category: "Produce" },
  { keys: ["corn", "corn on the cob"], usd: 0.7, unit: "ear", category: "Produce" },
  { keys: ["cilantro", "parsley", "herbs"], usd: 1.2, unit: "bunch", category: "Produce" },
  { keys: ["ginger"], usd: 1.5, unit: "piece", category: "Produce" },

  // Dairy & eggs
  { keys: ["milk", "whole milk", "2% milk", "skim milk"], usd: 3.9, unit: "gallon", category: "Dairy" },
  { keys: ["almond milk", "oat milk", "soy milk"], usd: 4.2, unit: "half gallon", category: "Dairy" },
  { keys: ["egg", "eggs", "dozen eggs"], usd: 4.0, unit: "dozen", category: "Dairy" },
  { keys: ["butter"], usd: 4.7, unit: "1 lb", category: "Dairy" },
  { keys: ["cheese", "cheddar cheese", "shredded cheese"], usd: 4.3, unit: "8 oz", category: "Dairy" },
  { keys: ["mozzarella", "mozzarella cheese"], usd: 4.0, unit: "8 oz", category: "Dairy" },
  { keys: ["parmesan", "parmesan cheese"], usd: 5.5, unit: "6 oz", category: "Dairy" },
  { keys: ["cream cheese"], usd: 3.2, unit: "8 oz", category: "Dairy" },
  { keys: ["sour cream"], usd: 2.6, unit: "16 oz", category: "Dairy" },
  { keys: ["yogurt", "greek yogurt"], usd: 5.2, unit: "32 oz", category: "Dairy" },
  { keys: ["cottage cheese"], usd: 4.0, unit: "16 oz", category: "Dairy" },
  { keys: ["heavy cream", "half and half"], usd: 3.6, unit: "pint", category: "Dairy" },

  // Protein
  { keys: ["chicken breast", "chicken breasts", "chicken"], usd: 4.2, unit: "lb", category: "Protein" },
  { keys: ["chicken thigh", "chicken thighs"], usd: 3.2, unit: "lb", category: "Protein" },
  { keys: ["rotisserie chicken"], usd: 7.5, unit: "each", category: "Protein" },
  { keys: ["ground beef", "hamburger"], usd: 5.6, unit: "lb", category: "Protein" },
  { keys: ["ground turkey"], usd: 4.9, unit: "lb", category: "Protein" },
  { keys: ["steak", "sirloin", "ribeye"], usd: 11.0, unit: "lb", category: "Protein" },
  { keys: ["pork chop", "pork chops"], usd: 4.3, unit: "lb", category: "Protein" },
  { keys: ["bacon"], usd: 6.4, unit: "12 oz", category: "Protein" },
  { keys: ["sausage", "breakfast sausage"], usd: 5.0, unit: "1 lb", category: "Protein" },
  { keys: ["deli turkey", "lunch meat", "deli meat", "ham"], usd: 6.0, unit: "lb", category: "Protein" },
  { keys: ["hot dog", "hot dogs"], usd: 4.5, unit: "pack", category: "Protein" },
  { keys: ["salmon"], usd: 11.5, unit: "lb", category: "Protein" },
  { keys: ["tilapia", "cod", "white fish"], usd: 8.0, unit: "lb", category: "Protein" },
  { keys: ["shrimp"], usd: 9.5, unit: "lb", category: "Protein" },
  { keys: ["tuna", "canned tuna"], usd: 1.5, unit: "can", category: "Protein" },
  { keys: ["tofu"], usd: 2.8, unit: "block", category: "Protein" },

  // Bakery
  { keys: ["bread", "sandwich bread", "white bread", "wheat bread"], usd: 3.2, unit: "loaf", category: "Bakery" },
  { keys: ["bagel", "bagels"], usd: 4.0, unit: "pack", category: "Bakery" },
  { keys: ["tortilla", "tortillas"], usd: 3.2, unit: "pack", category: "Bakery" },
  { keys: ["hamburger buns", "hot dog buns", "buns"], usd: 2.8, unit: "pack", category: "Bakery" },
  { keys: ["english muffin", "english muffins"], usd: 3.4, unit: "pack", category: "Bakery" },
  { keys: ["pita", "naan"], usd: 3.6, unit: "pack", category: "Bakery" },

  // Pantry
  { keys: ["rice", "white rice", "brown rice", "jasmine rice"], usd: 4.5, unit: "2 lb", category: "Pantry" },
  { keys: ["pasta", "spaghetti", "penne", "noodles"], usd: 1.8, unit: "box", category: "Pantry" },
  { keys: ["pasta sauce", "marinara", "spaghetti sauce"], usd: 3.0, unit: "jar", category: "Pantry" },
  { keys: ["cereal"], usd: 4.6, unit: "box", category: "Pantry" },
  { keys: ["oatmeal", "oats", "rolled oats"], usd: 4.0, unit: "canister", category: "Pantry" },
  { keys: ["flour"], usd: 3.4, unit: "5 lb", category: "Pantry" },
  { keys: ["sugar"], usd: 3.6, unit: "4 lb", category: "Pantry" },
  { keys: ["olive oil"], usd: 9.5, unit: "bottle", category: "Pantry" },
  { keys: ["vegetable oil", "canola oil"], usd: 4.5, unit: "bottle", category: "Pantry" },
  { keys: ["peanut butter"], usd: 3.8, unit: "jar", category: "Pantry" },
  { keys: ["jelly", "jam"], usd: 3.4, unit: "jar", category: "Pantry" },
  { keys: ["honey"], usd: 6.0, unit: "bottle", category: "Pantry" },
  { keys: ["black beans", "beans", "canned beans", "pinto beans"], usd: 1.2, unit: "can", category: "Pantry" },
  { keys: ["canned tomatoes", "diced tomatoes", "tomato sauce"], usd: 1.5, unit: "can", category: "Pantry" },
  { keys: ["chicken broth", "broth", "stock"], usd: 2.6, unit: "carton", category: "Pantry" },
  { keys: ["soup", "canned soup"], usd: 2.4, unit: "can", category: "Pantry" },
  { keys: ["mac and cheese", "macaroni and cheese"], usd: 1.6, unit: "box", category: "Pantry" },
  { keys: ["chips", "tortilla chips", "potato chips"], usd: 4.2, unit: "bag", category: "Pantry" },
  { keys: ["crackers"], usd: 3.6, unit: "box", category: "Pantry" },
  { keys: ["granola bar", "granola bars", "protein bar", "protein bars"], usd: 5.5, unit: "box", category: "Pantry" },
  { keys: ["nuts", "almonds", "cashews", "walnuts"], usd: 7.5, unit: "bag", category: "Pantry" },
  { keys: ["coffee", "ground coffee"], usd: 9.5, unit: "bag", category: "Pantry" },
  { keys: ["tea"], usd: 4.2, unit: "box", category: "Pantry" },
  { keys: ["salt", "pepper", "spice", "spices", "seasoning"], usd: 3.0, unit: "each", category: "Pantry" },
  { keys: ["ketchup", "mustard", "mayo", "mayonnaise", "bbq sauce"], usd: 3.6, unit: "bottle", category: "Pantry" },
  { keys: ["salsa"], usd: 3.4, unit: "jar", category: "Pantry" },
  { keys: ["soda", "pop", "cola", "sparkling water"], usd: 6.5, unit: "12 pack", category: "Pantry" },
  { keys: ["juice", "orange juice", "apple juice"], usd: 4.3, unit: "carton", category: "Pantry" },
  { keys: ["water", "bottled water"], usd: 5.0, unit: "case", category: "Pantry" },

  // Frozen
  { keys: ["frozen pizza", "pizza"], usd: 6.5, unit: "each", category: "Frozen" },
  { keys: ["frozen vegetables", "frozen veggies", "frozen peas", "frozen broccoli"], usd: 2.2, unit: "bag", category: "Frozen" },
  { keys: ["frozen fruit", "frozen berries"], usd: 4.5, unit: "bag", category: "Frozen" },
  { keys: ["ice cream"], usd: 5.5, unit: "tub", category: "Frozen" },
  { keys: ["frozen waffles", "waffles"], usd: 3.4, unit: "box", category: "Frozen" },
  { keys: ["french fries", "frozen fries", "tater tots"], usd: 3.8, unit: "bag", category: "Frozen" },
  { keys: ["chicken nuggets", "frozen chicken"], usd: 8.5, unit: "bag", category: "Frozen" },

  // Household & personal
  { keys: ["paper towels"], usd: 9.5, unit: "pack", category: "Other" },
  { keys: ["toilet paper"], usd: 11.0, unit: "pack", category: "Other" },
  { keys: ["dish soap"], usd: 4.0, unit: "bottle", category: "Other" },
  { keys: ["laundry detergent"], usd: 12.0, unit: "bottle", category: "Other" },
  { keys: ["trash bags"], usd: 9.0, unit: "box", category: "Other" },
  { keys: ["shampoo", "conditioner", "body wash"], usd: 6.5, unit: "bottle", category: "Other" },
  { keys: ["toothpaste"], usd: 3.8, unit: "tube", category: "Other" },
  { keys: ["diapers"], usd: 25.0, unit: "pack", category: "Other" },
  { keys: ["wipes", "baby wipes"], usd: 7.0, unit: "pack", category: "Other" },
  { keys: ["dog food", "cat food", "pet food"], usd: 18.0, unit: "bag", category: "Other" },
];

/** Fallback used when nothing in the catalog matches. */
const FALLBACK_USD = 3.75;

/** Rough store price positioning relative to the national average. */
export const STORE_FACTOR: Record<string, number> = {
  walmart: 0.92,
  kroger: 1.0,
  meijer: 0.98,
  aldi: 0.84,
  target: 1.03,
  costco: 0.88,
  sams_club: 0.88,
  amazon: 1.1,
  amazon_fresh: 1.08,
  instacart: 1.18,
  whole_foods: 1.22,
  publix: 1.1,
  safeway: 1.07,
  heb: 0.95,
  wegmans: 1.05,
  trader_joes: 0.97,
};

const factorFor = (store: Retailer) => STORE_FACTOR[store] ?? 1;

/* --------------------------------------------------------------- matching */

function findRow(name: string): PriceRow | null {
  const key = itemKey(name);
  if (!key) return null;
  const w = words(name);
  let best: { row: PriceRow; score: number } | null = null;

  for (const row of CATALOG) {
    for (const k of row.keys) {
      const kk = itemKey(k);
      const kw = words(k);
      let score = 0;
      if (kk === key) score = 100;
      else if (key.includes(kk) || kk.includes(key)) score = 70 + Math.min(kk.length, 20);
      else {
        const overlap = kw.filter(t => w.includes(t)).length;
        if (overlap === kw.length) score = 55;
        else if (overlap > 0) score = 25 + overlap * 5;
      }
      if (score > 0 && (!best || score > best.score)) best = { row, score };
    }
  }
  return best && best.score >= 40 ? best.row : null;
}

/** Parse a quantity string like "2", "3 lbs", "2x" into a multiplier. */
export function qtyMultiplier(qty?: string | null): number {
  if (!qty) return 1;
  const m = String(qty).match(/(\d+(\.\d+)?)/);
  if (!m) return 1;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(n, 50);
}

export interface PriceResult {
  /** Total price in cents (quantity applied). */
  cents: number;
  /** True when the user has saved their own price for this item + store. */
  exact: boolean;
  /** Unit the catalog price is based on, when estimated. */
  unit?: string;
  matched: boolean;
}

/** Price for one item at one store; a saved override always wins. */
export function priceFor(
  name: string,
  qty: string | null | undefined,
  store: Retailer,
  overrides?: Map<string, number>,
): PriceResult {
  const mult = qtyMultiplier(qty);
  const saved = overrides?.get(overrideKey(name, store));
  if (saved != null) return { cents: Math.round(saved * mult), exact: true, matched: true };

  const row = findRow(name);
  const usd = (row?.usd ?? FALLBACK_USD) * factorFor(store);
  return {
    cents: Math.round(usd * 100 * mult),
    exact: false,
    unit: row?.unit,
    matched: !!row,
  };
}

export function overrideKey(name: string, store: Retailer): string {
  return `${itemKey(name)}|${store}`;
}

export interface BasketTotal {
  cents: number;
  exactCount: number;
  estimatedCount: number;
}

export function basketTotal(
  items: Array<{ name: string; qty?: string | null }>,
  store: Retailer,
  overrides?: Map<string, number>,
): BasketTotal {
  let cents = 0, exactCount = 0, estimatedCount = 0;
  for (const it of items) {
    const p = priceFor(it.name, it.qty, store, overrides);
    cents += p.cents;
    if (p.exact) exactCount++; else estimatedCount++;
  }
  return { cents, exactCount, estimatedCount };
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/* ------------------------------------------------------------------ hook */

export function useGroceryPrices() {
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setLoading(false); return; }
    const { data } = await supabase
      .from("grocery_price_overrides")
      .select("item_key,store,price_cents")
      .eq("user_id", uid);
    const m = new Map<string, number>();
    (data ?? []).forEach((r: any) => m.set(`${r.item_key}|${r.store}`, r.price_cents));
    setOverrides(m);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  /** Save (or clear, when cents is null) a user price for an item at a store. */
  const setPrice = useCallback(async (name: string, store: Retailer, cents: number | null) => {
    const key = itemKey(name);
    if (!key) return;
    setOverrides(prev => {
      const next = new Map(prev);
      if (cents == null) next.delete(`${key}|${store}`);
      else next.set(`${key}|${store}`, cents);
      return next;
    });
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    if (cents == null) {
      await supabase.from("grocery_price_overrides").delete()
        .eq("user_id", uid).eq("item_key", key).eq("store", store);
    } else {
      await supabase.from("grocery_price_overrides").upsert(
        { user_id: uid, item_key: key, store, price_cents: cents },
        { onConflict: "user_id,item_key,store" },
      );
      await supabase.from("grocery_price_history").insert({
        user_id: uid, item_key: key, item_name: name, store, price_cents: cents, source: "manual",
      });
    }
  }, []);

  return { overrides, setPrice, loading, refresh };
}

/* --------------------------------------------------------------- history */

export interface PricePoint {
  id: string;
  store: string;
  price_cents: number;
  recorded_at: string;
  source: string;
}

/** Every price you've recorded for one item, newest first. */
export async function fetchPriceHistory(name: string, limit = 20): Promise<PricePoint[]> {
  const key = itemKey(name);
  if (!key) return [];
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("grocery_price_history")
    .select("id,store,price_cents,recorded_at,source")
    .eq("user_id", uid)
    .eq("item_key", key)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PricePoint[];
}

/** Change between the oldest and newest recorded price, in cents. */
export function priceTrend(points: PricePoint[]): { changeCents: number; pct: number } | null {
  if (points.length < 2) return null;
  const newest = points[0].price_cents;
  const oldest = points[points.length - 1].price_cents;
  if (!oldest) return null;
  return { changeCents: newest - oldest, pct: Math.round(((newest - oldest) / oldest) * 100) };
}

/** True when the built-in catalog recognises the item name. */
export function hasCatalogPrice(name: string): boolean {
  return !!findRow(name);
}

/** A few sensible price choices for an item we don't recognise. */
export const QUICK_PRICE_CENTS = [99, 199, 299, 499, 799, 1299];
