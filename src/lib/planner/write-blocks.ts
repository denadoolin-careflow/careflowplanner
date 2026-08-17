/**
 * Writing sessions on the planner grid.
 *
 * A "write block" is a normal `time_blocks` row whose `link_type` / `link_id`
 * point at a note (`public.notes`) or a journal entry (`public.journal_entries`),
 * so a writing session can be scheduled, dragged and resized like anything else
 * while the underlying record still lives in Notes / Journal Flow.
 */
import { supabase } from "@/integrations/supabase/client";
import { createNote } from "@/lib/notes";

export type WriteKind = "note" | "journal";

export const WRITE_BLOCK_EVENT = "careflow:write-block:open";
export const TIME_BLOCKS_CHANGED = "careflow:time-blocks:changed";

export interface WriteBlockTarget {
  kind: WriteKind;
  /** notes.id or journal_entries.id */
  recordId: string;
  blockId?: string;
  title?: string;
}

export function openWriteBlock(target: WriteBlockTarget) {
  window.dispatchEvent(new CustomEvent(WRITE_BLOCK_EVENT, { detail: target }));
}

function notifyBlocks() {
  try { window.dispatchEvent(new Event(TIME_BLOCKS_CHANGED)); } catch { /* noop */ }
}

/** Default color token used to tint writing blocks on the grid. */
export const WRITE_BLOCK_COLOR: Record<WriteKind, string> = {
  note: "moon",
  journal: "warm",
};

export async function createJournalEntry(opts: { date: string; title: string; body?: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not authenticated");
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: u.user.id,
      date: opts.date,
      type: "daily",
      title: opts.title,
      body: opts.body ?? "",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Create a note or journal entry AND the time block that schedules it.
 * Returns the ids so the caller can immediately open the writing sheet.
 */
export async function createWriteBlock(opts: {
  kind: WriteKind;
  title: string;
  date: string;      // yyyy-MM-dd
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}): Promise<WriteBlockTarget> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error("not authenticated");
  const title = opts.title.trim() || (opts.kind === "note" ? "Untitled note" : "Journal entry");

  let recordId: string;
  if (opts.kind === "note") {
    const note = await createNote({ title, date: opts.date });
    recordId = note.id;
  } else {
    const entry = await createJournalEntry({ date: opts.date, title });
    recordId = entry.id as string;
  }

  const { data, error } = await supabase
    .from("time_blocks")
    .insert({
      user_id: u.user.id,
      date: opts.date,
      start_time: opts.startTime,
      end_time: opts.endTime,
      title,
      color: WRITE_BLOCK_COLOR[opts.kind],
      all_day: false,
      link_type: opts.kind,
      link_id: recordId,
    })
    .select("id")
    .single();
  if (error) throw error;
  notifyBlocks();
  return { kind: opts.kind, recordId, blockId: data.id as string, title };
}

/** Schedule an existing note/journal entry as a block on a given day. */
export async function scheduleExistingWrite(opts: {
  kind: WriteKind;
  recordId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  const { data, error } = await supabase
    .from("time_blocks")
    .insert({
      user_id: u.user.id,
      date: opts.date,
      start_time: opts.startTime,
      end_time: opts.endTime,
      title: opts.title || "Writing time",
      color: WRITE_BLOCK_COLOR[opts.kind],
      all_day: false,
      link_type: opts.kind,
      link_id: opts.recordId,
    })
    .select("id")
    .single();
  if (error) return null;
  notifyBlocks();
  return data.id as string;
}

/** Keep the block title in sync when the note/journal is renamed. */
export async function renameWriteBlock(target: WriteBlockTarget, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  if (target.kind === "note") {
    await supabase.from("notes").update({ title: trimmed }).eq("id", target.recordId);
  } else {
    await supabase.from("journal_entries").update({ title: trimmed }).eq("id", target.recordId);
  }
  await supabase
    .from("time_blocks")
    .update({ title: trimmed })
    .eq("link_type", target.kind)
    .eq("link_id", target.recordId);
  notifyBlocks();
}

export async function loadWriteRecord(target: WriteBlockTarget): Promise<{ title: string; body: string } | null> {
  const table = target.kind === "note" ? "notes" : "journal_entries";
  const { data, error } = await supabase.from(table).select("title, body").eq("id", target.recordId).maybeSingle();
  if (error || !data) return null;
  return { title: (data as any).title ?? "", body: (data as any).body ?? "" };
}

export async function saveWriteBody(target: WriteBlockTarget, body: string) {
  const table = target.kind === "note" ? "notes" : "journal_entries";
  await supabase.from(table).update({ body }).eq("id", target.recordId);
}