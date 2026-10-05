import { useMemo, useState } from "react";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ArrowLeft, BookOpenText, CalendarDays, ChevronRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Note } from "@/lib/notes";
import { monthKeyFor } from "@/lib/notes/periods";
import { cn } from "@/lib/utils";
import { NotesNotebookView } from "./NotesNotebookView";

type MonthSummary = {
  key: string;
  label: string;
  notes: Note[];
  monthly?: Note;
  written: number;
};

export function NotesNotebookGallery({ notes, selectedId, onSelect, onOpenMonth }: {
  notes: Note[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onOpenMonth: (key: string) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const months = useMemo<MonthSummary[]>(() => {
    const current = startOfMonth(new Date());
    const keys = Array.from({ length: 12 }, (_, index) => monthKeyFor(subMonths(current, index)));
    for (const note of notes) {
      if (!note.date || !["daily", "weekly", "monthly"].includes(note.kind)) continue;
      const key = monthKeyFor(parseISO(note.date));
      if (!keys.includes(key)) keys.push(key);
    }
    return keys.sort((a, b) => b.localeCompare(a)).map(key => {
      const entries = notes.filter(note => note.date && ["daily", "weekly", "monthly"].includes(note.kind) && monthKeyFor(parseISO(note.date)) === key);
      return {
        key,
        label: format(parseISO(key), "MMMM yyyy"),
        notes: entries,
        monthly: entries.find(note => note.kind === "monthly"),
        written: entries.filter(note => note.body.trim()).length,
      };
    });
  }, [notes]);

  const active = selectedMonth ? months.find(month => month.key === selectedMonth) : undefined;
  if (active) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(null)} aria-label="Back to notebook gallery" className="h-11 w-11 rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 flex-1"><h3 className="truncate font-display text-xl font-semibold">{active.label}</h3><p className="text-xs text-muted-foreground">Month, weeks, and daily notes</p></div>
          <Button variant="outline" size="sm" onClick={() => onOpenMonth(active.key)} className="h-10 gap-1.5 rounded-full"><PenLine className="h-3.5 w-3.5" />Month note</Button>
        </div>
        <NotesNotebookView notes={active.notes} selectedId={selectedId} onSelect={onSelect} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month, index) => {
        const monthDate = parseISO(month.key);
        const current = month.key === monthKeyFor(new Date());
        const tone = index % 4;
        return (
          <article key={month.key} className={cn("notes-notebook-card group relative min-h-[190px] overflow-hidden rounded-2xl border p-4", `notes-notebook-card--${tone}`)}>
            <button type="button" onClick={() => setSelectedMonth(month.key)} className="absolute inset-0 z-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`Open ${month.label} notebook`} />
            <div className="relative flex h-full min-h-[158px] flex-col">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{current ? "Current notebook" : format(monthDate, "yyyy")}</p><h3 className="mt-1 font-display text-xl font-semibold">{format(monthDate, "MMMM")}</h3></div>
                <BookOpenText className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {month.monthly?.body || (month.written ? `${month.written} written ${month.written === 1 ? "entry" : "entries"} across this month.` : "A quiet notebook ready for this month.")}
              </p>
              <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{month.notes.length} {month.notes.length === 1 ? "note" : "notes"}</div>
                <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}