/**
 * Built-in grocery food catalog — common staples and store-brand items from
 * major US grocers, so search returns something useful instantly even when the
 * Open Food Facts API is slow or offline.
 *
 * Nutrition figures are typical label values for one common serving. They are
 * estimates you can edit before logging — not medical or dietary advice.
 */
import type { FoodCandidate } from "./types";

export const STORES = [
  "Walmart", "Kroger", "Meijer", "Aldi", "Target", "Trader Joe's", "Costco", "Publix",
] as const;
export type Store = (typeof STORES)[number];

/** Store-brand names we can recognise inside a product's brand string. */
export const STORE_BRANDS: Record<Store, string[]> = {
  "Walmart": ["great value", "marketside", "bettergoods", "equate", "sam's choice", "walmart"],
  "Kroger": ["kroger", "simple truth", "private selection", "home chef", "psst"],
  "Meijer": ["meijer", "true goodness", "frederik's"],
  "Aldi": ["aldi", "simply nature", "millville", "friendly farms", "specially selected", "clancy's", "fit & active"],
  "Target": ["good & gather", "good and gather", "favorite day", "market pantry", "target"],
  "Trader Joe's": ["trader joe", "trader joe's"],
  "Costco": ["kirkland", "kirkland signature", "costco"],
  "Publix": ["publix", "greenwise"],
};

/** Which store (if any) a brand string belongs to. */
export function storeForBrand(brand?: string | null): Store | null {
  if (!brand) return null;
  const b = brand.toLowerCase();
  for (const s of STORES) if (STORE_BRANDS[s].some(k => b.includes(k))) return s;
  return null;
}

type Row = [
  name: string,
  brand: string,
  serving: string,
  cal: number, protein: number, carbs: number, fat: number, fiber: number,
  category: string,
];

