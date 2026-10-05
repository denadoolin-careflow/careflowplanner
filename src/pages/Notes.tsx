import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, isSameMonth, addMonths, subMonths, subDays,
} from "date-fns";
import {
  Plus, Search, Sun, Sparkles, LayoutGrid, List as ListIcon,
  KanbanSquare, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Filter as FilterIcon, ArrowDownUp, Network, Clock3, ChevronDown,
  BookOpen, MoreHorizontal, Pin, Heart, Tags, Menu, FolderOpen,
  Lightbulb, CalendarDays, Flower2, Users, BriefcaseBusiness, BookHeart,
  Flame, ChartNoAxesColumnIncreasing, SlidersHorizontal, Table2, NotebookPen,
  IndentIncrease, Images, BookTemplate, Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listNotes, createNote, deleteNote, updateNote, getOrCreateDailyNote, type Note } from "@/lib/notes";
import { listTags, fallbackColorFor, type Tag } from "@/lib/tags";
import { todayISO, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NoteCardV2 } from "@/components/notes/NoteCardV2";
import { NoteHoverPreview } from "@/components/notes/NoteHoverPreview";
import { NoteMarkdownPreview } from "@/components/notes/NoteMarkdownPreview";
import { NotesSideNav, applyCollection, type SmartCollectionId } from "@/components/notes/NotesSideNav";
import { NoteContextRail } from "@/components/notes/NoteContextRail";
import { TagManagerDialog } from "@/components/tags/TagManagerDialog";
import { resolveNoteIcon, getLucideIcon } from "@/lib/note-icons";
import { NoteTemplatesDialog } from "@/components/notes/NoteTemplatesDialog";
import { NotesOutlineView } from "@/components/notes/NotesOutlineView";
import { NotesTableView } from "@/components/notes/NotesTableView";
import { NotesNotebookView } from "@/components/notes/NotesNotebookView";
import { noteDisplayTitle, weekKeyFor, monthKeyFor } from "@/lib/notes/periods";
import { openPeriodNoteWithTemplate, readDefaultPeriodTemplate } from "@/lib/notes/daily";
import { getNoteCoverCss } from "@/lib/note-covers";

type View = "notebook" | "outline" | "list" | "compact" | "grid" | "board" | "table" | "timeline" | "calendar";
type Sort = "updated" | "created" | "title" | "words";
type TopFilter = "all" | "pinned" | "recent" | "favorites" | "tags";

const VIEW_KEY = "careflow.notes.view";
const COLLECTION_KEY = "careflow.notes.collection";
const SIDE_NAV_KEY = "careflow.notes.sidenav";

const ADVANCED_VIEWS: { id: Exclude<View, "list" | "compact" | "grid">; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "notebook", label: "Notebook", icon: NotebookPen },
  { id: "outline", label: "Outline", icon: IndentIncrease },
  { id: "board", label: "Board", icon: KanbanSquare },
  { id: "table", label: "Table", icon: Table2 },
  { id: "timeline", label: "Timeline", icon: Clock3 },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
];

