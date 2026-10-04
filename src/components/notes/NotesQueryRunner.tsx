/**
 * `NotesQueryRunner` — live notes query embedded in a note's `/query` block.
 *
 * Reads the notes table directly (no snapshot), so results stay current.
 * Filters: search text, note kind, and tag. Layouts: list and table.
 * Rows link to the note; nothing here edits note content.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, FileText, Pin } from "lucide-react";
import { listNotes, type Note, type NoteKind } from "@/lib/notes";
import { cn } from "@/lib/utils";

export type NotesQuerySort = "updated" | "created" | "title";
export const NOTES_QUERY_SORTS: NotesQuerySort[] = ["updated", "created", "title"];
export const NOTES_QUERY_SORT_LABEL: Record<NotesQuerySort, string> = {
  updated: "Recently updated",
  created: "Recently created",
  title: "Title",
};

export const NOTES_KINDS = ["any", "note", "daily", "weekly", "monthly"] as const;
export type NotesKindFilter = typeof NOTES_KINDS[number];
export const NOTES_KIND_LABEL: Record<NotesKindFilter, string> = {
  any: "All kinds", note: "Notes", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
};

export const NOTES_QUERY_COLUMNS = ["kind", "date", "tags", "updated"] as const;
export type NotesQueryColumn = typeof NOTES_QUERY_COLUMNS[number];
export const NOTES_QUERY_COLUMN_LABEL: Record<NotesQueryColumn, string> = {
  kind: "Kind", date: "Date", tags: "Tags", updated: "Updated",
};
export const DEFAULT_NOTES_QUERY_COLUMNS: NotesQueryColumn[] = ["kind", "updated"];

export interface NotesQueryFilters {
  search?: string;
  kind?: NotesKindFilter;
  tag?: string;
  /** Person id (and name) — matches person properties or a mention of the name. */
  personId?: string;
  personName?: string;
}

const KIND_BADGE: Record<NoteKind, string> = {
  note: "Note", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
};

