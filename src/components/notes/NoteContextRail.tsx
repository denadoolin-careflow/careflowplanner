import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, ExternalLink, FileText, Folder, Hash, Link2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  extractBacklinks, findBacklinksTo, getNote, type Note,
} from "@/lib/notes";
import { fallbackColorFor, type Tag } from "@/lib/tags";
import { resolveNoteIcon, getLucideIcon } from "@/lib/note-icons";
import { suggestRelatedNotes, type NoteSuggestion } from "@/lib/note-suggestions";

function stripMd(s: string): string {
  return (s || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function NoteContextRail({
  noteId, onClose, projectsById, tagsByName,
}: {
  noteId: string;
  onClose: () => void;
  projectsById: Record<string, string>;
  tagsByName: Map<string, Tag>;
}) {
  const [note, setNote] = useState<Note | null>(null);
  const [backlinks, setBacklinks] = useState<Note[]>([]);
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    void getNote(noteId).then(n => { if (alive) setNote(n); });
    return () => { alive = false; };
  }, [noteId]);

  useEffect(() => {
    if (!note) { setBacklinks([]); return; }
    const t = note.kind === "daily" && note.date ? note.date : (note.title || "");
    if (!t.trim()) { setBacklinks([]); return; }
    let alive = true;
    void findBacklinksTo(t)
      .then(arr => { if (alive) setBacklinks(arr.filter(n => n.id !== note.id)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [note]);

  useEffect(() => {
    if (!note) { setSuggestions([]); return; }
    let alive = true;
    setSuggestLoading(true);
    void suggestRelatedNotes(note, { limit: 5 })
      .then(arr => { if (alive) setSuggestions(arr); })
      .catch(() => { if (alive) setSuggestions([]); })
      .finally(() => { if (alive) setSuggestLoading(false); });
    return () => { alive = false; };
  }, [note]);

  if (!note) {
    return (
      <aside className="flex h-full w-full items-center justify-center rounded-2xl border border-border/60 bg-card/50 p-6 text-sm text-muted-foreground">
        Loading…
      </aside>
    );
  }

  const Icon = getLucideIcon(resolveNoteIcon(note));
  const title = note.kind === "daily" && note.date
    ? format(parseISO(note.date), "EEEE, MMM d")
    : (note.title || "Untitled");
  const words = note.body ? note.body.split(/\s+/).filter(Boolean).length : 0;
  const readingMin = Math.max(1, Math.round(words / 220));
  const outgoing = Array.from(new Set(extractBacklinks(note.body || "")));
  const projectName = note.projectId ? projectsById[note.projectId] : null;

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
      <header className="sticky top-0 z-10 flex items-start gap-2 border-b border-border/40 bg-card/95 px-4 py-3 backdrop-blur">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-display text-sm font-semibold leading-snug">{title}</h2>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
            {stripMd(note.body).slice(0, 80) || "Empty note"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close context"
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="space-y-5 px-4 py-4">
        {/* Properties */}
        <Section title="Properties">
          <Prop label="Kind">{note.kind === "daily" ? "Daily" : "Note"}</Prop>
          {projectName && (
            <Prop label="Project">
              <Link to={`/projects/${note.projectId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Folder className="h-3 w-3" /> {projectName}
              </Link>
            </Prop>
          )}
          <Prop label="Created">{format(parseISO(note.createdAt), "MMM d, yyyy")}</Prop>
          <Prop label="Updated">{format(parseISO(note.updatedAt), "MMM d, yyyy · h:mm a")}</Prop>
          <Prop label="Words">{words}</Prop>
          <Prop label="Reading">{readingMin} min</Prop>
        </Section>

        {/* Tags */}
        <Section title="Tags">
          {note.tags && note.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {note.tags.map(t => {
                const c = tagsByName.get(t.toLowerCase())?.color || fallbackColorFor(t);
                return (
                  <Link
                    key={t}
                    to={`/tags/${encodeURIComponent(t)}`}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium hover:opacity-80"
                    style={{ background: `${c}26`, color: c }}
                  >
                    <Hash className="h-2.5 w-2.5" /> {t}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground/70">No tags. Add some in the full editor.</p>
          )}
        </Section>

        {/* Linked content */}
        <Section title={`Linked notes · ${outgoing.length + backlinks.length}`}>
          {outgoing.length === 0 && backlinks.length === 0 ? (
            <p className="text-xs italic text-muted-foreground/70">No links yet. Use [[Title]] in the editor to connect notes.</p>
          ) : (
            <ul className="space-y-1">
              {outgoing.map(t => (
                <li key={`out:${t}`} className="flex items-center gap-1.5 truncate text-xs">
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate">{t}</span>
                </li>
              ))}
              {backlinks.map(n => (
                <li key={`bl:${n.id}`}>
                  <Link
                    to={`/notes?note=${n.id}`}
                    className="flex items-center gap-1.5 truncate rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  >
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{n.title || "Untitled"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* AI-suggested related notes */}
        <Section title="Suggested">
          {suggestLoading && suggestions.length === 0 ? (
            <p className="text-xs italic text-muted-foreground/70">Finding related notes…</p>
          ) : suggestions.length === 0 ? (
            <p className="text-xs italic text-muted-foreground/70">No related notes yet. Add tags or links to surface connections.</p>
          ) : (
            <ul className="space-y-1">
              {suggestions.map(s => {
                const title = s.note.kind === "daily" && s.note.date
                  ? format(parseISO(s.note.date), "EEE, MMM d")
                  : (s.note.title || "Untitled");
                return (
                  <li key={s.note.id}>
                    <Link
                      to={`/notes?note=${s.note.id}`}
                      className="group flex items-start gap-1.5 rounded-md px-1 py-1 text-xs hover:bg-muted/50"
                    >
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-foreground group-hover:text-foreground">{title}</span>
                        <span className="block truncate text-[10px] text-muted-foreground/80">
                          {s.reasons.join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <footer className="mt-auto border-t border-border/40 p-3">
        <Button asChild size="sm" className="w-full gap-2 rounded-xl">
          <Link to={`/notes/${note.id}`}>
            <ExternalLink className="h-3.5 w-3.5" /> Open full page
          </Link>
        </Button>
      </footer>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground/80">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-foreground">{children}</span>
    </div>
  );
}