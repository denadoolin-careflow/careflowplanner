/**
 * Craft-style block references:
 * - `blockEmbed`: a card that transcludes a block (or heading section) from
 *   another note, read-only or synced (edits write back to the source).
 * - `blockRef`: an inline chip linking to a specific block.
 * Both persist as raw HTML with data-* attrs inside the markdown body.
 */
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Link2, Lock, RefreshCw, Search, Unlock, FileText } from "lucide-react";
import { toast } from "sonner";
import { getNote, updateNote, type Note } from "@/lib/notes";
import { supabase } from "@/integrations/supabase/client";
import {
  extractBlockMarkdown, replaceBlockMarkdown, stripBlockMarkers, parseBlocks, ensureBlockId,
  notifyNoteBodyChanged, NOTE_BODY_EVENT, type NoteBlock,
} from "@/lib/notes/blocks";
import { NoteMarkdown } from "./NoteMarkdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const LazyBlockEditor = lazy(() => import("./BlockEditor").then(m => ({ default: m.BlockEditor })));

/** Tracks the host note and nesting depth so embeds can't loop. */
export const EmbedContext = createContext<{ noteId?: string; depth: number }>({ depth: 0 });
const MAX_DEPTH = 2;

function useSourceNote(noteId: string) {
  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const load = useCallback(() => { void getNote(noteId).then(n => setNote(n)).catch(() => setNote(null)); }, [noteId]);
  useEffect(() => {
    load();
    const onChange = (e: Event) => { if ((e as CustomEvent).detail?.noteId === noteId) load(); };
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener(NOTE_BODY_EVENT, onChange);
    document.addEventListener("visibilitychange", onVis);
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 20000);
    return () => {
      window.removeEventListener(NOTE_BODY_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(poll);
    };
  }, [noteId, load]);
  return { note, reload: load };
}

function EmbedView({ node, updateAttributes, selected }: NodeViewProps) {
  const noteId: string = node.attrs.noteId || "";
  const blockId: string = node.attrs.blockId || "";
  const mode: "read" | "synced" = node.attrs.mode === "synced" ? "synced" : "read";
  const ctx = useContext(EmbedContext);
  const { note, reload } = useSourceNote(noteId);
  const saveTimer = useRef<number | null>(null);

  const selfEmbed = ctx.noteId && ctx.noteId === noteId;
  const tooDeep = ctx.depth >= MAX_DEPTH;
  const md = note ? extractBlockMarkdown(note.body, blockId) : null;

  const writeBack = (next: string) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const latest = await getNote(noteId);
      if (!latest) return;
      const updated = replaceBlockMarkdown(latest.body, blockId, next);
      if (updated == null) {
        toast.error("Source block changed — switched to read-only");
        updateAttributes({ mode: "read" });
        return;
      }
      if (updated === latest.body) return;
      await updateNote(noteId, { body: updated });
      notifyNoteBodyChanged(noteId);
    }, 600);
  };

  return (
    <NodeViewWrapper
      as="div"
      contentEditable={false}
      data-drag-handle=""
      className={cn(
        "cf-block-embed my-2 rounded-xl border border-l-4 border-border/60 border-l-primary/50 bg-muted/20 px-3 py-2",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        <FileText className="h-3 w-3" aria-hidden />
        <span className="truncate font-medium">{note?.title || (note === undefined ? "Loading…" : "Untitled")}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
            onClick={() => updateAttributes({ mode: mode === "read" ? "synced" : "read" })}
            title={mode === "read" ? "Read-only — tap to allow editing here" : "Synced — edits save to the source"}
          >
            {mode === "read" ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            {mode === "read" ? "Read-only" : "Synced"}
          </button>
          <button type="button" className="rounded p-1 hover:bg-muted hover:text-foreground" onClick={reload} aria-label="Refresh embed">
            <RefreshCw className="h-3 w-3" />
          </button>
          <Link to={`/notes/${noteId}#${blockId}`} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground">
            Jump to source <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      {selfEmbed ? (
        <p className="text-xs italic text-muted-foreground">A note can't embed its own blocks.</p>
      ) : tooDeep ? (
        <p className="text-xs italic text-muted-foreground">Embedded block (open source to view — embeds stop at 2 levels).</p>
      ) : note === undefined ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !note || md == null ? (
        <p className="text-xs italic text-muted-foreground">Source removed.</p>
      ) : mode === "synced" ? (
        <EmbedContext.Provider value={{ noteId, depth: ctx.depth + 1 }}>
          <div onKeyDown={e => e.stopPropagation()} onPaste={e => e.stopPropagation()}>
            <Suspense fallback={<NoteMarkdown body={stripBlockMarkers(md)} />}>
              <LazyBlockEditor
                key={`${noteId}:${blockId}`}
                body={md}
                showFooter={false}
                minHeight="min-h-[24px]"
                onChange={(next: string) => writeBack(next)}
              />
            </Suspense>
          </div>
        </EmbedContext.Provider>
      ) : (
        <NoteMarkdown body={stripBlockMarkers(md)} />
      )}
    </NodeViewWrapper>
  );
}

export const BlockEmbed = TiptapNode.create({
  name: "blockEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      noteId: { default: "", parseHTML: el => el.getAttribute("data-note-id") || "", renderHTML: a => ({ "data-note-id": a.noteId }) },
      blockId: { default: "", parseHTML: el => el.getAttribute("data-block-ref-id") || "", renderHTML: a => ({ "data-block-ref-id": a.blockId }) },
      mode: { default: "read", parseHTML: el => el.getAttribute("data-mode") || "read", renderHTML: a => ({ "data-mode": a.mode }) },
    };
  },
  parseHTML() { return [{ tag: "div[data-block-embed]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-block-embed": "" })]; },
  addNodeView() { return ReactNodeViewRenderer(EmbedView); },
});