/* name, brand, serving, cal, P, C, F, fiber, category */
const ROWS: Row[] = [
  // Produce
  ["Banana", "", "1 medium", 105, 1.3, 27, 0.4, 3.1, "Produce"],
  ["Apple", "", "1 medium", 95, 0.5, 25, 0.3, 4.4, "Produce"],
  ["Strawberries", "", "1 cup", 49, 1, 11.7, 0.5, 3, "Produce"],
  ["Blueberries", "", "1 cup", 84, 1.1, 21, 0.5, 3.6, "Produce"],
  ["Avocado", "", "1/2 medium", 120, 1.5, 6.4, 11, 5, "Produce"],
  ["Baby spinach", "Great Value", "3 cups", 20, 2, 3, 0, 2, "Produce"],
  ["Broccoli florets", "Good & Gather", "1 cup", 31, 2.5, 6, 0.3, 2.4, "Produce"],
  ["Baby carrots", "Kroger", "1 cup", 50, 1, 12, 0, 3.4, "Produce"],
  ["Sweet potato", "", "1 medium", 103, 2.3, 24, 0.2, 3.8, "Produce"],
  ["Russet potato", "", "1 medium", 168, 4.5, 37, 0.2, 4, "Produce"],
  ["Roma tomato", "", "1 medium", 22, 1.1, 4.8, 0.2, 1.5, "Produce"],
  ["Cucumber", "", "1 cup sliced", 16, 0.7, 3.8, 0.1, 0.5, "Produce"],
  ["Romaine lettuce", "Meijer", "2 cups", 16, 1.2, 3, 0.3, 2, "Produce"],
  ["Green grapes", "", "1 cup", 104, 1.1, 27, 0.2, 1.4, "Produce"],
  ["Bell pepper", "", "1 medium", 31, 1, 7, 0.3, 2.5, "Produce"],
  ["Yellow onion", "", "1/2 cup chopped", 32, 0.9, 7.5, 0.1, 1.4, "Produce"],
  ["Zucchini", "", "1 cup sliced", 20, 1.5, 3.9, 0.4, 1.2, "Produce"],
  ["Cauliflower rice", "Simply Nature", "1 cup", 25, 2, 5, 0, 2, "Produce"],
  ["Green beans", "Publix", "1 cup", 31, 1.8, 7, 0.1, 3.4, "Produce"],
  ["Seedless watermelon", "", "1 cup diced", 46, 0.9, 11.5, 0.2, 0.6, "Produce"],
  ["Clementine", "Halos", "1 fruit", 35, 0.6, 9, 0.1, 1.3, "Produce"],
  ["Mixed berries, frozen", "Kirkland Signature", "1 cup", 70, 1, 17, 0.5, 4, "Produce"],
  ["Brussels sprouts", "", "1 cup", 38, 3, 8, 0.3, 3.3, "Produce"],
  ["Asparagus", "", "1 cup", 27, 3, 5, 0.2, 2.8, "Produce"],
  ["Kale", "Trader Joe's", "1 cup", 33, 2.9, 6, 0.6, 1.3, "Produce"],

  // Dairy & eggs
  ["Large egg", "Great Value", "1 egg", 70, 6, 0, 5, 0, "Dairy & eggs"],
  ["Liquid egg whites", "Kroger", "1/2 cup", 63, 13, 1, 0, 0, "Dairy & eggs"],
  ["Nonfat Greek yogurt, plain", "Great Value", "3/4 cup", 100, 18, 6, 0, 0, "Dairy & eggs"],
  ["Greek yogurt, vanilla", "Friendly Farms", "1 container", 120, 15, 14, 0, 0, "Dairy & eggs"],
  ["Skyr, plain", "Trader Joe's", "1 container", 110, 19, 7, 0, 0, "Dairy & eggs"],
  ["Cottage cheese, 2%", "Good & Gather", "1/2 cup", 90, 12, 5, 2.5, 0, "Dairy & eggs"],
  ["Whole milk", "Meijer", "1 cup", 150, 8, 12, 8, 0, "Dairy & eggs"],
  ["2% milk", "Kroger", "1 cup", 122, 8, 12, 5, 0, "Dairy & eggs"],
  ["Unsweetened almond milk", "Simple Truth", "1 cup", 30, 1, 1, 2.5, 1, "Dairy & eggs"],
  ["Shredded cheddar", "Great Value", "1/4 cup", 110, 6, 1, 9, 0, "Dairy & eggs"],
  ["String cheese", "Kirkland Signature", "1 stick", 80, 7, 1, 6, 0, "Dairy & eggs"],
  ["Butter", "Land O'Lakes", "1 tbsp", 100, 0, 0, 11, 0, "Dairy & eggs"],
  ["Cream cheese", "Philadelphia", "2 tbsp", 100, 2, 2, 9, 0, "Dairy & eggs"],
  ["Half & half", "Publix", "2 tbsp", 40, 1, 1, 3.5, 0, "Dairy & eggs"],
  ["Parmesan, grated", "Kraft", "1 tbsp", 20, 2, 0, 1.5, 0, "Dairy & eggs"],

  // Meat & seafood
  ["Boneless skinless chicken breast", "Great Value", "4 oz", 120, 26, 0, 1.5, 0, "Meat & seafood"],
  ["Chicken thigh, boneless", "Kroger", "4 oz", 180, 21, 0, 10, 0, "Meat & seafood"],
  ["Rotisserie chicken, breast meat", "Costco", "3 oz", 140, 25, 0, 4, 0, "Meat & seafood"],
  ["93/7 ground turkey", "Meijer", "4 oz", 170, 22, 0, 9, 0, "Meat & seafood"],
  ["90/10 ground beef", "Great Value", "4 oz", 200, 23, 0, 11, 0, "Meat & seafood"],
  ["Sirloin steak", "Publix", "4 oz", 210, 26, 0, 11, 0, "Meat & seafood"],
  ["Pork tenderloin", "Smithfield", "4 oz", 130, 24, 0, 3.5, 0, "Meat & seafood"],
  ["Center-cut bacon", "Kirkland Signature", "2 slices", 70, 6, 0, 5, 0, "Meat & seafood"],
  ["Deli turkey breast", "Boar's Head", "2 oz", 60, 11, 1, 1, 0, "Meat & seafood"],
  ["Atlantic salmon fillet", "Good & Gather", "4 oz", 230, 23, 0, 14, 0, "Meat & seafood"],
  ["Tilapia fillet", "Kroger", "4 oz", 110, 23, 0, 2, 0, "Meat & seafood"],
  ["Cooked shrimp", "Great Value", "4 oz", 110, 24, 1, 1, 0, "Meat & seafood"],
  ["Chunk light tuna in water", "StarKist", "1 pouch", 80, 17, 0, 1, 0, "Meat & seafood"],
  ["Chicken sausage, apple", "Aidells", "1 link", 160, 14, 5, 9, 0, "Meat & seafood"],

  // Pantry & grains
  ["Old fashioned oats", "Great Value", "1/2 cup dry", 150, 5, 27, 3, 4, "Pantry"],
  ["Instant oatmeal, maple", "Quaker", "1 packet", 160, 4, 32, 2, 3, "Pantry"],
  ["White rice, cooked", "", "1 cup", 205, 4.3, 45, 0.4, 0.6, "Pantry"],
  ["Brown rice, cooked", "Simple Truth", "1 cup", 216, 5, 45, 1.8, 3.5, "Pantry"],
  ["Quinoa, cooked", "Trader Joe's", "1 cup", 222, 8, 39, 3.6, 5, "Pantry"],
  ["Whole wheat bread", "Nature's Own", "1 slice", 70, 4, 12, 1, 2, "Pantry"],
  ["Sourdough bread", "Publix Bakery", "1 slice", 120, 4, 23, 0.5, 1, "Pantry"],
  ["Whole wheat tortilla", "Mission", "1 tortilla", 130, 4, 22, 3.5, 4, "Pantry"],
  ["Low carb tortilla", "Mission Carb Balance", "1 tortilla", 70, 5, 16, 2, 12, "Pantry"],
  ["Spaghetti, dry", "Barilla", "2 oz", 200, 7, 42, 1, 3, "Pantry"],
  ["Chickpea pasta", "Banza", "2 oz", 190, 14, 32, 3.5, 8, "Pantry"],
  ["Black beans, canned", "Great Value", "1/2 cup", 110, 7, 20, 0.5, 7, "Pantry"],
  ["Chickpeas, canned", "Kroger", "1/2 cup", 120, 6, 20, 2, 5, "Pantry"],
  ["Lentils, dry", "Meijer", "1/4 cup", 160, 11, 27, 0.5, 11, "Pantry"],
  ["Peanut butter", "Jif", "2 tbsp", 190, 7, 8, 16, 2, "Pantry"],
  ["Almond butter", "Simply Nature", "2 tbsp", 190, 7, 6, 17, 3, "Pantry"],
  ["Raw almonds", "Kirkland Signature", "1 oz", 164, 6, 6, 14, 3.5, "Pantry"],
  ["Walnut halves", "Great Value", "1 oz", 185, 4.3, 3.9, 18.5, 1.9, "Pantry"],
  ["Chia seeds", "Simple Truth", "1 tbsp", 60, 2, 5, 4, 4, "Pantry"],
  ["Ground flaxseed", "Bob's Red Mill", "2 tbsp", 70, 3, 4, 5.5, 4, "Pantry"],
  ["Olive oil", "Kirkland Signature", "1 tbsp", 120, 0, 0, 14, 0, "Pantry"],
  ["Avocado oil spray", "Great Value", "1 spray", 0, 0, 0, 0, 0, "Pantry"],
  ["Honey", "Meijer", "1 tbsp", 64, 0, 17, 0, 0, "Pantry"],
  ["Marinara sauce", "Rao's", "1/2 cup", 90, 2, 6, 6, 2, "Pantry"],
  ["Salsa", "Good & Gather", "2 tbsp", 10, 0, 2, 0, 0, "Pantry"],
  ["Hummus", "Sabra", "2 tbsp", 70, 2, 4, 5, 1, "Pantry"],
  ["Ranch dressing", "Hidden Valley", "2 tbsp", 130, 0, 2, 13, 0, "Pantry"],
  ["Soy sauce, low sodium", "Kikkoman", "1 tbsp", 10, 1, 1, 0, 0, "Pantry"],
  ["Chicken broth", "Great Value", "1 cup", 10, 1, 1, 0, 0, "Pantry"],
  ["Canned pumpkin", "Libby's", "1/2 cup", 40, 2, 9, 0.5, 5, "Pantry"],

  // Snacks & bars
  ["Protein bar, chocolate chip", "Quest", "1 bar", 190, 21, 21, 8, 14, "Snacks"],
  ["Protein bar", "Kirkland Signature", "1 bar", 190, 21, 22, 6, 15, "Snacks"],
  ["Chocolate protein shake", "Premier Protein", "1 bottle", 160, 30, 5, 3, 3, "Snacks"],
  ["Fairlife Core Power shake", "Fairlife", "1 bottle", 170, 26, 9, 3.5, 0, "Snacks"],
  ["Popcorn, lightly salted", "Skinny Pop", "1 cup", 39, 1, 4, 2.5, 1, "Snacks"],
  ["Tortilla chips", "Great Value", "1 oz", 140, 2, 19, 7, 1, "Snacks"],
  ["Pretzel sticks", "Snyder's", "1 oz", 110, 3, 23, 0.5, 1, "Snacks"],
  ["Dark chocolate square", "Trader Joe's", "1 square", 60, 1, 6, 4, 1, "Snacks"],
  ["Rice cake", "Quaker", "1 cake", 35, 1, 7, 0, 0, "Snacks"],
  ["Beef stick", "Chomps", "1 stick", 100, 9, 0, 7, 0, "Snacks"],
  ["Fruit strip", "That's It", "1 bar", 100, 1, 24, 0, 3, "Snacks"],
  ["Trail mix", "Great Value", "1/4 cup", 170, 5, 15, 11, 2, "Snacks"],

  // Frozen & prepared
  ["Frozen chicken nuggets", "Just Bare", "4 pieces", 160, 14, 10, 7, 0, "Frozen"],
  ["Cauliflower crust pizza", "Milton's", "1/3 pizza", 260, 12, 26, 12, 2, "Frozen"],
  ["Frozen turkey meatballs", "Trader Joe's", "5 meatballs", 190, 20, 6, 10, 1, "Frozen"],
  ["Steamable broccoli", "Great Value", "1 cup", 30, 2, 6, 0, 2, "Frozen"],
  ["Frozen stir fry vegetables", "Kroger", "1 cup", 45, 2, 9, 0, 3, "Frozen"],
  ["Frozen waffles", "Kodiak Cakes", "2 waffles", 200, 12, 27, 6, 4, "Frozen"],
  ["Veggie burger patty", "Dr. Praeger's", "1 patty", 130, 5, 15, 6, 4, "Frozen"],
  ["Frozen shrimp stir fry bowl", "Healthy Choice", "1 bowl", 300, 16, 44, 6, 6, "Frozen"],
  ["Egg bites, bacon & cheese", "Costco", "2 bites", 170, 12, 5, 12, 0, "Frozen"],
  ["Frozen mango chunks", "Great Value", "1 cup", 90, 1, 23, 0, 2, "Frozen"],

  // Drinks
  ["Black coffee", "", "1 cup", 2, 0.3, 0, 0, 0, "Drinks"],
  ["Latte with 2% milk", "", "12 oz", 150, 9, 14, 6, 0, "Drinks"],
  ["Unsweetened iced tea", "", "16 oz", 0, 0, 0, 0, 0, "Drinks"],
  ["Diet soda", "", "12 oz", 0, 0, 0, 0, 0, "Drinks"],
  ["Orange juice", "Simply", "8 oz", 110, 2, 26, 0, 0, "Drinks"],
  ["Electrolyte drink mix", "Liquid I.V.", "1 stick", 45, 0, 11, 0, 0, "Drinks"],
  ["Sparkling water", "LaCroix", "12 oz", 0, 0, 0, 0, 0, "Drinks"],
  ["Whey protein powder", "Optimum Nutrition", "1 scoop", 120, 24, 3, 1, 0, "Drinks"],
  ["Kombucha", "GT's", "1 bottle", 60, 0, 14, 0, 0, "Drinks"],
  ["Bone broth", "Kettle & Fire", "1 cup", 45, 10, 1, 0, 0, "Drinks"],
];

