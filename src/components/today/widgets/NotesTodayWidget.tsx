import { useEffect, useState } from "react";
import { format } from "date-fns";
import { StickyNote, ArrowRight, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { listNotes, createNote, updateNote, type Note } from "@/lib/notes";

function isToday(iso: string) {
  return iso.slice(0, 10) === format(new Date(), "yyyy-MM-dd");
}

/** Lists notes touched today + quick-add. */
export function NotesTodayWidget() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");

  const refresh = async () => {
    try {
      const all = await listNotes();
      setNotes(all.filter(n => isToday(n.updatedAt) || isToday(n.createdAt)).slice(0, 4));
    } catch { /* noop */ }
  };
  useEffect(() => { void refresh(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    try {
      const n = await createNote({ title });
      setDraft("");
      navigate(`/notes/${n.id}`);
    } catch { /* noop */ }
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Notes today</h3>
        </div>
        <Link to="/notes" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          All <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Nothing captured yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {notes.map(n => (
            <li key={n.id} className="flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-muted/40">
              <input
                defaultValue={n.title || "Untitled"}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== n.title) void updateNote(n.id, { title: v });
                }}
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
              />
              <Link to={`/notes/${n.id}`} className="text-[10px] text-muted-foreground hover:text-foreground">
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border/60 bg-background/50 px-2 py-1">
        <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New note…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
        />
      </form>
    </section>
  );
}