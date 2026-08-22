/**
 * Tags workspace — every tag, sortable, in three layouts.
 *
 * Cards / List / Table all read the same rows, and any row expands to reveal
 * the nested nodes living under that tag (tasks, notes, projects, grocery), so
 * the whole tag tree is browsable without leaving the page.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useTags } from "@/hooks/use-tags";
import { listNotes, type Note } from "@/lib/notes";
import { TagChip } from "@/components/tags/TagChip";
import { TagManagerDialog } from "@/components/tags/TagManagerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2, ChevronDown, ChevronRight, FileText, Folder, LayoutGrid, List as ListIcon,
  Pin, Search, Settings2, ShoppingCart, Table as TableIcon, Tags as TagsIcon, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fallbackColorFor } from "@/lib/tags";

type SortKey = "name" | "items" | "recent" | "pinned";
type ViewKey = "cards" | "list" | "table";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Name (A–Z)",
  items: "Most items",
  recent: "Recently used",
  pinned: "Pinned first",
};

const PREF_KEY = "careflow:tags:prefs";
type Prefs = { sort: SortKey; view: ViewKey; expanded: string[] };
const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    const p = raw ? JSON.parse(raw) : null;
    return {
      sort: (p?.sort as SortKey) ?? "name",
      view: (p?.view as ViewKey) ?? "cards",
      expanded: Array.isArray(p?.expanded) ? p.expanded : [],
    };
  } catch { return { sort: "name", view: "cards", expanded: [] }; }
};
const savePrefs = (p: Prefs) => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* noop */ } };

interface TagRow {
  name: string;
  color: string;
  pinned: boolean;
  description?: string | null;
  updatedAt?: string;
  tasks: number;
  openTasks: number;
  notes: number;
  projects: number;
  grocery: number;
  total: number;
}

interface ChildNode { id: string; title: string; to: string; meta?: string; kind: "task" | "note" | "project" | "grocery" }

