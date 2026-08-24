/**
 * Who a meal is for. Links a meal row to a care recipient or loved one with an
 * optional serve time, so "What's for dinner" can say who and when.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PersonKind } from "@/lib/people-directory";

export interface MealPerson {
  id: string;
  mealId: string;
  personId: string;
  personKind: PersonKind;
  serveTime?: string;
}

const EVENT = "careflow:meal-people-changed";

function fromRow(r: any): MealPerson {
  return {
    id: r.id,
    mealId: r.meal_id,
    personId: r.person_id,
    personKind: (r.person_kind ?? "recipient") as PersonKind,
    serveTime: r.serve_time ?? undefined,
  };
}

export async function listMealPeople(mealIds: string[]): Promise<MealPerson[]> {
  if (mealIds.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from("meal_people").select("*").in("meal_id", mealIds);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function linkMealPerson(input: {
  mealId: string; personId: string; personKind: PersonKind; serveTime?: string | null;
}): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await (supabase as any).from("meal_people").upsert({
    user_id: uid,
    meal_id: input.mealId,
    person_id: input.personId,
    person_kind: input.personKind,
    serve_time: input.serveTime ?? null,
  }, { onConflict: "meal_id,person_id" });
  if (error) throw error;
  notify();
}

export async function setMealServeTime(mealId: string, serveTime: string | null): Promise<void> {
  const { error } = await (supabase as any)
    .from("meal_people").update({ serve_time: serveTime }).eq("meal_id", mealId);
  if (error) throw error;
  notify();
}

export async function unlinkMealPerson(mealId: string, personId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("meal_people").delete().eq("meal_id", mealId).eq("person_id", personId);
  if (error) throw error;
  notify();
}

function notify() {
  try { window.dispatchEvent(new CustomEvent(EVENT)); } catch { /* noop */ }
}

/** Live links for a set of meals (usually today's meals). */
export function useMealPeople(mealIds: string[]) {
  const key = mealIds.slice().sort().join(",");
  const [rows, setRows] = useState<MealPerson[]>([]);

  const reload = useCallback(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) { setRows([]); return; }
    listMealPeople(ids).then(setRows).catch(() => setRows([]));
  }, [key]);

  useEffect(() => {
    reload();
    const on = () => reload();
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [reload]);

  return { links: rows, reload };
}
