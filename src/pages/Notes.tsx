import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isSameMonth, addMonths, subMonths,
} from "date-fns";
import {
  BookOpen, Plus, Search, Sun, Pin, Sparkles, LayoutGrid, List as ListIcon,
  KanbanSquare, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listNotes, createNote, getOrCreateDailyNote, type Note } from "@/lib/notes";
import { todayISO, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";

/** Strip markdown markers so list previews show plain text. */
function stripMarkdown(s: string): string {
  if (!s) return "";
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]]+)]]/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+\[[ xX]]\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

type View = "list" | "gallery" | "kanban" | "calendar";
type Group = "none" | "kind" | "project" | "month";

const VIEW_KEY = "careflow.notes.view";
const GROUP_KEY = "careflow.notes.group";

export default function Notes() {
  const [params] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const { state } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQ);
  const [view, setView] = useState<View>(() => (typeof window !== "undefined" && (localStorage.getItem(VIEW_KEY) as View)) || "gallery");
  const [group, setGroup] = useState<Group>(() => (typeof window !== "undefined" && (localStorage.getItem(GROUP_KEY) as Group)) || "none");

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  useEffect(() => { localStorage.setItem(GROUP_KEY, group); }, [group]);

  const refresh = async () => {
    setLoading(true);
    try { setNotes(await listNotes()); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter(n =>
      n.title.toLowerCase().includes(term) || n.body.toLowerCase().includes(term),
    );
  }, [notes, q]);

  const projectsById = useMemo(() => {
    const m: Record<string, string> = {};
    (state.projects ?? []).forEach(p => { m[p.id] = p.name; });
    return m;
  }, [state.projects]);

  const newNote = async () => {
    const n = await createNote({ title: "Untitled" });
    window.location.href = `/notes/${n.id}`;
  };
  const openToday = async () => {
    try {
      const n = await getOrCreateDailyNote(todayISO());
      window.location.href = `/notes/${n.id}`;
    } catch { toast.error("Could not open today's note"); }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">A second brain — link with <code className="rounded bg-muted px-1">[[title]]</code> and <code className="rounded bg-muted px-1">@project</code>.</p>
        </div>
        <Button variant="outline" size="sm" onClick={openToday} className="gap-1.5">
          <Sun className="h-4 w-4" /> Today's note
        </Button>
        <Button size="sm" onClick={newNote} className="gap-1.5">
          <Plus className="h-4 w-4" /> New
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" className="pl-9 rounded-full border-none bg-muted/40 focus-visible:ring-1 focus-visible:ring-primary/40" />
        </div>
        <ViewSwitcher view={view} onChange={setView} />
        {(view === "gallery" || view === "list") && (
          <GroupSwitcher group={group} onChange={setGroup} />
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-60" />
          No notes yet. Create your first one — try a daily note for today.
        </div>
      ) : view === "gallery" ? (
        <GalleryView notes={filtered} group={group} projectsById={projectsById} />
      ) : view === "list" ? (
        <ListView notes={filtered} group={group} projectsById={projectsById} />
      ) : view === "kanban" ? (
        <KanbanView notes={filtered} projectsById={projectsById} />
      ) : (
        <CalendarView notes={filtered} />
      )}
    </div>
  );
}

/* -------------------- switchers -------------------- */

