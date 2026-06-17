import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BookHeart, Loader2, Plus, Link as LinkIcon, X, CheckCircle2 } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [taskQuery, setTaskQuery] = useState("");

  const linkedTasks = useMemo(
    () => state.tasks.filter((t) => linkedTaskIds.includes(t.id)),
    [state.tasks, linkedTaskIds],
  );
  const taskMatches = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    return state.tasks
      .filter((t) => !t.done && !linkedTaskIds.includes(t.id))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [state.tasks, taskQuery, linkedTaskIds]);

  const reset = () => {
    setTitle(seedTitle);
    setBody(seedBody ? `> ${seedBody}\n\n` : "");
    setType(defaultType);
    setLinkedTaskIds([]);
    setTaskQuery("");
  };

  const save = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      setBusy(true);
      const linkedIds = linkedTasks.map((t) => ({ type: "task", id: t.id, label: t.title }));
      await addJournal({
        date: iso,
        type,
        title: title.trim() || undefined,
        body: trimmed,
        tags: defaultTags,
        linkedIds: linkedIds.length ? linkedIds : undefined,
      } as any);
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
              <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Linked tasks
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[11px]">
                        <LinkIcon className="h-3 w-3" /> Link task
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 p-2">
                      <Input
                        autoFocus
                        value={taskQuery}
                        onChange={(e) => setTaskQuery(e.target.value)}
                        placeholder="Search active tasks…"
                        className="h-8 text-xs"
                      />
                      <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
                        {taskMatches.length === 0 ? (
                          <li className="px-2 py-1.5 text-[11px] text-muted-foreground">
                            No tasks match.
                          </li>
                        ) : taskMatches.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setLinkedTaskIds((ids) => [...ids, t.id]);
                                setTaskQuery("");
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                            >
                              <Plus className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate">{t.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </div>
                {linkedTasks.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {linkedTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/70 px-2 py-1 text-xs"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-primary/70" />
                          <span className="truncate">{t.title}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setLinkedTaskIds((ids) => ids.filter((id) => id !== t.id))
                          }
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Unlink ${t.title}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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