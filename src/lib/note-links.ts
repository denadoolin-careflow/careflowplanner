import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Note } from "@/lib/notes";

export type EntityType = "task" | "project" | "goal" | "habit" | "appointment" | "time_block";

export const ENTITY_LABEL: Record<EntityType, string> = {
  task: "Task",
  project: "Project",
  goal: "Goal",
  habit: "Habit",
  appointment: "Appointment",
  time_block: "Time block",
};

export const ENTITY_ROUTE: Record<EntityType, (id: string) => string> = {
  task: () => "/anytime",
  project: (id) => `/projects/${id}`,
  goal: () => "/goals",
  habit: () => "/habits",
  appointment: () => "/calendar",
  time_block: () => "/today",
};

export interface NoteLink {
  id: string;
  noteId: string;
  entityType: EntityType;
  entityId: string;
  createdAt: string;
}

const fromRow = (r: any): NoteLink => ({
  id: r.id, noteId: r.note_id, entityType: r.entity_type, entityId: r.entity_id, createdAt: r.created_at,
});

const noteFromRow = (r: any): Note => ({
  id: r.id, userId: r.user_id, title: r.title ?? "", body: r.body ?? "",
  kind: r.kind, date: r.date ?? null, projectId: r.project_id ?? null,
  pinned: !!r.pinned, archived: !!r.archived,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export async function linkNote(noteId: string, entityType: EntityType, entityId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not authenticated");
  const { error } = await supabase
    .from("note_links")
    .insert({ user_id: u.user.id, note_id: noteId, entity_type: entityType, entity_id: entityId });
  if (error && !`${error.message}`.includes("duplicate")) throw error;
}

export async function unlinkNote(noteId: string, entityType: EntityType, entityId: string): Promise<void> {
  const { error } = await supabase
    .from("note_links")
    .delete()
    .eq("note_id", noteId).eq("entity_type", entityType).eq("entity_id", entityId);
  if (error) throw error;
}

/** Notes linked to a particular entity, with note details. */
export async function notesForEntity(entityType: EntityType, entityId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("note_links")
    .select("note_id, notes:notes!inner(*)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw error;
  return (data ?? []).map((r: any) => noteFromRow(r.notes)).filter(n => !n.archived);
}

/** Entities a particular note is linked to. */
export async function linksForNote(noteId: string): Promise<NoteLink[]> {
  const { data, error } = await supabase
    .from("note_links")
    .select("*")
    .eq("note_id", noteId);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export function useEntityNotes(entityType: EntityType | null, entityId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!entityType || !entityId) { setNotes([]); return; }
    setLoading(true);
    try { setNotes(await notesForEntity(entityType, entityId)); }
    finally { setLoading(false); }
  }, [entityType, entityId]);

  useEffect(() => { void reload(); }, [reload]);

  return { notes, loading, reload };
}

export function useNoteLinks(noteId: string | null) {
  const [links, setLinks] = useState<NoteLink[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!noteId) { setLinks([]); return; }
    setLoading(true);
    try { setLinks(await linksForNote(noteId)); }
    finally { setLoading(false); }
  }, [noteId]);

  useEffect(() => { void reload(); }, [reload]);

  return { links, loading, reload };
}