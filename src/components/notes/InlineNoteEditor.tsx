import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import { getNote, updateNote, type Note } from "@/lib/notes";
import { clearDraft, draftDiffers, loadDraft, saveDraft } from "@/lib/notes/drafts";
import { notifyDailyNotesChanged } from "@/lib/notes/daily";
import { BlockEditor } from "./BlockEditor";
import { SaveStatus, type SaveState } from "./SaveStatus";

/**
 * A note's editor embedded in place (Notebook rows). Same autosave safety net
 * as the full note page: local draft first, debounced cloud save, flush on
 * hide/unload, and silent draft recovery.
 */
export function InlineNoteEditor({ noteId, initial, onBodyChange }: {
  noteId: string;
  /** Skips the fetch when the caller already has the note. */
  initial?: Note | null;
  onBodyChange?: (body: string) => void;
}) {
  const [note, setNote] = useState<Note | null>(initial ?? null);
  const [body, setBody] = useState(initial?.body ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pendingRef = useRef<{ body?: string }>({});
  const timer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    void getNote(noteId).then(n => {
      if (!alive || !n) return;
      const draft = loadDraft(n.id);
      const b = draftDiffers(draft, { title: n.title, body: n.body }) && draft?.body != null ? draft.body : n.body;
      setNote(n); setBody(b);
      if (b !== n.body) setSaveState("dirty");
    });
    return () => { alive = false; };
  }, [noteId]);

  const flush = () => {
    const payload = { ...pendingRef.current };
    if (!payload.body && payload.body !== "") return;
    if (!navigator.onLine) { setSaveState("offline"); return; }
    setSaveState("saving");
    void updateNote(noteId, payload)
      .then(() => {
        pendingRef.current = {};
        clearDraft(noteId);
        notifyDailyNotesChanged();
        setSaveState("saved");
        if (flashTimer.current) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setSaveState("idle"), 1500);
      })
      .catch(() => setSaveState("error"));
  };

  const save = (next: string) => {
    saveDraft(noteId, { body: next });
    pendingRef.current = { body: next };
    setSaveState("dirty");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 500);
  };

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden" && pendingRef.current.body != null) flush(); };
    const onOnline = () => { if (pendingRef.current.body != null) flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", onOnline);
      if (timer.current) { window.clearTimeout(timer.current); if (pendingRef.current.body != null) flush(); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  if (!note) {
    return <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading note…</div>;
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-2 sm:p-3">
      <div className="mb-1 flex items-center gap-2">
        <SaveStatus state={saveState} onRetry={flush} />
        <Link to={`/notes/${note.id}`} className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          Open full note <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <BlockEditor
        body={body}
        noteId={note.id}
        defaultDueDate={note.kind === "daily" ? note.date ?? null : null}
        showFooter={false}
        minHeight="min-h-[120px]"
        toolbarPlacement="top"
        onChange={(md) => { setBody(md); save(md); onBodyChange?.(md); }}
      />
    </div>
  );
}