export interface CatalogFood extends FoodCandidate {
  store: Store | null;
  category: string;
}

export const FOOD_CATALOG: CatalogFood[] = ROWS.map(
  ([name, brand, serving, cal, protein, carbs, fat, fiber, category], i) => ({
    id: `catalog-${i}`,
    name,
    brand: brand || null,
    servingSize: serving,
    calories: cal,
    protein,
    carbs,
    fat,
    fiber,
    barcode: null,
    source: "catalog",
    store: storeForBrand(brand),
    category,
  }),
);

/** Search the built-in catalog. Store filter narrows to that grocer's brands. */
export function searchCatalog(query: string, store?: Store | null, limit = 12): CatalogFood[] {
  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return FOOD_CATALOG
    .filter(f => (store ? f.store === store : true))
    .map(f => {
      const hay = `${f.name} ${f.brand ?? ""} ${f.category}`.toLowerCase();
      if (!words.length) return { f, score: 0 };
      const hits = words.filter(w => hay.includes(w)).length;
      if (hits === 0) return null;
      const starts = hay.startsWith(q) ? 2 : 0;
      return { f, score: hits * 2 + starts };
    })
    .filter((x): x is { f: CatalogFood; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name))
    .slice(0, limit)
    .map(x => x.f);
}

/** Merge catalog matches ahead of remote results, dropping duplicates. */
export function mergeWithCatalog(
  query: string, remote: FoodCandidate[], store?: Store | null,
): FoodCandidate[] {
  const local = searchCatalog(query, store);
  const seen = new Set(local.map(f => `${f.name}|${f.brand ?? ""}`.toLowerCase()));
  const rest = remote.filter(r => {
    const key = `${r.name}|${r.brand ?? ""}`.toLowerCase();
    if (seen.has(key)) return false;
    if (store && storeForBrand(r.brand) !== store) return false;
    return true;
  });
  return [...local, ...rest];
}

