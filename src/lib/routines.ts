import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RoutineSlot = "morning" | "nap" | "evening";
export const ROUTINE_SLOTS: RoutineSlot[] = ["morning", "nap", "evening"];

export interface RoutineItem { id: string; text: string; done: boolean; }
export interface Routine {
  id: string;
  person_name: string;
  slot: RoutineSlot;
  items: RoutineItem[];
  notes: string | null;
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
  cache = ((data ?? []) as any[]).map(r => ({
    id: r.id,
    person_name: r.person_name,
    slot: r.slot,
    items: Array.isArray(r.items) ? r.items : [],
    notes: r.notes ?? null,
  }));
  loaded = true;
  emit();
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
  async upsert(person: string, slot: RoutineSlot, patch: Partial<Pick<Routine, "items" | "notes">>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = routines.find(person, slot);
    const items = patch.items ?? existing?.items ?? [];
    const notes = patch.notes ?? existing?.notes ?? null;
    const row = { user_id: user.id, person_name: person, slot, items, notes };
    const { data } = await supabase
      .from("routines" as any)
      .upsert(row as any, { onConflict: "user_id,person_name,slot" })
      .select()
      .single();
    if (data) {
      const r: Routine = {
        id: (data as any).id,
        person_name: (data as any).person_name,
        slot: (data as any).slot,
        items: Array.isArray((data as any).items) ? (data as any).items : [],
        notes: (data as any).notes ?? null,
      };
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