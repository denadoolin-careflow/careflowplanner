import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RoutineSlot = "morning" | "afternoon" | "evening" | "night" | "nap" | "anytime";
export const ROUTINE_SLOTS: RoutineSlot[] = ["morning", "afternoon", "evening", "night", "nap", "anytime"];
export const SLOT_LABEL: Record<RoutineSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  nap: "Nap time",
  anytime: "Anytime",
};

export type RoutineCadence = "daily" | "weekly" | "monthly" | "custom";
export const ROUTINE_CADENCES: RoutineCadence[] = ["daily", "weekly", "monthly", "custom"];
export const CADENCE_LABEL: Record<RoutineCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

export const SLOT_DEFAULT_TIME: Record<RoutineSlot, string> = {
  morning: "07:00",
  afternoon: "13:00",
  evening: "18:00",
  night: "21:00",
  nap: "12:30",
  anytime: "09:00",
};

export function formatTime12(t: string | null | undefined): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr ?? "0", 10);
  if (Number.isNaN(h)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${period}` : `${h12} ${period}`;
}

export interface RoutineItem { id: string; text: string; done: boolean; }
export interface Routine {
  id: string;
  person_name: string;
  slot: RoutineSlot;
  items: RoutineItem[];
  notes: string | null;
  cadence: RoutineCadence;
  tags: string[];
  recipient_id: string | null;
  time_of_day: string | null;
}

let cache: Routine[] = [];
const listeners = new Set<(r: Routine[]) => void>();
let loaded = false;
let loading: Promise<void> | null = null;

function emit() { listeners.forEach(l => l(cache)); }

async function loadAll() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { cache = []; loaded = true; emit(); return; }
  const { data } = await supabase
    .from("routines" as any)
    .select("*")
    .order("person_name", { ascending: true });
  cache = ((data ?? []) as any[]).map(mapRow);
  loaded = true;
  emit();
}

function mapRow(r: any): Routine {
  return {
    id: r.id,
    person_name: r.person_name,
    slot: r.slot,
    items: Array.isArray(r.items) ? r.items : [],
    notes: r.notes ?? null,
    cadence: (r.cadence ?? "daily") as RoutineCadence,
    tags: Array.isArray(r.tags) ? r.tags : [],
    recipient_id: r.recipient_id ?? null,
    time_of_day: r.time_of_day ?? null,
  };
}

function ensureLoaded() {
  if (loaded || loading) return loading;
  loading = loadAll().finally(() => { loading = null; });
  return loading;
}

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }

export const routines = {
  list(): Routine[] { return cache; },
  people(): string[] {
    return Array.from(new Set(cache.map(r => r.person_name))).sort();
  },
  find(person: string, slot: RoutineSlot): Routine | undefined {
    return cache.find(r => r.person_name === person && r.slot === slot);
  },
  byPerson(person: string): Routine[] {
    return cache.filter(r => r.person_name === person);
  },
  byRecipient(recipientId: string): Routine[] {
    return cache.filter(r => r.recipient_id === recipientId);
  },
  allTags(): string[] {
    const s = new Set<string>();
    cache.forEach(r => r.tags.forEach(t => s.add(t)));
    return Array.from(s).sort();
  },
  async upsert(
    person: string,
    slot: RoutineSlot,
    patch: Partial<Pick<Routine, "items" | "notes" | "cadence" | "tags" | "recipient_id" | "time_of_day">>,
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = routines.find(person, slot);
    const items = patch.items ?? existing?.items ?? [];
    const notes = patch.notes ?? existing?.notes ?? null;
    const cadence = patch.cadence ?? existing?.cadence ?? "daily";
    const tags = patch.tags ?? existing?.tags ?? [];
    const recipient_id = patch.recipient_id !== undefined ? patch.recipient_id : (existing?.recipient_id ?? null);
    const time_of_day = patch.time_of_day !== undefined ? patch.time_of_day : (existing?.time_of_day ?? null);
    const row = { user_id: user.id, person_name: person, slot, items, notes, cadence, tags, recipient_id, time_of_day };
    const { data } = await supabase
      .from("routines" as any)
      .upsert(row as any, { onConflict: "user_id,person_name,slot" })
      .select()
      .single();
    if (data) {
      const r = mapRow(data);
      const idx = cache.findIndex(x => x.person_name === person && x.slot === slot);
      if (idx >= 0) cache = cache.map((x, i) => i === idx ? r : x);
      else cache = [...cache, r];
      emit();
    }
  },
  async addItem(person: string, slot: RoutineSlot, text: string) {
    const r = routines.find(person, slot);
    const items = [...(r?.items ?? []), { id: uid(), text, done: false }];
    await routines.upsert(person, slot, { items });
  },
  async toggleItem(person: string, slot: RoutineSlot, itemId: string) {
    const r = routines.find(person, slot);
    if (!r) return;
    const items = r.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i);
    await routines.upsert(person, slot, { items });
  },
  async editItem(person: string, slot: RoutineSlot, itemId: string, text: string) {
    const r = routines.find(person, slot);
    if (!r) return;
    const items = r.items.map(i => i.id === itemId ? { ...i, text } : i);
    await routines.upsert(person, slot, { items });
  },
  async removeItem(person: string, slot: RoutineSlot, itemId: string) {
    const r = routines.find(person, slot);
    if (!r) return;
    const items = r.items.filter(i => i.id !== itemId);
    await routines.upsert(person, slot, { items });
  },
  async addPerson(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (cache.some(r => r.person_name.toLowerCase() === trimmed.toLowerCase())) return;
    await routines.upsert(trimmed, "morning", { items: [] });
  },
  async removePerson(name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("routines" as any).delete().eq("user_id", user.id).eq("person_name", name);
    cache = cache.filter(r => r.person_name !== name);
    emit();
  },
  async generateIdeas(person: string, slot: RoutineSlot, style?: string): Promise<string[]> {
    const { data, error } = await supabase.functions.invoke("ai-routine-ideas", {
      body: { person, slot, style },
    });
    if (error) throw error;
    return (data?.ideas ?? []) as string[];
  },
  reload: loadAll,
};

export function useRoutines() {
  const [list, setList] = useState<Routine[]>(cache);
  const [isLoaded, setIsLoaded] = useState(loaded);
  useEffect(() => {
    listeners.add(setList);
    void ensureLoaded()?.then(() => setIsLoaded(true));
    if (loaded) setIsLoaded(true);
    return () => { listeners.delete(setList); };
  }, []);
  return { routines: list, loaded: isLoaded };
}

// Reload when auth changes
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => { loaded = false; void ensureLoaded(); });
}