export function NotesQueryRunner({
  filters,
  layout = "list",
  sort = "updated",
  limit = 25,
  columns = DEFAULT_NOTES_QUERY_COLUMNS,
  emptyLabel = "No notes match this query.",
  onCount,
  paginate = true,
}: {
  paginate?: boolean;
  filters: NotesQueryFilters;
  layout?: "list" | "table" | "board";
  sort?: NotesQuerySort;
  limit?: number;
  columns?: NotesQueryColumn[];
  emptyLabel?: string;
  onCount?: (n: number) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    let alive = true;
    listNotes()
      .then(n => { if (alive) setNotes(n); })
      .catch(() => { if (alive) setNotes([]); });
    // Refresh when notes change elsewhere (pin/title/archive events already broadcast).
    const onChange = () => { void listNotes().then(n => { if (alive) setNotes(n); }).catch(() => {}); };
    window.addEventListener("careflow:notes:pinned-changed", onChange);
    return () => { alive = false; window.removeEventListener("careflow:notes:pinned-changed", onChange); };
  }, []);

  const all = useMemo(() => {
    const search = (filters.search ?? "").trim().toLowerCase();
    const kind = filters.kind ?? "any";
    const tag = (filters.tag ?? "").trim().toLowerCase();
    const pid = filters.personId ?? "";
    const pname = (filters.personName ?? "").trim().toLowerCase();
    let list = notes.filter(n => {
      if (kind !== "any" && n.kind !== kind) return false;
      if (tag && !(n.tags ?? []).some(t => t.toLowerCase() === tag)) return false;
      if (pid) {
        const byProp = (n.properties ?? []).some(p => p.type === "person" && (p.value === pid || (Array.isArray(p.value) && p.value.includes(pid))));
        const byName = !!pname && `${n.title} ${n.body}`.toLowerCase().includes(pname);
        if (!byProp && !byName) return false;
      }
      if (search && !(`${n.title} ${n.body}`.toLowerCase().includes(search))) return false;
      return true;
    });
    const cmp = (a: Note, b: Note) => {
      switch (sort) {
        case "created": return b.createdAt.localeCompare(a.createdAt);
        case "title": return (a.title || "Untitled").localeCompare(b.title || "Untitled");
        default: return b.updatedAt.localeCompare(a.updatedAt);
      }
    };
    return list.slice().sort(cmp);
  }, [notes, filters.search, filters.kind, filters.tag, filters.personId, filters.personName, sort]);

  const pageSize = Math.max(1, limit);
  const pages = paginate ? Math.max(1, Math.ceil(all.length / pageSize)) : 1;
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [filters.search, filters.kind, filters.tag, filters.personId, sort, pageSize]);
  const cur = Math.min(page, pages - 1);
  const rows = all.slice(cur * pageSize, cur * pageSize + pageSize);

  const countRef = useRef(onCount);
  countRef.current = onCount;
  useEffect(() => { countRef.current?.(all.length); }, [all.length]);

  if (rows.length === 0) {
    return <p className="px-3 py-4 text-[12px] text-muted-foreground">{emptyLabel}</p>;
  }

  const pager = paginate && all.length > pageSize ? (
    <div className="flex items-center justify-between gap-2 border-t border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground">
      <span>{cur * pageSize + 1}–{Math.min(all.length, (cur + 1) * pageSize)} of {all.length}</span>
      <span className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={cur === 0}
          onClick={() => setPage(cur - 1)}
          className="rounded-md border border-border/60 p-1 hover:bg-muted disabled:opacity-40">
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span>Page {cur + 1} / {pages}</span>
        <button type="button" aria-label="Next page" disabled={cur >= pages - 1}
          onClick={() => setPage(cur + 1)}
          className="rounded-md border border-border/60 p-1 hover:bg-muted disabled:opacity-40">
          <ChevronRight className="h-3 w-3" />
        </button>
      </span>
    </div>
  ) : null;

  const has = (c: NotesQueryColumn) => columns.includes(c);

  const cellFor = (n: Note, c: NotesQueryColumn) => {
    switch (c) {
      case "kind":
        return (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {KIND_BADGE[n.kind]}
          </span>
        );
      case "date":
        return <span className="text-muted-foreground">{n.date ?? "—"}</span>;
      case "tags":
        return <span className="text-muted-foreground">{n.tags?.length ? n.tags.join(", ") : "—"}</span>;
      case "updated":
        return (
          <span className="text-muted-foreground">
            {format(new Date(n.updatedAt), "MMM d")}
          </span>
        );
      default:
        return null;
    }
  };

  const Title = ({ n }: { n: Note }) => (
    <Link
      to={`/notes/${n.id}`}
      className="flex min-w-0 items-center gap-2 hover:underline"
      onClick={e => e.stopPropagation()}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 truncate font-medium">{n.title || "Untitled"}</span>
      {n.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" aria-label="Pinned" />}
    </Link>
  );

  if (layout === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-1.5 text-left">Note</th>
              {columns.map(c => (
                <th key={c} scope="col" className="px-3 py-1.5 text-left">{NOTES_QUERY_COLUMN_LABEL[c]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map(n => (
              <tr key={n.id}>
                <td className="px-3 py-1.5"><Title n={n} /></td>
                {columns.map(c => (
                  <td key={c} className="px-3 py-1.5 text-[11px]">{cellFor(n, c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {pager}
      </div>
    );
  }

  return (
    <>
    <ul className="divide-y divide-border/30">
      {rows.map(n => (
        <li key={n.id} className={cn("flex flex-wrap items-center gap-2 px-3 py-1.5 text-[13px]")}>
          <Title n={n} />
          <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px]">
            {columns.map(c => <span key={c} className="min-w-0">{cellFor(n, c)}</span>)}
          </span>
        </li>
      ))}
    </ul>
    {pager}
    </>
  );
}
