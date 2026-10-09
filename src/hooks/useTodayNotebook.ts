import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { getOrCreateDailyNote, updateNote, type Note } from "@/lib/notes";
import { clearDraft, loadDraft, saveDraft } from "@/lib/notes/drafts";
import { notifyDailyNotesChanged } from "@/lib/notes/daily";
import { snapshotNote } from "@/lib/notes/versions";
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
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const lastEdit = useRef(0);
  const [, setHistoryTick] = useState(0);

  const load = useCallback(async () => {
    if (noteRef.current) return noteRef.current;
    loading.current ??= (async () => {
      for (let attempt = 0; ; attempt++) {
        try { return await getOrCreateDailyNote(format(new Date(), "yyyy-MM-dd")); }
        catch (error) {
          if (attempt >= 4) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    })();
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
      void snapshotNote(n.id, n.title, next).catch(() => {});
      notifyDailyNotesChanged();
    } catch { setStatus("error"); }
    finally { if (saving.current === work) saving.current = null; }
  }, []);

  const writeBody = useCallback((next: string) => {
    bodyRef.current = next; setBody(next); pending.current = next;
    if (noteRef.current) saveDraft(noteRef.current.id, { body: next });
    setStatus("dirty"); clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 600);
  }, [flush]);

  /** Record an undo step; continuous typing within 1.5s coalesces, structural edits always record. */
  const changeBody = useCallback((next: string, opts?: { checkpoint?: boolean }) => {
    if (next === bodyRef.current) return;
    const now = Date.now();
    if (opts?.checkpoint || now - lastEdit.current > 1500) {
      undoStack.current.push(bodyRef.current);
      if (undoStack.current.length > 100) undoStack.current.shift();
    }
    lastEdit.current = opts?.checkpoint ? 0 : now;
    redoStack.current = [];
    writeBody(next); setHistoryTick(t => t + 1);
  }, [writeBody]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev == null) return;
    redoStack.current.push(bodyRef.current); lastEdit.current = 0;
    writeBody(prev); setHistoryTick(t => t + 1);
  }, [writeBody]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next == null) return;
    undoStack.current.push(bodyRef.current); lastEdit.current = 0;
    writeBody(next); setHistoryTick(t => t + 1);
  }, [writeBody]);

  const append = useCallback(async (text: string) => {
    await load();
    changeBody(appendTimestampedEntry(bodyRef.current, text, format(new Date(), "h:mm a")), { checkpoint: true });
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
  return { note, body, status, load, changeBody, append, flush, undo, redo, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 };
}