function ViewSwitcher({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "list", label: "List", icon: ListIcon },
    { id: "gallery", label: "Gallery", icon: LayoutGrid },
    { id: "kanban", label: "Kanban", icon: KanbanSquare },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-card/50 p-0.5">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
            view === t.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
          aria-pressed={view === t.id}
        >
          <t.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function GroupSwitcher({ group, onChange }: { group: Group; onChange: (g: Group) => void }) {
  const opts: { id: Group; label: string }[] = [
    { id: "none", label: "No group" },
    { id: "kind", label: "Kind" },
    { id: "project", label: "Project" },
    { id: "month", label: "Month" },
  ];
  return (
    <select
      value={group}
      onChange={(e) => onChange(e.target.value as Group)}
      className="h-8 rounded-md border border-border/60 bg-card/50 px-2 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Group notes"
    >
      {opts.map(o => <option key={o.id} value={o.id}>Group: {o.label}</option>)}
    </select>
  );
}

/* -------------------- grouping helper -------------------- */

function groupNotes(notes: Note[], group: Group, projectsById: Record<string, string>) {
  if (group === "none") {
    const pinned = notes.filter(n => n.pinned);
    const rest = notes.filter(n => !n.pinned);
    const groups: { key: string; label: string; items: Note[] }[] = [];
    if (pinned.length) groups.push({ key: "pinned", label: "Pinned", items: pinned });
    if (rest.length) groups.push({ key: "all", label: "All notes", items: rest });
    return groups;
  }
  const buckets: Record<string, { label: string; items: Note[] }> = {};
  for (const n of notes) {
    let key = "other", label = "Other";
    if (group === "kind") {
      key = n.kind; label = n.kind === "daily" ? "Daily notes" : "Notes";
    } else if (group === "project") {
      key = n.projectId ?? "_none";
      label = n.projectId ? (projectsById[n.projectId] ?? "Unknown project") : "Unassigned";
    } else if (group === "month") {
      const d = parseISO(n.updatedAt);
      key = format(d, "yyyy-MM");
      label = format(d, "MMMM yyyy");
    }
    buckets[key] = buckets[key] ?? { label, items: [] };
    buckets[key].items.push(n);
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, v]) => ({ key, label: v.label, items: v.items }));
}

/* -------------------- gallery -------------------- */

