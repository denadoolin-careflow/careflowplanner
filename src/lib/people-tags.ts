import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PersonTag {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

/** Curated palette for family member chips. */
export const PERSON_COLORS = [
  "#f97373", "#f59e0b", "#facc15", "#84cc16", "#22c55e",
  "#14b8a6", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899",
  "#78716c", "#64748b", "#c4654a", "#87a878", "#c9a84c",
];

/** Deterministic fallback when no color is set. */
export function fallbackPersonColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PERSON_COLORS[Math.abs(h) % PERSON_COLORS.length];
}

let cache: PersonTag[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<(p: PersonTag[]) => void>();
function emit() { listeners.forEach(l => l(cache)); }

async function loadAll() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { cache = []; loaded = true; emit(); return; }
  const { data } = await supabase
    .from("routine_people" as any)
    .select("*")
    .order("name", { ascending: true });
  cache = ((data ?? []) as any[]).map(r => ({
    id: r.id, name: r.name, color: r.color, icon: r.icon,
  }));
  loaded = true;
  emit();
}

function ensureLoaded() {
  if (loaded || loading) return loading;
  loading = loadAll().finally(() => { loading = null; });
  return loading;
}

export const peopleTags = {
  list(): PersonTag[] { return cache; },
  get(name: string): PersonTag | undefined {
    return cache.find(p => p.name.toLowerCase() === name.toLowerCase());
  },
  colorFor(name: string): string {
    return peopleTags.get(name)?.color || fallbackPersonColor(name);
  },
  iconFor(name: string): string | undefined {
    return peopleTags.get(name)?.icon || undefined;
  },
  async upsert(name: string, patch: { color?: string | null; icon?: string | null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = peopleTags.get(name);
    const row: any = {
      user_id: user.id,
      name,
      color: patch.color !== undefined ? patch.color : existing?.color ?? null,
      icon: patch.icon !== undefined ? patch.icon : existing?.icon ?? null,
    };
    const { data } = await supabase
      .from("routine_people" as any)
      .upsert(row, { onConflict: "user_id,name" })
      .select()
      .single();
    if (data) {
      const tag: PersonTag = { id: (data as any).id, name: (data as any).name, color: (data as any).color, icon: (data as any).icon };
      const idx = cache.findIndex(p => p.name === name);
      if (idx >= 0) cache = cache.map((p, i) => i === idx ? tag : p);
      else cache = [...cache, tag];
      emit();
    }
  },
  async rename(oldName: string, newName: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("routine_people" as any)
      .update({ name: newName } as any)
      .eq("user_id", user.id).eq("name", oldName);
    cache = cache.map(p => p.name === oldName ? { ...p, name: newName } : p);
    emit();
  },
  async remove(name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("routine_people" as any)
      .delete().eq("user_id", user.id).eq("name", name);
    cache = cache.filter(p => p.name !== name);
    emit();
  },
  reload: loadAll,
};

export function usePeopleTags() {
  const [list, setList] = useState<PersonTag[]>(cache);
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