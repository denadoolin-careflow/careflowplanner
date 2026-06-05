/**
 * Lightweight keyword-based grocery categorizer.
 * Maps an item name to one of the standard grocery list categories.
 * Used when a user (or smart-grocery auto-populate) adds an item
 * without an explicit category so it lands in the right column.
 */

export type GroceryCategory =
  | "Produce"
  | "Dairy"
  | "Meat"
  | "Frozen"
  | "Bakery"
  | "Pantry"
  | "Snacks"
  | "Beverages"
  | "Household"
  | "Pets"
  | "Other";

const RULES: Array<{ cat: GroceryCategory; words: string[] }> = [
  { cat: "Produce", words: [
    "apple","banana","berry","berries","blueberr","strawberr","raspberr","grape",
    "lemon","lime","orange","clementine","mandarin","peach","pear","plum","mango",
    "pineapple","melon","watermelon","kiwi","avocado","tomato","cucumber","lettuce",
    "spinach","kale","arugula","cabbage","carrot","celery","onion","scallion","garlic",
    "ginger","pepper","jalapeno","broccoli","cauliflower","zucchini","squash","corn",
    "potato","sweet potato","mushroom","cilantro","parsley","basil","mint","herb",
    "salad","greens","fruit","veggie","vegetable",
  ]},
  { cat: "Dairy", words: [
    "milk","cream","yogurt","yoghurt","butter","cheese","cheddar","mozzarella","parmesan",
    "feta","cottage cheese","cream cheese","sour cream","half and half","creamer",
    "egg","eggs",
  ]},
  { cat: "Meat", words: [
    "chicken","beef","steak","ground beef","pork","bacon","sausage","turkey","ham",
    "lamb","veal","ribs","brisket","tenderloin","salmon","tuna","shrimp","fish",
    "tilapia","cod","seafood","deli",
  ]},
  { cat: "Frozen", words: [
    "frozen","ice cream","popsicle","tv dinner","ice","waffle","frozen pizza","frozen veggies",
  ]},
  { cat: "Bakery", words: [
    "bread","bagel","baguette","tortilla","pita","bun","roll","muffin","croissant",
    "donut","cake","cookie","pastry","pie crust","naan",
  ]},
  { cat: "Pantry", words: [
    "rice","pasta","noodle","ramen","oat","oats","cereal","granola","flour","sugar",
    "salt","pepper","spice","seasoning","oil","olive oil","vinegar","soy sauce",
    "ketchup","mustard","mayo","mayonnaise","sauce","stock","broth","bean","lentil",
    "chickpea","canned","tomato sauce","peanut butter","jam","jelly","honey","syrup",
    "tea bag","coffee bean","quinoa","tortilla chip","cracker","baking",
  ]},
  { cat: "Snacks", words: [
    "chip","chips","pretzel","popcorn","candy","chocolate","cookie","granola bar",
    "snack","trail mix","nuts","almond","cashew","peanut","raisin",
  ]},
  { cat: "Beverages", words: [
    "water","sparkling","soda","pop","juice","lemonade","tea","coffee","kombucha",
    "beer","wine","seltzer","gatorade","energy drink",
  ]},
  { cat: "Household", words: [
    "paper towel","toilet paper","tp","tissue","napkin","dish soap","sponge","detergent",
    "laundry","bleach","cleaner","trash bag","ziploc","foil","plastic wrap","light bulb",
    "battery","candle","air freshener","shampoo","conditioner","soap","toothpaste",
    "deodorant","razor","floss",
  ]},
  { cat: "Pets", words: [
    "dog food","cat food","cat litter","pet","kibble","treat","leash","catnip",
  ]},
];

const KNOWN_CATEGORIES = new Set<string>(RULES.map(r => r.cat).concat("Other"));

/**
 * Returns the best-guess category for a grocery item name, or `fallback`
 * (default "Other") when no rule matches.
 */
export function categorizeGroceryItem(name: string, fallback: GroceryCategory = "Other"): GroceryCategory {
  const n = String(name ?? "").toLowerCase().trim();
  if (!n) return fallback;
  for (const rule of RULES) {
    for (const w of rule.words) {
      // word-boundary-ish match: substring is fine for things like "ground beef"
      if (n.includes(w)) return rule.cat;
    }
  }
  return fallback;
}

/** True when `cat` is one of the standard category names this module knows about. */
export function isKnownCategory(cat: string | null | undefined): boolean {
  return !!cat && KNOWN_CATEGORIES.has(cat);
}