/**
 * Project folders — ClickUp-style grouping above projects.
 * A folder is just a named bucket; projects carry `folderId`.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  parentId?: string;
}

const fromRow = (r: any): ProjectFolder => ({
  id: r.id,
  name: r.name,
  color: r.color ?? undefined,
  icon: r.icon ?? undefined,
  sortOrder: r.sort_order ?? 0,
  parentId: r.parent_id ?? undefined,
});

export async function listProjectFolders(): Promise<ProjectFolder[]> {
  const { data, error } = await supabase
    .from("project_folders" as any)
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createProjectFolder(patch: { name: string; color?: string; icon?: string; sortOrder?: number; parentId?: string }): Promise<ProjectFolder> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("Not authenticated");
  const name = patch.name.trim();
  if (!name) throw new Error("Folder name is required");
  const { data, error } = await supabase
    .from("project_folders" as any)
    .insert({
      user_id: u.user.id,
      name,
      color: patch.color ?? null,
      icon: patch.icon ?? null,
      sort_order: patch.sortOrder ?? 0,
      parent_id: patch.parentId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateProjectFolder(id: string, patch: Partial<Omit<ProjectFolder, "id">>): Promise<void> {
  const row: any = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.color !== undefined) row.color = patch.color ?? null;
  if (patch.icon !== undefined) row.icon = patch.icon ?? null;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.parentId !== undefined) row.parent_id = patch.parentId ?? null;
  const { error } = await supabase.from("project_folders" as any).update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteProjectFolder(id: string): Promise<void> {
  const { error } = await supabase.from("project_folders" as any).delete().eq("id", id);
  if (error) throw error;
}

/** Shared store so every surface sees the same folders. */
let cache: ProjectFolder[] | null = null;
const subs = new Set<(f: ProjectFolder[]) => void>();
const emit = (next: ProjectFolder[]) => { cache = next; subs.forEach(fn => fn(next)); };

export function useProjectFolders() {
  const [folders, setFolders] = useState<ProjectFolder[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    subs.add(setFolders);
    return () => { subs.delete(setFolders); };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try { emit(await listProjectFolders()); }
    catch (e) { console.warn("listProjectFolders failed", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (cache === null) void reload(); }, [reload]);

  const add = useCallback(async (patch: Parameters<typeof createProjectFolder>[0]) => {
    const created = await createProjectFolder({ ...patch, sortOrder: patch.sortOrder ?? (cache?.length ?? 0) });
    emit([...(cache ?? []), created]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Omit<ProjectFolder, "id">>) => {
    await updateProjectFolder(id, patch);
    emit((cache ?? []).map(f => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteProjectFolder(id);
    emit((cache ?? []).filter(f => f.id !== id));
  }, []);

  return { folders, loading, reload, add, update, remove };
}

/** Remembered collapse state per folder. */
const COLLAPSE_KEY = "careflow:projects:folder-collapse";
export function readCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? "{}"); } catch { return {}; }
}
export function writeCollapsed(next: Record<string, boolean>) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* noop */ }
}
