import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Pin, Trash2, Link2, ImagePlus, X, Move, Check, Copy, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteNote, extractBacklinks, findBacklinksTo, getNote, updateNote, type Note } from "@/lib/notes";
import { uploadNoteImage } from "@/lib/note-images";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NoteLinksSidebar } from "@/components/notes/NoteLinksSidebar";
import { NoteAIButton } from "@/components/notes/NoteAIButton";
import { CareyButton } from "@/components/carey/CareyButton";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { EditorPrefsMenu } from "@/components/notes/EditorPrefsMenu";
import { TagPicker } from "@/components/tags/TagPicker";
import { NoteTOC } from "@/components/notes/NoteTOC";
import { NoteContextRail } from "@/components/notes/NoteContextRail";
import { useTags } from "@/hooks/use-tags";
import { useStore } from "@/lib/store";
import { copyToClipboard } from "@/lib/clipboard";
import { NoteIconPicker } from "@/components/notes/NoteIconPicker";
import { NoteCoverPicker } from "@/components/notes/NoteCoverPicker";
import { resolveNoteIcon, getLucideIcon } from "@/lib/note-icons";
import { getNoteCoverCss } from "@/lib/note-covers";
import { buildDailyNoteTemplate, isEmptyBody } from "@/lib/daily-note-template";
import { useEditorPrefs } from "@/lib/editor-prefs";
import type { NoteTitleSize } from "@/lib/editor-prefs";

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { state } = useStore();
  const { tags: allTags } = useTags();
  const projectsById = useMemo(() => {
    const m: Record<string, string> = {};
    (state.projects ?? []).forEach(p => { m[p.id] = p.name; });
    return m;
  }, [state.projects]);
  const tagsByName = useMemo(() => {
    const m = new Map<string, typeof allTags[number]>();
    for (const t of allTags) m.set(t.name.toLowerCase(), t);
    return m;
  }, [allTags]);
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
  const [editorPrefs] = useEditorPrefs();
  const focusContainerRef = useRef<HTMLDivElement | null>(null);
  const savedScrollRef = useRef<{ window: number; focus: number }>({ window: 0, focus: 0 });
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("careflow.notes.focusMode") === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("careflow.notes.focusMode", focusMode ? "1" : "0"); } catch {}
  }, [focusMode]);
  // Preserve scroll position across focus toggles. Entering: remember window scrollY.
  // Exiting: restore window scrollY on next frame (after the overlay unmounts).
  const enterFocus = () => {
    savedScrollRef.current.window = window.scrollY;
    setFocusMode(true);
  };
  const exitFocus = () => {
    if (focusContainerRef.current) {
      savedScrollRef.current.focus = focusContainerRef.current.scrollTop;
    }
    setFocusMode(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollRef.current.window, behavior: "auto" });
    });
  };
  // When entering focus mode, restore previous in-overlay scroll position.
  useEffect(() => {
    if (!focusMode) return;
    const el = focusContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = savedScrollRef.current.focus || 0;
    });
  }, [focusMode]);
  // Esc exits focus mode
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") exitFocus(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMode]);

  const titleSizeClasses: Record<NoteTitleSize, string> = {
    small: "text-lg md:text-xl",
    medium: "text-xl md:text-2xl",
    large: "text-2xl md:text-3xl",
  };
  const titleCls = titleSizeClasses[editorPrefs.titleSize] ?? titleSizeClasses.medium;

  useEffect(() => {
    if (!id) return;
    void getNote(id).then(n => {
      if (!n) { toast.error("Note not found"); nav("/notes"); return; }
      // Daily notes get a structured template auto-scaffolded on first open.
      let initialBody = n.body;
      if (n.kind === "daily" && n.date && isEmptyBody(initialBody)) {
        initialBody = buildDailyNoteTemplate(n.date);
        // Persist the scaffold so we don't re-insert on every open.
        void updateNote(n.id, { body: initialBody }).catch(() => {});
      }
      setNote(n); setTitle(n.title); setBody(initialBody); setTags(n.tags ?? []);
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
    setNote(n => n ? { ...n, coverUrl: null, coverGradient: null } : n);
    await updateNote(id, { coverUrl: null, coverPosition: null, coverGradient: null });
    setRepositioning(false);
  };

  const setGradientCover = async (gradientId: string) => {
    if (!id) return;
    setNote(n => n ? { ...n, coverGradient: gradientId, coverUrl: null, coverPosition: null } : n);
    try {
      await updateNote(id, { coverGradient: gradientId, coverUrl: null, coverPosition: null });
      toast.success("Cover updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save cover");
    }
  };

  const setIcon = async (next: string | null) => {
    if (!id) return;
    setNote(n => n ? { ...n, icon: next } : n);
    try {
      await updateNote(id, { icon: next });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save icon");
    }
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
  const resolvedIcon = resolveNoteIcon({ title, body, kind: note.kind, icon: note.icon ?? null });
  const IconEl = getLucideIcon(resolvedIcon);
  const gradientCss = getNoteCoverCss(note.coverGradient);

  return (
    <div
      ref={focusContainerRef}
      className={cn(
        focusMode
          ? "fixed inset-0 z-[60] overflow-auto bg-background px-3 py-4 md:px-6 md:py-6"
          : "mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 px-3 py-4 md:px-6 md:py-6 lg:grid-cols-[minmax(0,1fr)_300px]",
      )}
    >
      {focusMode && (
        <button
          type="button"
          onClick={exitFocus}
          aria-label="Exit focus mode"
          title="Exit focus mode (Esc)"
          className="fixed right-4 top-4 z-[70] inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur transition hover:bg-card hover:text-foreground"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Exit focus
        </button>
      )}
      <div className="min-w-0">
      <header className="mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-2 px-2">
        <Button variant="ghost" size="sm" onClick={() => nav("/notes")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Notes
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (focusMode ? exitFocus() : enterFocus())}
            aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
            title={focusMode ? "Exit focus mode (Esc)" : "Focus mode — just the writing"}
          >
            {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <NoteAIButton
            title={title}
            body={body}
            onApply={(next) => { setBody(next); save({ body: next }); }}
          />
          <CareyButton
            label="Carey"
            contextType="note"
            contextId={id}
            context={{ title, body: body.slice(0, 4000) }}
            actions={[
              { label: "Summarize this note", prompt: `Summarize this note in 3-5 bullets, then one sentence on what to do next.\n\nTitle: ${title}\n\n${body}` },
              { label: "Extract action items", prompt: `From this note, extract concrete action items as a checklist. Group by area when obvious.\n\nTitle: ${title}\n\n${body}` },
              { label: "Suggest tags", prompt: `Suggest 3-6 short tags for this note and briefly explain why.\n\nTitle: ${title}\n\n${body}` },
              { label: "Turn into a project plan", prompt: `Turn this note into a lightweight project plan: 1-line goal, 3 milestones, first 5 tasks.\n\nTitle: ${title}\n\n${body}` },
              { label: "Find what's missing", prompt: `What's missing or unclear in this note? Ask me clarifying questions.\n\nTitle: ${title}\n\n${body}` },
            ]}
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
          <NoteIconPicker
            value={note.icon ?? null}
            resolved={resolvedIcon}
            onChange={(next) => void setIcon(next)}
          />
          <NoteCoverPicker
            hasCover={!!note.coverUrl || !!note.coverGradient}
            busy={coverBusy}
            onPickGradient={(gid) => void setGradientCover(gid)}
            onPickImage={(f) => void setCover(f)}
            onRemove={() => void removeCover()}
          />
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

      {!note.coverUrl && gradientCss && (
        <div className="mx-auto mt-3 w-full max-w-[920px] px-2">
          <div
            className="group relative h-32 overflow-hidden rounded-2xl border border-border/60 md:h-44"
            style={{ background: gradientCss }}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/40 to-transparent" />
          </div>
        </div>
      )}

      <div className="mx-auto mt-6 w-full max-w-[760px] px-2">
        <div className="flex items-center gap-3">
          <IconEl className="h-7 w-7 shrink-0 text-primary sm:h-8 sm:w-8" />
          <div className="min-w-0 flex-1">
            {note.kind === "daily" ? (
              <h1 className={cn("note-page-title break-words leading-snug", titleCls)}>{headerTitle}</h1>
            ) : (
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); save({ title: e.target.value }); }}
                placeholder="Untitled"
                className={cn("note-page-title h-auto border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0 break-words leading-snug", titleCls)}
              />
            )}
          </div>
        </div>
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
      {!focusMode && (
      <div className="hidden lg:block">
        <div className="sticky top-20 space-y-3">
          <NoteContextRail
            noteId={note.id}
            onClose={() => nav("/notes")}
            projectsById={projectsById}
            tagsByName={tagsByName}
            projects={(state.projects ?? []).map(p => ({ id: p.id, name: p.name }))}
            onUpdated={(patch) => {
              setNote(n => (n ? { ...n, ...patch } : n));
              if (patch.tags !== undefined) setTags(patch.tags ?? []);
            }}
          />
          <NoteTOC body={body} />
        </div>
      </div>
      )}
    </div>
  );
}