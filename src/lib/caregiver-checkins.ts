import { supabase } from "@/integrations/supabase/client";

export interface CaregiverCheckin {
  id?: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  water: boolean;
  food: boolean;
  meds: boolean;
  outside: boolean;
  movement: boolean;
  sleep_hours: number | null;
  energy: number | null; // 1..10
  mood: string | null;
  updated_at?: string;
}

export const EMPTY_CHECKIN = (date: string): CaregiverCheckin => ({
  date,
  water: false,
  food: false,
  meds: false,
  outside: false,
  movement: false,
  sleep_hours: null,
  energy: null,
  mood: null,
});

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function loadCheckin(uid: string, date = todayISO()): Promise<CaregiverCheckin> {
  const { data } = await supabase
    .from("caregiver_checkins" as any)
    .select("*")
    .eq("user_id", uid)
    .eq("date", date)
    .maybeSingle();
  return (data as any) ?? EMPTY_CHECKIN(date);
}

export async function saveCheckin(uid: string, patch: Partial<CaregiverCheckin> & { date: string }): Promise<CaregiverCheckin> {
  const existing = await loadCheckin(uid, patch.date);
  const merged: CaregiverCheckin = { ...existing, ...patch };
  const { data } = await supabase
    .from("caregiver_checkins" as any)
    .upsert(
      {
        user_id: uid,
        date: merged.date,
        water: merged.water,
        food: merged.food,
        meds: merged.meds,
        outside: merged.outside,
        movement: merged.movement,
        sleep_hours: merged.sleep_hours,
        energy: merged.energy,
        mood: merged.mood,
      },
      { onConflict: "user_id,date" },
    )
    .select()
    .single();
  return (data as any) ?? merged;
}

export { todayISO as todayCheckinISO };