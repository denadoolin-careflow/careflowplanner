import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BookHeart, Loader2, Plus, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStore, todayISO } from "@/lib/store";
import type { JournalEntry } from "@/lib/types";

type JournalType = JournalEntry["type"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date?: Date;
  /** Seed body text (e.g. reflection quote). */
  seedBody?: string;
  /** Optional seed title. */
  seedTitle?: string;
  /** Optional tags applied to new entries. */
  defaultTags?: string[];
  /** Default journal type for new entries. */
  defaultType?: JournalType;
}

const TYPE_OPTIONS: { value: JournalType; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "brain-dump", label: "Brain dump" },
  { value: "gratitude", label: "Gratitude" },
  { value: "burnout", label: "Burnout" },
];

export function JournalEntryDialog({
  open,
  onOpenChange,
  date,
  seedBody = "",
  seedTitle = "",
  defaultTags,
  defaultType = "daily",
}: Props) {
  const { state, addJournal } = useStore();
  const iso = format(date ?? new Date(), "yyyy-MM-dd");

  const entries = useMemo(
    () =>
      state.journal
        .filter(j => (j.date ?? "").slice(0, 10) === iso)
        .sort((a, b) => (b.id > a.id ? 1 : -1)),
    [state.journal, iso],
  );

  const [title, setTitle] = useState(seedTitle);
  const [body, setBody] = useState(seedBody ? `> ${seedBody}\n\n` : "");
  const [type, setType] = useState<JournalType>(defaultType);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle(seedTitle);
    setBody(seedBody ? `> ${seedBody}\n\n` : "");
    setType(defaultType);
  };

  const save = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      setBusy(true);
      await addJournal({
        date: iso,
        type,
        title: title.trim() || undefined,
        body: trimmed,
        tags: defaultTags,
      });
      toast.success("Entry saved");
      reset();
    } catch {
      toast.error("Couldn't save entry");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-border/50 px-6 pb-3 pt-5">
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <BookHeart className="h-4 w-4 text-primary" />
              Journal · {format(date ?? new Date(), "EEE, MMM d")}
            </DialogTitle>
            <DialogDescription>
              Capture a new entry or review what you've written today.
            </DialogDescription>
          </DialogHeader>

          <div className="grid flex-1 min-h-0 gap-0 overflow-hidden md:grid-cols-[1fr_260px]">
            {/* Editor */}
            <div className="flex min-h-0 flex-col gap-2 overflow-y-auto px-6 py-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {TYPE_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setType(o.value)}
                    className={
                      "rounded-full border px-2.5 py-1 text-[11px] transition " +
                      (type === o.value
                        ? "border-primary/60 bg-primary/15 text-foreground"
                        : "border-border/50 bg-background/60 text-muted-foreground hover:text-foreground")
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="h-9"
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's on your heart?"
                rows={10}
                className="min-h-[220px] flex-1 resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <Link
                  to="/journal"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <LinkIcon className="h-3 w-3" /> Open full journal
                </Link>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    disabled={busy}
                  >
                    Reset
                  </Button>
                  <Button size="sm" onClick={save} disabled={!body.trim() || busy}>
                    {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
                    Save entry
                  </Button>
                </div>
              </div>
            </div>

            {/* Today's entries */}
            <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-border/50 bg-muted/20 px-4 py-4 md:flex">
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Today · {entries.length}
              </p>
              {entries.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
                  No entries yet today.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {entries.map(j => (
                    <li
                      key={j.id}
                      className="rounded-lg border border-border/40 bg-background/70 px-2 py-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-medium text-foreground">
                          {j.title || j.type}
                        </span>
                        <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">
                          {j.type}
                        </span>
                      </div>
                      <p className="line-clamp-3 whitespace-pre-wrap text-[11px] text-muted-foreground">
                        {j.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { todayISO };