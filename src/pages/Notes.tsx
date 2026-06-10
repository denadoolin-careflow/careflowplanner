import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isSameMonth, addMonths, subMonths,
} from "date-fns";
import {
  Plus, Search, Sun, Sparkles, LayoutGrid, List as ListIcon,
  KanbanSquare, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Filter as FilterIcon, ArrowDownUp, Network, Clock3, ChevronDown,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listNotes, createNote, deleteNote, getOrCreateDailyNote, type Note } from "@/lib/notes";
import { listTags, fallbackColorFor, type Tag } from "@/lib/tags";
import { todayISO, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NoteCardV2 } from "@/components/notes/NoteCardV2";
import { NoteHoverPreview } from "@/components/notes/NoteHoverPreview";
import { NotesSideNav, applyCollection, type SmartCollectionId } from "@/components/notes/NotesSideNav";
import { NoteContextRail } from "@/components/notes/NoteContextRail";
import { NotesStatsRow } from "@/components/notes/NotesStatsRow";
import { TagManagerDialog } from "@/components/tags/TagManagerDialog";
import { resolveNoteIcon, getLucideIcon } from "@/lib/note-icons";

type View = "list" | "grid" | "board" | "timeline" | "calendar";
type Sort = "updated" | "created" | "title" | "words";

const VIEW_KEY = "careflow.notes.view";
const COLLECTION_KEY = "careflow.notes.collection";
const SIDE_NAV_KEY = "careflow.notes.sidenav";

const VIEW_TABS: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "list",      label: "All notes", icon: ListIcon },
  { id: "grid",      label: "Grid",      icon: LayoutGrid },
  { id: "board",     label: "Board",     icon: KanbanSquare },
  { id: "timeline",  label: "Timeline",  icon: Clock3 },
  { id: "calendar",  label: "Calendar",  icon: CalendarIcon },
];

