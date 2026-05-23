import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { BookHeart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Compact gallery of journal entries linked to a project.
 * Shown on the project detail page.
 */
export function ProjectJournalPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { state } = useStore();
  const entries = useMemo(() => {
    return state.journal
      .filter(e => (e.linkedIds ?? []).some(l => l.type === "project" && l.id === projectId))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [state.journal, projectId]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookHeart className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">Journal · {entries.length}</h3>
        </div>
        <Button asChild size="sm" variant="ghost" className="h-7 gap-1 rounded-full text-xs">
          <Link to={`/journal?linkProject=${projectId}&label=${encodeURIComponent(projectName)}`}>
            <Plus className="h-3 w-3" /> Write entry
          </Link>
        </Button>
      </header>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No journal entries linked to this project yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {entries.slice(0, 6).map(e => (
            <li key={e.id} className="rounded-xl border border-border/50 bg-background/60 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {format(parseISO(e.date), "MMM d, yyyy")}
              </div>
              {e.title && <div className="mb-0.5 truncate font-display text-sm">{e.title}</div>}
              <div className="line-clamp-3 text-xs text-muted-foreground">
                <NoteMarkdown body={e.body} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}