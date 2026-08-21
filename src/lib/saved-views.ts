/**
 * Saved views — a named filter + layout combination you can pin and re-run.
 * Backed by `public.saved_views` so they follow you across devices.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_WEEK_FILTERS, type WeekFilterState } from "./planner/week-filters";

export type SavedViewLayout = "schedule" | "board" | "overview" | "list" | "table";
export type SavedViewScope = "day" | "week" | "month" | "year";

export interface SavedView {
  id: string;
  name: string;
  layout: SavedViewLayout;
  scope: SavedViewScope;
  filters: WeekFilterState;
  pinned: boolean;
  sortOrder: number;
}

const fromRow = (r: any): SavedView => ({
  id: r.id,
  name: r.name,
  layout: (r.layout ?? "list") as SavedViewLayout,
  scope: (r.scope ?? "week") as SavedViewScope,
  filters: { ...EMPTY_WEEK_FILTERS, ...(r.filters ?? {}) },
  pinned: !!r.pinned,
  sortOrder: r.sort_order ?? 0,
});

export async function listSavedViews(): Promise<SavedView[]> {
  const { data, error } = await supabase
    .from("saved_views" as any)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createSavedView(patch: {
  name: string;
  layout: SavedViewLayout;
  scope: SavedViewScope;
  filters: WeekFilterState;
  pinned?: boolean;
}): Promise<SavedView> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("Not authenticated");
  const name = patch.name.trim();
  if (!name) throw new Error("Give the view a name");
  const { data, error } = await supabase
    .from("saved_views" as any)
    .insert({
      user_id: u.user.id,
      name,
      layout: patch.layout,
      scope: patch.scope,
      filters: patch.filters as any,
      pinned: patch.pinned ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateSavedView(id: string, patch: Partial<Omit<SavedView, "id">>): Promise<void> {
  const row: any = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.layout !== undefined) row.layout = patch.layout;
  if (patch.scope !== undefined) row.scope = patch.scope;
  if (patch.filters !== undefined) row.filters = patch.filters;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  const { error } = await supabase.from("saved_views" as any).update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteSavedView(id: string): Promise<void> {
  const { error } = await supabase.from("saved_views" as any).delete().eq("id", id);
  if (error) throw error;
}

/** Shared store so every planner surface sees the same saved views. */
let cache: SavedView[] | null = null;
const subs = new Set<(v: SavedView[]) => void>();
function emit(next: SavedView[]) { cache = next; subs.forEach(fn => fn(next)); }

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    subs.add(setViews);
    return () => { subs.delete(setViews); };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try { emit(await listSavedViews()); }
    catch (e) { console.warn("listSavedViews failed", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (cache === null) void reload(); }, [reload]);

  const add = useCallback(async (patch: Parameters<typeof createSavedView>[0]) => {
    const created = await createSavedView(patch);
    emit([...(cache ?? []), created]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Omit<SavedView, "id">>) => {
    await updateSavedView(id, patch);
    emit((cache ?? []).map(v => (v.id === id ? { ...v, ...patch } as SavedView : v)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteSavedView(id);
    emit((cache ?? []).filter(v => v.id !== id));
  }, []);

  return { views, loading, reload, add, update, remove };
}
