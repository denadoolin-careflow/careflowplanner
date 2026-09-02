/**
 * WellFlow data layer — goals, food entries, saved foods, water, weight,
 * GLP-1 profile/injections, and daily wellness check-ins.
 *
 * Everything is private to the signed-in user (row-level security on the
 * server). A tiny event bus keeps every mounted card in sync after a write.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_GLP1, DEFAULT_GOALS, n, todayISO,
  type FoodCandidate, type FoodEntry, type Glp1Profile, type Goals,
  type Injection, type MealType, type SavedFood, type WaterEntry,
  type WeightEntry, type WellnessCheckIn,
} from "./types";

/* ------------------------------------------------------------------ bus */

type Channel =
  | "goals" | "food" | "saved-foods" | "water"
  | "weight" | "glp1" | "injections" | "checkin";

const listeners: Record<string, Set<() => void>> = {};

export function emitWellflow(ch: Channel) {
  listeners[ch]?.forEach((f) => f());
}

function useChannel(ch: Channel, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const cb = () => ref.current();
    (listeners[ch] ??= new Set()).add(cb);
    return () => { listeners[ch]?.delete(cb); };
  }, [ch]);
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------------------------------------------------------------- goals */

export function useGoals() {
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("nutrition_goals").select("*").maybeSingle();
    setGoals(data ? { ...DEFAULT_GOALS, ...data } as Goals : DEFAULT_GOALS);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useChannel("goals", load);

  const save = useCallback(async (patch: Partial<Goals>) => {
    const user_id = await uid();
    if (!user_id) return;
    const next = { ...goals, ...patch };
    await supabase.from("nutrition_goals").upsert({ user_id, ...next }, { onConflict: "user_id" });
    setGoals(next);
    emitWellflow("goals");
  }, [goals]);

  return { goals, loading, save };
}

/* ----------------------------------------------------------- food entries */

const mapFood = (r: any): FoodEntry => ({
  id: r.id,
  date: r.date,
  logged_at: r.logged_at ?? r.created_at,
  food_name: r.food_name,
  serving_size: r.serving_size ?? null,
  servings: n(r.servings, 1),
  calories: n(r.calories),
  protein: n(r.protein),
  carbs: n(r.carbs),
  fat: n(r.fat),
  fiber: n(r.fiber),
  meal_type: (r.meal_type ?? "other") as MealType,
  source: r.source ?? null,
  notes: r.notes ?? null,
});

export function useFoodEntries(date: string) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("food_entries")
      .select("*").eq("date", date).order("logged_at", { ascending: true });
    setEntries((data ?? []).map(mapFood));
    setLoading(false);
  }, [date]);

  useEffect(() => { setLoading(true); void load(); }, [load]);
  useChannel("food", load);

  return { entries, loading, reload: load };
}

export async function logFood(input: {
  date?: string;
  candidate: FoodCandidate;
  servings: number;
  mealType: MealType;
  notes?: string | null;
  /** "HH:MM" — when the food was actually eaten. Defaults to now. */
  time?: string | null;
}) {
  const user_id = await uid();
  if (!user_id) throw new Error("Please sign in");
  const c = input.candidate;
  const mult = input.servings;
  const day = input.date ?? todayISO();
  const loggedAt = input.time
    ? new Date(`${day}T${input.time.length === 5 ? `${input.time}:00` : input.time}`).toISOString()
    : new Date().toISOString();
  const { data, error } = await supabase.from("food_entries").insert({
    user_id,
    date: day,
    logged_at: loggedAt,
    food_name: c.brand ? `${c.name} (${c.brand})` : c.name,
    serving_size: c.servingSize ?? null,
    servings: mult,
    calories: Math.round(c.calories * mult),
    protein: +(c.protein * mult).toFixed(1),
    carbs: +(c.carbs * mult).toFixed(1),
    fat: +(c.fat * mult).toFixed(1),
    fiber: +(c.fiber * mult).toFixed(1),
    meal_type: input.mealType,
    source: c.source ?? "manual",
    notes: input.notes ?? null,
  }).select().single();
  if (error) throw error;

  // Remember the food so it shows up under Recent / Custom next time.
  await rememberFood(c);
  emitWellflow("food");
  return mapFood(data);
}

export async function updateFoodEntry(id: string, patch: Partial<FoodEntry>) {
  await supabase.from("food_entries").update(patch as any).eq("id", id);
  emitWellflow("food");
}

export async function deleteFoodEntry(id: string) {
  await supabase.from("food_entries").delete().eq("id", id);
  emitWellflow("food");
}

/* ----------------------------------------------------------- saved foods */

const mapSaved = (r: any): SavedFood => ({
  id: r.id,
  name: r.name,
  brand: r.brand ?? null,
  serving_size: r.serving_size ?? null,
  calories: n(r.calories),
  protein: n(r.protein),
  carbs: n(r.carbs),
  fat: n(r.fat),
  fiber: n(r.fiber),
  favorite: !!r.favorite,
  times_logged: n(r.times_logged),
  barcode: r.barcode ?? null,
});

