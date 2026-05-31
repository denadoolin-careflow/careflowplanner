import { supabase } from "@/integrations/supabase/client";

export type NoteKind = "note" | "daily";

export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: NoteKind;
  date?: string | null;
  projectId?: string | null;
  pinned: boolean;
  archived: boolean;
  tags?: string[];
  wordGoal?: number | null;
  createdAt: string;
  updatedAt: string;
}

const fromRow = (r: any): Note => ({
  id: r.id, userId: r.user_id, title: r.title ?? "", body: r.body ?? "",
  kind: r.kind, date: r.date ?? null, projectId: r.project_id ?? null,
  pinned: !!r.pinned, archived: !!r.archived,
  tags: Array.isArray(r.tags) ? r.tags : [],
  wordGoal: r.word_goal ?? null,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function getNote(id: string): Promise<Note | null> {
  const { data, error } = await supabase.from("notes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function createNote(patch: Partial<Note> = {}): Promise<Note> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not authenticated");
  const { data, error } = await supabase.from("notes").insert({
    user_id: u.user.id,
    title: patch.title ?? "",
    body: patch.body ?? "",
    kind: patch.kind ?? "note",
    date: patch.date ?? null,
    project_id: patch.projectId ?? null,
    pinned: patch.pinned ?? false,
  }).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<void> {
  const row: {
    title?: string; body?: string; pinned?: boolean; archived?: boolean;
    project_id?: string | null;
    tags?: string[];
    word_goal?: number | null;
  } = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  if (patch.archived !== undefined) row.archived = patch.archived;
  if (patch.projectId !== undefined) row.project_id = patch.projectId;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.wordGoal !== undefined) row.word_goal = patch.wordGoal;
  const { error } = await supabase.from("notes").update(row).eq("id", id);
  if (error) throw error;
  if (patch.pinned !== undefined || patch.title !== undefined || patch.archived !== undefined) {
    try { window.dispatchEvent(new Event("careflow:notes:pinned-changed")); } catch {}
  }
}

export async function listPinnedNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("pinned", true)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
  try { window.dispatchEvent(new Event("careflow:notes:pinned-changed")); } catch {}
}

/** Get-or-create today's daily note. */
export async function getOrCreateDailyNote(date: string): Promise<Note> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not authenticated");
  const existing = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", u.user.id)
    .eq("kind", "daily")
    .eq("date", date)
    .maybeSingle();
  if (existing.data) return fromRow(existing.data);
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: u.user.id, kind: "daily", date, title: date, body: "" })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Extract `[[Backlink Title]]` references from a body. */
export function extractBacklinks(body: string): string[] {
  const out = new Set<string>();
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.add(m[1].trim());
  return Array.from(out);
}

/** Find notes whose body links to the given title via [[title]]. */
export async function findBacklinksTo(title: string): Promise<Note[]> {
  if (!title.trim()) return [];
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .ilike("body", `%[[${title}]]%`)
    .eq("archived", false)
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}