import { supabase } from "@/integrations/supabase/client";

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  body: string;
  createdAt: string;
}

const fromRow = (r: any): NoteVersion => ({
  id: r.id, noteId: r.note_id, title: r.title ?? "", body: r.body ?? "", createdAt: r.created_at,
});

/** Keep at most this many saved versions per note. */
const MAX_VERSIONS = 40;
/** Don't snapshot more often than this (ms) while someone keeps typing. */
const MIN_GAP_MS = 3 * 60 * 1000;

const lastSnapshot = new Map<string, number>();

export async function listNoteVersions(noteId: string): Promise<NoteVersion[]> {
  const { data, error } = await supabase
    .from("note_versions")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false })
    .limit(MAX_VERSIONS + 10);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

/**
 * Store a formatted snapshot of the note, unless an identical one is already
 * the newest version or we snapshotted very recently.
 */
export async function snapshotNote(noteId: string, title: string, body: string): Promise<void> {
  const now = Date.now();
  const last = lastSnapshot.get(noteId) ?? 0;
  if (now - last < MIN_GAP_MS) return;

  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return;

  const { data: recent } = await supabase
    .from("note_versions")
    .select("id, title, body, created_at")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false })
    .limit(1);
  const top = recent?.[0] as any;
  if (top && top.title === title && top.body === body) {
    lastSnapshot.set(noteId, now);
    return;
  }
  if (top && now - new Date(top.created_at).getTime() < MIN_GAP_MS) {
    lastSnapshot.set(noteId, now);
    return;
  }

  const { error } = await supabase.from("note_versions").insert({
    note_id: noteId, user_id: u.user.id, title, body,
  });
  if (error) return;
  lastSnapshot.set(noteId, now);
  void pruneVersions(noteId);
}

async function pruneVersions(noteId: string) {
  const { data } = await supabase
    .from("note_versions")
    .select("id")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false });
  const extra = (data ?? []).slice(MAX_VERSIONS).map((r: any) => r.id);
  if (extra.length) await supabase.from("note_versions").delete().in("id", extra);
}
