/** Shared WellFlow types — nutrition, water, weight, GLP-1, and check-ins. */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

export const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
  { key: "other", label: "Other" },
];

export interface FoodEntry {
  id: string;
  date: string;
  logged_at: string;
  food_name: string;
  serving_size: string | null;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  meal_type: MealType;
  source: string | null;
  notes: string | null;
}

/** A food the user saved (custom, favorite, or previously logged). */
export interface SavedFood {
  id: string;
  name: string;
  brand: string | null;
  serving_size: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  favorite: boolean;
  times_logged: number;
  barcode: string | null;
}

/** A candidate from search, AI parsing, or the user's own library. */
export interface FoodCandidate {
  id: string;
  name: string;
  brand?: string | null;
  servingSize?: string | null;
  servings?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  barcode?: string | null;
  source?: string | null;
  savedId?: string;
}

export interface Goals {
  calories: number | null;
  protein: number | null;
  fiber: number | null;
  carbs: number | null;
  fat: number | null;
  water_oz: number | null;
  starting_weight: number | null;
  goal_weight: number | null;
  weight_unit: string;
}

export const DEFAULT_GOALS: Goals = {
  calories: null, protein: null, fiber: null, carbs: null, fat: null,
  water_oz: null, starting_weight: null, goal_weight: null, weight_unit: "lb",
};

export interface WaterEntry {
  id: string;
  date: string;
  logged_at: string;
  ounces: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight_lb: number;
  notes: string | null;
}

export interface Glp1Profile {
  medication_name: string | null;
  prescribed_dose: string | null;
  frequency: string;
  injection_day: string | null;
  start_date: string | null;
  provider: string | null;
  notes: string | null;
}

export const DEFAULT_GLP1: Glp1Profile = {
  medication_name: null, prescribed_dose: null, frequency: "weekly",
  injection_day: null, start_date: null, provider: null, notes: null,
};

export interface Injection {
  id: string;
  date: string;
  time_of_day: string | null;
  medication: string | null;
  dose: string | null;
  injection_site: string | null;
  symptoms: string[];
  notes: string | null;
}

export const INJECTION_SITES = [
  "Left abdomen", "Right abdomen",
  "Left thigh", "Right thigh",
  "Left upper arm", "Right upper arm",
  "Other",
];

export const SYMPTOM_OPTIONS = ["Appetite change", "Nausea", "Low energy", "Digestion", "Headache", "Other"];

export interface WellnessCheckIn {
  id?: string;
  date: string;
  hunger: number | null;
  fullness: number | null;
  energy: number | null;
  nausea: number | null;
  digestion: number | null;
  mood: number | null;
  notes: string | null;
}

export const CHECKIN_FIELDS: { key: keyof WellnessCheckIn; label: string; low: string; high: string }[] = [
  { key: "energy", label: "Energy", low: "Depleted", high: "Bright" },
  { key: "hunger", label: "Hunger", low: "None", high: "Very hungry" },
  { key: "fullness", label: "Fullness", low: "Empty", high: "Very full" },
  { key: "nausea", label: "Nausea", low: "None", high: "Strong" },
  { key: "digestion", label: "Digestion", low: "Uneasy", high: "Comfortable" },
  { key: "mood", label: "Mood", low: "Heavy", high: "Light" },
];

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const n = (v: unknown, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};
