/**
 * Per-person dietary preferences + allergy notes, stored in the `dietary`
 * jsonb column on loved_ones / care_recipients, and a keyword matcher that
 * flags meals which don't fit.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PersonKind } from "@/lib/people-directory";
import type { Meal } from "@/lib/types";

export interface Dietary {
  diets?: string[];
  allergies?: string[];
  notes?: string;
}

export const DIETS = ["Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free", "Low-sodium", "Low-sugar"] as const;
export const ALLERGENS = ["Peanuts", "Tree nuts", "Dairy", "Eggs", "Gluten", "Shellfish", "Fish", "Soy", "Sesame"] as const;

const MEAT = ["chicken", "beef", "pork", "bacon", "ham", "turkey", "sausage", "steak", "lamb", "pepperoni", "salami", "meatball", "brisket", "prosciutto", "chorizo", "veal", "duck", "teriyaki chicken"];
const FISH = ["fish", "salmon", "tuna", "cod", "tilapia", "halibut", "anchov", "sardine", "trout"];
const SHELL = ["shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"];
const DAIRY = ["milk", "cheese", "butter", "cream", "yogurt", "parmesan", "mozzarella", "cheddar", "ghee", "alfredo", "queso"];
const GLUTEN = ["wheat", "flour", "bread", "pasta", "noodle", "spaghetti", "barley", "rye", "couscous", "tortilla", "bun", "pizza", "breadcrumb", "soy sauce", "teriyaki", "cracker"];
const EGG = ["egg", "mayo", "mayonnaise", "meringue"];
const NUTS = ["almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "pine nut"];
const SOY = ["soy", "tofu", "edamame", "tempeh", "miso", "teriyaki"];
const SALTY = ["bacon", "ham", "soy sauce", "pickle", "salami", "teriyaki"];
const SUGARY = ["sugar", "syrup", "honey", "candy", "cake", "cookie", "frosting"];

const ALLERGEN_WORDS: Record<string, string[]> = {
  Peanuts: ["peanut"], "Tree nuts": NUTS, Dairy: DAIRY, Eggs: EGG, Gluten: GLUTEN,
  Shellfish: SHELL, Fish: FISH, Soy: SOY, Sesame: ["sesame", "tahini"],
};
const DIET_WORDS: Record<string, string[]> = {
  Vegetarian: [...MEAT, ...FISH, ...SHELL],
  Vegan: [...MEAT, ...FISH, ...SHELL, ...DAIRY, ...EGG, "honey"],
  Pescatarian: MEAT,
  "Gluten-free": GLUTEN, "Dairy-free": DAIRY, "Low-sodium": SALTY, "Low-sugar": SUGARY,
};

export interface DietConflict { rule: string; kind: "allergy" | "diet"; word: string }

/** Find ingredients/names in a meal that clash with someone's dietary info. */
export function mealConflicts(meal: Pick<Meal, "name" | "ingredients" | "tags">, d?: Dietary | null): DietConflict[] {
  if (!d) return [];
  const text = [meal.name, ...(meal.ingredients ?? []), ...(meal.tags ?? [])].join(" \n ").toLowerCase();
  const hit = (words: string[]) => words.find((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text));
  const out: DietConflict[] = [];
  for (const a of d.allergies ?? []) {
    const w = hit(ALLERGEN_WORDS[a] ?? [a.toLowerCase()]);
    if (w) out.push({ rule: a, kind: "allergy", word: w });
  }
  for (const di of d.diets ?? []) {
    const w = hit(DIET_WORDS[di] ?? []);
    if (w) out.push({ rule: di, kind: "diet", word: w });
  }
  return out;
}

const EVENT = "careflow:dietary-changed";
const table = (k: PersonKind) => (k === "recipient" ? "care_recipients" : "loved_ones");

export async function saveDietary(personId: string, kind: PersonKind, d: Dietary) {
  const { error } = await (supabase as any).from(table(kind)).update({ dietary: d }).eq("id", personId);
  if (error) throw error;
  window.dispatchEvent(new Event(EVENT));
}

/** Dietary info for everyone, keyed by person id. */
export function useDietaryMap() {
  const [map, setMap] = useState<Record<string, Dietary>>({});
  const reload = useCallback(async () => {
    const [a, b] = await Promise.all([
      (supabase as any).from("loved_ones").select("id,dietary"),
      (supabase as any).from("care_recipients").select("id,dietary"),
    ]);
    const next: Record<string, Dietary> = {};
    for (const r of [...(a.data ?? []), ...(b.data ?? [])]) if (r.dietary) next[r.id] = r.dietary;
    setMap(next);
  }, []);
  useEffect(() => {
    void reload();
    window.addEventListener(EVENT, reload);
    return () => window.removeEventListener(EVENT, reload);
  }, [reload]);
  return map;
}

export const hasDietary = (d?: Dietary) => !!(d && ((d.diets?.length ?? 0) + (d.allergies?.length ?? 0) > 0 || d.notes?.trim()));
