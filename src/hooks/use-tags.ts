import { useCallback, useEffect, useState } from "react";
import {
  Tag, listTags, createTag, updateTag, deleteTag,
  normalizeTagName, fallbackColorFor, DEFAULT_COLOR, DEFAULT_ICON,
} from "@/lib/tags";
import { supabase } from "@/integrations/supabase/client";

let cache: Tag[] | null = null;
const subscribers = new Set<(t: Tag[]) => void>();

function emit(next: Tag[]) {
  cache = next;
  subscribers.forEach((s) => s(next));
}

/** Shared tag store. All consumers re-render together on changes. */
export function useTags() {
  const [tags, setTags] = useState<Tag[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    subscribers.add(setTags);
    return () => { subscribers.delete(setTags); };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listTags();
      emit(next);
    } catch (e) {
      console.warn("listTags failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cache !== null) return;
    void reload();
  }, [reload]);

  const byName = useCallback((name: string): Tag | undefined => {
    const norm = normalizeTagName(name).toLowerCase();
    return tags.find((t) => t.name.toLowerCase() === norm);
  }, [tags]);

  const resolve = useCallback((name: string): { name: string; color: string; icon: string } => {
    const found = byName(name);
    if (found) return { name: found.name, color: found.color, icon: found.icon };
    return { name, color: fallbackColorFor(name), icon: DEFAULT_ICON };
  }, [byName]);

  const ensure = useCallback(
    async (name: string, opts?: { color?: string; icon?: string }): Promise<Tag> => {
      const found = byName(name);
      if (found) return found;
      const created = await createTag({
        name,
        color: opts?.color ?? fallbackColorFor(name),
        icon: opts?.icon ?? DEFAULT_ICON,
      });
      emit([...(cache ?? []), created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    },
    [byName],
  );

  const rename = useCallback(async (id: string, name: string) => {
    await updateTag(id, { name });
    emit((cache ?? []).map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const recolor = useCallback(async (id: string, patch: { color?: string; icon?: string }) => {
    await updateTag(id, patch);
    emit((cache ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const setPinned = useCallback(async (id: string, pinned: boolean) => {
    await updateTag(id, { pinned });
    emit((cache ?? []).map((t) => (t.id === id ? { ...t, pinned } : t)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteTag(id);
    emit((cache ?? []).filter((t) => t.id !== id));
  }, []);

  return { tags, loading, reload, byName, resolve, ensure, rename, recolor, setPinned, remove };
}

/* expose for non-hook callers that just need the cache */
export function getCachedTags(): Tag[] { return cache ?? []; }

// Refresh after auth flips
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
    cache = null;
    subscribers.forEach((s) => s([]));
  }
});