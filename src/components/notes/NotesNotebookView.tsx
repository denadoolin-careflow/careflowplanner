import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, ExternalLink, NotebookPen, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { Note, PeriodKind } from "@/lib/notes";
import { fromISO, monthKeyFor, periodTitle, weekKeyFor } from "@/lib/notes/periods";
import { TEMPLATES_BY_KIND, hasWriting, openPeriodNoteWithTemplate } from "@/lib/notes/daily";
import { fmt12 } from "@/lib/planner/day-plan";
import { foldSound } from "@/lib/fold-sound";
import { haptics } from "@/lib/haptics";
import { NoteMarkdownPreview } from "./NoteMarkdownPreview";
import { InlineNoteEditor } from "./InlineNoteEditor";

type Status = "all" | "written" | "blank";
type Sort = "newest" | "oldest";
const PREFS_KEY = "careflow:notebook:prefs:v1";
const readPrefs = (): { status: Status; sort: Sort; kinds: PeriodKind[] } => {
  try { return { status: "all", sort: "newest", kinds: ["daily", "weekly", "monthly"], ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") }; }
  catch { return { status: "all", sort: "newest", kinds: ["daily", "weekly", "monthly"] }; }
};

/**
 * Notebook: every daily / weekly / monthly note, nested month → week → day.
 * Rows unfold in place to read and edit the note; blank periods offer a layout.
 */
export function NotesNotebookView({ notes, selectedId, onSelect }: {
  notes: Note[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  const [prefs, setPrefsState] = useState(readPrefs);
  const setPrefs = (p: Partial<typeof prefs>) => {
    const next = { ...prefs, ...p };
    setPrefsState(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  // Notes created from this view before the parent list refreshes.
  const [created, setCreated] = useState<Record<string, Note>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(selectedId ? [selectedId] : []));

  const allNotes = useMemo(() => {
    const byId = new Map(notes.map(n => [n.id, n]));
    for (const n of Object.values(created)) if (!byId.has(n.id)) byId.set(n.id, n);
    return Array.from(byId.values());
  }, [notes, created]);

  const tree = useMemo(() => {
    const months = new Map<string, { note?: Note; weeks: Map<string, { note?: Note; days: Note[] }> }>();
    const month = (k: string) => { if (!months.has(k)) months.set(k, { weeks: new Map() }); return months.get(k)!; };
    const week = (mk: string, wk: string) => { const m = month(mk); if (!m.weeks.has(wk)) m.weeks.set(wk, { days: [] }); return m.weeks.get(wk)!; };
    for (const n of allNotes) {
      if (!n.date) continue;
      const d = fromISO(n.date);
      if (n.kind === "monthly") month(n.date).note = n;
      else if (n.kind === "weekly") week(monthKeyFor(d), n.date).note = n;
      else if (n.kind === "daily") week(monthKeyFor(d), weekKeyFor(d)).days.push(n);
    }
    const now = new Date();
    week(monthKeyFor(now), weekKeyFor(now));
    const dir = prefs.sort === "newest" ? -1 : 1;
    const cmp = (a: string, b: string) => (a < b ? -dir : a > b ? dir : 0);
    const matches = (n?: Note) => {
      if (prefs.status === "all") return true;
      const w = !!n && hasWriting(n.body ?? "");
      return prefs.status === "written" ? w : !w;
    };
    return Array.from(months.entries()).sort((a, b) => cmp(a[0], b[0])).map(([mk, m]) => ({
      key: mk, note: m.note,
      weeks: Array.from(m.weeks.entries()).sort((a, b) => cmp(a[0], b[0])).map(([wk, w]) => ({
        key: wk, note: w.note,
        days: w.days.filter(d => prefs.kinds.includes("daily") && matches(d)).sort((a, b) => cmp(a.date!, b.date!)),
      })).filter(w => prefs.kinds.includes("weekly") ? (matches(w.note) || w.days.length > 0) : w.days.length > 0),
    })).filter(m => (prefs.kinds.includes("monthly") && matches(m.note)) || m.weeks.length > 0);
  }, [allNotes, prefs]);

  const rowKey = (kind: PeriodKind, k: string) => `${kind}:${k}`;
  const toggle = (id: string) => setExpanded(s => {
    const n = new Set(s); const opening = !n.has(id);
    opening ? n.add(id) : n.delete(id);
    (opening ? foldSound.unfold : foldSound.fold)();
    (opening ? haptics.unfold : haptics.fold)();
    return n;
  });

  const start = async (kind: PeriodKind, key: string, templateId: string | null) => {
    try {
      const n = await openPeriodNoteWithTemplate(kind, key, templateId);
      setCreated(c => ({ ...c, [n.id]: n }));
      setExpanded(s => { const x = new Set(s); x.delete(rowKey(kind, key)); x.add(n.id); return x; });
    } catch (e: any) { toast.error(e?.message ?? "Could not start the note"); }
  };

  const Row = ({ kind, k, note, depth }: { kind: PeriodKind; k: string; note?: Note; depth: number }) => {
    const written = !!note && hasWriting(note.body ?? "");
    const id = note?.id ?? rowKey(kind, k);
    const isOpen = expanded.has(id);
    const isToday = kind === "daily" && k === format(new Date(), "yyyy-MM-dd");
    const title = periodTitle(kind, k, { short: depth > 0 });
    return (
      <div className={cn(isOpen && "rounded-xl bg-muted/30")}>
        <div
          className={cn(
            "group flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-left text-sm hover:bg-muted/60",
            selectedId && note?.id === selectedId && "bg-primary/10",
            depth === 0 && "font-display text-base font-semibold",
            depth === 1 && "font-medium",
          )}
          style={{ paddingLeft: 4 + depth * 16 }}
        >
          <button type="button" onClick={() => toggle(id)} aria-expanded={isOpen}
                  aria-label={isOpen ? "Collapse" : "Expand"}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-90")} aria-hidden />
          </button>
          <NotebookPen className={cn("h-3.5 w-3.5 shrink-0", written ? "text-primary" : note ? "text-muted-foreground/60" : "text-muted-foreground/30")} aria-hidden />
          <HoverCard openDelay={400}>
            <HoverCardTrigger asChild>
              <button type="button" onClick={() => toggle(id)} className="min-w-0 flex-1 truncate text-left">
                {title}
                {isToday && <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-primary">Today</span>}
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="right" align="start" className="max-h-[70vh] min-h-40 w-96 min-w-72 max-w-[calc(100vw-2rem)] resize overflow-auto p-3">
              <div className="mb-1 text-xs font-semibold">{periodTitle(kind, k)}</div>
              {written ? (
                <NoteMarkdownPreview body={note!.body} className="text-xs" maxChars={1200} />
              ) : (
                <p className="text-xs text-muted-foreground">{note ? "Nothing written yet." : "No note yet — click to pick a layout."}</p>
              )}
              {note && <div className="mt-2 text-[10px] text-muted-foreground">Updated {format(new Date(note.updatedAt), "MMM d")} · {fmt12(format(new Date(note.updatedAt), "HH:mm"))}</div>}
            </HoverCardContent>
          </HoverCard>
          {!note ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Plus className="h-3 w-3" /> start</span>
          ) : !written ? (
            <span className="text-[10px] text-muted-foreground">blank</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">{format(new Date(note.updatedAt), "MMM d")}</span>
          )}
          {note && (
            <button type="button" onClick={() => onSelect(note.id)} aria-label="Open note page"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground focus:opacity-100 group-hover:opacity-100">
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {isOpen && (
          <div className="animate-fade-in pb-2 pr-1" style={{ paddingLeft: 12 + depth * 16 }}>
            {note ? (
              <InlineNoteEditor noteId={note.id} initial={note} />
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 p-2">
                <div className="mb-1.5 text-[11px] text-muted-foreground">Start this {kind === "daily" ? "day" : kind === "weekly" ? "week" : "month"} with a layout:</div>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES_BY_KIND[kind].map(t => (
                    <button key={t.id} type="button" onClick={() => void start(kind, k, t.id)} title={t.description}
                            className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] hover:bg-muted">
                      {t.emoji} {t.name}
                    </button>
                  ))}
                  <button type="button" onClick={() => void start(kind, k, null)}
                          className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted">
                    Blank
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const chip = (active: boolean) => cn(
    "rounded-full border px-2.5 py-1 text-[11px] transition",
    active ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:bg-muted",
  );

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-1.5 rounded-xl bg-background/90 px-1 py-1.5 backdrop-blur">
        {(["all", "written", "blank"] as Status[]).map(s => (
          <button key={s} type="button" className={chip(prefs.status === s)} onClick={() => setPrefs({ status: s })}>
            {s === "all" ? "All" : s === "written" ? "Written" : "Blank"}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />
        {(["daily", "weekly", "monthly"] as PeriodKind[]).map(k => (
          <button key={k} type="button" className={chip(prefs.kinds.includes(k))}
                  onClick={() => {
                    const has = prefs.kinds.includes(k);
                    const next = has ? prefs.kinds.filter(x => x !== k) : [...prefs.kinds, k];
                    if (next.length) setPrefs({ kinds: next });
                  }}>
            {k === "daily" ? "Days" : k === "weekly" ? "Weeks" : "Months"}
          </button>
        ))}
        <button type="button" className={cn(chip(false), "ml-auto inline-flex items-center gap-1")}
                onClick={() => setPrefs({ sort: prefs.sort === "newest" ? "oldest" : "newest" })}>
          {prefs.sort === "newest" ? <ArrowDownWideNarrow className="h-3 w-3" /> : <ArrowUpNarrowWide className="h-3 w-3" />}
          {prefs.sort === "newest" ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {tree.length === 0 && (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing matches these filters.</p>
      )}

      {tree.map(m => (
        <section key={m.key} className="rounded-2xl border border-border/60 bg-card/60 p-2">
          {prefs.kinds.includes("monthly") && <Row kind="monthly" k={m.key} note={m.note} depth={0} />}
          <div className="mt-1 space-y-0.5">
            {m.weeks.map(w => (
              <div key={w.key}>
                {prefs.kinds.includes("weekly") && <Row kind="weekly" k={w.key} note={w.note} depth={1} />}
                {w.days.map(d => <Row key={d.id} kind="daily" k={d.date!} note={d} depth={prefs.kinds.includes("weekly") ? 2 : 1} />)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