/* ------------------------------------------------------------ diet shelves */

export const DIET_TAGS = [
  { key: "keto", label: "Keto" },
  { key: "atkins", label: "Atkins" },
  { key: "glp1", label: "GLP-1 friendly" },
  { key: "points", label: "Points friendly" },
  { key: "high_protein", label: "High protein" },
  { key: "high_fiber", label: "High fiber" },
] as const;

export type DietTag = (typeof DIET_TAGS)[number]["key"];

const per100 = (f: CatalogFood, k: "protein" | "carbs" | "fiber") =>
  f.calories > 0 ? ((f[k] as number) * 100) / f.calories : 0;

/** Does this catalog food fit the shape of a given eating style? */
export function matchesDiet(f: CatalogFood, tag: DietTag): boolean {
  switch (tag) {
    case "keto": return f.carbs <= 8 && f.fat >= 4;
    case "atkins": return f.carbs <= 12;
    case "glp1": return f.protein >= 10 && f.calories <= 350;
    case "points": return f.calories <= 200 && f.fat <= 8;
    case "high_protein": return per100(f, "protein") >= 8 || f.protein >= 20;
    case "high_fiber": return f.fiber >= 4;
  }
}

/** Popular shelf for a diet style, optionally limited to one grocer. */
export function dietShelf(tag: DietTag, store?: Store | null, limit = 12): CatalogFood[] {
  return FOOD_CATALOG
    .filter(f => (store ? f.store === store : true) && matchesDiet(f, tag))
    .sort((a, b) => b.protein - a.protein || a.calories - b.calories)
    .slice(0, limit);
}

