import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, CheckSquare, ChevronLeft, ChevronRight, Eye, Eye, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { TagChip } from "@/components/tags/TagChip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NoteMarkdownPreview } from "@/components/notes/NoteMarkdownPreview";

type TagNote = { id: string; title: string; body: string; updated_at: string };
type Peek = { kind: "note"; id: string } | { kind: "task"; id: string } | null;

/** Inline view of one tag: a gallery of notes and open tasks carrying it.
 *  Click opens; Shift+click opens it in a side panel instead. */
export function TagFocusPanel({ tag, currentNoteId, onClose }: { tag: string; currentNoteId?: string; onClose: () => void }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<TagNote[] | null>(null);
  const [peek, setPeek] = useState<Peek>(null);
  const rail = useRef<HTMLDivElement | null>(null);
  const lc = tag.toLowerCase();
  const tasks = (state.tasks ?? []).filter(t => !t.done && (t.tags ?? []).some(x => x.toLowerCase() === lc)).slice(0, 12);

  useEffect(() => {
    let alive = true;
    setNotes(null);
    void supabase.from("notes").select("id,title,body,updated_at").eq("archived", false)
      .contains("tags", [tag]).order("updated_at", { ascending: false }).limit(24)
      .then(({ data }) => { if (alive) setNotes(((data ?? []) as TagNote[]).filter(n => n.id !== currentNoteId)); });
    return () => { alive = false; };
  }, [tag, currentNoteId]);

  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * (rail.current.clientWidth * 0.8), behavior: "smooth" });
  const peekNote = peek?.kind === "note" ? notes?.find(n => n.id === peek.id) : null;
  const peekTask = peek?.kind === "task" ? (state.tasks ?? []).find(t => t.id === peek.id) : null;

  return (
    <section className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3" aria-label={`Tag ${tag}`}>
      <div className="mb-2 flex items-center gap-2">
        <TagChip name={tag} size="sm" />
        <Link to={`/tags/${encodeURIComponent(tag)}`} className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground">
          Open tag page <ArrowUpRight className="h-3 w-3" />
        </Link>
        <span className="hidden text-[10px] text-muted-foreground sm:inline">Shift+click to view in side panel</span>
        <button type="button" onClick={onClose} className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close tag view">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-1 flex items-center gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes{notes ? ` · ${notes.length}` : ""}</p>
        {!!notes?.length && (
          <div className="ml-auto flex gap-1">
            <button type="button" onClick={() => scroll(-1)} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Previous notes"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => scroll(1)} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Next notes"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
      {notes === null ? <p className="text-xs text-muted-foreground">Loading…</p> : notes.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">No other notes with this tag.</p>
      ) : (
        <div ref={rail} className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2">
          {notes.map(n => (
            <HoverCard key={n.id} openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => { if (e.shiftKey) setPeek({ kind: "note", id: n.id }); else navigate(`/notes/${n.id}`); }}
                  className="flex h-28 w-44 shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border/50 bg-background/80 p-2 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="flex items-center gap-1 text-xs font-medium">
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{n.title || "Untitled"}</span>
                  </span>
                  <div className="pointer-events-none mt-1 min-h-0 flex-1 overflow-hidden text-[10px] leading-snug">
                    <NoteMarkdownPreview body={n.body} maxChars={160} />
                  </div>
                  <span className="mt-1 text-[10px] text-muted-foreground">{format(parseISO(n.updated_at), "MMM d")}</span>
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="bottom" className="w-80 p-3">
                <p className="mb-1 font-display text-sm font-semibold">{n.title || "Untitled"}</p>
                <div className="max-h-60 overflow-auto text-xs"><NoteMarkdownPreview body={n.body} maxChars={900} /></div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </div>
      )}

      <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Open tasks · {tasks.length}</p>
      {tasks.length === 0 ? <p className="text-xs italic text-muted-foreground">No open tasks with this tag.</p> : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {tasks.map(t => (
            <li key={t.id}>
              <button type="button" onClick={(e) => { if (e.shiftKey) setPeek({ kind: "task", id: t.id }); else openTaskEditor(t.id); }}
                className="flex w-full items-center gap-1.5 rounded-md border border-border/40 bg-background/60 px-2 py-1.5 text-left text-xs hover:border-primary/40">
                <CheckSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                {t.dueDate && <span className="text-[10px] text-muted-foreground">{format(parseISO(t.dueDate), "MMM d")}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!peek} onOpenChange={(o) => { if (!o) setPeek(null); }}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader><SheetTitle className="truncate">{peekNote ? (peekNote.title || "Untitled") : peekTask?.title ?? ""}</SheetTitle></SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto py-3 text-sm">
            {peekNote && <NoteMarkdownPreview body={peekNote.body} maxChars={100000} />}
            {peekTask && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {peekTask.dueDate ? `Due ${format(parseISO(peekTask.dueDate), "EEE, MMM d")}` : "No due date"}
                  {(peekTask.tags ?? []).length ? ` · ${(peekTask.tags ?? []).map(x => `#${x}`).join(" ")}` : ""}
                </p>
                {peekTask.notes ? <NoteMarkdownPreview body={peekTask.notes} maxChars={100000} /> : <p className="text-xs italic text-muted-foreground">No notes.</p>}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => {
            const p = peek; setPeek(null);
            if (p?.kind === "note") navigate(`/notes/${p.id}`); else if (p) openTaskEditor(p.id);
          }}>
            {peek?.kind === "note" ? "Open note" : "Edit task"}
          </Button>
        </SheetContent>
      </Sheet>
    </section>
  );
}
