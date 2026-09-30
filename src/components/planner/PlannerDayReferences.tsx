import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { BookOpen, ChevronDown, ExternalLink, FileText, Link2 } from "lucide-react";
import { listNotes, updateNote, type Note } from "@/lib/notes";
import type { JournalEntry } from "@/lib/types";
import { useStore } from "@/lib/store";
import { referencesDate } from "@/lib/notes/date-refs";
import { NoteHoverPreview } from "@/components/notes/NoteHoverPreview";
import { InlineNoteEditor } from "@/components/notes/InlineNoteEditor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTags } from "@/hooks/use-tags";
import { cn } from "@/lib/utils";

function JournalEditor({ entry, onUpdate }: { entry: JournalEntry; onUpdate: (patch: Partial<JournalEntry>) => Promise<void> }) {
  const [title, setTitle] = useState(entry.title ?? "");
  const [body, setBody] = useState(entry.body ?? "");
  const timer = useRef<number | null>(null);
  const save = (patch: Partial<JournalEntry>) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void onUpdate(patch), 500);
  };
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return (
    <div className="space-y-2 border-t border-border/40 p-2">
      <Input value={title} placeholder="Journal title" className="h-8 text-sm" onChange={e => { setTitle(e.target.value); save({ title: e.target.value, body }); }} />
      <Textarea value={body} className="min-h-28 text-sm" onChange={e => { setBody(e.target.value); save({ title, body: e.target.value }); }} />
      <Button asChild size="sm" variant="ghost" className="h-7 rounded-full text-[11px]"><a href="/journal"><ExternalLink className="mr-1 h-3 w-3" />Open journal</a></Button>
    </div>
  );
}

export function PlannerDayReferences({ date, className }: { date: Date; className?: string }) {
  const iso = format(date, "yyyy-MM-dd");
  const navigate = useNavigate();
  const { state, updateJournal } = useStore();
  const { tags } = useTags();
  const tagsByName = new Map(tags.map(tag => [tag.name.toLowerCase(), tag]));
  const [notes, setNotes] = useState<Note[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listNotes().then(all => { if (!cancelled) setNotes(all); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const matchedNotes = notes.filter(n => referencesDate(n.body, iso) || n.date === iso);
  const matchedJournal = (state.journal ?? []).filter(j => referencesDate(j.body, iso) || j.date === iso);
  if (!matchedNotes.length && !matchedJournal.length) return null;

  const rowClass = "flex min-h-9 w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11.5px] hover:bg-muted/50";
  return (
    <section aria-label="Notes and journal referencing this day" className={cn("overflow-hidden rounded-xl border border-border/50 bg-background/50", className)}>
      <p className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Link2 className="h-3 w-3" aria-hidden /> Referencing this day
      </p>
      <ul className="divide-y divide-border/40 border-t border-border/40">
        {matchedNotes.slice(0, 5).map(n => {
          const open = expanded === `note:${n.id}`;
          const trigger = (
            <button type="button" onClick={() => setExpanded(open ? null : `note:${n.id}`)} className={rowClass} aria-expanded={open}>
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{n.title || "Untitled note"}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </button>
          );
          return <li key={n.id}>
            {open ? trigger : <NoteHoverPreview note={n} tagsByName={tagsByName} onOpen={() => navigate(`/notes/${n.id}`)}>{trigger}</NoteHoverPreview>}
            {open && <div className="space-y-2 border-t border-border/40 p-2">
              <Input defaultValue={n.title} placeholder="Untitled note" className="h-8 text-sm" onBlur={e => { const title = e.target.value; void updateNote(n.id, { title }); setNotes(current => current.map(item => item.id === n.id ? { ...item, title } : item)); }} />
              <InlineNoteEditor noteId={n.id} initial={n} onBodyChange={body => setNotes(current => current.map(item => item.id === n.id ? { ...item, body } : item))} />
            </div>}
          </li>;
        })}
        {matchedJournal.slice(0, 5).map(j => {
          const open = expanded === `journal:${j.id}`;
          return <li key={j.id}>
            <button type="button" onClick={() => setExpanded(open ? null : `journal:${j.id}`)} className={rowClass} aria-expanded={open} title={(j.body ?? "").slice(0, 240)}>
              <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{j.title || j.body?.slice(0, 60) || "Journal entry"}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </button>
            {open && <JournalEditor entry={j} onUpdate={patch => updateJournal(j.id, patch)} />}
          </li>;
        })}
      </ul>
    </section>
  );
}