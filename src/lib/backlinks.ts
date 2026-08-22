/**
 * Backlinks — the reverse half of `@` references.
 *
 * `note_links` and `task_links` record "this note/task points at that entity".
 * Reading them the other way around tells any entity who mentions it, so a
 * task, note, project or person can show a "Linked from" list.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EntityType } from "@/lib/note-links";

export interface Backlink {
  /** What kind of thing does the mentioning? */
  sourceType: "note" | "task";
  sourceId: string;
  title: string;
  snippet?: string;
  /** Longer excerpt used by the hover preview. */
  preview?: string;
  /** ISO timestamp of the source's last edit, for preview context. */
  updatedAt?: string;
  /** "note" | "journal" for notes; "done" | "open" for tasks. */
  kindLabel?: string;
  route: string;
}

const snippetOf = (body: string | null | undefined, max = 120) => {
  const text = (body ?? "").replace(/[#*_>`\-]/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) + (text.length > max ? "…" : "") : undefined;
};

export async function listBacklinks(entityType: EntityType, entityId: string): Promise<Backlink[]> {
  if (!entityId) return [];

  const [noteRes, taskRes] = await Promise.all([
    (supabase as any)
      .from("note_links")
      .select("note_id, notes:note_id (id, title, body, kind, updated_at)")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId),
    (supabase as any)
      .from("task_links")
      .select("task_id, tasks:task_id (id, title, notes, done, due_date, updated_at)")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId),
  ]);

  const out: Backlink[] = [];
  const seen = new Set<string>();

  for (const r of (noteRes.data ?? []) as any[]) {
    const n = r.notes;
    const id = n?.id ?? r.note_id;
    if (!id || seen.has(`note:${id}`)) continue;
    seen.add(`note:${id}`);
    out.push({
      sourceType: "note",
      sourceId: id,
      title: n?.title?.trim() || (n?.kind === "journal" ? "Journal entry" : "Untitled note"),
      snippet: snippetOf(n?.body),
      preview: snippetOf(n?.body, 320),
      updatedAt: n?.updated_at ?? undefined,
      kindLabel: n?.kind === "journal" ? "Journal" : "Note",
      // Journal entries are note rows too, so the note route opens the exact
      // entry rather than dropping you on the journal index.
      route: `/notes/${id}`,
    });
  }

  for (const r of (taskRes.data ?? []) as any[]) {
    const t = r.tasks;
    const id = t?.id ?? r.task_id;
    if (!id || seen.has(`task:${id}`)) continue;
    seen.add(`task:${id}`);
    out.push({
      sourceType: "task",
      sourceId: id,
      title: t?.title?.trim() || "Untitled task",
      snippet: snippetOf(t?.notes),
      preview: snippetOf(t?.notes, 320),
      updatedAt: t?.updated_at ?? undefined,
      kindLabel: t?.done ? "Completed task" : "Task",
      route: `/anytime?taskId=${id}`,
    });
  }

  return out;
}

export function useBacklinks(entityType: EntityType | null, entityId: string | null) {
  const [links, setLinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!entityType || !entityId) { setLinks([]); return; }
    setLoading(true);
    try { setLinks(await listBacklinks(entityType, entityId)); }
    catch (e) { console.warn("listBacklinks failed", e); }
    finally { setLoading(false); }
  }, [entityType, entityId]);

  useEffect(() => { void reload(); }, [reload]);

  return { links, loading, reload, count: links.length };
}
