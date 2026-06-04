import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aiInvoke } from "@/lib/ai-invoke";

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

export interface RoutineItem {
  id: string;
  text: string;
  done: boolean;
  icon?: string;        // emoji or short label
  durationMin?: number; // estimated minutes for this step
  note?: string;
  /** Optional fixed clock time (HH:mm). When set, the step anchors to this time
   *  in computeNowNext instead of chaining from the previous step's duration. */
  startTime?: string;
}

export interface RoutineMeta {
  prepNoticeMin?: number; // 0/2/5/10
  color?: string;
}
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
  meta: RoutineMeta;
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
  void resetRoutinesIfNewDay();
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
    meta: (r.meta && typeof r.meta === "object") ? r.meta as RoutineMeta : {},
  };
}

function ensureLoaded() {
  if (loaded || loading) return loading;
  loading = loadAll().finally(() => { loading = null; });
  return loading;
}

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }

const RESET_KEY = "careflow:routines:last-reset-date";
function todayISO() { return new Date().toISOString().slice(0, 10); }

async function resetRoutinesIfNewDay() {
  if (typeof localStorage === "undefined") return;
  const today = todayISO();
  let last: string | null = null;
  try { last = localStorage.getItem(RESET_KEY); } catch { /* */ }
  if (last === today) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const toReset = cache.filter(r => r.items.some(i => i.done));
  for (const r of toReset) {
    const items = r.items.map(i => i.done ? { ...i, done: false } : i);
    await supabase
      .from("routines" as any)
      .update({ items } as any)
      .eq("user_id", user.id)
      .eq("person_name", r.person_name)
      .eq("slot", r.slot);
  }
  if (toReset.length) {
    cache = cache.map(r => toReset.includes(r) ? { ...r, items: r.items.map(i => ({ ...i, done: false })) } : r);
    emit();
  }
  try { localStorage.setItem(RESET_KEY, today); } catch { /* */ }
}

export const routines = {
  /**
   * Reset all routine item `done` flags to false when the day rolls over.
   * Historical completions are preserved separately in `routine_completions`.
   */
  async resetIfNewDay() { return resetRoutinesIfNewDay(); },
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
    patch: Partial<Pick<Routine, "items" | "notes" | "cadence" | "tags" | "recipient_id" | "time_of_day" | "meta">>,
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
    const meta = patch.meta !== undefined ? { ...(existing?.meta ?? {}), ...patch.meta } : (existing?.meta ?? {});
    const row = { user_id: user.id, person_name: person, slot, items, notes, cadence, tags, recipient_id, time_of_day, meta };
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
    const items = [...(r?.items ?? []), { id: uid(), text, done: false, durationMin: 5 }];
    await routines.upsert(person, slot, { items });
  },
  async reorderItems(person: string, slot: RoutineSlot, fromIdx: number, toIdx: number) {
    const r = routines.find(person, slot);
    if (!r) return;
    if (fromIdx === toIdx || fromIdx < 0 || fromIdx >= r.items.length) return;
    const items = r.items.slice();
    const [moved] = items.splice(fromIdx, 1);
    const clampedTo = Math.max(0, Math.min(items.length, toIdx));
    items.splice(clampedTo, 0, moved);
    await routines.upsert(person, slot, { items });
  },
  async updateItem(person: string, slot: RoutineSlot, itemId: string, patch: Partial<RoutineItem>) {
    const r = routines.find(person, slot);
    if (!r) return;
    const items = r.items.map(i => i.id === itemId ? { ...i, ...patch } : i);
    await routines.upsert(person, slot, { items });
  },
  async toggleItem(person: string, slot: RoutineSlot, itemId: string) {
    const r = routines.find(person, slot);
    if (!r) return;
    const target = r.items.find(i => i.id === itemId);
    const nextDone = !target?.done;
    const items = r.items.map(i => i.id === itemId ? { ...i, done: nextDone } : i);
    await routines.upsert(person, slot, { items });
    // Log completion for garden / consistency tracking.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().slice(0, 10);
        if (nextDone) {
          await supabase.from("routine_completions" as any).upsert({
            user_id: user.id, routine_id: r.id, item_id: itemId, completed_on: today,
          } as any, { onConflict: "user_id,routine_id,item_id,completed_on" } as any);
        } else {
          await supabase.from("routine_completions" as any).delete()
            .eq("user_id", user.id).eq("routine_id", r.id)
            .eq("item_id", itemId).eq("completed_on", today);
        }
      }
    } catch { /* non-fatal */ }
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
    const { ensureWithinLimit } = await import("@/lib/limit-guard");
    // Count distinct people as routines
    const peopleCount = new Set(cache.map(r => r.person_name.toLowerCase())).size;
    const ok = await ensureWithinLimit("routines", peopleCount);
    if (!ok) return;
    await routines.upsert(trimmed, "morning", { items: [] });
  },
  async removePerson(name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("routines" as any).delete().eq("user_id", user.id).eq("person_name", name);
    cache = cache.filter(r => r.person_name !== name);
    emit();
  },
  async renamePerson(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("routines" as any)
      .update({ person_name: trimmed } as any)
      .eq("user_id", user.id)
      .eq("person_name", oldName);
    cache = cache.map(r => r.person_name === oldName ? { ...r, person_name: trimmed } : r);
    emit();
  },
  async generateIdeas(person: string, slot: RoutineSlot, style?: string): Promise<string[]> {
    const { data, error, quotaExceeded } = await aiInvoke("ai-routine-ideas", {
      body: { person, slot, style },
    });
    if (quotaExceeded) return [];
    if (error) throw error;
    return (data?.ideas ?? []) as string[];
  },
  async breakdown(goal: string, opts?: { person?: string; slot?: RoutineSlot }): Promise<Array<{ text: string; icon?: string; durationMin?: number }>> {
    const { data, error, quotaExceeded } = await aiInvoke("ai-routine-breakdown", {
      body: { goal, person: opts?.person, slot: opts?.slot },
    });
    if (quotaExceeded) return [];
    if (error) throw error;
    return (data?.steps ?? []) as Array<{ text: string; icon?: string; durationMin?: number }>;
  },
  reload: loadAll,
};

