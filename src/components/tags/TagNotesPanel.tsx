import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, LayoutList, LayoutGrid, Columns3, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";

type View = "list" | "gallery" | "kanban" | "date";
const STORAGE_KEY = "tag-notes-view";

interface Props {
  notes: Note[];
  tagName: string;
  accent: string;
  onAdd: () => void;
}

interface Snippet {
  before: string;
  match: string;
  after: string;
  hasMatch: boolean;
}

function extractTagContext(body: string, tagName: string, max = 140): Snippet {
  const text = (body || "").replace(/[*_`>#~\[\]()]/g, "").replace(/\s+/g, " ").trim();
  if (!text) return { before: "", match: "", after: "", hasMatch: false };
  const needle = `#${tagName}`;
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) {
    return { before: text.slice(0, max), match: "", after: "", hasMatch: false };
  }
  const matchLen = needle.length;
  const ctx = Math.max(0, Math.floor((max - matchLen) / 2));
  const start = Math.max(0, idx - ctx);
  const end = Math.min(text.length, idx + matchLen + ctx);
  return {
    before: (start > 0 ? "…" : "") + text.slice(start, idx),
    match: text.slice(idx, idx + matchLen),
    after: text.slice(idx + matchLen, end) + (end < text.length ? "…" : ""),
    hasMatch: true,
  };
}

function noteTitle(n: Note): string {
  if (n.kind === "daily" && n.date) return format(parseISO(n.date), "EEEE, MMM d");
  return n.title?.trim() || "Untitled";
}

function SnippetText({ snippet, accent, clamp = 2 }: { snippet: Snippet; accent: string; clamp?: number }) {
  if (!snippet.before && !snippet.match && !snippet.after) {
    return <span className="italic text-muted-foreground/70">No preview</span>;
  }
  return (
    <span
      className="block text-muted-foreground"
      style={{
        display: "-webkit-box",
        WebkitLineClamp: clamp,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {snippet.before}
      {snippet.hasMatch && (
        <mark
          className="rounded px-0.5 font-semibold"
          style={{ background: "transparent", color: accent }}
        >
          {snippet.match}
        </mark>
      )}
      {snippet.after}
    </span>
  );
}

function AccentBar({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden
      className="absolute inset-y-2 left-1 w-1 rounded-full"
      style={{ background: accent }}
    />
  );
}

function ViewButton({
  active, onClick, label, icon: Icon,
}: { active: boolean; onClick: () => void; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function TagNotesPanel({ notes, tagName, accent, onAdd }: Props) {
  const [view, setView] = useState<View>("list");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as View | null;
      if (saved && ["list", "gallery", "kanban", "date"].includes(saved)) setView(saved);
    } catch { /* noop */ }
  }, []);

  const setAndStore = (v: View) => {
    setView(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* noop */ }
  };

  const enriched = useMemo(
    () => notes
      .slice()
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .map(n => ({ note: n, snippet: extractTagContext(n.body || "", tagName) })),
    [notes, tagName],
  );

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> Notes
          <span className="text-muted-foreground/60">· {notes.length}</span>
        </h2>
        <div className="ml-auto flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 p-0.5">
          <ViewButton active={view === "list"} onClick={() => setAndStore("list")} label="List" icon={LayoutList} />
          <ViewButton active={view === "gallery"} onClick={() => setAndStore("gallery")} label="Gallery" icon={LayoutGrid} />
          <ViewButton active={view === "kanban"} onClick={() => setAndStore("kanban")} label="Kanban" icon={Columns3} />
          <ViewButton active={view === "date"} onClick={() => setAndStore("date")} label="Date" icon={CalendarDays} />
        </div>
      </div>

      {enriched.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/30 px-4 py-6 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-card/60 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> No notes tagged yet — Add note
        </button>
      ) : view === "list" ? (
        <ListView items={enriched} accent={accent} />
      ) : view === "gallery" ? (
        <GalleryView items={enriched} accent={accent} />
      ) : view === "kanban" ? (
        <KanbanView items={enriched} accent={accent} />
      ) : (
        <DateView items={enriched} accent={accent} />
      )}
    </section>
  );
}