export default function Tags() {
  const { tags, loading, ensure, setPinned, byName } = useTags();
  const { state } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [q, setQ] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());

  useEffect(() => { void listNotes().then(setNotes).catch(() => {}); }, []);
  const update = (patch: Partial<Prefs>) => setPrefs(p => { const next = { ...p, ...patch }; savePrefs(next); return next; });
  const toggleExpanded = (name: string) =>
    update({ expanded: prefs.expanded.includes(name) ? prefs.expanded.filter(n => n !== name) : [...prefs.expanded, name] });

  /** Children of a tag, grouped as a flat nested node list. */
  const childrenFor = (name: string): ChildNode[] => {
    const lc = name.toLowerCase();
    const token = `#${lc}`;
    return [
      ...(state.tasks ?? [])
        .filter(t => (t.tags ?? []).some(n => n.toLowerCase() === lc))
        .map(t => ({ id: t.id, title: t.title, to: `/anytime?taskId=${t.id}`, meta: t.done ? "Done" : (t.dueDate ?? undefined), kind: "task" as const })),
      ...notes
        .filter(n => (n.tags ?? []).some(t => t.toLowerCase() === lc))
        .map(n => ({ id: n.id, title: n.title || "Untitled note", to: `/notes/${n.id}`, kind: "note" as const })),
      ...(state.projects ?? [])
        .filter(p => (p.notes ?? "").toLowerCase().includes(token))
        .map(p => ({ id: p.id, title: p.name, to: `/projects/${p.id}`, meta: p.status ?? undefined, kind: "project" as const })),
      ...(state.grocery ?? [])
        .filter(g => (g.tags ?? []).some(t => t.toLowerCase() === lc))
        .map(g => ({ id: g.id, title: g.name, to: "/pantry", meta: g.bought ? "Bought" : undefined, kind: "grocery" as const })),
    ];
  };

  const rows = useMemo<TagRow[]>(() => {
    const names = new Map<string, string>(); // lc -> display
    tags.forEach(t => names.set(t.name.toLowerCase(), t.name));
    const add = (n: string) => { const k = n.toLowerCase(); if (!names.has(k)) names.set(k, n); };
    (state.tasks ?? []).forEach(t => (t.tags ?? []).forEach(add));
    notes.forEach(n => (n.tags ?? []).forEach(add));
    (state.grocery ?? []).forEach(g => (g.tags ?? []).forEach(add));

    return Array.from(names.values()).map(name => {
      const lc = name.toLowerCase();
      const meta = byName(name);
      const tasks = (state.tasks ?? []).filter(t => (t.tags ?? []).some(n => n.toLowerCase() === lc));
      const noteCount = notes.filter(n => (n.tags ?? []).some(t => t.toLowerCase() === lc)).length;
      const grocery = (state.grocery ?? []).filter(g => (g.tags ?? []).some(t => t.toLowerCase() === lc)).length;
      const projects = (state.projects ?? []).filter(p => (p.notes ?? "").toLowerCase().includes(`#${lc}`)).length;
      return {
        name,
        color: meta?.color || fallbackColorFor(name),
        pinned: !!meta?.pinned,
        description: meta?.description,
        updatedAt: meta?.updatedAt,
        tasks: tasks.length,
        openTasks: tasks.filter(t => !t.done).length,
        notes: noteCount,
        projects,
        grocery,
        total: tasks.length + noteCount + projects + grocery,
      };
    });
  }, [tags, notes, state.tasks, state.projects, state.grocery, byName]);

  const term = q.trim().toLowerCase();

  /**
   * Search reaches into the nested nodes too: a tag stays visible when its own
   * name matches or when any child under it does. Sort and view are untouched.
   */
  const matchesByTag = useMemo(() => {
    if (!term) return null;
    const map = new Map<string, number>();
    rows.forEach(r => {
      const hits = childrenFor(r.name).filter(k => k.title.toLowerCase().includes(term)).length;
      if (hits || r.name.toLowerCase().includes(term)) map.set(r.name, hits);
    });
    return map;
  }, [term, rows, notes, state.tasks, state.projects, state.grocery]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const base = matchesByTag ? rows.filter(r => matchesByTag.has(r.name)) : rows;
    const sorted = [...base];
    sorted.sort((a, b) => {
      switch (prefs.sort) {
        case "items": return b.total - a.total || a.name.localeCompare(b.name);
        case "recent": return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.name.localeCompare(b.name);
        case "pinned": return Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name);
        default: return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [rows, matchesByTag, prefs.sort]);

  const matchedItems = useMemo(
    () => (matchesByTag ? Array.from(matchesByTag.values()).reduce((a, b) => a + b, 0) : 0),
    [matchesByTag],
  );

  /** While searching, any tag with matching children opens itself. */
  const isExpanded = (name: string) =>
    prefs.expanded.includes(name) || Boolean(matchesByTag?.get(name));

  const pin = async (name: string) => {
    try {
      const tag = byName(name) ?? await ensure(name);
      await setPinned(tag.id, !tag.pinned);
      toast.success(tag.pinned ? `Unpinned #${name}` : `Pinned #${name}`);
    } catch { toast.error("Could not update pin"); }
  };

  const NestedList = ({ name }: { name: string }) => {
    const all = childrenFor(name);
    const kids = term ? all.filter(k => k.title.toLowerCase().includes(term)) : all;
    if (!kids.length) {
      return (
        <p className="px-3 py-2 text-[12px] text-muted-foreground">
          {term ? "No nested items match your search." : "Nothing nested under this tag yet."}
        </p>
      );
    }
    const icons = { task: CheckCircle2, note: FileText, project: Folder, grocery: ShoppingCart };
    return (
      <ul className="space-y-0.5 py-1">
        {kids.map(k => {
          const Icon = icons[k.kind];
          return (
            <li key={`${k.kind}:${k.id}`}>
              <Link
                to={k.to}
                className="flex items-center gap-2 rounded-lg px-3 py-1 text-[12px] hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span aria-hidden className="ml-1 h-3 w-3 border-b border-l border-border/70" />
                <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate"><MatchText text={k.title} term={term} /></span>
                {k.meta && <span className="shrink-0 text-[10px] text-muted-foreground">{k.meta}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  const ExpandButton = ({ name }: { name: string }) => {
    const open = isExpanded(name);
    const Icon = open ? ChevronDown : ChevronRight;
    return (
      <button
        type="button"
        onClick={() => toggleExpanded(name)}
        aria-expanded={open}
        aria-label={`${open ? "Collapse" : "Expand"} nested items for ${name}`}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <TagsIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">Cross-cut your tasks, notes, and ideas with color-coded tags.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)} className="gap-1.5">
          <Settings2 className="h-4 w-4" /> Manage
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tags and nested items…" className="pl-9" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" /> {SORT_LABEL[prefs.sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Sort by</DropdownMenuLabel>
            {(Object.keys(SORT_LABEL) as SortKey[]).map(k => (
              <DropdownMenuItem key={k} onClick={() => update({ sort: k })}>
                {SORT_LABEL[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-card/50 p-0.5" role="group" aria-label="Tag layout">
          {([["cards", LayoutGrid], ["list", ListIcon], ["table", TableIcon]] as const).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ view: key })}
              aria-pressed={prefs.view === key}
              aria-label={`${key} view`}
              className={cn(
                "grid h-7 w-8 place-items-center rounded-full transition-colors",
                prefs.view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {term && (
        <p className="text-[11px] text-muted-foreground" role="status">
          {filtered.length} tag{filtered.length === 1 ? "" : "s"} · {matchedItems} matching item{matchedItems === 1 ? "" : "s"}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No tags yet. Add tags to a task or note to get started.
        </div>
      ) : prefs.view === "cards" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(r => (
            <div
              key={r.name}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3 transition hover:border-primary/40 hover:shadow-md"
            >
              <span aria-hidden className="absolute inset-y-2 left-0.5 w-1 rounded-full" style={{ background: r.color }} />
              <div className="flex items-center gap-1.5 pl-1.5">
                <ExpandButton name={r.name} />
                <Link to={`/tags/${encodeURIComponent(r.name)}`} className="min-w-0 flex-1">
                  <TagChip name={r.name} size="md" />
                </Link>
                <button
                  type="button"
                  aria-label={r.pinned ? "Unpin tag" : "Pin tag to sidebar"}
                  onClick={() => void pin(r.name)}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full transition",
                    r.pinned ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground",
                  )}
                >
                  <Pin className={cn("h-3.5 w-3.5", r.pinned && "fill-current")} />
                </button>
              </div>
              {r.description && <p className="mt-1.5 line-clamp-2 pl-2 text-[11px] text-muted-foreground">{r.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1 pl-2 text-[10px] text-muted-foreground">
                <Stat icon={CheckCircle2} n={r.tasks} label={r.openTasks ? `${r.openTasks} open` : "tasks"} />
                <Stat icon={FileText} n={r.notes} label="notes" />
                <Stat icon={Folder} n={r.projects} label="projects" />
                <Stat icon={ShoppingCart} n={r.grocery} label="grocery" />
              </div>
              {isExpanded(r.name) && (
                <div className="mt-2 border-t border-border/50 pt-1"><NestedList name={r.name} /></div>
              )}
            </div>
          ))}
        </div>
      ) : prefs.view === "list" ? (
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/50">
          {filtered.map(r => (
            <div key={r.name}>
              <div className="group flex items-center gap-2 px-2 py-2">
                <ExpandButton name={r.name} />
                <Link to={`/tags/${encodeURIComponent(r.name)}`} className="min-w-0 flex-1"><TagChip name={r.name} size="sm" /></Link>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {r.total} item{r.total === 1 ? "" : "s"} · {r.openTasks} open
                </span>
                <button
                  type="button"
                  aria-label={r.pinned ? "Unpin tag" : "Pin tag to sidebar"}
                  onClick={() => void pin(r.name)}
                  className={cn("grid h-7 w-7 place-items-center rounded-full", r.pinned ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
                >
                  <Pin className={cn("h-3.5 w-3.5", r.pinned && "fill-current")} />
                </button>
              </div>
              {isExpanded(r.name) && <div className="pb-1 pl-6"><NestedList name={r.name} /></div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/50">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Tag</th>
                <th className="px-2 py-2 font-medium">Items</th>
                <th className="px-2 py-2 font-medium">Tasks</th>
                <th className="px-2 py-2 font-medium">Open</th>
                <th className="px-2 py-2 font-medium">Notes</th>
                <th className="px-2 py-2 font-medium">Projects</th>
                <th className="px-2 py-2 font-medium">Grocery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(r => (
                <Fragment key={r.name}>
                  <tr className="hover:bg-muted/40">
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <ExpandButton name={r.name} />
                        <Link to={`/tags/${encodeURIComponent(r.name)}`}><TagChip name={r.name} size="xs" /></Link>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">{r.total}</td>
                    <td className="px-2 py-1.5">{r.tasks}</td>
                    <td className="px-2 py-1.5">{r.openTasks}</td>
                    <td className="px-2 py-1.5">{r.notes}</td>
                    <td className="px-2 py-1.5">{r.projects}</td>
                    <td className="px-2 py-1.5">{r.grocery}</td>
                  </tr>
                  {isExpanded(r.name) && (
                    <tr>
                      <td colSpan={7} className="bg-muted/20 px-2"><NestedList name={r.name} /></td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TagManagerDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}

/** Bold the matched slice of a title so search hits are obvious. */
function MatchText({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const i = text.toLowerCase().indexOf(term);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-primary/20 px-0.5 text-foreground">{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

function Stat({ icon: Icon, n, label }: { icon: React.ComponentType<{ className?: string }>; n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5">
      <Icon className="h-3 w-3" aria-hidden /> {n} {label}
    </span>
  );
}