/** Shelf staples for one grocer, handy before you've typed anything. */
export function storeShelf(store: Store, limit = 12): CatalogFood[] {
  return FOOD_CATALOG.filter(f => f.store === store).slice(0, limit);
}

/* ------------------------------------------------------- sorting results */

export const SORT_OPTIONS = [
  { key: "best", label: "Best match" },
  { key: "name", label: "Name A–Z" },
  { key: "cal_asc", label: "Calories low → high" },
  { key: "cal_desc", label: "Calories high → low" },
  { key: "protein", label: "Protein high → low" },
  { key: "fiber", label: "Fiber high → low" },
  { key: "carbs_asc", label: "Carbs low → high" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["key"];

/** Sort any list of food candidates. "Best match" keeps the incoming order. */
export function sortCandidates<T extends FoodCandidate>(list: T[], key: SortKey): T[] {
  const out = [...list];
  switch (key) {
    case "best": return out;
    case "name": return out.sort((a, b) => a.name.localeCompare(b.name));
    case "cal_asc": return out.sort((a, b) => a.calories - b.calories);
    case "cal_desc": return out.sort((a, b) => b.calories - a.calories);
    case "protein": return out.sort((a, b) => b.protein - a.protein);
    case "fiber": return out.sort((a, b) => b.fiber - a.fiber);
    case "carbs_asc": return out.sort((a, b) => a.carbs - b.carbs);
  }
}

/** Relevance score for a food against a typed term: exact > prefix > word > brand. */
export function relevance(food: FoodCandidate & { category?: string }, term: string): number {
  const q = term.trim().toLowerCase();
  if (!q) return 0;
  const name = food.name.toLowerCase();
  const brand = (food.brand ?? "").toLowerCase();
  const cat = (food.category ?? "").toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  const words = q.split(/\s+/).filter(Boolean);
  const nameHits = words.filter(w => name.includes(w)).length;
  if (nameHits) return 30 + nameHits * 5;
  const otherHits = words.filter(w => brand.includes(w) || cat.includes(w)).length;
  return otherHits ? 10 + otherHits : 0;
}

/** Rank a merged result list by relevance, keeping only real matches. */
export function rankByRelevance<T extends FoodCandidate>(list: T[], term: string): T[] {
  if (!term.trim()) return list;
  return list
    .map(f => ({ f, s: relevance(f, term) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.f.name.localeCompare(b.f.name))
    .map(x => x.f);
}

/* --------------------------------------------- preferred store crosswalk */

/** Grocery preference ids (see src/lib/retailer-links.ts) mapped to catalog stores. */
export const RETAILER_TO_STORE: Record<string, Store> = {
  walmart: "Walmart",
  kroger: "Kroger",
  target: "Target",
  costco: "Costco",
};

export const STORE_TO_RETAILER: Partial<Record<Store, string>> = {
  "Walmart": "walmart",
  "Kroger": "kroger",
  "Target": "target",
  "Costco": "costco",
};
