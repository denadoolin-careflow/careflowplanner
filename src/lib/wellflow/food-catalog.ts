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

/**
 * Ingredient-level staples — the things people actually cook with, so a search
 * for "chicken thigh" or "black beans" returns something useful immediately.
 * Typical label values for one common serving; edit before logging.
 */
const INGREDIENT_ROWS: Row[] = [
  // Proteins — poultry, beef, pork
  ["Chicken breast, boneless skinless", "", "4 oz raw", 130, 24, 0, 3, 0, "Proteins"],
  ["Chicken thigh, boneless skinless", "", "4 oz raw", 170, 21, 0, 9, 0, "Proteins"],
  ["Chicken tenderloins", "", "4 oz raw", 120, 26, 0, 1.5, 0, "Proteins"],
  ["Chicken wings", "", "4 oz raw", 220, 20, 0, 15, 0, "Proteins"],
  ["Rotisserie chicken, white meat", "", "3 oz", 140, 25, 0, 4, 0, "Proteins"],
  ["Ground chicken, 93/7", "", "4 oz raw", 160, 21, 0, 8, 0, "Proteins"],
  ["Ground turkey, 93/7", "", "4 oz raw", 170, 22, 0, 9, 0, "Proteins"],
  ["Turkey breast, sliced deli", "", "2 oz", 50, 11, 1, 0.5, 0, "Proteins"],
  ["Ground beef, 80/20", "", "4 oz raw", 280, 19, 0, 23, 0, "Proteins"],
  ["Ground beef, 90/10", "", "4 oz raw", 200, 23, 0, 11, 0, "Proteins"],
  ["Ground beef, 96/4", "", "4 oz raw", 140, 24, 0, 5, 0, "Proteins"],
  ["Sirloin steak", "", "4 oz raw", 180, 25, 0, 8, 0, "Proteins"],
  ["Ribeye steak", "", "4 oz raw", 290, 21, 0, 23, 0, "Proteins"],
  ["Flank steak", "", "4 oz raw", 170, 25, 0, 7, 0, "Proteins"],
  ["Beef chuck roast", "", "4 oz raw", 220, 22, 0, 14, 0, "Proteins"],
  ["Pork tenderloin", "", "4 oz raw", 130, 24, 0, 3.5, 0, "Proteins"],
  ["Pork chop, boneless", "", "4 oz raw", 180, 24, 0, 9, 0, "Proteins"],
  ["Ground pork", "", "4 oz raw", 250, 20, 0, 19, 0, "Proteins"],
  ["Bacon", "", "2 slices", 80, 6, 0, 6, 0, "Proteins"],
  ["Turkey bacon", "", "2 slices", 60, 6, 1, 4, 0, "Proteins"],
  ["Ham, sliced deli", "", "2 oz", 60, 10, 2, 1.5, 0, "Proteins"],
  ["Italian sausage", "", "1 link", 230, 13, 2, 19, 0, "Proteins"],
  ["Chicken sausage", "", "1 link", 140, 14, 3, 8, 0, "Proteins"],
  ["Hot dog, beef", "", "1 frank", 180, 7, 2, 16, 0, "Proteins"],
  ["Lamb chop", "", "4 oz raw", 250, 22, 0, 18, 0, "Proteins"],

  // Proteins — seafood
  ["Salmon fillet, Atlantic", "", "4 oz raw", 230, 23, 0, 15, 0, "Proteins"],
  ["Salmon, wild sockeye", "", "4 oz raw", 170, 25, 0, 7, 0, "Proteins"],
  ["Canned pink salmon", "", "1/2 can", 90, 17, 0, 3, 0, "Proteins"],
  ["Tilapia fillet", "", "4 oz raw", 110, 23, 0, 2, 0, "Proteins"],
  ["Cod fillet", "", "4 oz raw", 90, 20, 0, 0.7, 0, "Proteins"],
  ["Halibut", "", "4 oz raw", 125, 24, 0, 2.6, 0, "Proteins"],
  ["Mahi mahi", "", "4 oz raw", 100, 22, 0, 0.8, 0, "Proteins"],
  ["Shrimp, raw", "", "4 oz", 100, 23, 0.5, 0.5, 0, "Proteins"],
  ["Canned tuna in water", "", "1 can (5 oz)", 100, 22, 0, 1, 0, "Proteins"],
  ["Canned sardines in olive oil", "", "1 can", 190, 22, 0, 11, 0, "Proteins"],
  ["Scallops", "", "4 oz", 100, 19, 3, 0.8, 0, "Proteins"],
  ["Crab meat, lump", "", "3 oz", 80, 17, 0, 1, 0, "Proteins"],
  ["Imitation crab", "", "3 oz", 80, 6, 13, 0.4, 0, "Proteins"],
  ["Tuna steak, ahi", "", "4 oz raw", 130, 29, 0, 1, 0, "Proteins"],

  // Proteins — plant based
  ["Extra firm tofu", "", "3 oz", 80, 9, 2, 4.5, 1, "Proteins"],
  ["Tempeh", "", "3 oz", 160, 17, 8, 9, 5, "Proteins"],
  ["Edamame, shelled", "", "1/2 cup", 100, 9, 8, 4, 4, "Proteins"],
  ["Seitan", "", "3 oz", 110, 21, 4, 1, 1, "Proteins"],
  ["Textured vegetable protein", "", "1/4 cup dry", 80, 12, 7, 0.5, 4, "Proteins"],
  ["Veggie burger patty", "", "1 patty", 130, 11, 9, 5, 4, "Proteins"],

  // Legumes & beans
  ["Black beans, canned", "", "1/2 cup", 110, 7, 20, 0.5, 7, "Beans & legumes"],
  ["Pinto beans, canned", "", "1/2 cup", 110, 6, 20, 0.5, 6, "Beans & legumes"],
  ["Kidney beans, canned", "", "1/2 cup", 110, 7, 20, 0.5, 6, "Beans & legumes"],
  ["Chickpeas (garbanzo beans), canned", "", "1/2 cup", 120, 6, 20, 2, 5, "Beans & legumes"],
  ["Cannellini beans", "", "1/2 cup", 100, 6, 18, 0.5, 5, "Beans & legumes"],
  ["Refried beans", "", "1/2 cup", 130, 7, 20, 2, 6, "Beans & legumes"],
  ["Lentils, cooked", "", "1/2 cup", 115, 9, 20, 0.4, 8, "Beans & legumes"],
  ["Split peas, cooked", "", "1/2 cup", 115, 8, 21, 0.4, 8, "Beans & legumes"],
  ["Green peas, frozen", "", "1/2 cup", 60, 4, 11, 0.3, 4, "Beans & legumes"],
  ["Hummus", "", "2 tbsp", 70, 2, 4, 5, 2, "Beans & legumes"],
  ["Baked beans", "", "1/2 cup", 140, 6, 27, 0.5, 5, "Beans & legumes"],

  // Grains & starches
  ["White rice, cooked", "", "1 cup", 205, 4.3, 45, 0.4, 0.6, "Grains"],
  ["Brown rice, cooked", "", "1 cup", 215, 5, 45, 1.8, 3.5, "Grains"],
  ["Jasmine rice, cooked", "", "1 cup", 205, 4, 45, 0.4, 0.6, "Grains"],
  ["Basmati rice, cooked", "", "1 cup", 210, 4.4, 46, 0.5, 0.7, "Grains"],
  ["Quinoa, cooked", "", "1 cup", 222, 8, 39, 3.6, 5, "Grains"],
  ["Couscous, cooked", "", "1 cup", 176, 6, 36, 0.3, 2.2, "Grains"],
  ["Farro, cooked", "", "1 cup", 200, 8, 40, 1.5, 5, "Grains"],
  ["Barley, cooked", "", "1 cup", 193, 3.5, 44, 0.7, 6, "Grains"],
  ["Rolled oats, dry", "", "1/2 cup", 150, 5, 27, 3, 4, "Grains"],
  ["Steel cut oats, dry", "", "1/4 cup", 150, 5, 27, 2.5, 4, "Grains"],
  ["Instant oatmeal packet", "", "1 packet", 130, 4, 24, 2, 3, "Grains"],
  ["Cream of wheat, cooked", "", "1 cup", 130, 4, 28, 0.5, 1, "Grains"],
  ["Spaghetti, cooked", "", "1 cup", 220, 8, 43, 1.3, 2.5, "Grains"],
  ["Penne pasta, cooked", "", "1 cup", 200, 7, 41, 1.1, 2.5, "Grains"],
  ["Whole wheat pasta, cooked", "", "1 cup", 174, 7.5, 37, 0.8, 6, "Grains"],
  ["Chickpea pasta, cooked", "", "1 cup", 190, 13, 32, 3, 8, "Grains"],
  ["Egg noodles, cooked", "", "1 cup", 220, 7, 40, 3.3, 2, "Grains"],
  ["Ramen noodles, cooked", "", "1 block", 190, 5, 27, 7, 1, "Grains"],
  ["Rice noodles, cooked", "", "1 cup", 190, 3, 44, 0.4, 1.8, "Grains"],
  ["Corn tortilla", "", "1 tortilla", 50, 1.4, 11, 0.7, 1.5, "Grains"],
  ["Flour tortilla, 8 inch", "", "1 tortilla", 140, 4, 24, 3.5, 1, "Grains"],
  ["Low carb tortilla", "", "1 tortilla", 50, 5, 16, 2, 14, "Grains"],
  ["Whole wheat bread", "", "1 slice", 80, 4, 14, 1, 2, "Grains"],
  ["White sandwich bread", "", "1 slice", 75, 2.5, 14, 1, 0.8, "Grains"],
  ["Sourdough bread", "", "1 slice", 90, 3.5, 18, 0.6, 1, "Grains"],
  ["Bagel, plain", "", "1 bagel", 270, 11, 53, 1.5, 2, "Grains"],
  ["English muffin", "", "1 muffin", 130, 5, 25, 1, 2, "Grains"],
  ["Hamburger bun", "", "1 bun", 140, 5, 26, 2, 1, "Grains"],
  ["Pita bread", "", "1 pita", 165, 5.5, 33, 0.7, 1.3, "Grains"],
  ["Naan", "", "1 piece", 260, 9, 45, 5, 2, "Grains"],
  ["Panko breadcrumbs", "", "1/4 cup", 110, 3, 22, 0.5, 1, "Grains"],
  ["All purpose flour", "", "1/4 cup", 110, 3, 23, 0.3, 1, "Baking"],
  ["Almond flour", "", "1/4 cup", 160, 6, 6, 14, 3, "Baking"],
  ["Coconut flour", "", "2 tbsp", 60, 2, 8, 2, 5, "Baking"],
  ["Cornmeal", "", "1/4 cup", 110, 2.5, 23, 0.5, 2, "Baking"],
  ["Corn grits, cooked", "", "1 cup", 140, 3, 31, 0.5, 1, "Grains"],

  // Dairy & eggs
  ["Whole egg, large", "", "1 egg", 72, 6.3, 0.4, 4.8, 0, "Dairy & eggs"],
  ["Egg yolk", "", "1 yolk", 55, 2.7, 0.6, 4.5, 0, "Dairy & eggs"],
  ["Hard boiled egg", "", "1 egg", 78, 6.3, 0.6, 5.3, 0, "Dairy & eggs"],
  ["2% milk", "", "1 cup", 122, 8, 12, 4.8, 0, "Dairy & eggs"],
  ["Skim milk", "", "1 cup", 83, 8, 12, 0.2, 0, "Dairy & eggs"],
  ["Almond milk, unsweetened", "", "1 cup", 30, 1, 1, 2.5, 1, "Dairy & eggs"],
  ["Oat milk", "", "1 cup", 120, 3, 16, 5, 2, "Dairy & eggs"],
  ["Soy milk, unsweetened", "", "1 cup", 80, 7, 4, 4, 2, "Dairy & eggs"],
  ["Half and half", "", "2 tbsp", 40, 1, 1, 3.5, 0, "Dairy & eggs"],
  ["Heavy cream", "", "1 tbsp", 51, 0.4, 0.4, 5.4, 0, "Dairy & eggs"],
  ["Sour cream", "", "2 tbsp", 60, 1, 1, 5, 0, "Dairy & eggs"],
  ["Cream cheese", "", "1 oz", 100, 2, 1.5, 9, 0, "Dairy & eggs"],
  ["Cheddar cheese", "", "1 oz", 115, 7, 0.4, 9.4, 0, "Dairy & eggs"],
  ["Mozzarella, part skim", "", "1 oz", 72, 7, 0.8, 4.5, 0, "Dairy & eggs"],
  ["Shredded mexican blend cheese", "", "1/4 cup", 110, 7, 1, 9, 0, "Dairy & eggs"],
  ["Parmesan, grated", "", "1 tbsp", 22, 2, 0.2, 1.4, 0, "Dairy & eggs"],
  ["Feta cheese", "", "1 oz", 75, 4, 1.2, 6, 0, "Dairy & eggs"],
  ["Goat cheese", "", "1 oz", 75, 5, 0.3, 6, 0, "Dairy & eggs"],
  ["Swiss cheese", "", "1 slice", 80, 6, 1, 6, 0, "Dairy & eggs"],
  ["American cheese slice", "", "1 slice", 60, 3, 2, 4.5, 0, "Dairy & eggs"],
  ["String cheese", "", "1 stick", 80, 7, 1, 6, 0, "Dairy & eggs"],
  ["Ricotta, part skim", "", "1/4 cup", 90, 7, 3, 5, 0, "Dairy & eggs"],
  ["Butter", "", "1 tbsp", 102, 0.1, 0, 11.5, 0, "Dairy & eggs"],
  ["Whipped topping", "", "2 tbsp", 25, 0, 2, 1.5, 0, "Dairy & eggs"],
  ["Plain whole milk yogurt", "", "1 cup", 150, 8, 11, 8, 0, "Dairy & eggs"],
  ["Kefir, plain", "", "1 cup", 110, 11, 12, 2, 0, "Dairy & eggs"],

  // Produce — vegetables
  ["Mushrooms, white", "", "1 cup sliced", 15, 2.2, 2.3, 0.2, 0.7, "Produce"],
  ["Portobello mushroom", "", "1 cap", 22, 2.1, 3.9, 0.4, 1.3, "Produce"],
  ["Celery", "", "2 stalks", 12, 0.6, 2.4, 0.1, 1.3, "Produce"],
  ["Cabbage, shredded", "", "1 cup", 22, 1.1, 5.2, 0.1, 2.2, "Produce"],
  ["Red cabbage", "", "1 cup", 28, 1.3, 6.6, 0.1, 1.9, "Produce"],
  ["Bok choy", "", "1 cup", 9, 1, 1.5, 0.1, 0.7, "Produce"],
  ["Corn kernels", "", "1/2 cup", 66, 2.5, 15, 0.8, 1.8, "Produce"],
  ["Butternut squash, cubed", "", "1 cup", 63, 1.4, 16, 0.1, 2.8, "Produce"],
  ["Spaghetti squash, cooked", "", "1 cup", 42, 1, 10, 0.4, 2.2, "Produce"],
  ["Eggplant", "", "1 cup cubed", 20, 0.8, 4.8, 0.1, 2.5, "Produce"],
  ["Snap peas", "", "1 cup", 41, 2.8, 7.4, 0.2, 2.5, "Produce"],
  ["Arugula", "", "2 cups", 10, 1, 1.4, 0.3, 0.6, "Produce"],
  ["Mixed salad greens", "", "2 cups", 15, 1.2, 2.6, 0.2, 1.6, "Produce"],
  ["Radish", "", "1 cup sliced", 19, 0.8, 3.9, 0.1, 1.9, "Produce"],
  ["Beets, cooked", "", "1/2 cup", 37, 1.4, 8.5, 0.2, 1.7, "Produce"],
  ["Garlic", "", "1 clove", 4, 0.2, 1, 0, 0.1, "Produce"],
  ["Ginger root", "", "1 tsp grated", 2, 0, 0.4, 0, 0.1, "Produce"],
  ["Jalapeno", "", "1 pepper", 4, 0.1, 0.9, 0.1, 0.4, "Produce"],
  ["Green onion", "", "2 tbsp", 4, 0.2, 0.9, 0, 0.3, "Produce"],
  ["Cilantro", "", "1/4 cup", 1, 0.1, 0.2, 0, 0.1, "Produce"],
  ["Coleslaw mix", "", "1 cup", 25, 1, 5, 0, 2, "Produce"],
  ["Frozen stir fry vegetables", "", "1 cup", 45, 2, 9, 0, 3, "Produce"],
  ["Sauerkraut", "", "1/4 cup", 5, 0.3, 1, 0, 0.7, "Produce"],
  ["Pickle spear", "", "1 spear", 5, 0.2, 1, 0, 0.4, "Produce"],
  ["Olives, kalamata", "", "5 olives", 45, 0.3, 1, 4.5, 1, "Produce"],

  // Produce — fruit
  ["Orange", "", "1 medium", 62, 1.2, 15, 0.2, 3.1, "Produce"],
  ["Pear", "", "1 medium", 101, 0.6, 27, 0.2, 5.5, "Produce"],
  ["Peach", "", "1 medium", 59, 1.4, 14, 0.4, 2.3, "Produce"],
  ["Pineapple, cubed", "", "1 cup", 82, 0.9, 22, 0.2, 2.3, "Produce"],
  ["Mango, cubed", "", "1 cup", 99, 1.4, 25, 0.6, 2.6, "Produce"],
  ["Cantaloupe, cubed", "", "1 cup", 54, 1.3, 13, 0.3, 1.4, "Produce"],
  ["Raspberries", "", "1 cup", 64, 1.5, 15, 0.8, 8, "Produce"],
  ["Blackberries", "", "1 cup", 62, 2, 14, 0.7, 7.6, "Produce"],
  ["Cherries", "", "1 cup", 87, 1.5, 22, 0.3, 2.9, "Produce"],
  ["Kiwi", "", "1 fruit", 42, 0.8, 10, 0.4, 2.1, "Produce"],
  ["Plum", "", "1 fruit", 30, 0.5, 7.5, 0.2, 0.9, "Produce"],
  ["Grapefruit", "", "1/2 fruit", 52, 1, 13, 0.2, 2, "Produce"],
  ["Raisins", "", "1/4 cup", 108, 1.1, 29, 0.2, 1.4, "Produce"],
  ["Dates, medjool", "", "2 dates", 133, 0.8, 36, 0.1, 3.2, "Produce"],
  ["Dried cranberries", "", "1/4 cup", 123, 0, 33, 0.5, 2, "Produce"],
  ["Applesauce, unsweetened", "", "1/2 cup", 50, 0.2, 14, 0.1, 1.5, "Produce"],
  ["Banana, frozen sliced", "", "1 cup", 134, 1.6, 34, 0.5, 3.9, "Produce"],

  // Nuts, seeds & fats
  ["Almonds", "", "1 oz (23)", 164, 6, 6, 14, 3.5, "Nuts & fats"],
  ["Walnuts", "", "1 oz", 185, 4.3, 3.9, 18.5, 1.9, "Nuts & fats"],
  ["Cashews", "", "1 oz", 157, 5.2, 8.6, 12.4, 0.9, "Nuts & fats"],
  ["Pecans", "", "1 oz", 196, 2.6, 3.9, 20.4, 2.7, "Nuts & fats"],
  ["Pistachios", "", "1 oz", 159, 5.7, 7.7, 12.9, 3, "Nuts & fats"],
  ["Peanuts", "", "1 oz", 161, 7.3, 4.6, 14, 2.4, "Nuts & fats"],
  ["Peanut butter", "", "2 tbsp", 190, 7, 7, 16, 2, "Nuts & fats"],
  ["Almond butter", "", "2 tbsp", 196, 6.7, 6, 18, 3.3, "Nuts & fats"],
  ["Chia seeds", "", "1 tbsp", 58, 2, 5, 3.7, 4.1, "Nuts & fats"],
  ["Ground flaxseed", "", "1 tbsp", 37, 1.3, 2, 3, 1.9, "Nuts & fats"],
  ["Pumpkin seeds", "", "1 oz", 158, 8.5, 3, 13.9, 1.7, "Nuts & fats"],
  ["Sunflower seeds", "", "1 oz", 165, 5.5, 6.8, 14, 3, "Nuts & fats"],
  ["Hemp hearts", "", "3 tbsp", 166, 9.5, 2.6, 14.6, 1.2, "Nuts & fats"],
  ["Olive oil", "", "1 tbsp", 119, 0, 0, 13.5, 0, "Nuts & fats"],
  ["Avocado oil", "", "1 tbsp", 124, 0, 0, 14, 0, "Nuts & fats"],
  ["Canola oil", "", "1 tbsp", 124, 0, 0, 14, 0, "Nuts & fats"],
  ["Coconut oil", "", "1 tbsp", 121, 0, 0, 13.5, 0, "Nuts & fats"],
  ["Sesame oil", "", "1 tsp", 40, 0, 0, 4.5, 0, "Nuts & fats"],
  ["Cooking spray", "", "1 spray", 0, 0, 0, 0, 0, "Nuts & fats"],
  ["Tahini", "", "1 tbsp", 89, 2.6, 3.2, 8, 1.4, "Nuts & fats"],

  // Condiments, sauces & spices
  ["Ketchup", "", "1 tbsp", 17, 0.2, 4.5, 0, 0, "Condiments"],
  ["Mustard, yellow", "", "1 tsp", 3, 0.2, 0.3, 0.2, 0.1, "Condiments"],
  ["Mayonnaise", "", "1 tbsp", 94, 0.1, 0.1, 10, 0, "Condiments"],
  ["Light mayonnaise", "", "1 tbsp", 35, 0, 1, 3.5, 0, "Condiments"],
  ["Ranch dressing", "", "2 tbsp", 129, 0.4, 1.8, 13, 0, "Condiments"],
  ["Balsamic vinaigrette", "", "2 tbsp", 90, 0, 3, 9, 0, "Condiments"],
  ["Soy sauce", "", "1 tbsp", 9, 1.3, 0.8, 0, 0.1, "Condiments"],
  ["Coconut aminos", "", "1 tbsp", 5, 0, 1, 0, 0, "Condiments"],
  ["Sriracha", "", "1 tsp", 5, 0, 1, 0, 0, "Condiments"],
  ["Hot sauce", "", "1 tsp", 1, 0, 0.1, 0, 0, "Condiments"],
  ["BBQ sauce", "", "2 tbsp", 60, 0, 15, 0, 0.3, "Condiments"],
  ["Salsa", "", "2 tbsp", 10, 0.5, 2, 0, 0.5, "Condiments"],
  ["Guacamole", "", "2 tbsp", 50, 0.6, 3, 4.5, 2, "Condiments"],
  ["Marinara sauce", "", "1/2 cup", 70, 2, 12, 2, 3, "Condiments"],
  ["Alfredo sauce", "", "1/4 cup", 110, 2, 3, 10, 0, "Condiments"],
  ["Pesto", "", "2 tbsp", 160, 3, 2, 16, 1, "Condiments"],
  ["Teriyaki sauce", "", "1 tbsp", 30, 1, 6, 0, 0, "Condiments"],
  ["Honey", "", "1 tbsp", 64, 0.1, 17, 0, 0, "Condiments"],
  ["Maple syrup", "", "1 tbsp", 52, 0, 13, 0, 0, "Condiments"],
  ["Brown sugar", "", "1 tbsp", 52, 0, 13.5, 0, 0, "Baking"],
  ["Granulated sugar", "", "1 tsp", 16, 0, 4.2, 0, 0, "Baking"],
  ["Cocoa powder, unsweetened", "", "1 tbsp", 12, 1, 3, 0.7, 1.8, "Baking"],
  ["Vanilla extract", "", "1 tsp", 12, 0, 0.5, 0, 0, "Baking"],
  ["Cinnamon, ground", "", "1 tsp", 6, 0.1, 2.1, 0, 1.4, "Spices"],
  ["Garlic powder", "", "1 tsp", 10, 0.5, 2.3, 0, 0.3, "Spices"],
  ["Onion powder", "", "1 tsp", 8, 0.2, 1.9, 0, 0.1, "Spices"],
  ["Paprika", "", "1 tsp", 6, 0.3, 1.2, 0.3, 0.8, "Spices"],
  ["Chili powder", "", "1 tsp", 8, 0.4, 1.4, 0.4, 0.9, "Spices"],
  ["Cumin, ground", "", "1 tsp", 8, 0.4, 0.9, 0.5, 0.2, "Spices"],
  ["Italian seasoning", "", "1 tsp", 4, 0.2, 0.8, 0.1, 0.5, "Spices"],
  ["Everything bagel seasoning", "", "1 tsp", 5, 0.2, 0.5, 0.3, 0.2, "Spices"],
  ["Nutritional yeast", "", "1 tbsp", 20, 3, 2, 0, 1, "Spices"],
  ["Chicken broth, low sodium", "", "1 cup", 15, 2, 1, 0.5, 0, "Pantry"],
  ["Beef broth", "", "1 cup", 15, 2, 1, 0.5, 0, "Pantry"],
  ["Vegetable broth", "", "1 cup", 15, 1, 3, 0, 0, "Pantry"],
  ["Canned diced tomatoes", "", "1/2 cup", 25, 1, 5, 0, 1.5, "Pantry"],
  ["Tomato paste", "", "2 tbsp", 30, 1.5, 6, 0, 1.5, "Pantry"],
  ["Coconut milk, canned", "", "1/4 cup", 100, 1, 2, 10, 0, "Pantry"],
  ["Canned pumpkin", "", "1/2 cup", 40, 1.5, 10, 0.3, 3.5, "Pantry"],
  ["Canned green chiles", "", "2 tbsp", 5, 0, 1, 0, 0.3, "Pantry"],

  // Snacks & sweets
  ["Popcorn, air popped", "", "3 cups", 93, 3, 19, 1.1, 3.5, "Snacks"],
  ["Tortilla chips", "", "1 oz", 140, 2, 19, 7, 1.5, "Snacks"],
  ["Potato chips", "", "1 oz", 150, 2, 15, 10, 1, "Snacks"],
  ["Pretzels", "", "1 oz", 110, 3, 23, 1, 1, "Snacks"],
  ["Saltine crackers", "", "5 crackers", 60, 1, 11, 1.5, 0.4, "Snacks"],
  ["Whole grain crackers", "", "16 crackers", 130, 3, 22, 4, 3, "Snacks"],
  ["Rice cake", "", "1 cake", 35, 0.7, 7.3, 0.3, 0.4, "Snacks"],
  ["Granola bar", "", "1 bar", 140, 3, 21, 5, 2, "Snacks"],
  ["Protein bar", "", "1 bar", 200, 20, 22, 7, 10, "Snacks"],
  ["Beef jerky", "", "1 oz", 80, 12, 5, 1, 0, "Snacks"],
  ["Trail mix", "", "1/4 cup", 170, 5, 16, 11, 2.5, "Snacks"],
  ["Dark chocolate, 70%", "", "1 oz", 170, 2, 13, 12, 3, "Snacks"],
  ["Milk chocolate", "", "1 oz", 150, 2, 17, 8, 1, "Snacks"],
  ["Ice cream, vanilla", "", "1/2 cup", 140, 2.5, 16, 7, 0.5, "Snacks"],
  ["Frozen yogurt bar", "", "1 bar", 80, 3, 14, 1.5, 0, "Snacks"],
  ["Chocolate chip cookie", "", "1 cookie", 150, 1.5, 20, 7, 0.7, "Snacks"],
  ["Brownie", "", "1 square", 170, 2, 24, 8, 1, "Snacks"],
  ["Donut, glazed", "", "1 donut", 240, 3, 27, 14, 1, "Snacks"],
  ["Muffin, blueberry", "", "1 muffin", 380, 6, 55, 15, 2, "Snacks"],

  // Drinks
  ["Black coffee", "", "1 cup", 2, 0.3, 0, 0, 0, "Drinks"],
  ["Latte, 2% milk", "", "12 oz", 150, 9, 14, 6, 0, "Drinks"],
  ["Cappuccino", "", "12 oz", 90, 6, 9, 3.5, 0, "Drinks"],
  ["Cold brew, unsweetened", "", "16 oz", 5, 0, 0, 0, 0, "Drinks"],
  ["Green tea", "", "1 cup", 2, 0, 0, 0, 0, "Drinks"],
  ["Orange juice", "", "8 oz", 110, 2, 26, 0.5, 0.5, "Drinks"],
  ["Apple juice", "", "8 oz", 114, 0.2, 28, 0.3, 0.5, "Drinks"],
  ["Cola", "", "12 oz", 140, 0, 39, 0, 0, "Drinks"],
  ["Diet soda", "", "12 oz", 0, 0, 0, 0, 0, "Drinks"],
  ["Lemonade", "", "8 oz", 99, 0.2, 26, 0.1, 0, "Drinks"],
  ["Sports drink", "", "12 oz", 80, 0, 21, 0, 0, "Drinks"],
  ["Beer, regular", "", "12 oz", 153, 1.6, 13, 0, 0, "Drinks"],
  ["Light beer", "", "12 oz", 103, 0.9, 5.8, 0, 0, "Drinks"],
  ["Red wine", "", "5 oz", 125, 0.1, 3.8, 0, 0, "Drinks"],
  ["White wine", "", "5 oz", 121, 0.1, 3.8, 0, 0, "Drinks"],
  ["Protein shake, ready to drink", "", "1 bottle", 160, 30, 5, 3, 1, "Drinks"],
  ["Meal replacement shake", "", "1 bottle", 220, 10, 33, 6, 5, "Drinks"],

  // Prepared & restaurant style
  ["Cheese pizza slice", "", "1 slice", 285, 12, 36, 10, 2.5, "Prepared"],
  ["Pepperoni pizza slice", "", "1 slice", 313, 13, 36, 13, 2.5, "Prepared"],
  ["Cheeseburger, fast food", "", "1 burger", 300, 15, 33, 12, 2, "Prepared"],
  ["French fries, medium", "", "1 order", 320, 4, 43, 15, 4, "Prepared"],
  ["Chicken nuggets", "", "6 pieces", 250, 13, 15, 15, 1, "Prepared"],
  ["Burrito bowl, chicken", "", "1 bowl", 630, 45, 60, 21, 10, "Prepared"],
  ["Chicken caesar salad", "", "1 salad", 470, 32, 12, 33, 4, "Prepared"],
  ["Turkey sandwich", "", "1 sandwich", 350, 22, 42, 10, 4, "Prepared"],
  ["Sushi roll, california", "", "6 pieces", 255, 9, 38, 7, 4, "Prepared"],
  ["Chicken stir fry with rice", "", "1 plate", 520, 34, 60, 16, 5, "Prepared"],
  ["Beef taco", "", "1 taco", 170, 8, 13, 9, 2, "Prepared"],
  ["Chicken noodle soup", "", "1 cup", 100, 6, 12, 3, 1, "Prepared"],
  ["Chili with beans", "", "1 cup", 250, 17, 24, 9, 7, "Prepared"],
  ["Mac and cheese", "", "1 cup", 350, 12, 44, 14, 2, "Prepared"],
  ["Scrambled eggs, 2 eggs", "", "1 serving", 180, 12, 2, 14, 0, "Prepared"],
  ["Pancakes", "", "2 pancakes", 350, 8, 45, 15, 2, "Prepared"],
  ["Waffle", "", "1 waffle", 220, 6, 25, 11, 1, "Prepared"],
  ["Breakfast burrito", "", "1 burrito", 480, 22, 44, 24, 3, "Prepared"],
  ["Overnight oats with berries", "", "1 jar", 330, 12, 50, 9, 8, "Prepared"],
  ["Smoothie, berry protein", "", "16 oz", 320, 25, 42, 6, 7, "Prepared"],
];

