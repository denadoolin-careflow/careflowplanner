import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO, startOfWeek } from "date-fns";
import {
  BookOpen, Sun, Pin, Sparkles, Clock3, CalendarDays, Folder, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveNoteIcon, getLucideIcon } from "@/lib/note-icons";
import { getNoteCoverCss } from "@/lib/note-covers";
import type { Note } from "@/lib/notes";

function stripMd(s: string): string {
  return (s || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function NotesHub({
  notes, projectsById, onOpenToday, onNew,
}: {
  notes: Note[];
  projectsById: Record<string, string>;
  onOpenToday: () => void;
  onNew: () => void;
}) {
  const stats = useMemo(() => {
    const total = notes.length;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
    const thisWeek = notes.filter(n => parseISO(n.updatedAt).getTime() >= weekStart).length;
    const daily = notes.filter(n => n.kind === "daily");
    return { total, thisWeek, daily: daily.length };
  }, [notes]);

  const pinned   = useMemo(() => notes.filter(n => n.pinned).slice(0, 8), [notes]);
  const recent   = useMemo(() => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8), [notes]);
  const dailies  = useMemo(() => notes.filter(n => n.kind === "daily").slice(0, 8), [notes]);

  return (
    <section className="space-y-4">
      {/* HERO */}
      <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-100/80 via-amber-50/40 to-rose-50/40 p-5 ring-1 ring-stone-200/60 shadow-soft sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/60">Your second brain</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-stone-700 ring-1 ring-white/60 shadow-sm">
            <BookOpen className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">Notes</h1>
            <p className="mt-1 text-xs text-foreground/70">
              A quiet home for ideas, daily logs, and project thinking. Link with <code className="rounded bg-white/60 px-1">[[title]]</code>.
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Button variant="outline" size="sm" onClick={onOpenToday} className="rounded-full">
              <Sun className="mr-1 h-4 w-4" /> Today's note
            </Button>
            <Button size="sm" onClick={onNew} className="rounded-full">
              <Sparkles className="mr-1 h-4 w-4" /> New note
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="total notes" value={stats.total} tone="stone" />
          <Stat label="this week"  value={stats.thisWeek} tone="rose" />
          <Stat label="daily logs"  value={stats.daily} tone="amber" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
          <Button variant="outline" size="sm" onClick={onOpenToday} className="rounded-full">
            <Sun className="mr-1 h-4 w-4" /> Today's note
          </Button>
          <Button size="sm" onClick={onNew} className="rounded-full">
            <Sparkles className="mr-1 h-4 w-4" /> New note
          </Button>
        </div>
      </article>

      {/* SHELVES */}
      {pinned.length > 0 && <Shelf title="Pinned" icon={Pin} notes={pinned} projectsById={projectsById} />}
      {recent.length > 0 && <Shelf title="Recent" icon={Clock3} notes={recent} projectsById={projectsById} />}
      {dailies.length > 0 && <Shelf title="Daily notes" icon={CalendarDays} notes={dailies} projectsById={projectsById} dailyStyle />}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "stone" | "rose" | "amber" }) {
  const tones: Record<string, string> = {
    stone: "bg-stone-100/80 text-stone-700",
    rose: "bg-rose-100/80 text-rose-700",
    amber: "bg-amber-100/80 text-amber-700",
  };
  return (
    <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60 backdrop-blur-sm">
      <p className={cn("inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", tones[tone])}>{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function Shelf({
  title, icon: Icon, notes, projectsById, dailyStyle,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  notes: Note[];
  projectsById: Record<string, string>;
  dailyStyle?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-wide text-foreground/90">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
          <span className="text-xs font-normal text-muted-foreground/70">· {notes.length}</span>
        </h2>
      </div>
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {notes.map(n => (
          <ShelfCard key={n.id} note={n} projectsById={projectsById} dailyStyle={dailyStyle} />
        ))}
      </div>
    </div>
  );
}

function ShelfCard({ note, projectsById, dailyStyle }: { note: Note; projectsById: Record<string, string>; dailyStyle?: boolean }) {
  const title = note.kind === "daily" && note.date
    ? format(parseISO(note.date), "EEE, MMM d")
    : (note.title || "Untitled");
  const Icon = getLucideIcon(resolveNoteIcon(note));
  const projectName = note.projectId ? projectsById[note.projectId] : null;
  const gradient = !note.coverUrl ? getNoteCoverCss(note.coverGradient) : null;
  return (
    <Link
      to={`/notes/${note.id}`}
      className={cn(
        "group relative flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        dailyStyle && "w-44",
      )}
    >
      {gradient && <div className="h-10 w-full" style={{ background: gradient }} />}
      <div className="flex items-start gap-2 px-3 pt-2.5">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <h3 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">{title}</h3>
      </div>
      <p className="line-clamp-2 px-3 pt-1 text-[11px] text-muted-foreground">{stripMd(note.body).slice(0, 90) || "Empty"}</p>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 bg-background/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{format(parseISO(note.updatedAt), "MMM d")}</span>
        {projectName && (
          <span className="inline-flex max-w-[60%] items-center gap-1 truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] normal-case text-primary">
            <Folder className="h-2.5 w-2.5" /> {projectName}
          </span>
        )}
      </div>
    </Link>
  );
}