// ---------- Pure helpers ----------

export function routineTotalMinutes(r: Routine): number {
  return r.items.reduce((sum, it) => sum + (it.durationMin ?? 5), 0);
}

/** Compute current/next step for one person's routines based on clock time + cumulative item durations. */
export function computeNowNext(rs: Routine[], now: Date = new Date()): {
  current?: { routine: Routine; item: RoutineItem; endsAt: Date; startsAt: Date };
  next?: { routine: Routine; item: RoutineItem; startsAt: Date };
  upcoming?: { routine: Routine; startsAt: Date; prepInMin: number };
} {
  type Block = { routine: Routine; item: RoutineItem; startsAt: Date; endsAt: Date };
  const blocks: Block[] = [];
  const today = new Date(now); today.setSeconds(0, 0);
  for (const r of rs) {
    const t = r.time_of_day ?? SLOT_DEFAULT_TIME[r.slot];
    if (!t) continue;
    const [hh, mm] = t.split(":").map(n => parseInt(n, 10));
    if (Number.isNaN(hh)) continue;
    let cursor = new Date(today); cursor.setHours(hh, mm || 0, 0, 0);
    for (const it of r.items) {
      const dur = it.durationMin ?? 5;
      let startsAt = new Date(cursor);
      if (it.startTime) {
        const [ih, im] = it.startTime.split(":").map(n => parseInt(n, 10));
        if (!Number.isNaN(ih)) {
          startsAt = new Date(today); startsAt.setHours(ih, im || 0, 0, 0);
        }
      }
      const endsAt = new Date(startsAt.getTime() + dur * 60_000);
      blocks.push({ routine: r, item: it, startsAt, endsAt });
      cursor = endsAt;
    }
  }
  blocks.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const current = blocks.find(b => now >= b.startsAt && now < b.endsAt && !b.item.done);
  const future = blocks.filter(b => b.startsAt > now);
  const next = future[0];
  // Find soonest routine starting within prep window
  let upcoming: { routine: Routine; startsAt: Date; prepInMin: number } | undefined;
  for (const r of rs) {
    const prep = r.meta?.prepNoticeMin ?? 0;
    if (!prep) continue;
    const t = r.time_of_day ?? SLOT_DEFAULT_TIME[r.slot];
    if (!t) continue;
    const [hh, mm] = t.split(":").map(n => parseInt(n, 10));
    const startsAt = new Date(today); startsAt.setHours(hh, mm || 0, 0, 0);
    const diffMin = (startsAt.getTime() - now.getTime()) / 60_000;
    if (diffMin > 0 && diffMin <= prep) {
      if (!upcoming || startsAt < upcoming.startsAt) {
        upcoming = { routine: r, startsAt, prepInMin: Math.ceil(diffMin) };
      }
    }
  }
  return {
    current: current ? { routine: current.routine, item: current.item, endsAt: current.endsAt, startsAt: current.startsAt } : undefined,
    next: next ? { routine: next.routine, item: next.item, startsAt: next.startsAt } : undefined,
    upcoming,
  };
}

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