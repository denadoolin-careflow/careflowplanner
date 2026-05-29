import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProgressCategory = "milestone" | "skill" | "mood" | "health" | "behavior" | "custom";

export const PROGRESS_CATEGORIES: ProgressCategory[] = [
  "milestone", "skill", "mood", "health", "behavior", "custom",
];

export const CATEGORY_LABEL: Record<ProgressCategory, string> = {
  milestone: "Milestone",
  skill: "Skill",
  mood: "Mood",
  health: "Health",
  behavior: "Behavior",
  custom: "Other",
};

export interface ProgressEntry {
  id: string;
  recipient_id: string;
  category: ProgressCategory;
  label: string;
  value_numeric: number | null;
  value_text: string | null;
  notes: string | null;
  recorded_at: string;
}

export interface ProgressGoal {
  id: string;
  recipient_id: string;
  title: string;
  category: ProgressCategory;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  status: "active" | "achieved" | "paused";
  target_date: string | null;
  notes: string | null;
}

let eCache: ProgressEntry[] = [];
let gCache: ProgressGoal[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const eListeners = new Set<(e: ProgressEntry[]) => void>();
const gListeners = new Set<(g: ProgressGoal[]) => void>();
function emitE() { eListeners.forEach(l => l(eCache)); }
function emitG() { gListeners.forEach(l => l(gCache)); }

function mapEntry(r: any): ProgressEntry {
  return {
    id: r.id, recipient_id: r.recipient_id,
    category: (r.category ?? "custom") as ProgressCategory,
    label: r.label, value_numeric: r.value_numeric, value_text: r.value_text,
    notes: r.notes, recorded_at: r.recorded_at,
  };
}
function mapGoal(r: any): ProgressGoal {
  return {
    id: r.id, recipient_id: r.recipient_id, title: r.title,
    category: (r.category ?? "custom") as ProgressCategory,
    target_value: r.target_value, current_value: r.current_value ?? 0,
    unit: r.unit, status: (r.status ?? "active") as ProgressGoal["status"],
    target_date: r.target_date, notes: r.notes,
  };
}

async function loadAll() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { eCache = []; gCache = []; loaded = true; emitE(); emitG(); return; }
  const [{ data: eData }, { data: gData }] = await Promise.all([
    supabase.from("person_progress_entries" as any).select("*")
      .order("recorded_at", { ascending: false }).limit(500),
    supabase.from("person_progress_goals" as any).select("*"),
  ]);
  eCache = ((eData ?? []) as any[]).map(mapEntry);
  gCache = ((gData ?? []) as any[]).map(mapGoal);
  loaded = true; emitE(); emitG();
}

function ensureLoaded() {
  if (loaded || loading) return loading;
  loading = loadAll().finally(() => { loading = null; });
  return loading;
}

export const progressStore = {
  entries(recipientId: string): ProgressEntry[] {
    return eCache.filter(e => e.recipient_id === recipientId);
  },
  goals(recipientId: string): ProgressGoal[] {
    return gCache.filter(g => g.recipient_id === recipientId);
  },
  async addEntry(recipientId: string, patch: Omit<ProgressEntry, "id" | "recipient_id" | "recorded_at"> & { recorded_at?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("person_progress_entries" as any).insert({
      user_id: user.id, recipient_id: recipientId,
      category: patch.category, label: patch.label,
      value_numeric: patch.value_numeric, value_text: patch.value_text,
      notes: patch.notes, recorded_at: patch.recorded_at ?? new Date().toISOString(),
    } as any).select().single();
    if (data) { eCache = [mapEntry(data), ...eCache]; emitE(); }
  },
  async deleteEntry(id: string) {
    await supabase.from("person_progress_entries" as any).delete().eq("id", id);
    eCache = eCache.filter(e => e.id !== id); emitE();
  },
  async upsertGoal(g: Partial<ProgressGoal> & { recipient_id: string; title: string; category: ProgressCategory }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (g.id) {
      const { data } = await supabase.from("person_progress_goals" as any).update({
        title: g.title, category: g.category, target_value: g.target_value ?? null,
        current_value: g.current_value ?? 0, unit: g.unit ?? null,
        status: g.status ?? "active", target_date: g.target_date ?? null, notes: g.notes ?? null,
      } as any).eq("id", g.id).select().single();
      if (data) { gCache = gCache.map(x => x.id === g.id ? mapGoal(data) : x); emitG(); }
    } else {
      const { data } = await supabase.from("person_progress_goals" as any).insert({
        user_id: user.id, recipient_id: g.recipient_id,
        title: g.title, category: g.category, target_value: g.target_value ?? null,
        current_value: g.current_value ?? 0, unit: g.unit ?? null,
        status: g.status ?? "active", target_date: g.target_date ?? null, notes: g.notes ?? null,
      } as any).select().single();
      if (data) { gCache = [...gCache, mapGoal(data)]; emitG(); }
    }
  },
  async deleteGoal(id: string) {
    await supabase.from("person_progress_goals" as any).delete().eq("id", id);
    gCache = gCache.filter(g => g.id !== id); emitG();
  },
  reload: loadAll,
};

export function useProgressEntries() {
  const [list, setList] = useState<ProgressEntry[]>(eCache);
  useEffect(() => {
    eListeners.add(setList);
    void ensureLoaded();
    return () => { eListeners.delete(setList); };
  }, []);
  return list;
}

export function useProgressGoals() {
  const [list, setList] = useState<ProgressGoal[]>(gCache);
  useEffect(() => {
    gListeners.add(setList);
    void ensureLoaded();
    return () => { gListeners.delete(setList); };
  }, []);
  return list;
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => { loaded = false; void ensureLoaded(); });
}