export const savedToCandidate = (s: SavedFood): FoodCandidate => ({
  id: s.id,
  name: s.name,
  brand: s.brand,
  servingSize: s.serving_size,
  calories: s.calories,
  protein: s.protein,
  carbs: s.carbs,
  fat: s.fat,
  fiber: s.fiber,
  barcode: s.barcode,
  source: "saved",
  savedId: s.id,
});

export function useSavedFoods() {
  const [foods, setFoods] = useState<SavedFood[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("custom_foods").select("*")
      .order("times_logged", { ascending: false }).limit(200);
    setFoods((data ?? []).map(mapSaved));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useChannel("saved-foods", load);

  return { foods, loading, reload: load };
}

/** Insert or bump a food in the user's personal library. */
export async function rememberFood(c: FoodCandidate) {
  const user_id = await uid();
  if (!user_id) return;
  const { data: existing } = await supabase.from("custom_foods").select("id, times_logged")
    .eq("name", c.name).limit(1).maybeSingle();
  if (existing) {
    await supabase.from("custom_foods")
      .update({ times_logged: n(existing.times_logged) + 1 }).eq("id", existing.id);
  } else {
    await supabase.from("custom_foods").insert({
      user_id, name: c.name, brand: c.brand ?? null, serving_size: c.servingSize ?? null,
      calories: c.calories, protein: c.protein, carbs: c.carbs, fat: c.fat, fiber: c.fiber,
      barcode: c.barcode ?? null, times_logged: 1,
    });
  }
  emitWellflow("saved-foods");
}

export async function toggleFavoriteFood(id: string, favorite: boolean) {
  await supabase.from("custom_foods").update({ favorite }).eq("id", id);
  emitWellflow("saved-foods");
}

export async function deleteSavedFood(id: string) {
  await supabase.from("custom_foods").delete().eq("id", id);
  emitWellflow("saved-foods");
}

/* --------------------------------------------------------------- search */

/** Open Food Facts lookup, proxied through an edge function. */
export async function searchFoods(query: string, barcode?: string): Promise<FoodCandidate[]> {
  const { data, error } = await supabase.functions.invoke("food-search", {
    body: barcode ? { barcode } : { query },
  });
  if (error) throw error;
  return ((data as any)?.results ?? []).map((r: any, i: number): FoodCandidate => ({
    id: r.barcode ?? `off-${i}-${r.name}`,
    name: r.name,
    brand: r.brand ?? null,
    servingSize: r.servingSize ?? null,
    calories: n(r.calories),
    protein: n(r.protein),
    carbs: n(r.carbs),
    fat: n(r.fat),
    fiber: n(r.fiber),
    barcode: r.barcode ?? null,
    source: "openfoodfacts",
  }));
}

/** Plain-language estimate ("2 eggs and toast") — always shown for review. */
export async function parseFoodText(text: string): Promise<FoodCandidate[]> {
  const { data, error } = await supabase.functions.invoke("ai-food-parse", { body: { text } });
  if (error) throw error;
  return ((data as any)?.items ?? []).map((r: any, i: number): FoodCandidate => ({
    id: `ai-${i}-${r.name}`,
    name: r.name,
    servingSize: r.servingSize ?? r.serving_size ?? null,
    servings: n(r.servings, 1),
    calories: n(r.calories),
    protein: n(r.protein),
    carbs: n(r.carbs),
    fat: n(r.fat),
    fiber: n(r.fiber),
    source: "ai",
  }));
}

/* ---------------------------------------------------------------- water */

export function useWaterEntries(date: string) {
  const [entries, setEntries] = useState<WaterEntry[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("water_entries").select("*")
      .eq("date", date).order("logged_at", { ascending: true });
    setEntries((data ?? []).map((r: any) => ({
      id: r.id, date: r.date, logged_at: r.logged_at ?? r.created_at, ounces: n(r.ounces),
    })));
  }, [date]);

  useEffect(() => { void load(); }, [load]);
  useChannel("water", load);

  return { entries, total: entries.reduce((s, e) => s + e.ounces, 0), reload: load };
}

export async function logWater(ounces: number, date = todayISO()) {
  const user_id = await uid();
  if (!user_id) throw new Error("Please sign in");
  await supabase.from("water_entries").insert({
    user_id, date, ounces, logged_at: new Date().toISOString(),
  });
  emitWellflow("water");
}

export async function deleteWater(id: string) {
  await supabase.from("water_entries").delete().eq("id", id);
  emitWellflow("water");
}

/* --------------------------------------------------------------- weight */