export interface CatalogFood extends FoodCandidate {
  store: Store | null;
  category: string;
}

const ALL_ROWS: Row[] = [...ROWS, ...INGREDIENT_ROWS];

export const FOOD_CATALOG: CatalogFood[] = ALL_ROWS.map(

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

/* ------------------------------------------------------------ text search */

/** Words that mean the same thing, so either spelling finds the food. */
const SYNONYMS: Record<string, string[]> = {
  shrimp: ["prawn", "prawns"],
  prawn: ["shrimp"],
  garbanzo: ["chickpea", "chickpeas"],
  chickpea: ["garbanzo"],
  soda: ["cola", "pop", "soft drink"],
  pop: ["soda", "cola"],
  yoghurt: ["yogurt"],
  yogurt: ["yoghurt", "greek"],
  aubergine: ["eggplant"],
  eggplant: ["aubergine"],
  courgette: ["zucchini"],
  zucchini: ["courgette"],
  coriander: ["cilantro"],
  cilantro: ["coriander"],
  mince: ["ground"],
  ground: ["mince", "minced"],
  fries: ["french fries", "chips"],
  crisps: ["potato chips"],
  soy: ["soya"],
  cheddar: ["cheese"],
  noodle: ["pasta", "noodles"],
  pasta: ["noodle", "noodles"],
  bell: ["pepper"],
  oats: ["oatmeal", "oat"],
  oatmeal: ["oats"],
  taters: ["potato"],
  spud: ["potato"],
  beef: ["steak"],
  soda_water: ["sparkling water"],
};

/** Lowercase, strip punctuation, drop a trailing plural. */
export function normalizeTerm(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (w.length > 3 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

const tokens = (s: string) => s.split(/\s+/).map(normalizeTerm).filter(Boolean);

/** Every variant of a typed word we should accept as a match. */
function variants(word: string): string[] {
  const base = normalizeTerm(word);
  const extra = (SYNONYMS[word.toLowerCase()] ?? SYNONYMS[base] ?? []).flatMap(s => tokens(s));
  return Array.from(new Set([base, ...extra])).filter(Boolean);
}

interface Scored { name: string; brand?: string | null; category?: string }

/**
 * Score a food against a typed term. Every typed word must match somewhere
 * (name, brand, or category); name matches count far more than brand matches.
 */
function scoreFood(food: Scored, term: string): number {
  const raw = term.trim().toLowerCase();
  if (!raw) return 0;

  const name = food.name.toLowerCase();
  const brand = (food.brand ?? "").toLowerCase();
  const cat = (food.category ?? "").toLowerCase();

  const nameTokens = tokens(name);
  const brandTokens = tokens(brand);
  const catTokens = tokens(cat);

  let score = 0;
  if (name === raw) score += 120;
  else if (name.startsWith(raw)) score += 70;
  else if (name.includes(raw)) score += 40;

  const words = raw.split(/\s+/).filter(Boolean);
  for (const w of words) {
    const vs = variants(w);
    if (!vs.length) continue;
    const inNameWhole = vs.some(v => nameTokens.includes(v));
    const inNamePrefix = vs.some(v => nameTokens.some(t => t.startsWith(v)));
    const inNamePart = vs.some(v => nameTokens.some(t => t.includes(v)));
    const inBrand = vs.some(v => brandTokens.some(t => t.includes(v)));
    const inCat = vs.some(v => catTokens.some(t => t.includes(v)));

    if (inNameWhole) score += 25;
    else if (inNamePrefix) score += 18;
    else if (inNamePart) score += 10;
    else if (inBrand) score += 6;
    else if (inCat) score += 4;
    else return 0; // this word matched nothing — not a real result
  }

  // Prefer simple, ingredient-style names over long packaged ones.
  score += Math.max(0, 12 - nameTokens.length);
  return score;
}

/** Search the built-in catalog. Store filter narrows to that grocer's brands. */
export function searchCatalog(query: string, store?: Store | null, limit = 12): CatalogFood[] {
  const q = query.trim();
  const pool = FOOD_CATALOG.filter(f => (store ? f.store === store : true));
  if (!q) return pool.slice(0, limit);
  return pool
    .map(f => ({ f, score: scoreFood(f, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name))
    .slice(0, limit)
    .map(x => x.f);
}

/** Merge catalog matches ahead of remote results, dropping duplicates. */
export function mergeWithCatalog(
  query: string, remote: FoodCandidate[], store?: Store | null, limit = 16,
): FoodCandidate[] {
  const local = searchCatalog(query, store, limit);
  const keyOf = (f: FoodCandidate) =>
    f.barcode ? `bc:${f.barcode}` : `${normalizeTerm(f.name)}|${(f.brand ?? "").toLowerCase()}`;
  const seen = new Set(local.map(keyOf));
  const rest: FoodCandidate[] = [];
  for (const r of remote) {
    const key = keyOf(r);
    if (seen.has(key)) continue;
    if (store && storeForBrand(r.brand) !== store) continue;
    seen.add(key);
    rest.push(r);
  }
  return [...local, ...rankByRelevance(rest, query)];
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
