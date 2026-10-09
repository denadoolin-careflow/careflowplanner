import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { BookOpen, CalendarDays, ExternalLink, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InlineNoteEditor } from "@/components/notes/InlineNoteEditor";
import { NotePicker } from "@/components/notes/NotePicker";
import { getNote, getOrCreateDailyNote, type Note } from "@/lib/notes";
import { OPEN_SCHEDULE_NOTE_EVENT } from "@/lib/schedule-note-pane";
import { cn } from "@/lib/utils";

type Selection = { mode: "daily" } | { mode: "note"; id: string };

export function ScheduleNotePane({ date, storageKey, onClose, className }: {
  date: Date;
  storageKey: string;
  onClose?: () => void;
  className?: string;
}) {
  const [selection, setSelection] = useState<Selection>(() => {
    try {
      const id = window.localStorage.getItem(storageKey);
      return id ? { mode: "note", id } : { mode: "daily" };
    } catch { return { mode: "daily" }; }
  });
  const [note, setNote] = useState<Note | null>(null);
  const dateKey = format(date, "yyyy-MM-dd");

  const chooseNote = useCallback((id: string) => {
    setSelection({ mode: "note", id });
    try { window.localStorage.setItem(storageKey, id); } catch { /* ignore */ }
  }, [storageKey]);

  const followDaily = useCallback(() => {
    setSelection({ mode: "daily" });
    try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    const listener = (event: Event) => {
      const noteId = (event as CustomEvent<{ noteId?: string }>).detail?.noteId;
      if (noteId) chooseNote(noteId);
    };
    window.addEventListener(OPEN_SCHEDULE_NOTE_EVENT, listener);
    return () => window.removeEventListener(OPEN_SCHEDULE_NOTE_EVENT, listener);
  }, [chooseNote]);

  useEffect(() => {
    let alive = true;
    setNote(null);
    const request = selection.mode === "daily"
      ? getOrCreateDailyNote(dateKey)
      : getNote(selection.id);
    void request.then(value => { if (alive) setNote(value); }).catch(() => { if (alive) setNote(null); });
    return () => { alive = false; };
  }, [selection, dateKey]);

  return (
    <aside className={cn("notes-editor-experience flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/55", className)} aria-label="Notebook beside schedule">
      <header className="flex items-start gap-2 border-b border-border/50 px-3 py-2.5">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{note?.title || (selection.mode === "daily" ? format(date, "EEEE's notebook") : "Opening note…")}</p>
          <p className="text-[11px] text-muted-foreground">{selection.mode === "daily" ? format(date, "MMMM d, yyyy") : "Selected note"}</p>
        </div>
        <NotePicker
          onPick={picked => chooseNote(picked.id)}
          trigger={<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Search notes" title="Search notes"><Search className="h-4 w-4" /></Button>}
        />
        {onClose && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close notebook"><X className="h-4 w-4" /></Button>}
      </header>
      <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5">
        <Button variant={selection.mode === "daily" ? "secondary" : "ghost"} size="sm" className="h-7 gap-1.5 text-xs" onClick={followDaily}>
          <CalendarDays className="h-3.5 w-3.5" /> Daily note
        </Button>
        {note && <Button asChild variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-xs"><Link to={`/notes/${note.id}`}>Full note<ExternalLink className="h-3 w-3" /></Link></Button>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {note ? <InlineNoteEditor key={note.id} noteId={note.id} initial={note} /> : <p className="p-3 text-sm text-muted-foreground">Opening notebook…</p>}
      </div>
    </aside>
  );
}