const SPACES = [
  { name: "All Notes", icon: BookOpen, tags: [] },
  { name: "Life", icon: Flower2, tags: ["life", "personal", "self"] },
  { name: "Care", icon: Heart, tags: ["care", "caregiving", "medical", "health", "therapy"] },
  { name: "Ideas", icon: Lightbulb, tags: ["idea", "ideas", "inspiration"] },
  { name: "Planning", icon: CalendarDays, tags: ["planning", "plan", "project"] },
  { name: "Reflection", icon: BookHeart, tags: ["reflection", "journal", "insights"] },
  { name: "Family", icon: Users, tags: ["family", "kids", "partner"] },
  { name: "Work", icon: BriefcaseBusiness, tags: ["work", "business", "career"] },
] as const;

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
  const [searchOpen, setSearchOpen] = useState(Boolean(initialQ));
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [view, setView] = useState<View>(() => {
    const fromUrl = params.get("view") as View | null;
    if (fromUrl) return fromUrl;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(VIEW_KEY) as View | null;
      if (stored) return stored;
    }
    return "list";
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
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [previewLines, setPreviewLines] = useState<number>(() => {
    const raw = typeof window === "undefined" ? 3 : Number(localStorage.getItem("careflow.notes.previewLines"));
    return Number.isFinite(raw) && raw >= 0 && raw <= 8 ? raw : 3;
  });
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | "note" | "daily" | "weekly" | "monthly">("all");
  const [sideOpen, setSideOpen] = useState<boolean>(() => typeof window === "undefined" || localStorage.getItem(SIDE_NAV_KEY) !== "0");
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  useEffect(() => { localStorage.setItem("careflow.notes.previewLines", String(previewLines)); }, [previewLines]);
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  useEffect(() => { localStorage.setItem(COLLECTION_KEY, collection); }, [collection]);
  useEffect(() => { localStorage.setItem(SIDE_NAV_KEY, sideOpen ? "1" : "0"); }, [sideOpen]);
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
      setNotes(n); setTags(t);
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const tagsByName = useMemo(() => new Map(tags.map(t => [t.name.toLowerCase(), t])), [tags]);
  const projectsById = useMemo(() => Object.fromEntries((state.projects ?? []).map(p => [p.id, p.name])), [state.projects]);
  const filtered = useMemo(() => {
    let arr = applyCollection(collection, notes);
    if (activeTag) arr = arr.filter(n => (n.tags ?? []).some(t => t.toLowerCase() === activeTag.toLowerCase()));
    if (kindFilter !== "all") arr = arr.filter(n => n.kind === kindFilter);
    if (pinnedOnly) arr = arr.filter(n => n.pinned);
    const term = q.trim().toLowerCase();
    if (term) arr = arr.filter(n => n.title.toLowerCase().includes(term) || n.body.toLowerCase().includes(term) || (n.tags ?? []).some(t => t.toLowerCase().includes(term)));
    const sorted = [...arr];
    if (sort === "updated") sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    else if (sort === "created") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "title") sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else sorted.sort((a, b) => wordCount(b.body) - wordCount(a.body));
    return sorted;
  }, [notes, collection, activeTag, q, kindFilter, pinnedOnly, sort]);
  const pinnedStrip = useMemo(() => notes.filter(n => n.pinned).slice(0, 3), [notes]);

  const selectNote = (id: string) => navigate(`/notes/${id}`);
  const closeNote = () => { const next = new URLSearchParams(params); next.delete("note"); setParams(next, { replace: true }); };
  const newNote = async () => { const n = await createNote({ title: "Untitled" }); navigate(`/notes/${n.id}`); };
  const newDaily = async () => { try { navigate(`/notes/${(await getOrCreateDailyNote(todayISO())).id}`); } catch { toast.error("Could not open today's note"); } };
  const newPeriod = async (kind: "weekly" | "monthly") => {
    try {
      const key = kind === "weekly" ? weekKeyFor(new Date()) : monthKeyFor(new Date());
      navigate(`/notes/${(await openPeriodNoteWithTemplate(kind, key, readDefaultPeriodTemplate(kind))).id}`);
    } catch { toast.error("Could not open the note"); }
  };
  const handleDeleteNote = async (id: string) => { if (!confirm("Delete this note?")) return; try { await deleteNote(id); toast.success("Note deleted"); await refresh(); } catch { toast.error("Could not delete note"); } };
  const handlePinNote = async (id: string, next: boolean) => { try { await updateNote(id, { pinned: next }); toast.success(next ? "Pinned" : "Unpinned"); await refresh(); } catch { toast.error("Could not update pin"); } };
  const handleArchiveNote = async (id: string, next: boolean) => { try { await updateNote(id, { archived: next }); toast.success(next ? "Archived" : "Restored"); await refresh(); } catch { toast.error("Could not update archive"); } };

  const topFilter: TopFilter = activeTag ? "tags" : collection === "pinned" ? "pinned" : collection === "recent" ? "recent" : "all";
  const setTopFilter = (next: TopFilter) => {
    if (next === "tags") { setSpacesOpen(true); return; }
    setActiveTag(null); setPinnedOnly(false);
    setCollection(next === "recent" ? "recent" : next === "pinned" || next === "favorites" ? "pinned" : "all");
  };
  const selectSpace = (space: typeof SPACES[number]) => {
    setCollection("all");
    const used = new Set(notes.flatMap(n => n.tags ?? []).map(t => t.toLowerCase()));
    const tag = space.tags.find(t => used.has(t.toLowerCase())) ?? space.tags[0] ?? null;
    setActiveTag(tag); setSpacesOpen(false);
  };

  return (
    <div className="notes-experience -mx-4 -mt-6 min-h-dvh overflow-x-hidden px-4 pb-8 pt-4 lg:-mx-8 lg:px-8 lg:pt-6">
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="notes-header mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSpacesOpen(true)} aria-label="Open note spaces" className="notes-icon-button md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="notes-title font-display text-3xl font-semibold">Notes</h1>
                <Flower2 className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <p className="notes-philosophy mt-1 text-[9px] font-semibold uppercase text-muted-foreground">Capture · Organize · Reflect · Act</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(v => !v)} aria-label="Search notes" aria-expanded={searchOpen} className="notes-icon-button">
              <Search className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More Notes options" className="notes-icon-button"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={newDaily}><Sun className="mr-2 h-4 w-4" />Today's daily note</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void newPeriod("weekly")}><NotebookPen className="mr-2 h-4 w-4" />This week's note</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void newPeriod("monthly")}><NotebookPen className="mr-2 h-4 w-4" />This month's note</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/journal")}><BookHeart className="mr-2 h-4 w-4" />Journal entry</DropdownMenuItem>
                <DropdownMenuItem onSelect={e => { e.preventDefault(); setTemplatesOpen(true); }}><BookTemplate className="mr-2 h-4 w-4" />From template…</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/notes/files")}><Images className="mr-2 h-4 w-4" />Files & photos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSpacesOpen(true)}><FolderOpen className="mr-2 h-4 w-4" />Spaces & tags</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {searchOpen && (
            <div className="relative mt-3 animate-fade-in">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search notes, words, or tags…" aria-label="Search notes" className="notes-search h-11 pl-10" />
            </div>
          )}
        </header>

        <button type="button" onClick={() => void newNote()} className="notes-quick-capture group mb-3 flex min-h-[62px] w-full items-center gap-3 rounded-2xl border px-4 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Flower2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span className="flex-1 text-sm text-muted-foreground">What’s on your mind?</span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform group-hover:rotate-90" aria-hidden><Plus className="h-5 w-5" /></span>
        </button>

        <nav aria-label="Note filters" className="notes-filter-scroll -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            ["all", "All", BookOpen], ["pinned", "Pinned", Pin], ["recent", "Recent", Clock3], ["favorites", "Favorites", Heart], ["tags", "Tags", Tags],
          ] as const).map(([id, label, Icon]) => (
            <Button key={id} type="button" variant="ghost" onClick={() => setTopFilter(id)} aria-pressed={topFilter === id || (id === "favorites" && collection === "pinned")}
              className={cn("notes-filter-pill h-11 shrink-0 gap-2 rounded-full px-4", (topFilter === id || (id === "favorites" && collection === "pinned")) && "is-active")}>
              <Icon className="h-4 w-4" />{label}
            </Button>
          ))}
        </nav>

        <CompactInsights notes={notes} />

        <div className={cn("mt-5 grid gap-5", sideOpen ? "lg:grid-cols-[220px_minmax(0,1fr)]" : "lg:grid-cols-1", noteParam && sideOpen && "xl:grid-cols-[220px_minmax(0,1fr)_300px]", noteParam && !sideOpen && "xl:grid-cols-[minmax(0,1fr)_300px]")}>
          {sideOpen && <aside className="hidden lg:block"><NotesSideNav notes={notes} tags={tags} activeCollection={collection} onCollectionChange={setCollection} activeTag={activeTag} onTagChange={setActiveTag} onNewTag={() => setTagManagerOpen(true)} /></aside>}
          <main className="min-w-0">
            {pinnedStrip.length > 0 && collection !== "pinned" && !activeTag && (
              <section className="mb-6" aria-labelledby="pinned-heading">
                <div className="mb-2 flex items-center">
                  <h2 id="pinned-heading" className="font-display text-xl font-semibold"><Pin className="mr-1.5 inline h-4 w-4 fill-current text-accent" />Pinned <span className="font-sans text-xs font-normal text-muted-foreground">· {notes.filter(n => n.pinned).length}</span></h2>
                  <Button variant="ghost" size="sm" className="ml-auto h-9 gap-1 text-xs" onClick={() => setCollection("pinned")}>View all <ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {pinnedStrip.map(n => <PinnedNoteCard key={n.id} note={n} tagsByName={tagsByName} onOpen={selectNote} onPin={handlePinNote} onDelete={handleDeleteNote} />)}
                </div>
              </section>
            )}

            <section aria-labelledby="all-notes-heading">
              <div className="mb-3 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h2 id="all-notes-heading" className="truncate font-display text-xl font-semibold">{activeTag ? `#${activeTag}` : collection === "all" ? "All Notes" : collection === "pinned" ? "Pinned Notes" : "Recent Notes"} <span className="font-sans text-xs font-normal text-muted-foreground">· {filtered.length}</span></h2>
                </div>
                <div className="notes-view-control flex shrink-0 items-center rounded-full border p-0.5" aria-label="Note view">
                  <Button variant="ghost" size="icon" onClick={() => setView("grid")} aria-label="Grid view" aria-pressed={view === "grid"} className={cn("h-9 w-9 rounded-full", view === "grid" && "is-active")}><LayoutGrid className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"} className={cn("h-9 w-9 rounded-full", view === "list" && "is-active")}><ListIcon className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setView("compact")} aria-label="Compact view" aria-pressed={view === "compact"} className={cn("h-9 w-9 rounded-full", view === "compact" && "is-active")}><IndentIncrease className="h-4 w-4" /></Button>
                </div>
                <SortMenu sort={sort} setSort={setSort} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="notes-round-control h-10 w-10" aria-label="Advanced note views and filters"><SlidersHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Advanced views</DropdownMenuLabel>
                    {ADVANCED_VIEWS.map(item => <DropdownMenuItem key={item.id} onClick={() => setView(item.id)} className={cn(view === item.id && "bg-primary/10")}><item.icon className="mr-2 h-4 w-4" />{item.label}</DropdownMenuItem>)}
                    <DropdownMenuItem asChild><Link to="/graph?focus=notes"><Network className="mr-2 h-4 w-4" />Connections</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSpacesOpen(true)}><Tags className="mr-2 h-4 w-4" />Spaces & tags</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPinnedOnly(v => !v)}><Pin className="mr-2 h-4 w-4" />{pinnedOnly ? "Show all" : "Pinned only"}</DropdownMenuItem>
                    <DropdownMenuLabel>Note kind</DropdownMenuLabel>
                    {(["all", "note", "daily", "weekly", "monthly"] as const).map(k => <DropdownMenuItem key={k} onClick={() => setKindFilter(k)} className={cn("capitalize", kindFilter === k && "bg-primary/10")}>{k}</DropdownMenuItem>)}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSideOpen(v => !v)} className="hidden lg:flex"><FolderOpen className="mr-2 h-4 w-4" />{sideOpen ? "Hide" : "Show"} spaces sidebar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {loading ? <NotesLoading /> : filtered.length === 0 && view !== "table" ? <EmptyNotes onCreate={() => void newNote()} /> : view === "notebook" ? (
                <NotesNotebookView notes={filtered} selectedId={noteParam} onSelect={selectNote} />
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(n => <NoteCardV2 key={n.id} note={n} tagsByName={tagsByName} selected={noteParam === n.id} onSelect={selectNote} onDelete={refresh} onChanged={refresh} previewLines={previewLines} />)}</div>
              ) : view === "outline" ? (
                <NotesOutlineView notes={filtered} selectedId={noteParam} onSelect={selectNote} term={q} />
              ) : view === "table" ? (
                <NotesTableView notes={filtered} allNotes={notes} selectedId={noteParam} onSelect={selectNote} sort={sort} onSortChange={setSort} onPropertiesChange={(id, properties) => { setNotes(prev => prev.map(x => x.id === id ? { ...x, properties } : x)); void updateNote(id, { properties }).catch(() => toast.error("Save failed")); }} onCreate={async (title, properties) => { const n = await createNote({ title }); if (properties.length) await updateNote(n.id, { properties }); setNotes(prev => [{ ...n, properties }, ...prev]); }} />
              ) : view === "list" || view === "compact" ? (
                <ListView notes={filtered} selectedId={noteParam} onSelect={selectNote} tagsByName={tagsByName} onDelete={handleDeleteNote} onPin={handlePinNote} onArchive={handleArchiveNote} compact={view === "compact"} />
              ) : view === "board" ? (
                <BoardView notes={filtered} tagsByName={tagsByName} onSelect={selectNote} selectedId={noteParam} onDelete={handleDeleteNote} onChanged={refresh} />
              ) : view === "timeline" ? (
                <TimelineView notes={filtered} tagsByName={tagsByName} onSelect={selectNote} selectedId={noteParam} onDelete={handleDeleteNote} onChanged={refresh} />
              ) : <CalendarView notes={filtered} onSelectNote={selectNote} tagsByName={tagsByName} />}
            </section>
          </main>
          {noteParam && <aside className="hidden xl:block"><NoteContextRail noteId={noteParam} onClose={closeNote} projectsById={projectsById} tagsByName={tagsByName} /></aside>}
        </div>
      </div>

      <SpacesSheet open={spacesOpen} onOpenChange={setSpacesOpen} notes={notes} tags={tags} activeTag={activeTag} activeCollection={collection} onSpace={selectSpace} onTag={tag => { setCollection("all"); setActiveTag(tag); setSpacesOpen(false); }} onNewTag={() => { setSpacesOpen(false); setTagManagerOpen(true); }} onNew={() => void newNote()} />
      <NoteTemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <TagManagerDialog open={tagManagerOpen} onOpenChange={setTagManagerOpen} />
      {noteParam && <div className="fixed inset-x-0 bottom-24 z-40 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t border-border bg-background shadow-float xl:hidden"><NoteContextRail noteId={noteParam} onClose={closeNote} projectsById={projectsById} tagsByName={tagsByName} /></div>}
    </div>
  );
}

