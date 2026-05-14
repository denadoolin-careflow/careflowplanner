import { useNavigate } from "react-router-dom";
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
  const { notes, reload } = useEntityNotes(entityType, entityId);

  const onLink = async (noteId: string) => {
    try {
      await linkNote(noteId, entityType, entityId);
      await reload();
      toast("Note linked");
    } catch (e: any) { toast.error(e?.message ?? "Could not link note"); }
  };

  const onUnlink = async (noteId: string) => {
    try {
      await unlinkNote(noteId, entityType, entityId);
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
                {!compact && n.body && (
                  <span className="block truncate text-[10px] text-muted-foreground">{n.body.slice(0, 100)}</span>
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