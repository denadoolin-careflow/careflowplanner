import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink, Leaf } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getOrCreateDailyNote, updateNote, type Note } from "@/lib/notes";
import { todayISO, useStore } from "@/lib/store";
import { appendDayRhythm } from "@/lib/notes/day-rhythm";

/** Side drawer with today's Daily Note, editable next to the planner timeline. */
export function TodayJournalDrawer({ compact }: { compact?: boolean }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<number>();

  useEffect(() => {
    if (!open) return;
    getOrCreateDailyNote(todayISO())
      .then(n => { setNote(n); setBody(n.body); })
      .catch(() => toast.error("Couldn't open today's note"));
  }, [open]);

  const save = (next: string) => {
    setBody(next);
    if (!note) return;
    setStatus("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      updateNote(note.id, { body: next })
        .then(() => setStatus("saved"))
        .catch(() => { setStatus("idle"); toast.error("Couldn't save"); });
    }, 600);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size={compact ? "icon" : "sm"}
          variant="outline"
          className={compact ? "h-10 w-10 shrink-0 rounded-full" : "h-8 rounded-full"}
          aria-label="Open today's journal"
          title="Today's journal"
        >
          <BookOpen className="h-4 w-4" />
          {!compact && <span className="ml-1.5">Journal</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[92vw] max-w-[440px] flex-col gap-3 sm:max-w-[440px]">
        <SheetHeader>
          <SheetTitle className="font-display">Today's journal</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Writes straight into today's daily note"}
          </p>
        </SheetHeader>
        <Textarea
          value={body}
          onChange={e => save(e.target.value)}
          disabled={!note}
          placeholder={note ? "Brain-dump, meeting notes, - [ ] action items…" : "Opening…"}
          aria-label="Today's journal"
          className="min-h-0 flex-1 resize-none text-sm leading-relaxed"
        />
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