type Item = { note: Note; snippet: Snippet };

function ListView({ items, accent }: { items: Item[]; accent: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {items.map(({ note, snippet }) => (
        <Link
          key={note.id}
          to={`/notes/${note.id}`}
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-3 pl-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <AccentBar accent={accent} />
          <div className="flex items-baseline justify-between gap-2">
            <div className="truncate text-sm font-medium">{noteTitle(note)}</div>
            <div className="shrink-0 text-[11px] text-muted-foreground">
              {format(parseISO(note.updatedAt), "MMM d")}
            </div>
          </div>
          <div className="mt-1 text-xs">
            <SnippetText snippet={snippet} accent={accent} clamp={2} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function GalleryView({ items, accent }: { items: Item[]; accent: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {items.map(({ note, snippet }) => (
        <Link
          key={note.id}
          to={`/notes/${note.id}`}
          className="group relative flex h-44 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <div
            className="h-10 w-full"
            style={{ background: `linear-gradient(135deg, ${accent}33, transparent)` }}
          />
          <div className="flex flex-1 flex-col gap-1.5 p-3">
            <div className="truncate text-sm font-medium">{noteTitle(note)}</div>
            <div className="flex-1 text-xs">
              <SnippetText snippet={snippet} accent={accent} clamp={4} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {format(parseISO(note.updatedAt), "MMM d")}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function KanbanView({ items, accent }: { items: Item[]; accent: string }) {
  const columns = useMemo(() => {
    const groups: Record<string, Item[]> = { Pinned: [], Daily: [], Notes: [] };
    for (const it of items) {
      if (it.note.pinned) groups.Pinned.push(it);
      else if (it.note.kind === "daily") groups.Daily.push(it);
      else groups.Notes.push(it);
    }
    return Object.entries(groups).filter(([, v]) => v.length > 0);
  }, [items]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map(([name, col]) => (
        <div key={name} className="w-64 shrink-0 space-y-2 rounded-2xl bg-muted/30 p-2">
          <div className="flex items-center justify-between px-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>{name}</span>
            <span className="text-muted-foreground/60">{col.length}</span>
          </div>
          <div className="space-y-2">
            {col.map(({ note, snippet }) => (
              <Link
                key={note.id}
                to={`/notes/${note.id}`}
                className="group relative block overflow-hidden rounded-xl border border-border/60 bg-card/80 p-2.5 pl-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <AccentBar accent={accent} />
                <div className="truncate text-xs font-medium">{noteTitle(note)}</div>
                <div className="mt-1 text-[11px]">
                  <SnippetText snippet={snippet} accent={accent} clamp={3} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DateView({ items, accent }: { items: Item[]; accent: string }) {
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const key = format(parseISO(it.note.updatedAt), "MMMM yyyy");
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <div className="space-y-4">
      {groups.map(([month, list]) => (
        <div key={month} className="space-y-2">
          <div className="sticky top-0 z-[1] -mx-1 bg-background/80 px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            {month} · {list.length}
          </div>
          <div className="space-y-1.5">
            {list.map(({ note, snippet }) => (
              <Link
                key={note.id}
                to={`/notes/${note.id}`}
                className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-3 pl-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <AccentBar accent={accent} />
                <div
                  className="flex shrink-0 flex-col items-center justify-center rounded-xl px-2.5 py-1.5"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {format(parseISO(note.updatedAt), "MMM")}
                  </span>
                  <span className="text-base font-semibold leading-none">
                    {format(parseISO(note.updatedAt), "d")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{noteTitle(note)}</div>
                  <div className="mt-0.5 text-xs">
                    <SnippetText snippet={snippet} accent={accent} clamp={2} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}