import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink, Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Note, PeriodKind } from "@/lib/notes";
import { periodTitle } from "@/lib/notes/periods";
import { openPeriodNoteWithTemplate, readDefaultPeriodTemplate } from "@/lib/notes/daily";
import { InlineNoteEditor } from "./InlineNoteEditor";

/**
 * Collapsible period note (weekly/monthly) shown inside planner sections.
 * Closed it is a quiet one-line header; open it edits the note in place with
 * the full markdown editor.
 */
export function PeriodNoteCard({ kind, keyISO, className, defaultOpen = false }: {
  kind: PeriodKind;
  keyISO: string;
  className?: string;
  defaultOpen?: boolean;
}) {
  const storeKey = `careflow:period-note-card:${kind}`;
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(storeKey);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch { /* ignore */ }
    return defaultOpen;
  });
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const title = periodTitle(kind, keyISO);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(storeKey, next ? "1" : "0"); } catch { /* ignore */ }
    if (!next || note || loading) return;
    setLoading(true);
    try {
      const n = await openPeriodNoteWithTemplate(kind, keyISO, readDefaultPeriodTemplate(kind));
      setNote(n);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open the note");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card/50", className)}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => void toggle()}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden />
          <NotebookPen className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="truncate text-xs font-medium">{title} note</span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />}
        </button>
        {note && (
          <Link to={`/notes/${note.id}`} className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            Open <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      {open && note && (
        <div className="px-2 pb-2 sm:px-3 sm:pb-3">
          <InlineNoteEditor noteId={note.id} initial={note} />
        </div>
      )}
    </div>
  );
}