export function useWeights() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("weight_logs").select("*").order("date", { ascending: true });
    setEntries((data ?? []).map((r: any) => ({
      id: r.id, date: r.date, weight_lb: n(r.weight_lb), notes: r.notes ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useChannel("weight", load);

  return { entries, loading, latest: entries[entries.length - 1] ?? null, reload: load };
}

export async function logWeight(weight_lb: number, date = todayISO(), notes?: string | null) {
  const user_id = await uid();
  if (!user_id) throw new Error("Please sign in");
  await supabase.from("weight_logs").insert({ user_id, date, weight_lb, notes: notes ?? null });
  emitWellflow("weight");
}

export async function deleteWeight(id: string) {
  await supabase.from("weight_logs").delete().eq("id", id);
  emitWellflow("weight");
}

/* ----------------------------------------------------------------- GLP-1 */

export function useGlp1Profile() {
  const [profile, setProfile] = useState<Glp1Profile>(DEFAULT_GLP1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("glp1_profile").select("*").maybeSingle();
    setProfile(data ? { ...DEFAULT_GLP1, ...data } as Glp1Profile : DEFAULT_GLP1);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useChannel("glp1", load);

  const save = useCallback(async (patch: Partial<Glp1Profile>) => {
    const user_id = await uid();
    if (!user_id) return;
    const next = { ...profile, ...patch };
    await supabase.from("glp1_profile").upsert({ user_id, ...next }, { onConflict: "user_id" });
    setProfile(next);
    emitWellflow("glp1");
  }, [profile]);

  return { profile, loading, save };
}

export function useInjections() {
  const [injections, setInjections] = useState<Injection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("glp1_injections").select("*").order("date", { ascending: false });
    setInjections((data ?? []).map((r: any) => ({
      id: r.id, date: r.date, time_of_day: r.time_of_day ?? null,
      medication: r.medication ?? null, dose: r.dose ?? null,
      injection_site: r.injection_site ?? null,
      symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
      notes: r.notes ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useChannel("injections", load);

  return { injections, loading, last: injections[0] ?? null, reload: load };
}

export async function logInjection(input: Partial<Injection> & { date: string }) {
  const user_id = await uid();
  if (!user_id) throw new Error("Please sign in");
  await supabase.from("glp1_injections").insert({
    user_id,
    date: input.date,
    time_of_day: input.time_of_day ?? null,
    medication: input.medication ?? null,
    dose: input.dose ?? null,
    injection_site: input.injection_site ?? null,
    symptoms: input.symptoms ?? [],
    notes: input.notes ?? null,
  });
  emitWellflow("injections");
}

export async function updateInjection(id: string, patch: Partial<Injection>) {
  await supabase.from("glp1_injections").update(patch as any).eq("id", id);
  emitWellflow("injections");
}

export async function deleteInjection(id: string) {
  await supabase.from("glp1_injections").delete().eq("id", id);
  emitWellflow("injections");
}

/** Days between injections implied by the profile frequency. */
export function frequencyDays(frequency: string | null | undefined) {
  switch ((frequency ?? "weekly").toLowerCase()) {
    case "daily": return 1;
    case "biweekly":
    case "every 2 weeks": return 14;
    case "monthly": return 30;
    default: return 7;
  }
}

export function nextInjectionDate(lastDate: string | null, frequency: string | null) {
  if (!lastDate) return null;
  const d = new Date(`${lastDate}T12:00:00`);
  d.setDate(d.getDate() + frequencyDays(frequency));
  return d.toISOString().slice(0, 10);
}

export function daysBetween(isoA: string, isoB: string) {
  const a = new Date(`${isoA}T12:00:00`).getTime();
  const b = new Date(`${isoB}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/* -------------------------------------------------------------- check-in */

export function useCheckIn(date: string) {
  const [checkIn, setCheckIn] = useState<WellnessCheckIn>({
    date, hunger: null, fullness: null, energy: null,
    nausea: null, digestion: null, mood: null, notes: null,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("wellness_checkins").select("*").eq("date", date).maybeSingle();
    setCheckIn({
      date,
      id: data?.id,
      hunger: data?.hunger ?? null,
      fullness: data?.fullness ?? null,
      energy: data?.energy ?? null,
      nausea: data?.nausea ?? null,
      digestion: data?.digestion ?? null,
      mood: data?.mood ?? null,
      notes: data?.notes ?? null,
    });
    setLoading(false);
  }, [date]);

  useEffect(() => { setLoading(true); void load(); }, [load]);
  useChannel("checkin", load);

  const save = useCallback(async (patch: Partial<WellnessCheckIn>) => {
    const user_id = await uid();
    if (!user_id) return;
    const next = { ...checkIn, ...patch };
    setCheckIn(next);
    const { id, ...rest } = next;
    await supabase.from("wellness_checkins")
      .upsert({ user_id, ...rest }, { onConflict: "user_id,date" });
    emitWellflow("checkin");
  }, [checkIn]);

  return { checkIn, loading, save };
}

/* --------------------------------------------------------------- totals */

export interface DayTotals {
  calories: number; protein: number; carbs: number; fat: number; fiber: number; meals: number;
}

export function sumEntries(entries: FoodEntry[]): DayTotals {
  return entries.reduce<DayTotals>((acc, e) => ({
    calories: acc.calories + e.calories,
    protein: acc.protein + e.protein,
    carbs: acc.carbs + e.carbs,
    fat: acc.fat + e.fat,
    fiber: acc.fiber + e.fiber,
    meals: acc.meals + 1,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 });
}
