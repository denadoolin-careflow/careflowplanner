import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { phaseForDate, type CyclePhase, type PeriodLog, type CycleSettings } from "@/lib/cycle";

export type CheckinCadence = "daily" | "weekly" | "cycle_phase" | "custom_days";

export interface PersonCheckin {
  id: string;
  recipient_id: string;
  title: string;
  prompt: string | null;
  cadence: CheckinCadence;
  cadence_config: { phase?: CyclePhase; days?: string[]; weekday?: number };
  last_completed_at: string | null;
  next_due_at: string | null;
  active: boolean;
}

export interface CheckinResponse {
  id: string;
  checkin_id: string;
  recipient_id: string;
  mood: number | null;
  energy: number | null;
  notes: string | null;
  tags: string[];
  cycle_phase: string | null;
  responded_at: string;
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function atMorning(d: Date): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(d, 9), 0), 0), 0);
}

/** Compute next_due_at for a check-in, considering recipient cycle data when relevant. */
export function computeNextDue(
  c: Pick<PersonCheckin, "cadence" | "cadence_config" | "last_completed_at">,
  periods: PeriodLog[],
  cycleSettings: CycleSettings,
  from: Date = new Date(),
): string {
  const base = atMorning(addDays(from, c.last_completed_at ? 0 : 0));

  if (c.cadence === "daily") {
    return atMorning(addDays(from, 1)).toISOString();
  }
  if (c.cadence === "weekly") {
    const wd = c.cadence_config.weekday ?? from.getDay();
    for (let i = 1; i <= 14; i++) {
      const d = atMorning(addDays(from, i));
      if (d.getDay() === wd) return d.toISOString();
    }
    return atMorning(addDays(from, 7)).toISOString();
  }
  if (c.cadence === "custom_days") {
    const days = (c.cadence_config.days ?? []).map(d => WEEKDAYS.indexOf(d.toLowerCase())).filter(n => n >= 0);
    if (days.length === 0) return atMorning(addDays(from, 7)).toISOString();
    for (let i = 1; i <= 14; i++) {
      const d = atMorning(addDays(from, i));
      if (days.includes(d.getDay())) return d.toISOString();
    }
    return atMorning(addDays(from, 7)).toISOString();
  }
  if (c.cadence === "cycle_phase") {
    const wantPhase = c.cadence_config.phase;
    if (!wantPhase || !cycleSettings.enabled || periods.length === 0) {
      // Fallback to weekly
      return atMorning(addDays(from, 7)).toISOString();
    }
    for (let i = 1; i <= 60; i++) {
      const d = addDays(from, i);
      const p = phaseForDate(d, periods, cycleSettings);
      if (p === wantPhase) return atMorning(d).toISOString();
    }
    return atMorning(addDays(from, 14)).toISOString();
  }
  return atMorning(addDays(from, 7)).toISOString();
}

// ---- store ----
let cache: PersonCheckin[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<(c: PersonCheckin[]) => void>();
function emit() { listeners.forEach(l => l(cache)); }

function mapRow(r: any): PersonCheckin {
  return {
    id: r.id,
    recipient_id: r.recipient_id,
    title: r.title,
    prompt: r.prompt ?? null,
    cadence: (r.cadence ?? "weekly") as CheckinCadence,
    cadence_config: (r.cadence_config && typeof r.cadence_config === "object") ? r.cadence_config : {},
    last_completed_at: r.last_completed_at ?? null,
    next_due_at: r.next_due_at ?? null,
    active: !!r.active,
  };
}

async function loadAll() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { cache = []; loaded = true; emit(); return; }
  const { data } = await supabase
    .from("person_checkins" as any)
    .select("*")
    .order("next_due_at", { ascending: true, nullsFirst: true });
  cache = ((data ?? []) as any[]).map(mapRow);
  loaded = true;
  emit();
}

function ensureLoaded() {
  if (loaded || loading) return loading;
  loading = loadAll().finally(() => { loading = null; });
  return loading;
}

