import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Pin, Trash2, Link2, ImagePlus, X, Move, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteNote, extractBacklinks, findBacklinksTo, getNote, updateNote, type Note } from "@/lib/notes";
import { uploadNoteImage } from "@/lib/note-images";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NoteLinksSidebar } from "@/components/notes/NoteLinksSidebar";
import { NoteAIButton } from "@/components/notes/NoteAIButton";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { EditorPrefsMenu } from "@/components/notes/EditorPrefsMenu";
import { TagPicker } from "@/components/tags/TagPicker";
import { NoteTOC } from "@/components/notes/NoteTOC";
import { copyToClipboard } from "@/lib/clipboard";

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [backlinks, setBacklinks] = useState<Note[]>([]);
  const saveTimer = useRef<number | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const coverDragRef = useRef<{ startY: number; startPos: number; height: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    void getNote(id).then(n => {
      if (!n) { toast.error("Note not found"); nav("/notes"); return; }
      setNote(n); setTitle(n.title); setBody(n.body); setTags(n.tags ?? []);
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

  const setCover = async (file: File) => {
    if (!id) return;
    setCoverBusy(true);
    const tid = toast.loading("Uploading cover…");
    try {
      const url = await uploadNoteImage(file);
      setNote(n => n ? { ...n, coverUrl: url } : n);
      await updateNote(id, { coverUrl: url });
      toast.success("Cover updated", { id: tid });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed", { id: tid });
    } finally {
      setCoverBusy(false);
    }
  };

  const removeCover = async () => {
    if (!id) return;
    setNote(n => n ? { ...n, coverUrl: null } : n);
    await updateNote(id, { coverUrl: null, coverPosition: null });
    setRepositioning(false);
  };

  const setCoverPosition = (pos: number) => {
    const clamped = Math.max(0, Math.min(100, pos));
    setNote(n => n ? { ...n, coverPosition: clamped } : n);
  };

  const onCoverPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!repositioning || !note) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    coverDragRef.current = {
      startY: e.clientY,
      startPos: note.coverPosition ?? 50,
      height: el.getBoundingClientRect().height,
    };
  };
  const onCoverPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = coverDragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    // Drag down moves image down (shows more of top) → decreases object-position Y%
    const delta = (dy / d.height) * 100;
    setCoverPosition(d.startPos - delta);
  };
  const onCoverPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!coverDragRef.current) return;
    coverDragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };
  const saveCoverPosition = async () => {
    if (!id || !note) return;
    await updateNote(id, { coverPosition: note.coverPosition ?? 50 });
    setRepositioning(false);
    toast.success("Cover position saved");
  };

  if (!note) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const linkedOut = extractBacklinks(body);
  const headerTitle = note.kind === "daily" && note.date ? format(parseISO(note.date), "EEEE, MMMM d, yyyy") : null;

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-3 py-4 md:px-6 md:py-6 2xl:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
      <header className="mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-2 px-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/notes")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Notes
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <NoteAIButton
            title={title}
            body={body}
            onApply={(next) => { setBody(next); save({ body: next }); }}
          />
          <EditorPrefsMenu />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const headerText = note.kind === "daily" && note.date
                ? format(parseISO(note.date), "EEEE, MMMM d, yyyy")
                : (title || "Untitled");
              const ok = await copyToClipboard(`${headerText}\n\n${body}`);
              if (ok) toast.success("Copied to clipboard");
              else toast.error("Copy failed");
            }}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-4 w-4" /> Copy
          </Button>
          {!note.coverUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverBusy}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="h-4 w-4" /> Cover
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={togglePin} aria-label="Pin">
            <Pin className={cn("h-4 w-4", note.pinned && "fill-current text-accent-foreground")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </header>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void setCover(f);
          e.target.value = "";
        }}
      />

      {note.coverUrl && (
        <div className="mx-auto mt-3 w-full max-w-[920px] px-2">
          <div
            className={cn(
              "note-cover group relative h-44 md:h-56 touch-none select-none",
              repositioning && "cursor-grab active:cursor-grabbing ring-2 ring-primary"
            )}
            onPointerDown={onCoverPointerDown}
            onPointerMove={onCoverPointerMove}
            onPointerUp={onCoverPointerUp}
            onPointerCancel={onCoverPointerUp}
          >
            <img
              src={note.coverUrl}
              alt=""
              style={{ objectPosition: `center ${note.coverPosition ?? 50}%` }}
              draggable={false}
            />
            <div
              className={cn(
                "absolute right-3 top-3 z-10 flex gap-1 transition",
                repositioning ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              {repositioning ? (
                <>
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5 shadow" onClick={saveCoverPosition}>
                    <Check className="h-3.5 w-3.5" /> Save position
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 shadow" onClick={() => setRepositioning(false)} aria-label="Cancel">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5 shadow" onClick={() => setRepositioning(true)}>
                    <Move className="h-3.5 w-3.5" /> Reposition
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5 shadow" onClick={() => coverInputRef.current?.click()} disabled={coverBusy}>
                    <ImagePlus className="h-3.5 w-3.5" /> Change
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 shadow" onClick={removeCover} aria-label="Remove cover">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
            {repositioning && (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[11px] font-medium text-white drop-shadow">
                Drag to reposition · click Save when done
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto mt-6 w-full max-w-[760px] px-2">
        {note.kind === "daily" ? (
          <h1 className="note-page-title text-3xl sm:text-4xl md:text-5xl">{headerTitle}</h1>
        ) : (
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); save({ title: e.target.value }); }}
            placeholder="Untitled"
            className="note-page-title h-auto border-0 bg-transparent px-0 py-1 text-3xl shadow-none focus-visible:ring-0 sm:text-4xl md:text-5xl"
          />
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Updated {format(parseISO(note.updatedAt), "MMM d, h:mm a")}
        </p>

        <div className="mt-3">
          <TagPicker
            value={tags}
            onChange={(next) => {
              setTags(next);
              if (id) void updateNote(id, { tags: next }).catch(() => toast.error("Save failed"));
            }}
          />
        </div>

        <div className="mt-6">
          <BlockEditor
            body={body}
            noteId={note.id}
            onChange={(markdown) => { setBody(markdown); save({ body: markdown }); }}
            goal={note.wordGoal}
            onGoalChange={(next) => {
              setNote({ ...note, wordGoal: next });
              if (id) void updateNote(id, { wordGoal: next }).catch(() => toast.error("Save failed"));
            }}
          />
        </div>
      </div>

      {(linkedOut.length > 0 || backlinks.length > 0) && (
        <div className="mx-auto mt-6 grid w-full max-w-[760px] gap-3 px-2 md:grid-cols-2">
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

      <div className="mx-auto mt-4 w-full max-w-[760px] px-2">
        <NoteLinksSidebar noteId={note.id} />
      </div>
      </div>
      <div className="hidden 2xl:block">
        <div className="sticky top-20">
          <NoteTOC body={body} />
        </div>
      </div>
    </div>
  );
}