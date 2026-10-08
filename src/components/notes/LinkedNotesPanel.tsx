import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { updateNote, type Note } from "@/lib/notes";
import { FileText, X, ExternalLink, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntityNotes, linkNote, unlinkNote, type EntityType } from "@/lib/note-links";
import { createNote } from "@/lib/notes";
import { NotePicker } from "./NotePicker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  entityType: EntityType;
  entityId: string;
  /** Optional title used to seed a new note's title. */
  contextTitle?: string;
  className?: string;
  compact?: boolean;
}

export function LinkedNotesPanel({ entityType, entityId, contextTitle, className, compact }: Props) {
  const nav = useNavigate();
  const { notes: linked, reload: reloadLinked } = useEntityNotes(entityType, entityId);
  const [propNotes, setPropNotes] = useState<Note[]>([]);

  // Notes whose Project property points at this project (notes.project_id).
  const loadProp = useCallback(async () => {
    if (entityType !== "project" || !entityId) { setPropNotes([]); return; }
    const { data } = await supabase.from("notes").select("*").eq("project_id", entityId).eq("archived", false).limit(200);
    setPropNotes((data ?? []).map((r: any) => ({
      id: r.id, userId: r.user_id, title: r.title ?? "", body: r.body ?? "", kind: r.kind,
      date: r.date, projectId: r.project_id, pinned: !!r.pinned, archived: false,
      properties: Array.isArray(r.properties) ? r.properties : [],
      createdAt: r.created_at, updatedAt: r.updated_at,
    })));
  }, [entityType, entityId]);
  useEffect(() => { void loadProp(); }, [loadProp]);
  const reload = async () => { await Promise.all([reloadLinked(), loadProp()]); };

  const linkedIds = useMemo(() => new Set(linked.map(n => n.id)), [linked]);
  const propIds = useMemo(() => new Set(propNotes.map(n => n.id)), [propNotes]);
  const notes = useMemo(() => {
    const m = new Map<string, Note>();
    [...linked, ...propNotes].forEach(n => m.set(n.id, n));
    return [...m.values()].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }, [linked, propNotes]);

  /** Plain-text excerpt around where the note mentions this item, if it does. */
  const referenceOf = (n: Note) => {
    const text = (n.body ?? "").replace(/<[^>]+>/g, " ").replace(/[#*_>`|\[\]]/g, " ").replace(/\s+/g, " ").trim();
    const needle = (contextTitle ?? "").trim().toLowerCase();
    if (needle) {
      const i = text.toLowerCase().indexOf(needle);
      if (i >= 0) {
        const start = Math.max(0, i - 40);
        return (start > 0 ? "…" : "") + text.slice(start, i + needle.length + 60) + (i + needle.length + 60 < text.length ? "…" : "");
      }
    }
    return text.slice(0, 100);
  };

  const onLink = async (noteId: string) => {
    try {
      await linkNote(noteId, entityType, entityId);
      await reload();
      toast("Note linked");
    } catch (e: any) { toast.error(e?.message ?? "Could not link note"); }
  };

  const onUnlink = async (noteId: string) => {
    try {
      if (linkedIds.has(noteId)) await unlinkNote(noteId, entityType, entityId);
      if (propIds.has(noteId)) {
        const n = propNotes.find(x => x.id === noteId);
        await updateNote(noteId, {
          projectId: null,
          properties: (n?.properties ?? []).map(p => p.type === "project" ? { ...p, value: null } : p),
        });
      }
      await reload();
    } catch (e: any) { toast.error(e?.message ?? "Could not unlink"); }
  };

  const createAndLink = async () => {
    try {
      const n = await createNote({ title: contextTitle ?? "" });
      await linkNote(n.id, entityType, entityId);
      nav(`/notes/${n.id}`);
    } catch (e: any) { toast.error(e?.message ?? "Could not create note"); }
  };

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/40 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <NotebookPen className="h-3.5 w-3.5" /> Linked notes
          {notes.length > 0 && <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] normal-case tracking-normal">{notes.length}</span>}
        </div>
        <NotePicker
          excludeIds={notes.map(n => n.id)}
          onPick={(n) => onLink(n.id)}
          onCreateNew={createAndLink}
        />
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
          No notes attached. Link an existing note or create a new one.
        </div>
      ) : (
        <ul className="space-y-1">
          {notes.map(n => (
            <li key={n.id} className="group flex items-start gap-2 rounded-lg bg-muted/40 px-2 py-1.5 hover:bg-muted/70">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => nav(`/notes/${n.id}`)}
              >
                <span className="block truncate text-xs font-medium">{n.title || "Untitled"}</span>
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {propIds.has(n.id) && <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-foreground">Project property</span>}
                  {linkedIds.has(n.id) && <span className="rounded-full bg-muted px-1.5 text-[10px] text-foreground">Linked</span>}
                </span>
                {!compact && n.body && (
                  <span className="mt-0.5 block line-clamp-2 text-[11px] italic text-muted-foreground">“{referenceOf(n)}”</span>
                )}
              </button>
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => nav(`/notes/${n.id}`)} aria-label="Open note">
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => onUnlink(n.id)} aria-label="Unlink">
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}