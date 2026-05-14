import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { BookOpen, Plus, Search, Sun, Pin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listNotes, createNote, getOrCreateDailyNote, type Note } from "@/lib/notes";
import { todayISO } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Notes() {
  const [params] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQ);

  const refresh = async () => {
    setLoading(true);
    try { setNotes(await listNotes()); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter(n =>
      n.title.toLowerCase().includes(term) || n.body.toLowerCase().includes(term),
    );
  }, [notes, q]);

  const pinned = filtered.filter(n => n.pinned);
  const others = filtered.filter(n => !n.pinned);

  const newNote = async () => {
    const n = await createNote({ title: "Untitled" });
    window.location.href = `/notes/${n.id}`;
  };

  const openToday = async () => {
    try {
      const n = await getOrCreateDailyNote(todayISO());
      window.location.href = `/notes/${n.id}`;
    } catch (e) {
      toast.error("Could not open today's note");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">A second brain — link with <code className="rounded bg-muted px-1">[[title]]</code> and <code className="rounded bg-muted px-1">@project</code>.</p>
        </div>
        <Button variant="outline" size="sm" onClick={openToday} className="gap-1.5">
          <Sun className="h-4 w-4" /> Today's note
        </Button>
        <Button size="sm" onClick={newNote} className="gap-1.5">
          <Plus className="h-4 w-4" /> New
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" className="pl-9" />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-60" />
          No notes yet. Create your first one — try a daily note for today.
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && <NoteGrid title="Pinned" notes={pinned} />}
          <NoteGrid title="All notes" notes={others} />
        </div>
      )}
    </div>
  );
}

function NoteGrid({ title, notes }: { title: string; notes: Note[] }) {
  if (notes.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map(n => (
          <Link
            key={n.id}
            to={`/notes/${n.id}`}
            className={cn(
              "group block rounded-2xl border border-border/60 bg-card/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
            )}
          >
            <div className="flex items-start gap-2">
              {n.kind === "daily" ? <Sun className="mt-0.5 h-4 w-4 text-primary" /> : null}
              {n.pinned ? <Pin className="mt-0.5 h-3.5 w-3.5 text-accent-foreground" /> : null}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-base font-semibold">
                  {n.kind === "daily" && n.date ? format(parseISO(n.date), "EEEE, MMM d") : (n.title || "Untitled")}
                </h3>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{n.body || "Empty"}</p>
              </div>
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              {format(parseISO(n.updatedAt), "MMM d, h:mm a")}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}