import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ChevronRight, NotebookPen, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Note, PeriodKind } from "@/lib/notes";
import { fromISO, monthKeyFor, periodTitle, weekKeyFor } from "@/lib/notes/periods";
import { hasWriting, openPeriodNoteWithTemplate, readDefaultPeriodTemplate } from "@/lib/notes/daily";

/**
 * Notebook: every daily / weekly / monthly note, nested month → week → day,
 * so it's obvious where each period's note lives and which are still blank.
 */
export function NotesNotebookView({ notes, selectedId, onSelect }: {
  notes: Note[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  const navigate = useNavigate();

  const tree = useMemo(() => {
    const months = new Map<string, { note?: Note; weeks: Map<string, { note?: Note; days: Note[] }> }>();
    const month = (k: string) => { if (!months.has(k)) months.set(k, { weeks: new Map() }); return months.get(k)!; };
    const week = (mk: string, wk: string) => { const m = month(mk); if (!m.weeks.has(wk)) m.weeks.set(wk, { days: [] }); return m.weeks.get(wk)!; };
    for (const n of notes) {
      if (!n.date) continue;
      const d = fromISO(n.date);
      if (n.kind === "monthly") month(n.date).note = n;
      else if (n.kind === "weekly") week(monthKeyFor(d), n.date).note = n;
      else if (n.kind === "daily") week(monthKeyFor(d), weekKeyFor(d)).days.push(n);
    }
    // Always show the current month so there's somewhere to start.
    const now = new Date();
    week(monthKeyFor(now), weekKeyFor(now));
    return Array.from(months.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([mk, m]) => ({
      key: mk, note: m.note,
      weeks: Array.from(m.weeks.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([wk, w]) => ({
        key: wk, note: w.note, days: w.days.sort((a, b) => (a.date! < b.date! ? 1 : -1)),
      })),
    }));
  }, [notes]);

  const open = async (kind: PeriodKind, key: string, note?: Note) => {
    if (note) { onSelect(note.id); return; }
    try {
      const n = await openPeriodNoteWithTemplate(kind, key, readDefaultPeriodTemplate(kind));
      navigate(`/notes/${n.id}`);
    } catch (e: any) { toast.error(e?.message ?? "Could not open the note"); }
  };

  const Row = ({ kind, k, note, depth }: { kind: PeriodKind; k: string; note?: Note; depth: number }) => {
    const written = !!note && hasWriting(note.body ?? "");
    return (
      <button
        type="button"
        onClick={() => void open(kind, k, note)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/60",
          selectedId && note?.id === selectedId && "bg-primary/10",
          depth === 0 && "font-display text-base font-semibold",
          depth === 1 && "font-medium",
        )}
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        {depth > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />}
        <NotebookPen className={cn("h-3.5 w-3.5 shrink-0", written ? "text-primary" : note ? "text-muted-foreground/60" : "text-muted-foreground/30")} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{periodTitle(kind, k, { short: depth > 0 })}</span>
        {!note ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Plus className="h-3 w-3" /> start</span>
        ) : !written ? (
          <span className="text-[10px] text-muted-foreground">blank</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{format(fromISO(note.updatedAt.slice(0, 10)), "MMM d")}</span>
        )}
      </button>
    );
  };

  if (tree.length === 0) return null;

  return (
    <div className="space-y-3">
      {tree.map(m => (
        <section key={m.key} className="rounded-2xl border border-border/60 bg-card/60 p-2">
          <Row kind="monthly" k={m.key} note={m.note} depth={0} />
          <div className="mt-1 space-y-0.5">
            {m.weeks.map(w => (
              <div key={w.key}>
                <Row kind="weekly" k={w.key} note={w.note} depth={1} />
                {w.days.map(d => <Row key={d.id} kind="daily" k={d.date!} note={d} depth={2} />)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
