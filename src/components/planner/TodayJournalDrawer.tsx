import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink, Leaf } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getOrCreateDailyNote, updateNote, type Note } from "@/lib/notes";
import { todayISO, useStore } from "@/lib/store";
import { appendDayRhythm } from "@/lib/notes/day-rhythm";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { notifyDailyNotesChanged } from "@/lib/notes/daily";

/** Side drawer with today's Daily Note, editable next to the planner timeline. */
export function TodayJournalDrawer({ compact, label = "Journal", triggerClassName }: { compact?: boolean; label?: string; triggerClassName?: string }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<number>();
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getOrCreateDailyNote(todayISO())
      .then(n => { setNote(n); setBody(n.body); })
      .catch(() => toast.error("Couldn't open today's note"));
  }, [open]);

  const flush = useCallback(async () => {
    const next = pending.current;
    if (!note || next == null) return;
    window.clearTimeout(timer.current);
    setStatus("saving");
    try {
      await updateNote(note.id, { body: next });
      pending.current = null;
      notifyDailyNotesChanged();
      setStatus("saved");
    } catch {
      setStatus("idle");
      toast.error("Couldn't save");
    }
  }, [note]);

  const save = (next: string) => {
    setBody(next);
    if (!note) return;
    pending.current = next;
    setStatus("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, 600);
  };

  useEffect(() => () => { if (pending.current != null) void flush(); }, [flush]);

  const changeOpen = (next: boolean) => {
    if (!next && pending.current != null) void flush();
    setOpen(next);
  };

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button
          size={compact ? "icon" : "sm"}
          variant="outline"
          className={triggerClassName ?? (compact ? "h-10 w-10 shrink-0 rounded-full" : "h-8 rounded-full")}
          aria-label="Open today's journal"
          title="Today's journal"
        >
          <BookOpen className="h-4 w-4" />
          {!compact && <span className="ml-1.5">{label}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="notes-editor-experience flex w-[96vw] max-w-[560px] flex-col gap-3 overflow-hidden sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle className="font-display">Today's journal</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Writes straight into today's daily note"}
          </p>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/55 bg-background/65 p-2 sm:p-3">
          {note ? (
            <BlockEditor
              body={body}
              noteId={note.id}
              defaultDueDate={todayISO()}
              showFooter={false}
              minHeight="min-h-[55vh]"
              toolbarPlacement="top"
              placeholder="Write, reflect, or press / for more…"
              onChange={(markdown) => save(markdown)}
            />
          ) : <p className="px-2 py-4 text-sm text-muted-foreground">Opening today’s note…</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={!note} onClick={() => save(appendDayRhythm(body, state, todayISO()))}>
            <Leaf className="mr-1.5 h-4 w-4" /> Insert day's rhythm
          </Button>
          {note && (
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/notes/${note.id}`}><ExternalLink className="mr-1.5 h-4 w-4" /> Open full note</Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