function wordCount(body: string) { return body.trim() ? body.trim().split(/\s+/).length : 0; }

function CompactInsights({ notes }: { notes: Note[] }) {
  const stats = useMemo(() => {
    const now = new Date(); const week = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const days = new Set(notes.map(n => parseISO(n.updatedAt).toISOString().slice(0, 10)));
    let streak = 0;
    for (let i = 0; i < 365; i++) { const key = subDays(now, i).toISOString().slice(0, 10); if (days.has(key)) streak++; else if (i > 0) break; }
    return { total: notes.length, week: notes.filter(n => parseISO(n.updatedAt).getTime() >= week).length, streak };
  }, [notes]);
  return <section className="notes-insight relative overflow-hidden rounded-2xl border px-4 py-3" aria-label="Notes insights">
    <Flower2 className="notes-insight-leaf absolute -bottom-3 right-2 h-20 w-20" aria-hidden />
    <div className="relative grid grid-cols-[1fr_auto] items-center gap-3">
      <div className="grid grid-cols-3 divide-x divide-border/50">
        <InsightStat icon={BookOpen} value={stats.total} label="notes" />
        <InsightStat icon={ChartNoAxesColumnIncreasing} value={stats.week} label="this week" />
        <InsightStat icon={Flame} value={stats.streak} label={stats.streak === 1 ? "day streak" : "day streak"} />
      </div>
      <Button asChild variant="ghost" size="sm" className="hidden h-10 gap-1 sm:inline-flex"><Link to="/insights">View insights <ChevronRight className="h-3.5 w-3.5" /></Link></Button>
    </div>
  </section>;
}
function InsightStat({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return <div className="flex min-w-0 items-center gap-2 px-2 first:pl-0"><Icon className="hidden h-4 w-4 shrink-0 text-primary sm:block" /><div><div className="font-display text-xl font-semibold leading-none">{value}</div><div className="mt-1 truncate text-[9px] text-muted-foreground">{label}</div></div></div>;
}

function PinnedNoteCard({ note, tagsByName, onOpen, onPin, onDelete }: { note: Note; tagsByName: Map<string, Tag>; onOpen: (id: string) => void; onPin: (id: string, next: boolean) => void; onDelete: (id: string) => void }) {
  const cover = !note.coverUrl ? getNoteCoverCss(note.coverGradient) : null;
  return <article className="notes-pinned-card relative w-[72vw] max-w-[250px] shrink-0 snap-start overflow-hidden rounded-2xl border">
    <button type="button" onClick={() => onOpen(note.id)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`Open ${noteDisplayTitle(note, true)}`}>
      {note.coverUrl ? <img src={note.coverUrl} alt="" className="h-24 w-full object-cover" style={{ objectPosition: `center ${note.coverPosition ?? 50}%` }} /> : cover ? <div className="h-16 w-full" style={{ background: cover }} /> : <div className="h-3 bg-primary/25" />}
      <div className="p-3">
        <h3 className="line-clamp-1 font-display text-base font-semibold">{noteDisplayTitle(note, true)}</h3>
        <div className="mt-1 line-clamp-2 min-h-[34px] text-xs leading-relaxed text-muted-foreground"><NoteMarkdownPreview body={note.body || ""} maxChars={100} /></div>
        <div className="mt-2 flex items-center gap-1 overflow-hidden">{(note.tags ?? []).slice(0, 2).map(t => <SoftTag key={t} name={t} color={tagsByName.get(t.toLowerCase())?.color || fallbackColorFor(t)} />)}<span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{format(parseISO(note.updatedAt), "MMM d")}</span></div>
      </div>
    </button>
    <Pin className="absolute left-2 top-2 h-4 w-4 fill-current text-accent drop-shadow" aria-label="Pinned" />
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="absolute right-1 top-1 h-10 w-10 bg-background/50 backdrop-blur" aria-label={`More options for ${noteDisplayTitle(note, true)}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onOpen(note.id)}>Open note</DropdownMenuItem><DropdownMenuItem onClick={() => void onPin(note.id, false)}>Unpin</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => void onDelete(note.id)}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </article>;
}

function SoftTag({ name, color }: { name: string; color: string }) { return <span className="max-w-24 truncate rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: `${color}24`, color }}>{name}</span>; }

function SortMenu({ sort, setSort }: { sort: Sort; setSort: (sort: Sort) => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="notes-round-control h-10 w-10" aria-label="Sort notes"><ArrowDownUp className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Sort by</DropdownMenuLabel>{([{ id: "updated", label: "Recently updated" }, { id: "created", label: "Recently created" }, { id: "title", label: "Title (A–Z)" }, { id: "words", label: "Word count" }] as const).map(o => <DropdownMenuItem key={o.id} onClick={() => setSort(o.id)} className={cn(sort === o.id && "bg-primary/10")}>{o.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}

function SpacesSheet({ open, onOpenChange, notes, tags, activeTag, activeCollection, onSpace, onTag, onNewTag, onNew }: { open: boolean; onOpenChange: (open: boolean) => void; notes: Note[]; tags: Tag[]; activeTag: string | null; activeCollection: SmartCollectionId; onSpace: (space: typeof SPACES[number]) => void; onTag: (tag: string) => void; onNewTag: () => void; onNew: () => void }) {
  const counts = (space: typeof SPACES[number]) => space.tags.length === 0 ? notes.length : notes.filter(n => (n.tags ?? []).some(t => space.tags.some(s => s.toLowerCase() === t.toLowerCase()))).length;
  const tagCounts = useMemo(() => { const out = new Map<string, number>(); notes.forEach(n => (n.tags ?? []).forEach(t => out.set(t.toLowerCase(), (out.get(t.toLowerCase()) ?? 0) + 1))); return out; }, [notes]);
  const merged = useMemo(() => { const map = new Map(tags.map(t => [t.name.toLowerCase(), t])); tagCounts.forEach((_, name) => { if (!map.has(name)) map.set(name, { id: `ghost:${name}`, name, color: fallbackColorFor(name), icon: "tag", pinned: false, defaults: {}, checklist: [], createdAt: "", updatedAt: "" }); }); return [...map.values()].sort((a,b) => (tagCounts.get(b.name.toLowerCase()) ?? 0) - (tagCounts.get(a.name.toLowerCase()) ?? 0)); }, [tags, tagCounts]);
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="left" className="notes-spaces-sheet w-[88vw] max-w-sm overflow-y-auto border-r p-5"><SheetHeader className="text-left"><SheetTitle className="font-display text-2xl">My Notes</SheetTitle><SheetDescription>Spaces and tags for everything you’re holding.</SheetDescription></SheetHeader><Button onClick={onNew} className="mt-4 h-11 w-full gap-2 rounded-full"><Plus className="h-4 w-4" />New note</Button><section className="mt-6"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase text-muted-foreground"><Pin className="mr-1 inline h-3.5 w-3.5" />Spaces</h2></div><ul className="space-y-1">{SPACES.map(space => { const Icon=space.icon; const active=space.name === "All Notes" ? activeCollection === "all" && !activeTag : Boolean(activeTag && space.tags.includes(activeTag.toLowerCase() as never)); return <li key={space.name}><Button variant="ghost" onClick={() => onSpace(space)} className={cn("h-11 w-full justify-start gap-3 px-2", active && "bg-primary/15 text-foreground")}><Icon className="h-4 w-4 text-primary" /><span className="flex-1 text-left">{space.name}</span><span className="text-xs text-muted-foreground">{counts(space)}</span></Button></li>; })}</ul></section><section className="mt-6 border-t border-border/50 pt-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase text-muted-foreground"><Tags className="mr-1 inline h-3.5 w-3.5" />Tags</h2><Button variant="ghost" size="sm" onClick={onNewTag}>Edit</Button></div><div className="flex flex-wrap gap-2">{merged.length ? merged.map(t => <button type="button" key={t.id} onClick={() => onTag(t.name)} className="min-h-[36px] rounded-full px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ backgroundColor: `${t.color}24`, color: t.color }}>#{t.name} · {tagCounts.get(t.name.toLowerCase()) ?? 0}</button>) : <p className="text-sm text-muted-foreground">No tags yet.</p>}</div></section></SheetContent></Sheet>;
}

function NotesLoading() { return <div className="notes-empty rounded-2xl border p-10 text-center text-sm text-muted-foreground" aria-live="polite">Loading your notes…</div>; }
function EmptyNotes({ onCreate }: { onCreate: () => void }) { return <div className="notes-empty rounded-2xl border border-dashed p-10 text-center"><Sparkles className="mx-auto mb-3 h-6 w-6 text-primary" /><h3 className="font-display text-lg font-semibold">A quiet place for what’s on your mind.</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Capture an idea, reflection, care detail, or next step.</p><Button onClick={onCreate} className="mt-4 h-11 gap-2 rounded-full"><Plus className="h-4 w-4" />Create a note</Button></div>; }

/* -------------------- list view -------------------- */
function ListView({ notes, selectedId, onSelect, tagsByName, onDelete, onPin, onArchive, compact = false }: { notes: Note[]; selectedId: string | null; onSelect: (id: string) => void; tagsByName: Map<string, Tag>; onDelete?: (id: string) => void; onPin?: (id: string, next: boolean) => void; onArchive?: (id: string, next: boolean) => void; compact?: boolean }) {
  return <div className="space-y-2">{notes.map(n => { const Icon = getLucideIcon(resolveNoteIcon(n)); const title = noteDisplayTitle(n, true); const gradient = !n.coverUrl ? getNoteCoverCss(n.coverGradient) : null; return <NoteHoverPreview key={n.id} note={n} tagsByName={tagsByName} onOpen={onSelect} onEdit={onSelect} onDelete={onDelete} onPin={onPin} onArchive={onArchive}><article className={cn("notes-list-card group relative flex min-h-[92px] items-stretch overflow-hidden rounded-2xl border transition active:scale-[0.99]", selectedId === n.id && "ring-2 ring-primary/40", compact && "min-h-[66px]")}><button type="button" onClick={() => onSelect(n.id)} className="flex min-w-0 flex-1 items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{!compact && (n.coverUrl ? <img src={n.coverUrl} alt="" className="h-[92px] w-20 shrink-0 object-cover sm:w-24" style={{ objectPosition: `center ${n.coverPosition ?? 50}%` }} /> : gradient ? <div className="h-[92px] w-20 shrink-0 sm:w-24" style={{ background: gradient }} /> : <div className="grid h-[92px] w-16 shrink-0 place-items-center bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>)}<div className={cn("min-w-0 flex-1 py-3 pl-3 pr-10", compact && "py-2")}><div className="flex items-center gap-1.5"><h3 className="truncate font-display text-base font-semibold">{title}</h3>{n.pinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-current text-accent" aria-label="Pinned" />}</div>{!compact && <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground"><NoteMarkdownPreview body={n.body || ""} maxChars={170} /></div>}<div className="mt-2 flex items-center gap-1.5 overflow-hidden">{(n.tags ?? []).slice(0, compact ? 1 : 2).map(t => <SoftTag key={t} name={t} color={tagsByName.get(t.toLowerCase())?.color || fallbackColorFor(t)} />)}<span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{wordCount(n.body) > 0 && !compact ? `${wordCount(n.body)} words · ` : ""}{format(parseISO(n.updatedAt), "MMM d")}</span></div></div></button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="absolute right-1 top-1 h-10 w-10" aria-label={`More options for ${title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onSelect(n.id)}>Open</DropdownMenuItem><DropdownMenuItem onClick={() => onPin?.(n.id, !n.pinned)}>{n.pinned ? "Unpin" : "Pin"}</DropdownMenuItem><DropdownMenuItem onClick={() => onArchive?.(n.id, true)}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(n.id)}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></article></NoteHoverPreview>; })}</div>;
}

