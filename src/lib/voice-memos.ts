import { supabase } from "@/integrations/supabase/client";

export interface VoiceMemoRow {
  id: string;
  user_id: string;
  path: string;
  note_id: string | null;
  duration_ms: number;
  mime: string | null;
  transcript: string | null;
  summary: string | null;
  transcript_edited: boolean;
  created_at: string;
  updated_at: string;
}

const db = () => (supabase as any).from("voice_memos");

/** Note id from the current page URL (/notes/:id), if any. */
export function currentNoteId(): string | null {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/^\/notes\/([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

export async function createVoiceMemo(input: { path: string; duration_ms: number; mime?: string; note_id?: string | null }) {
  const { data, error } = await db().insert(input).select().single();
  if (error) throw error;
  return data as VoiceMemoRow;
}

/** Find the memo row for a storage path, creating it for older memos made before the library existed. */
export async function ensureVoiceMemo(path: string, duration_ms = 0): Promise<VoiceMemoRow | null> {
  const { data } = await db().select("*").eq("path", path).maybeSingle();
  if (data) return data as VoiceMemoRow;
  try { return await createVoiceMemo({ path, duration_ms, note_id: currentNoteId() }); } catch { return null; }
}

export async function updateVoiceMemo(id: string, patch: Partial<Pick<VoiceMemoRow, "transcript" | "summary" | "transcript_edited" | "note_id">>) {
  const { error } = await db().update(patch).eq("id", id);
  if (error) throw error;
}

export async function listVoiceMemos(): Promise<VoiceMemoRow[]> {
  const { data, error } = await db().select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VoiceMemoRow[];
}

/** Deletes the recording file and its library entry. */
export async function deleteVoiceMemo(memo: { id?: string | null; path: string }) {
  await supabase.storage.from("note-audio").remove([memo.path]);
  if (memo.id) await db().delete().eq("id", memo.id);
  else await db().delete().eq("path", memo.path);
}

async function invokeMessage(error: any, fallback: string) {
  let msg = error?.message;
  try { const j = await error?.context?.json?.(); if (j?.message) msg = j.message; } catch { /* noop */ }
  return msg || fallback;
}

export async function transcribeVoiceMemo(path: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("transcribe-voice-memo", { body: { path } });
  if (error) throw new Error(await invokeMessage(error, "Couldn't transcribe this memo"));
  return String(data?.text ?? "").trim();
}

export async function summarizeVoiceMemo(id: string, transcript: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("summarize-voice-memo", { body: { id, transcript } });
  if (error) throw new Error(await invokeMessage(error, "Couldn't summarize this memo"));
  return String(data?.summary ?? "").trim();
}

export const fmtMemoDuration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
