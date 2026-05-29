import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChoreCadence = "daily" | "weekly" | "monthly" | "as_needed";

export const CHORE_CADENCES: ChoreCadence[] = ["daily", "weekly", "monthly", "as_needed"];
export const CHORE_CADENCE_LABEL: Record<ChoreCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  as_needed: "As needed",
};

export interface CaregivingChore {
  id: string;
  recipient_id: string | null;
  title: string;
  zone: string | null;
  area: string | null;
  cadence: ChoreCadence;
  assigned_to: string | null;
  notes: string | null;
  est_minutes: number | null;
  done: boolean;
  last_done_at: string | null;
  linked_task_id: string | null;
}

let cache: CaregivingChore[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<(c: CaregivingChore[]) => void>();
function emit() { listeners.forEach(l => l(cache)); }

function mapRow(r: any): CaregivingChore {
  return {
    id: r.id,
    recipient_id: r.recipient_id ?? null,
    title: r.title,
    zone: r.zone ?? null,
    area: r.area ?? "Caregiving",
    cadence: (r.cadence ?? "weekly") as ChoreCadence,
    assigned_to: r.assigned_to ?? null,
    notes: r.notes ?? null,
    est_minutes: r.est_minutes ?? null,
    done: !!r.done,
    last_done_at: r.last_done_at ?? null,
    linked_task_id: r.linked_task_id ?? null,
  };
}

async function loadAll() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { cache = []; loaded = true; emit(); return; }
  const { data } = await supabase
    .from("caregiving_chores" as any)
    .select("*")
    .order("created_at", { ascending: true });
  cache = ((data ?? []) as any[]).map(mapRow);
  loaded = true;
  emit();
}

function ensureLoaded() {
  if (loaded || loading) return loading;
  loading = loadAll().finally(() => { loading = null; });
  return loading;
}

export const caregivingChores = {
  list(): CaregivingChore[] { return cache; },
  byRecipient(recipientId: string): CaregivingChore[] {
    return cache.filter(c => c.recipient_id === recipientId);
  },
  byZone(zone: string): CaregivingChore[] {
    return cache.filter(c => (c.zone ?? "").toLowerCase() === zone.toLowerCase());
  },
  async create(patch: Partial<CaregivingChore> & { title: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("caregiving_chores" as any).insert({
      user_id: user.id,
      recipient_id: patch.recipient_id ?? null,
      title: patch.title,
      zone: patch.zone ?? null,
      area: patch.area ?? "Caregiving",
      cadence: patch.cadence ?? "weekly",
      assigned_to: patch.assigned_to ?? null,
      notes: patch.notes ?? null,
      est_minutes: patch.est_minutes ?? null,
    } as any).select().single();
    if (data) { cache = [...cache, mapRow(data)]; emit(); }
  },
  async update(id: string, patch: Partial<CaregivingChore>) {
    const { data } = await supabase.from("caregiving_chores" as any)
      .update(patch as any).eq("id", id).select().single();
    if (data) {
      cache = cache.map(c => c.id === id ? mapRow(data) : c);
      emit();
    }
  },
  async toggle(id: string) {
    const c = cache.find(x => x.id === id);
    if (!c) return;
    await caregivingChores.update(id, {
      done: !c.done,
      last_done_at: !c.done ? new Date().toISOString() : c.last_done_at,
    } as any);
  },
  async remove(id: string) {
    await supabase.from("caregiving_chores" as any).delete().eq("id", id);
    cache = cache.filter(c => c.id !== id);
    emit();
  },
  /** Push a chore as a Home/Reset task so it shows up in the daily flow. */
  async sendToHome(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const c = cache.find(x => x.id === id);
    if (!c || c.linked_task_id) return;
    const { data } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: c.title,
      notes: c.notes,
      area: "Home",
      status: "active",
      est_minutes: c.est_minutes,
    } as any).select("id").single();
    if (data?.id) {
      await caregivingChores.update(id, { linked_task_id: data.id } as any);
    }
  },
  reload: loadAll,
};

export function useCaregivingChores() {
  const [list, setList] = useState<CaregivingChore[]>(cache);
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