/* -------------------- board view (by tag) -------------------- */

function BoardView({
  notes, tagsByName, onSelect, selectedId, onDelete, onChanged,
}: {
  notes: Note[];
  tagsByName: Map<string, Tag>;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onDelete?: (id: string) => void;
  onChanged?: () => void;
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
                <NoteCardV2 key={n.id} note={n} tagsByName={tagsByName} selected={selectedId === n.id} onSelect={onSelect} onDelete={onDelete} onChanged={onChanged} compact />
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
  notes, tagsByName, onSelect, selectedId, onDelete, onChanged,
}: {
  notes: Note[];
  tagsByName: Map<string, Tag>;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onDelete?: (id: string) => void;
  onChanged?: () => void;
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
              <NoteCardV2 key={n.id} note={n} tagsByName={tagsByName} selected={selectedId === n.id} onSelect={onSelect} onDelete={onDelete} onChanged={onChanged} compact />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------- calendar view -------------------- */

function CalendarView({ notes, onSelectNote, tagsByName }: {
  notes: Note[];
  onSelectNote: (id: string) => void;
  tagsByName: Map<string, Tag>;
}) {
  const [anchor, setAnchor] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
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
                  <CalendarNoteItem
                    key={n.id}
                    note={n}
                    tagsByName={tagsByName}
                    onSelect={onSelectNote}
                  />
                ))}
                {items.length > 3 && (
                  <Popover
                    open={expandedDay === key}
                    onOpenChange={(open) => setExpandedDay(open ? key : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-full justify-start px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        +{items.length - 3} more
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="right" collisionPadding={12} className="w-72 p-2">
                      <div className="mb-1.5 flex items-center justify-between px-1">
                        <span className="text-xs font-semibold">{format(d, "EEEE, MMMM d")}</span>
                        <span className="text-[10px] text-muted-foreground">{items.length} notes</span>
                      </div>
                      <div className="max-h-72 space-y-1 overflow-y-auto overscroll-contain pr-1">
                        {items.slice(3).map(n => (
                          <CalendarNoteItem
                            key={n.id}
                            note={n}
                            tagsByName={tagsByName}
                            onSelect={(id) => {
                              setExpandedDay(null);
                              onSelectNote(id);
                            }}
                            roomy
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarNoteItem({ note, tagsByName, onSelect, roomy = false }: {
  note: Note;
  tagsByName: Map<string, Tag>;
  onSelect: (id: string) => void;
  roomy?: boolean;
}) {
  const Icon = getLucideIcon(resolveNoteIcon(note));
  return (
    <NoteHoverPreview
      note={note}
      tagsByName={tagsByName}
      side="right"
      onOpen={onSelect}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSelect(note.id)}
        className={cn(
          "w-full justify-start gap-1.5 bg-primary/10 px-1.5 text-left text-primary hover:bg-primary/20",
          roomy ? "h-8 text-xs" : "h-5 text-[11px]",
        )}
        title={note.title || "Untitled"}
      >
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{noteDisplayTitle(note, true)}</span>
      </Button>
    </NoteHoverPreview>
  );
}