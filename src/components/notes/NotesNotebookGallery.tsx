import { useMemo, useState } from "react";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ArrowLeft, CalendarDays, ChevronRight, Flower2, Leaf, PenLine, Settings2, Snowflake, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Note } from "@/lib/notes";
import { monthKeyFor } from "@/lib/notes/periods";
import { NOTEBOOK_COVERS, NOTEBOOK_ICONS, readNotebookPreferences, saveNotebookPreference, type NotebookCover, type NotebookPreference, type NotebookSeasonIcon } from "@/lib/notes/notebook-preferences";
import { cn } from "@/lib/utils";
import { NotesNotebookView } from "./NotesNotebookView";

type MonthSummary = {
  key: string;
  label: string;
  notes: Note[];
  monthly?: Note;
  written: number;
};

const SEASON_ICONS = { flower: Flower2, sun: Sun, leaf: Leaf, snowflake: Snowflake, sparkles: Sparkles } as const;

function defaultNotebookPreference(date: Date): NotebookPreference {
  const month = date.getMonth();
  return {
    cover: "primary",
    icon: month >= 2 && month <= 4 ? "flower" : month >= 5 && month <= 7 ? "sun" : month >= 8 && month <= 10 ? "leaf" : "snowflake",
  };
}

export function NotesNotebookGallery({ notes, selectedId, onSelect, onOpenMonth }: {
  notes: Note[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onOpenMonth: (key: string) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [preferences, setPreferences] = useState(readNotebookPreferences);
  const [customizing, setCustomizing] = useState<MonthSummary | null>(null);
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
    const preference = preferences[active.key] ?? defaultNotebookPreference(parseISO(active.key));
    const ActiveIcon = SEASON_ICONS[preference.icon];
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(null)} aria-label="Back to notebook gallery" className="h-11 w-11 rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
          <ActiveIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1"><h3 className="truncate font-display text-xl font-semibold">{preference.title || active.label}</h3><p className="text-xs text-muted-foreground">{preference.title ? active.label : "Month, weeks, and daily notes"}</p></div>
          <Button variant="ghost" size="icon" onClick={() => setCustomizing(active)} aria-label={`Customize ${active.label} notebook`} className="h-10 w-10 rounded-full"><Settings2 className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onOpenMonth(active.key)} className="h-10 gap-1.5 rounded-full"><PenLine className="h-3.5 w-3.5" />Month note</Button>
        </div>
        <NotesNotebookView notes={active.notes} selectedId={selectedId} onSelect={onSelect} />
        <NotebookCustomizeDialog month={customizing} preference={preference} onClose={() => setCustomizing(null)} onSave={next => { setPreferences(saveNotebookPreference(active.key, next)); setCustomizing(null); }} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month, index) => {
        const monthDate = parseISO(month.key);
        const current = month.key === monthKeyFor(new Date());
        const preference = preferences[month.key] ?? defaultNotebookPreference(monthDate);
        const SeasonIcon = SEASON_ICONS[preference.icon];
        return (
          <article key={month.key} className={cn("notes-notebook-card group relative min-h-[190px] overflow-hidden rounded-2xl border p-4", `notes-notebook-cover--${preference.cover}`)}>
            <button type="button" onClick={() => setSelectedMonth(month.key)} className="absolute inset-0 z-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`Open ${month.label} notebook`} />
            <Button variant="ghost" size="icon" onClick={() => setCustomizing(month)} aria-label={`Customize ${month.label} notebook`} className="absolute right-2 top-2 z-20 h-10 w-10 rounded-full bg-background/50 backdrop-blur"><Settings2 className="h-4 w-4" /></Button>
            <div className="relative flex h-full min-h-[158px] flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pr-9"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{current ? "Current notebook" : month.label}</p><h3 className="mt-1 truncate font-display text-xl font-semibold">{preference.title || format(monthDate, "MMMM")}</h3></div>
                <SeasonIcon className="mt-10 h-5 w-5 shrink-0 text-primary" aria-hidden />
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
      <NotebookCustomizeDialog month={customizing} preference={customizing ? preferences[customizing.key] ?? defaultNotebookPreference(parseISO(customizing.key)) : undefined} onClose={() => setCustomizing(null)} onSave={next => { if (!customizing) return; setPreferences(saveNotebookPreference(customizing.key, next)); setCustomizing(null); }} />
    </div>
  );
}

function NotebookCustomizeDialog({ month, preference, onClose, onSave }: { month: MonthSummary | null; preference?: NotebookPreference; onClose: () => void; onSave: (preference: NotebookPreference) => void }) {
  const fallback = month ? defaultNotebookPreference(parseISO(month.key)) : defaultNotebookPreference(new Date());
  const [title, setTitle] = useState(preference?.title ?? "");
  const [cover, setCover] = useState<NotebookCover>(preference?.cover ?? fallback.cover);
  const [icon, setIcon] = useState<NotebookSeasonIcon>(preference?.icon ?? fallback.icon);
  const resetKey = `${month?.key ?? "closed"}:${preference?.title ?? ""}:${preference?.cover ?? ""}:${preference?.icon ?? ""}`;
  return (
    <Dialog open={Boolean(month)} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent key={resetKey} className="w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-md">
        <DialogHeader className="pr-6 text-left"><DialogTitle className="font-display text-xl">Customize notebook</DialogTitle><DialogDescription>{month?.label}</DialogDescription></DialogHeader>
        <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Title</span><Input defaultValue={preference?.title ?? ""} onChange={event => setTitle(event.target.value)} placeholder={month ? format(parseISO(month.key), "MMMM") : "Notebook title"} /></label>
        <fieldset><legend className="mb-2 text-xs font-medium text-muted-foreground">Cover color</legend><div className="grid grid-cols-5 gap-2">{NOTEBOOK_COVERS.map(option => <Button key={option.id} type="button" variant="outline" size="icon" onClick={() => setCover(option.id)} aria-label={option.label} aria-pressed={cover === option.id} className={cn("notebook-cover-swatch h-11 w-full", `notes-notebook-cover--${option.id}`, cover === option.id && "ring-2 ring-ring ring-offset-2 ring-offset-background")}><span className="sr-only">{option.label}</span></Button>)}</div></fieldset>
        <fieldset><legend className="mb-2 text-xs font-medium text-muted-foreground">Seasonal icon</legend><div className="grid grid-cols-5 gap-2">{NOTEBOOK_ICONS.map(option => { const Icon = SEASON_ICONS[option.id]; return <Button key={option.id} type="button" variant={icon === option.id ? "default" : "outline"} size="icon" onClick={() => setIcon(option.id)} aria-label={option.label} aria-pressed={icon === option.id} className="h-11 w-full"><Icon className="h-4 w-4" /></Button>; })}</div></fieldset>
        <DialogFooter className="gap-2 sm:space-x-0"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ title: title.trim() || undefined, cover, icon })}>Save cover</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}