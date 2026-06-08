import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, ExternalLink, FileText, Folder, Hash, Link2, Pin, Sparkles, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  extractBacklinks, findBacklinksTo, getNote, updateNote, type Note,
} from "@/lib/notes";
import { fallbackColorFor, type Tag } from "@/lib/tags";
import { resolveNoteIcon, getLucideIcon } from "@/lib/note-icons";
import { suggestRelatedNotes, type NoteSuggestion } from "@/lib/note-suggestions";
import { TagPicker } from "@/components/tags/TagPicker";
import { toast } from "sonner";

function stripMd(s: string): string {
  return (s || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function NoteContextRail({
  noteId, onClose, projectsById, tagsByName, projects, onUpdated,
}: {
  noteId: string;
  onClose: () => void;
  projectsById: Record<string, string>;
  tagsByName: Map<string, Tag>;
  projects?: { id: string; name: string }[];
  onUpdated?: (patch: Partial<Note>) => void;
}) {
  const [note, setNote] = useState<Note | null>(null);
  const [backlinks, setBacklinks] = useState<Note[]>([]);
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [goalDraft, setGoalDraft] = useState<string>("");
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    let alive = true;
    void getNote(noteId).then(n => {
      if (!alive) return;
      setNote(n);
      setGoalDraft(n?.wordGoal ? String(n.wordGoal) : "");
    });
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

  const apply = async (patch: Partial<Note>) => {
    setNote(n => (n ? { ...n, ...patch } : n));
    try {
      await updateNote(noteId, patch);
      onUpdated?.(patch);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
    }
  };

  const commitGoal = () => {
    setEditingGoal(false);
    const n = goalDraft.trim() === "" ? null : Math.max(0, parseInt(goalDraft, 10) || 0);
    if ((n ?? null) === (note.wordGoal ?? null)) return;
    void apply({ wordGoal: n });
  };

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
          onClick={() => void apply({ pinned: !note.pinned })}
          aria-label={note.pinned ? "Unpin" : "Pin"}
          title={note.pinned ? "Unpin" : "Pin"}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md hover:bg-muted/60",
            note.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Pin className={cn("h-3.5 w-3.5", note.pinned && "fill-current")} />
        </button>
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
          <Prop label="Project">
            <Select
              value={note.projectId ?? "__none__"}
              onValueChange={(v) => void apply({ projectId: v === "__none__" ? null : v })}
            >
              <SelectTrigger className="h-7 w-full justify-end gap-1 border-0 bg-transparent px-1 py-0 text-xs shadow-none hover:bg-muted/50 focus:ring-0 focus-visible:ring-0">
                <SelectValue placeholder="None">
                  {projectName ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Folder className="h-3 w-3" /> {projectName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70">None</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="max-h-72">
                <SelectItem value="__none__">No project</SelectItem>
                {(projects ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Prop>
          <Prop label="Created">{format(parseISO(note.createdAt), "MMM d, yyyy")}</Prop>
          <Prop label="Updated">{format(parseISO(note.updatedAt), "MMM d, yyyy · h:mm a")}</Prop>
          <Prop label="Words">{words}</Prop>
          <Prop label="Reading">{readingMin} min</Prop>
          <Prop label="Word goal">
            {editingGoal ? (
              <Input
                autoFocus
                type="number"
                min={0}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onBlur={commitGoal}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitGoal(); }
                  if (e.key === "Escape") { setGoalDraft(note.wordGoal ? String(note.wordGoal) : ""); setEditingGoal(false); }
                }}
                placeholder="e.g. 500"
                className="h-6 w-20 px-1.5 py-0 text-right text-xs"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingGoal(true)}
                className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-muted/50"
                title="Click to edit"
              >
                <Target className="h-3 w-3 text-muted-foreground" />
                {note.wordGoal ? `${note.wordGoal} words` : <span className="text-muted-foreground/70">Set goal</span>}
              </button>
            )}
          </Prop>
        </Section>

        {/* Tags */}
        <Section title="Tags">
          <TagPicker
            value={note.tags ?? []}
            onChange={(next) => void apply({ tags: next })}
            triggerLabel={(note.tags?.length ?? 0) === 0 ? "Add tag" : "Add"}
          />
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