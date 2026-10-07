/** Edit any note in a side sheet without leaving the current page. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { getNote, updateNote, type Note } from "@/lib/notes";

export function NoteQuickEditSheet({ noteId, onOpenChange, onSaved }: { noteId: string | null; onOpenChange: (open: boolean) => void; onSaved?: () => void }) {
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const pending = useRef<Partial<Note> | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    setNote(null);
    if (!noteId) return;
    void getNote(noteId).then(n => { setNote(n); setTitle(n?.title ?? ""); }).catch(() => toast.error("Couldn't open note"));
  }, [noteId]);

  const flush = useCallback(async () => {
    const p = pending.current; pending.current = null;
    window.clearTimeout(timer.current);
    if (!p || !noteId) return;
    try { await updateNote(noteId, p); onSaved?.(); } catch { toast.error("Couldn't save"); }
  }, [noteId, onSaved]);

  const queue = (p: Partial<Note>) => {
    pending.current = { ...(pending.current ?? {}), ...p };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, 600);
  };

  const change = (open: boolean) => { if (!open) void flush(); onOpenChange(open); };

  return (
    <Sheet open={!!noteId} onOpenChange={change}>
      <SheetContent side="right" className="notes-editor-experience flex w-[96vw] max-w-[620px] flex-col gap-3 overflow-hidden sm:max-w-[620px]">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="sr-only">Edit linked note</SheetTitle>
          <Input value={title} onChange={e => { setTitle(e.target.value); queue({ title: e.target.value }); }} aria-label="Note title" placeholder="Untitled"
            className="border-0 bg-transparent px-0 font-display text-2xl font-semibold shadow-none focus-visible:ring-0" />
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/55 bg-background/65 p-2 sm:p-3">
          {note ? (
            <BlockEditor body={note.body} noteId={note.id} showFooter={false} minHeight="min-h-[55vh]" toolbarPlacement="top"
              onChange={md => queue({ body: md })} />
          ) : <p className="px-2 py-4 text-sm text-muted-foreground">Opening…</p>}
        </div>
        {noteId && (
          <Button asChild variant="outline" size="sm" className="self-start gap-1.5">
            <Link to={`/notes/${noteId}`} onClick={() => change(false)}><ExternalLink className="h-3.5 w-3.5" />Open full note</Link>
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
