import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Pin, Trash2, Eye, Pencil, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteNote, extractBacklinks, findBacklinksTo, getNote, updateNote, type Note } from "@/lib/notes";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [backlinks, setBacklinks] = useState<Note[]>([]);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    void getNote(id).then(n => {
      if (!n) { toast.error("Note not found"); nav("/notes"); return; }
      setNote(n); setTitle(n.title); setBody(n.body);
    });
  }, [id, nav]);

  // Refresh backlinks (notes that link TO this one) whenever title changes
  useEffect(() => {
    if (!note) return;
    const t = note.kind === "daily" && note.date ? note.date : title;
    if (!t) { setBacklinks([]); return; }
    void findBacklinksTo(t).then(arr => setBacklinks(arr.filter(n => n.id !== note.id)));
  }, [note, title]);

  const save = (next: { title?: string; body?: string }) => {
    if (!id) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void updateNote(id, next).catch(() => toast.error("Save failed"));
    }, 400);
  };

  const togglePin = async () => {
    if (!note) return;
    const next = !note.pinned;
    setNote({ ...note, pinned: next });
    await updateNote(note.id, { pinned: next });
  };

  const remove = async () => {
    if (!id) return;
    if (!confirm("Delete this note? This cannot be undone.")) return;
    await deleteNote(id);
    nav("/notes");
  };

  if (!note) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const linkedOut = extractBacklinks(body);
  const headerTitle = note.kind === "daily" && note.date ? format(parseISO(note.date), "EEEE, MMMM d, yyyy") : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/notes")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Notes
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={view === "edit" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("edit")}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant={view === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("preview")}
            className="gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          <Button variant="ghost" size="icon" onClick={togglePin} aria-label="Pin">
            <Pin className={cn("h-4 w-4", note.pinned && "fill-current text-accent-foreground")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </header>

      <div className="cozy-card p-5 md:p-7">
        {note.kind === "daily" ? (
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{headerTitle}</h1>
        ) : (
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); save({ title: e.target.value }); }}
            placeholder="Untitled"
            className="border-0 bg-transparent px-0 font-display text-2xl font-semibold shadow-none focus-visible:ring-0 sm:text-3xl"
          />
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Updated {format(parseISO(note.updatedAt), "MMM d, h:mm a")}
        </p>

        <div className="mt-4">
          {view === "edit" ? (
            <Textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); save({ body: e.target.value }); }}
              placeholder={"Start writing…\n\nLink with [[Another Note]] · mention @ProjectName · supports **markdown**"}
              className="min-h-[40vh] resize-y border-0 bg-transparent px-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
            />
          ) : (
            <NoteMarkdown body={body} />
          )}
        </div>
      </div>

      {(linkedOut.length > 0 || backlinks.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {linkedOut.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" /> Links out
              </h3>
              <ul className="space-y-1 text-sm">
                {linkedOut.map(t => (
                  <li key={t}>
                    <Link to={`/notes?q=${encodeURIComponent(t)}`} className="text-primary hover:underline">[[{t}]]</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {backlinks.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" /> Backlinks
              </h3>
              <ul className="space-y-1 text-sm">
                {backlinks.map(b => (
                  <li key={b.id}>
                    <Link to={`/notes/${b.id}`} className="text-primary hover:underline">
                      {b.kind === "daily" && b.date ? format(parseISO(b.date), "EEE, MMM d") : (b.title || "Untitled")}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}