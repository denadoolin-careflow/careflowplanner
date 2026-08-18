import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { BookOpen, FileText, Link2 } from "lucide-react";
import { listNotes, type Note } from "@/lib/notes";
import { useStore } from "@/lib/store";
import { referencesDate } from "@/lib/notes/date-refs";
import { cn } from "@/lib/utils";

/**
 * The other half of `@today` date chips: everything written elsewhere that
 * points at this planner day, so the link works in both directions.
 */
export function PlannerDayReferences({ date, className }: { date: Date; className?: string }) {
  const iso = format(date, "yyyy-MM-dd");
  const navigate = useNavigate();
  const { state } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await listNotes();
        if (!cancelled) setNotes(all);
      } catch { /* offline or unauthenticated — nothing to show */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const matchedNotes = notes.filter(n => referencesDate(n.body, iso) || n.date === iso);
  const matchedJournal = (state.journal ?? []).filter(
    (j: any) => referencesDate(j.body, iso) || j.date === iso,
  );

  if (matchedNotes.length === 0 && matchedJournal.length === 0) return null;

  return (
    <section
      aria-label="Notes and journal referencing this day"
      className={cn("rounded-xl border border-border/50 bg-background/50 px-3 py-2", className)}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Link2 className="h-3 w-3" aria-hidden /> Referencing this day
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {matchedNotes.slice(0, 5).map(n => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => navigate(`/notes/${n.id}`)}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-[11.5px] hover:bg-muted/60"
            >
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{n.title || "Untitled note"}</span>
            </button>
          </li>
        ))}
        {matchedJournal.slice(0, 5).map((j: any) => (
          <li key={j.id}>
            <button
              type="button"
              onClick={() => navigate("/journal")}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-[11.5px] hover:bg-muted/60"
            >
              <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{j.title || j.body?.slice(0, 60) || "Journal entry"}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
