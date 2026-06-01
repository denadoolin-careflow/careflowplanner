import { supabase } from "@/integrations/supabase/client";

export const LOCATIONS = ["Fridge", "Freezer", "Pantry", "Cabinets", "Other"] as const;
export type Location = typeof LOCATIONS[number];

export const LOCATION_META: Record<Location, { emoji: string; hint: string }> = {
  Fridge:   { emoji: "🧊", hint: "Cold storage — dairy, produce, leftovers" },
  Freezer:  { emoji: "❄️", hint: "Frozen meals, veggies, meat" },
  Pantry:   { emoji: "🫙", hint: "Dry goods, canned, grains, snacks" },
  Cabinets: { emoji: "🪟", hint: "Oils, spices, baking, condiments" },
  Other:    { emoji: "📦", hint: "Anywhere else you store food" },
};

/** Static starter library. Each row becomes a pantry_item at status "out" with restock_cadence=none. */
export const SEED_INVENTORY: Record<Location, { name: string; restock?: "weekly" | "biweekly" }[]> = {
  Fridge: [
    { name: "Milk", restock: "weekly" },
    { name: "Eggs", restock: "weekly" },
    { name: "Butter", restock: "biweekly" },
    { name: "Yogurt", restock: "weekly" },
    { name: "Cheese" },
    { name: "Lettuce / greens", restock: "weekly" },
    { name: "Tomatoes" },
    { name: "Onions" },
    { name: "Carrots" },
    { name: "Apples", restock: "weekly" },
    { name: "Bananas", restock: "weekly" },
    { name: "Lemons" },
    { name: "Leftovers" },
  ],
  Freezer: [
    { name: "Frozen berries" },
    { name: "Frozen veggies (mix)" },
    { name: "Frozen peas" },
    { name: "Chicken breast" },
    { name: "Ground beef" },
    { name: "Salmon fillets" },
    { name: "Frozen pizza" },
    { name: "Ice cream" },
    { name: "Bread (backup loaf)" },
    { name: "Ice" },
  ],
  Pantry: [
    { name: "Rice" },
    { name: "Pasta" },
    { name: "Bread", restock: "weekly" },
    { name: "Tortillas" },
    { name: "Oats", restock: "biweekly" },
    { name: "Cereal" },
    { name: "Canned tomatoes" },
    { name: "Canned beans" },
    { name: "Tuna" },
    { name: "Peanut butter" },
    { name: "Jam / honey" },
    { name: "Crackers" },
    { name: "Chips / snacks" },
    { name: "Granola bars" },
    { name: "Coffee", restock: "biweekly" },
    { name: "Tea" },
    { name: "Potatoes" },
    { name: "Garlic" },
  ],
  Cabinets: [
    { name: "Olive oil" },
    { name: "Cooking oil" },
    { name: "Vinegar" },
    { name: "Soy sauce" },
    { name: "Hot sauce" },
    { name: "Ketchup" },
    { name: "Mustard" },
    { name: "Mayo" },
    { name: "Salt" },
    { name: "Black pepper" },
    { name: "Garlic powder" },
    { name: "Paprika" },
    { name: "Cumin" },
    { name: "Cinnamon" },
    { name: "Sugar" },
    { name: "Flour" },
    { name: "Baking powder" },
    { name: "Baking soda" },
    { name: "Vanilla extract" },
    { name: "Honey" },
  ],
  Other: [
    { name: "Paper towels", restock: "biweekly" },
    { name: "Trash bags", restock: "biweekly" },
    { name: "Dish soap" },
    { name: "Sponges" },
    { name: "Foil / parchment" },
    { name: "Ziploc bags" },
  ],
};

export async function seedInventory(userId: string, opts: { onlyMissing?: boolean } = { onlyMissing: true }) {
  const existing = new Set<string>();
  if (opts.onlyMissing) {
    const { data } = await supabase.from("pantry_items").select("name").eq("user_id", userId);
    (data ?? []).forEach((r: any) => existing.add(String(r.name).toLowerCase().trim()));
  }
  const rows: any[] = [];
  let order = 0;
  for (const loc of LOCATIONS) {
    for (const item of SEED_INVENTORY[loc]) {
      if (existing.has(item.name.toLowerCase().trim())) continue;
      rows.push({
        user_id: userId,
        name: item.name,
        location: loc,
        category: loc === "Freezer" ? "Frozen" : loc === "Fridge" ? "Fridge" : "Other",
        stock_status: "out",
        in_stock: false,
        restock_cadence: item.restock ?? "none",
        sort_order: ++order,
      });
    }
  }
  if (!rows.length) return { inserted: 0 };
  const { error } = await supabase.from("pantry_items").insert(rows as any);
  if (error) throw error;
  return { inserted: rows.length };
}