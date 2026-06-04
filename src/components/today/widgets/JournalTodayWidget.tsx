import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BookHeart, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";

/** Today's journal entries + quick capture. */
export function JournalTodayWidget() {
  const { state, addJournal } = useStore();
  const iso = format(new Date(), "yyyy-MM-dd");
  const entries = useMemo(
    () => state.journal.filter(j => (j.date ?? "").slice(0, 10) === iso).slice(0, 3),
    [state.journal, iso],
  );
  const [draft, setDraft] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    await addJournal({ body, type: "brain-dump", date: iso });
    setDraft("");
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <BookHeart className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Journal today</h3>
        </div>
        <Link to="/journal" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Open <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          No entries yet today.
        </p>
      ) : (
        <ul className="space-y-1">
          {entries.map(j => (
            <li key={j.id} className="rounded-lg border border-border/40 bg-background/60 px-2 py-1.5">
              {j.title && <div className="truncate text-xs font-medium text-foreground">{j.title}</div>}
              <p className="line-clamp-2 text-[11px] text-muted-foreground">{j.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border/60 bg-background/50 px-2 py-1">
        <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="A line for today…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
        />
      </form>
    </section>
  );
}