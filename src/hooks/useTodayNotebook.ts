import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { getOrCreateDailyNote, updateNote, type Note } from "@/lib/notes";
import { clearDraft, loadDraft, saveDraft } from "@/lib/notes/drafts";
import { notifyDailyNotesChanged } from "@/lib/notes/daily";
import { appendTimestampedEntry } from "@/lib/notes/timestamped-entries";
import type { SaveState } from "@/components/notes/SaveStatus";

export function useTodayNotebook() {
  const [note, setNote] = useState<Note | null>(null);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<SaveState>("idle");
  const noteRef = useRef<Note | null>(null);
  const bodyRef = useRef("");
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const saving = useRef<Promise<void> | null>(null);
  const loading = useRef<Promise<Note> | null>(null);

  const load = useCallback(async () => {
    if (noteRef.current) return noteRef.current;
    loading.current ??= getOrCreateDailyNote(format(new Date(), "yyyy-MM-dd"));
    try {
      const n = await loading.current;
      if (!noteRef.current) {
        noteRef.current = n;
        const draft = loadDraft(n.id)?.body;
        bodyRef.current = draft ?? n.body;
        setNote(n); setBody(bodyRef.current);
        if (draft != null && draft !== n.body) { pending.current = draft; setStatus("dirty"); }
      }
      return n;
    } finally { loading.current = null; }
  }, []);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current) await saving.current;
    const n = noteRef.current;
    if (!n || pending.current == null) return;
    if (!navigator.onLine) { setStatus("offline"); return; }
    const next = pending.current;
    setStatus("saving");
    const work = updateNote(n.id, { body: next });
    saving.current = work;
    try {
      await work;
      if (pending.current === next) { pending.current = null; clearDraft(n.id); setStatus("saved"); }
      notifyDailyNotesChanged();
    } catch { setStatus("error"); }
    finally { if (saving.current === work) saving.current = null; }
  }, []);

  const changeBody = useCallback((next: string) => {
    bodyRef.current = next; setBody(next); pending.current = next;
    if (noteRef.current) saveDraft(noteRef.current.id, { body: next });
    setStatus("dirty"); clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 600);
  }, [flush]);

  const append = useCallback(async (text: string) => {
    await load();
    changeBody(appendTimestampedEntry(bodyRef.current, text, format(new Date(), "h:mm a")));
    await flush();
    // Failures retain a local draft and must not clear the source capture.
    if (pending.current != null) throw new Error("Reflection awaiting save");
  }, [load, changeBody, flush]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden") void flush(); };
    const online = () => { void flush(); };
    document.addEventListener("visibilitychange", hide); window.addEventListener("online", online);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("online", online); void flush(); };
  }, [flush]);
  return { note, body, status, load, changeBody, append, flush };
}