export const checkinsStore = {
  list(): PersonCheckin[] { return cache; },
  byRecipient(recipientId: string): PersonCheckin[] {
    return cache.filter(c => c.recipient_id === recipientId);
  },
  due(recipientId: string, now: Date = new Date()): PersonCheckin[] {
    return checkinsStore.byRecipient(recipientId).filter(c =>
      c.active && (!c.next_due_at || new Date(c.next_due_at) <= now)
    );
  },
  async create(
    recipientId: string,
    patch: { title: string; prompt?: string; cadence: CheckinCadence; cadence_config?: any },
    periods: PeriodLog[],
    cycleSettings: CycleSettings,
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = computeNextDue({
      cadence: patch.cadence,
      cadence_config: patch.cadence_config ?? {},
      last_completed_at: null,
    }, periods, cycleSettings);
    const { data } = await supabase
      .from("person_checkins" as any)
      .insert({
        user_id: user.id,
        recipient_id: recipientId,
        title: patch.title,
        prompt: patch.prompt ?? null,
        cadence: patch.cadence,
        cadence_config: patch.cadence_config ?? {},
        next_due_at: next,
        active: true,
      } as any)
      .select().single();
    if (data) { cache = [...cache, mapRow(data)]; emit(); }
  },
  async update(id: string, patch: Partial<PersonCheckin>) {
    const { data } = await supabase.from("person_checkins" as any)
      .update(patch as any).eq("id", id).select().single();
    if (data) {
      cache = cache.map(c => c.id === id ? mapRow(data) : c);
      emit();
    }
  },
  async remove(id: string) {
    await supabase.from("person_checkins" as any).delete().eq("id", id);
    cache = cache.filter(c => c.id !== id);
    emit();
  },
  async recordResponse(
    checkin: PersonCheckin,
    response: { mood?: number; energy?: number; notes?: string; tags?: string[]; cycle_phase?: string | null },
    periods: PeriodLog[],
    cycleSettings: CycleSettings,
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date();
    await supabase.from("person_checkin_responses" as any).insert({
      user_id: user.id,
      checkin_id: checkin.id,
      recipient_id: checkin.recipient_id,
      mood: response.mood ?? null,
      energy: response.energy ?? null,
      notes: response.notes ?? null,
      tags: response.tags ?? [],
      cycle_phase: response.cycle_phase ?? null,
      responded_at: now.toISOString(),
    } as any);
    const next = computeNextDue(checkin, periods, cycleSettings, now);
    await checkinsStore.update(checkin.id, {
      last_completed_at: now.toISOString(),
      next_due_at: next,
    } as any);
  },
  async listResponses(checkinId: string, limit = 30): Promise<CheckinResponse[]> {
    const { data } = await supabase
      .from("person_checkin_responses" as any)
      .select("*")
      .eq("checkin_id", checkinId)
      .order("responded_at", { ascending: false })
      .limit(limit);
    return ((data ?? []) as any[]).map(r => ({
      id: r.id, checkin_id: r.checkin_id, recipient_id: r.recipient_id,
      mood: r.mood, energy: r.energy, notes: r.notes,
      tags: r.tags ?? [], cycle_phase: r.cycle_phase, responded_at: r.responded_at,
    }));
  },
  async listResponsesByRecipient(recipientId: string, limit = 500): Promise<CheckinResponse[]> {
    const { data } = await supabase
      .from("person_checkin_responses" as any)
      .select("*")
      .eq("recipient_id", recipientId)
      .order("responded_at", { ascending: true })
      .limit(limit);
    return ((data ?? []) as any[]).map(r => ({
      id: r.id, checkin_id: r.checkin_id, recipient_id: r.recipient_id,
      mood: r.mood, energy: r.energy, notes: r.notes,
      tags: r.tags ?? [], cycle_phase: r.cycle_phase, responded_at: r.responded_at,
    }));
  },
  reload: loadAll,
};

export function useCheckins() {
  const [list, setList] = useState<PersonCheckin[]>(cache);
  useEffect(() => {
    listeners.add(setList);
    void ensureLoaded();
    return () => { listeners.delete(setList); };
  }, []);
  return list;
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => { loaded = false; void ensureLoaded(); });
}