function GalleryView({ notes, group, projectsById }: { notes: Note[]; group: Group; projectsById: Record<string, string> }) {
  const groups = groupNotes(notes, group, projectsById);
  return (
    <div className="space-y-7">
      {groups.map(g => (
        <section key={g.key}>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label} <span className="ml-1 text-muted-foreground/60">· {g.items.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map(n => <GalleryCard key={n.id} note={n} projectsById={projectsById} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function GalleryCard({ note, projectsById }: { note: Note; projectsById: Record<string, string> }) {
  const title = note.kind === "daily" && note.date
    ? format(parseISO(note.date), "EEEE, MMM d")
    : (note.title || "Untitled");
  const projectName = note.projectId ? projectsById[note.projectId] : null;
  return (
    <Link
      to={`/notes/${note.id}`}
      className={cn(
        "group relative flex h-64 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 transition-all",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
      )}
    >
      <div className="flex items-start gap-2 px-4 pt-4">
        {note.kind === "daily" ? <Sun className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : null}
        {note.pinned ? <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-accent-foreground" /> : null}
        <h3 className="line-clamp-2 flex-1 font-display text-base font-semibold leading-snug">{title}</h3>
      </div>
      <div className="relative mt-2 flex-1 overflow-hidden px-4">
        <div className="gallery-preview text-[12.5px] leading-relaxed text-muted-foreground">
          {note.body
            ? <NoteMarkdown body={note.body} />
            : <p className="italic">Empty note</p>}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/95 to-transparent" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-background/30 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{format(parseISO(note.updatedAt), "MMM d, h:mm a")}</span>
        {projectName && (
          <span className="inline-flex max-w-[50%] items-center gap-1 truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] normal-case text-primary">
            <Folder className="h-2.5 w-2.5" /> {projectName}
          </span>
        )}
      </div>
    </Link>
  );
}

/* -------------------- list -------------------- */

function ListView({ notes, group, projectsById }: { notes: Note[]; group: Group; projectsById: Record<string, string> }) {
  const groups = groupNotes(notes, group, projectsById);
  return (
    <div className="space-y-5">
      {groups.map(g => (
        <section key={g.key}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label} <span className="ml-1 text-muted-foreground/60">· {g.items.length}</span>
          </h2>
          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/60">
            {g.items.map(n => {
              const title = n.kind === "daily" && n.date
                ? format(parseISO(n.date), "EEEE, MMM d")
                : (n.title || "Untitled");
              return (
                <Link
                  key={n.id}
                  to={`/notes/${n.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40"
                >
                  {n.kind === "daily" ? <Sun className="h-4 w-4 text-primary" /> :
                    n.pinned ? <Pin className="h-3.5 w-3.5 fill-current text-accent-foreground" /> :
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{title}</div>
                    <div className="truncate text-xs text-muted-foreground">{stripMarkdown(n.body).slice(0, 140) || "Empty"}</div>
                  </div>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                    {format(parseISO(n.updatedAt), "MMM d")}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* -------------------- kanban -------------------- */

function KanbanView({ notes, projectsById }: { notes: Note[]; projectsById: Record<string, string> }) {
  // Columns: Daily, Pinned, Unassigned, then one per project (alpha)
  const cols: { key: string; label: string; items: Note[] }[] = [];
  const daily = notes.filter(n => n.kind === "daily");
  const pinned = notes.filter(n => n.kind !== "daily" && n.pinned);
  const byProject: Record<string, Note[]> = {};
  for (const n of notes) {
    if (n.kind === "daily" || n.pinned) continue;
    const k = n.projectId ?? "_none";
    (byProject[k] ??= []).push(n);
  }
  if (daily.length) cols.push({ key: "daily", label: "Daily", items: daily });
  if (pinned.length) cols.push({ key: "pinned", label: "Pinned", items: pinned });
  if (byProject._none?.length) cols.push({ key: "_none", label: "Unassigned", items: byProject._none });
  Object.entries(byProject)
    .filter(([k]) => k !== "_none")
    .sort(([a], [b]) => (projectsById[a] ?? "").localeCompare(projectsById[b] ?? ""))
    .forEach(([k, items]) => cols.push({ key: k, label: projectsById[k] ?? "Project", items }));

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div className="flex min-w-max gap-3 pb-2">
        {cols.map(c => (
          <div key={c.key} className="flex w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-card/40 p-2">
            <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{c.label}</span>
              <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px]">{c.items.length}</span>
            </div>
            <div className="space-y-2">
              {c.items.map(n => (
                <Link
                  key={n.id}
                  to={`/notes/${n.id}`}
                  className="block rounded-xl border border-border/40 bg-background/60 p-2.5 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="truncate text-sm font-medium">
                    {n.kind === "daily" && n.date ? format(parseISO(n.date), "EEE, MMM d") : (n.title || "Untitled")}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body || "Empty"}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- calendar -------------------- */

function CalendarView({ notes }: { notes: Note[] }) {
  const [anchor, setAnchor] = useState(new Date());
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  const byDay: Record<string, Note[]> = {};
  for (const n of notes) {
    const key = n.kind === "daily" && n.date
      ? n.date
      : format(parseISO(n.updatedAt), "yyyy-MM-dd");
    (byDay[key] ??= []).push(n);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{format(anchor, "MMMM yyyy")}</h2>
        <div className="inline-flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setAnchor(subMonths(anchor, 1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
          <Button variant="ghost" size="icon" onClick={() => setAnchor(addMonths(anchor, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 text-xs">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="bg-card/70 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
        ))}
        {days.map(d => {
          const key = format(d, "yyyy-MM-dd");
          const items = byDay[key] ?? [];
          const muted = !isSameMonth(d, anchor);
          const today = isSameDay(d, new Date());
          return (
            <div
              key={key}
              className={cn(
                "min-h-[96px] bg-card/60 p-1.5 transition",
                muted && "bg-card/30 text-muted-foreground/50",
              )}
            >
              <div className={cn("mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]", today && "bg-primary text-primary-foreground font-semibold")}>
                {format(d, "d")}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map(n => (
                  <Link
                    key={n.id}
                    to={`/notes/${n.id}`}
                    className="block truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                    title={n.title || "Untitled"}
                  >
                    {n.kind === "daily" ? "● " : ""}{n.title || "Untitled"}
                  </Link>
                ))}
                {items.length > 3 && (
                  <div className="px-1 text-[10px] text-muted-foreground">+{items.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