export default function Notes() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useStore();

  const initialQ = params.get("q") ?? "";
  const noteParam = params.get("note");

  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQ);
  const [view, setView] = useState<View>(() => {
    const fromUrl = params.get("view") as View | null;
    if (fromUrl) return fromUrl;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(VIEW_KEY) as View | null;
      if (stored) return stored;
    }
    return "grid";
  });
  const [collection, setCollection] = useState<SmartCollectionId>(() => {
    const fromUrl = params.get("collection") as SmartCollectionId | null;
    if (fromUrl) return fromUrl;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(COLLECTION_KEY) as SmartCollectionId | null;
      if (stored) return stored;
    }
    return "all";
  });
  const [activeTag, setActiveTag] = useState<string | null>(params.get("tag"));
  const [sort, setSort] = useState<Sort>("updated");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | "note" | "daily">("all");
  const [sideOpen, setSideOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SIDE_NAV_KEY) !== "0";
  });
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  useEffect(() => { localStorage.setItem(COLLECTION_KEY, collection); }, [collection]);
  useEffect(() => { localStorage.setItem(SIDE_NAV_KEY, sideOpen ? "1" : "0"); }, [sideOpen]);

  // Sync key state to URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("view", view);
    next.set("collection", collection);
    if (activeTag) next.set("tag", activeTag); else next.delete("tag");
    if (q) next.set("q", q); else next.delete("q");
    if (noteParam) next.set("note", noteParam); else next.delete("note");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, collection, activeTag, q]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [n, t] = await Promise.all([listNotes(), listTags().catch(() => [] as Tag[])]);
      setNotes(n);
      setTags(t);
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const tagsByName = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const t of tags) m.set(t.name.toLowerCase(), t);
    return m;
  }, [tags]);

  const projectsById = useMemo(() => {
    const m: Record<string, string> = {};
    (state.projects ?? []).forEach(p => { m[p.id] = p.name; });
    return m;
  }, [state.projects]);

  // Apply collection, tag filter, search, kind, pinned, sort.
  const filtered = useMemo(() => {
    let arr = applyCollection(collection, notes);
    if (activeTag) {
      const lc = activeTag.toLowerCase();
      arr = arr.filter(n => (n.tags ?? []).some(t => t.toLowerCase() === lc));
    }
    if (kindFilter !== "all") arr = arr.filter(n => n.kind === kindFilter);
    if (pinnedOnly) arr = arr.filter(n => n.pinned);
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter(n =>
        n.title.toLowerCase().includes(term) ||
        n.body.toLowerCase().includes(term) ||
        (n.tags ?? []).some(t => t.toLowerCase().includes(term))
      );
    }
    const sorted = [...arr];
    if (sort === "updated") sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    else if (sort === "created") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "title") sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sort === "words") sorted.sort((a, b) => (b.body?.length ?? 0) - (a.body?.length ?? 0));
    return sorted;
  }, [notes, collection, activeTag, q, kindFilter, pinnedOnly, sort]);

  const pinnedStrip = useMemo(() => notes.filter(n => n.pinned).slice(0, 8), [notes]);

  const selectNote = (id: string) => {
    navigate(`/notes/${id}`);
  };
  const closeNote = () => {
    const next = new URLSearchParams(params);
    next.delete("note");
    setParams(next, { replace: true });
  };

  const newNote = async () => {
    const n = await createNote({ title: "Untitled" });
    navigate(`/notes/${n.id}`);
  };
  const newDaily = async () => {
    try {
      const n = await getOrCreateDailyNote(todayISO());
      navigate(`/notes/${n.id}`);
    } catch { toast.error("Could not open today's note"); }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote(id);
      toast.success("Note deleted");
      await refresh();
    } catch {
      toast.error("Could not delete note");
    }
  };

  const activeTitle = activeTag
    ? `#${activeTag}`
    : VIEW_TABS.find(v => v.id === view)?.label;

  return (
    <div className="mx-auto w-full max-w-[1600px] p-3 md:p-5">
      {/* HEADER */}
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSideOpen(s => !s)}
            className="hidden h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground md:grid"
            aria-label={sideOpen ? "Hide side nav" : "Show side nav"}
          >
            {sideOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-display text-xl font-semibold leading-tight sm:text-2xl">Notes</h1>
            <p className="text-[11px] text-muted-foreground">Your second brain</p>
          </div>
        </div>

        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes, tags…"
            className="h-9 pl-8 rounded-full border-border/60 bg-muted/40 focus-visible:ring-1 focus-visible:ring-primary/40"
          />
        </div>

        {/* Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full">
              <FilterIcon className="h-3.5 w-3.5" /> Filter
              {(pinnedOnly || kindFilter !== "all") && <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2 text-sm">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kind</div>
            <div className="grid grid-cols-3 gap-1 px-1 pb-2">
              {(["all", "note", "daily"] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setKindFilter(k)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs capitalize",
                    kindFilter === k ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >{k}</button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
              <span>Pinned only</span>
              <input type="checkbox" checked={pinnedOnly} onChange={e => setPinnedOnly(e.target.checked)} />
            </label>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full">
              <ArrowDownUp className="h-3.5 w-3.5" /> Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {([
              { id: "updated", label: "Recently updated" },
              { id: "created", label: "Recently created" },
              { id: "title",   label: "Title (A→Z)" },
              { id: "words",   label: "Word count" },
            ] as const).map(o => (
              <DropdownMenuItem
                key={o.id}
                onClick={() => setSort(o.id)}
                className={cn(sort === o.id && "bg-primary/10 text-foreground")}
              >{o.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-9 gap-1.5 rounded-full">
              <Plus className="h-3.5 w-3.5" /> New <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={newNote}><Plus className="mr-2 h-3.5 w-3.5" /> New note</DropdownMenuItem>
            <DropdownMenuItem onClick={newDaily}><Sun className="mr-2 h-3.5 w-3.5" /> Today's daily note</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Active-tag chip + count row (kept above so users can clear filters quickly) */}
      {(activeTag || filtered.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {activeTag && (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              #{activeTag} ×
            </button>
          )}
          <div className="ml-auto text-[11px] text-muted-foreground">{filtered.length} notes</div>
        </div>
      )}

      {/* MAIN SPLIT */}
      <div className={cn(
        "grid gap-4",
        sideOpen ? "md:grid-cols-[220px_1fr]" : "md:grid-cols-[1fr]",
        noteParam ? "lg:grid-cols-[220px_minmax(0,1fr)_320px]" : "",
        // Recompute when sideOpen is closed AND a note is selected.
        !sideOpen && noteParam ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "",
      )}>
        {/* Side nav */}
        {sideOpen && (
          <div className="hidden md:block">
            <NotesSideNav
              notes={notes}
              tags={tags}
              activeCollection={collection}
              onCollectionChange={setCollection}
              activeTag={activeTag}
              onTagChange={setActiveTag}
              onNewTag={() => setTagManagerOpen(true)}
            />
          </div>
        )}

        {/* Main area */}
        <div className="min-w-0 space-y-4">
          <NotesStatsRow notes={notes} tags={tags} />

          {/* View switcher row — sits between the stats and the notes */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-border/60 bg-card/50 p-0.5">
              {VIEW_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
                    view === t.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={view === t.id}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
              <Link
                to="/graph?focus=notes"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                title="Open notes in the Graph view"
              >
                <Network className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Connections</span>
              </Link>
            </div>
          </div>

          {pinnedStrip.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Pinned · {pinnedStrip.length}
              </h2>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {pinnedStrip.map(n => (
                <div key={n.id} className="w-64 shrink-0">
                    <NoteCardV2 note={n} tagsByName={tagsByName} selected={noteParam === n.id} onSelect={selectNote} onDelete={refresh} compact />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {activeTitle}
            </h2>

            {loading ? (
              <div className="rounded-2xl border border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
                <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-60" />
                No notes match. Try clearing filters or create your first one.
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(n => (
                <NoteCardV2 key={n.id} note={n} tagsByName={tagsByName} selected={noteParam === n.id} onSelect={selectNote} onDelete={refresh} />
                ))}
              </div>
            ) : view === "list" ? (
              <ListView notes={filtered} selectedId={noteParam} onSelect={selectNote} tagsByName={tagsByName} onDelete={handleDeleteNote} />
            ) : view === "board" ? (
              <BoardView notes={filtered} tagsByName={tagsByName} onSelect={selectNote} selectedId={noteParam} />
            ) : view === "timeline" ? (
              <TimelineView notes={filtered} tagsByName={tagsByName} onSelect={selectNote} selectedId={noteParam} />
            ) : (
              <CalendarView notes={filtered} onSelectNote={selectNote} />
            )}
          </section>
        </div>

        {/* Right context rail */}
        {noteParam && (
          <div className="hidden lg:block">
            <NoteContextRail
              noteId={noteParam}
              onClose={closeNote}
              projectsById={projectsById}
              tagsByName={tagsByName}
            />
          </div>
        )}
      </div>

      {/* Mobile: bottom sheet for context */}
      {noteParam && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-border/60 bg-background/95 shadow-2xl backdrop-blur lg:hidden">
          <NoteContextRail
            noteId={noteParam}
            onClose={closeNote}
            projectsById={projectsById}
            tagsByName={tagsByName}
          />
        </div>
      )}

      <TagManagerDialog open={tagManagerOpen} onOpenChange={setTagManagerOpen} />
    </div>
  );
}

/* -------------------- list view -------------------- */

function ListView({
  notes, selectedId, onSelect, tagsByName, onDelete,
}: {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  tagsByName: Map<string, Tag>;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/60">
      {notes.map(n => {
        const Icon = getLucideIcon(resolveNoteIcon(n));
        const title = n.kind === "daily" && n.date
          ? format(parseISO(n.date), "EEEE, MMM d")
          : (n.title || "Untitled");
        return (
          <NoteHoverPreview
            key={n.id}
            note={n}
            tagsByName={tagsByName}
            onOpen={onSelect}
            onEdit={onSelect}
            onDelete={onDelete}
          >
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
              selectedId === n.id ? "bg-primary/10" : "hover:bg-muted/40",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {n.body?.slice(0, 140) || "Empty"}
              </div>
            </div>
            {n.tags?.slice(0, 2).map(t => {
              const c = tagsByName.get(t.toLowerCase())?.color || fallbackColorFor(t);
              return (
                <span key={t} className="hidden rounded-full px-1.5 py-0.5 text-[10px] sm:inline-block" style={{ background: `${c}26`, color: c }}>{t}</span>
              );
            })}
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {format(parseISO(n.updatedAt), "MMM d")}
            </span>
          </button>
          </NoteHoverPreview>
        );
      })}
    </div>
  );
}

/* -------------------- board view (by tag) -------------------- */

function BoardView({
  notes, tagsByName, onSelect, selectedId, onDelete,
}: {
  notes: Note[];
  tagsByName: Map<string, Tag>;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onDelete?: (id: string) => void;
}) {
  // Build one column per tag in use, plus "Untagged".
  const byTag = new Map<string, Note[]>();
  const untagged: Note[] = [];
  for (const n of notes) {
    if (!n.tags || n.tags.length === 0) { untagged.push(n); continue; }
    for (const t of n.tags) {
      const k = t.toLowerCase();
      const list = byTag.get(k) ?? [];
      list.push(n);
      byTag.set(k, list);
    }
  }
  const cols: { key: string; label: string; color: string; items: Note[] }[] = [];
  Array.from(byTag.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([key, items]) => {
      const name = items[0]?.tags?.find(t => t.toLowerCase() === key) || key;
      cols.push({
        key, label: name, color: tagsByName.get(key)?.color || fallbackColorFor(name), items,
      });
    });
  if (untagged.length) cols.push({ key: "_none", label: "Untagged", color: "#94a3b8", items: untagged });

  if (cols.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">Add tags to your notes to see a board.</p>;
  }

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div className="flex min-w-max gap-3 pb-2">
        {cols.map(c => (
          <div key={c.key} className="flex w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-card/40 p-2">
            <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                <span style={{ color: c.color }}>{c.label}</span>
              </span>
              <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{c.items.length}</span>
            </div>
            <div className="space-y-2">
              {c.items.map(n => (
                <NoteCardV2 key={n.id} note={n} tagsByName={tagsByName} selected={selectedId === n.id} onSelect={onSelect} onDelete={onDelete} compact />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- timeline view -------------------- */

function TimelineView({
  notes, tagsByName, onSelect, selectedId,
}: {
  notes: Note[];
  tagsByName: Map<string, Tag>;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const byDay: Record<string, Note[]> = {};
  for (const n of notes) {
    const key = n.kind === "daily" && n.date
      ? n.date
      : format(parseISO(n.updatedAt), "yyyy-MM-dd");
    (byDay[key] ??= []).push(n);
  }
  const days = Object.keys(byDay).sort().reverse();
  return (
    <div className="space-y-5">
      {days.map(d => (
        <div key={d} className="grid grid-cols-[88px_1fr] gap-3">
          <div className="pt-1 text-right">
            <div className="font-display text-sm font-semibold">{format(parseISO(d), "MMM d")}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(parseISO(d), "EEEE")}</div>
          </div>
          <div className="space-y-2 border-l border-border/50 pl-4">
            {byDay[d].map(n => (
              <NoteCardV2 key={n.id} note={n} tagsByName={tagsByName} selected={selectedId === n.id} onSelect={onSelect} compact />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------- calendar view -------------------- */

function CalendarView({ notes, onSelectNote }: { notes: Note[]; onSelectNote: (id: string) => void }) {
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
                  <button
                    key={n.id}
                    onClick={() => onSelectNote(n.id)}
                    className="block w-full truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-left text-[11px] text-primary hover:bg-primary/20"
                    title={n.title || "Untitled"}
                  >
                    {n.kind === "daily" ? "● " : ""}{n.title || "Untitled"}
                  </button>
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