function RefView({ node }: NodeViewProps) {
  const navigate = useNavigate();
  const noteId: string = node.attrs.noteId || "";
  const blockId: string = node.attrs.blockId || "";
  const label: string = node.attrs.label || "Block";
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    void getNote(noteId).then(n => { if (alive) setMissing(!n || extractBlockMarkdown(n.body, blockId) == null); });
    return () => { alive = false; };
  }, [noteId, blockId]);
  return (
    <NodeViewWrapper as="span" contentEditable={false} className="inline">
      <button
        type="button"
        onClick={() => navigate(missing ? `/notes/${noteId}` : `/notes/${noteId}#${blockId}`)}
        className="inline-flex max-w-[22ch] items-center gap-1 truncate rounded bg-primary/10 px-1.5 align-baseline text-[0.9em] text-primary hover:bg-primary/20"
        title={missing ? "Block removed — opens the note" : label}
      >
        <Link2 className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{missing ? "Block removed" : label}</span>
      </button>
    </NodeViewWrapper>
  );
}

export const BlockRef = TiptapNode.create({
  name: "blockRef",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      noteId: { default: "", parseHTML: el => el.getAttribute("data-note-id") || "", renderHTML: a => ({ "data-note-id": a.noteId }) },
      blockId: { default: "", parseHTML: el => el.getAttribute("data-block-ref-id") || "", renderHTML: a => ({ "data-block-ref-id": a.blockId }) },
      label: { default: "", parseHTML: el => el.getAttribute("data-label") || el.textContent || "", renderHTML: a => ({ "data-label": a.label }) },
    };
  },
  parseHTML() { return [{ tag: "span[data-block-ref]" }]; },
  renderHTML({ HTMLAttributes, node }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-block-ref": "" }), node.attrs.label || "Block"];
  },
  addNodeView() { return ReactNodeViewRenderer(RefView); },
});

/** Two-step picker: choose a note, then a heading or block inside it. */
export function BlockPickerDialog({ open, mode, excludeNoteId, onOpenChange, onPick }: {
  open: boolean;
  mode: "embed" | "link";
  excludeNoteId?: string;
  onOpenChange: (o: boolean) => void;
  onPick: (r: { noteId: string; blockId: string; label: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) { setNote(null); setQ(""); } }, [open]);
  useEffect(() => {
    if (!open || note) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const term = q.trim().replace(/[%,()]/g, "");
      let query = supabase.from("notes").select("id,title,body,kind,date,updated_at").eq("archived", false).order("updated_at", { ascending: false }).limit(25);
      if (term) query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
      const { data } = await query;
      if (cancelled) return;
      setNotes((data ?? []).map((r: any) => ({ id: r.id, title: r.title ?? "", body: r.body ?? "", kind: r.kind, date: r.date } as Note))
        .filter(n => mode === "link" || n.id !== excludeNoteId));
    }, 150);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [q, open, note, mode, excludeNoteId]);

  const blocks = note ? parseBlocks(note.body) : [];
  const filtered = q.trim() && note ? blocks.filter(b => b.text.toLowerCase().includes(q.trim().toLowerCase())) : blocks;

  const choose = async (b: NoteBlock) => {
    if (!note) return;
    setBusy(true);
    try {
      const blockId = await ensureBlockId(note.id, b);
      onPick({ noteId: note.id, blockId, label: b.text.slice(0, 60) });
      onOpenChange(false);
    } catch {
      toast.error("Couldn't link that block");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "embed" ? "Embed a block" : "Link to a block"}{note ? ` · ${note.title || "Untitled"}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={note ? "Filter blocks…" : "Search notes…"} className="pl-8" />
        </div>
        {note && (
          <button type="button" className="self-start text-xs text-muted-foreground hover:text-foreground" onClick={() => { setNote(null); setQ(""); }}>
            ← All notes
          </button>
        )}
        <ScrollArea className="max-h-[50vh]">
          <ul className="space-y-0.5 pr-2">
            {!note && notes.map(n => (
              <li key={n.id}>
                <button type="button" onClick={() => { setNote(n); setQ(""); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{n.title || "Untitled"}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{n.kind === "note" ? "" : n.date}</span>
                </button>
              </li>
            ))}
            {note && filtered.map(b => (
              <li key={`${b.start}`}>
                <button
                  type="button" disabled={busy} onClick={() => void choose(b)}
                  className={cn("flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50", b.type === "heading" && "font-semibold")}
                  style={b.type === "heading" ? { paddingLeft: 8 + (b.level - 1) * 10 } : undefined}
                >
                  <span className="mt-0.5 w-6 shrink-0 text-[10px] uppercase text-muted-foreground">{b.type === "heading" ? `H${b.level}` : b.type === "listItem" ? "•" : "¶"}</span>
                  <span className="line-clamp-2">{b.text}</span>
                </button>
              </li>
            ))}
            {note && filtered.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">No blocks found.</li>}
            {!note && notes.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">No notes found.</li>}
          </ul>
        </ScrollArea>
        {note && mode === "embed" && <p className="text-[11px] text-muted-foreground">Picking a heading embeds its whole section.</p>}
      </DialogContent>
    </Dialog>
  );
}
