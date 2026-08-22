/**
 * Dense table of notes — title, tags, kind, nodes, words, updated.
 * Column headers drive the shared sort state so the toolbar stays in sync.
 */
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagChip } from "@/components/tags/TagChip";
import { noteNodes } from "./NotesOutlineView";
import type { Note } from "@/lib/notes";

export type NotesSort = "updated" | "created" | "title" | "words";

interface Props {
  notes: Note[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  sort: NotesSort;
  onSortChange: (s: NotesSort) => void;
}

const COLS: { id: NotesSort | null; label: string; className?: string }[] = [
  { id: "title",   label: "Title" },
  { id: null,      label: "Tags",   className: "hidden md:table-cell" },
  { id: null,      label: "Kind",   className: "hidden sm:table-cell" },
  { id: null,      label: "Nodes",  className: "hidden lg:table-cell text-right" },
  { id: "words",   label: "Words",  className: "hidden sm:table-cell text-right" },
  { id: "updated", label: "Updated", className: "text-right" },
];

export function NotesTableView({ notes, selectedId, onSelect, sort, onSortChange }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/50">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            {COLS.map(c => (
              <th key={c.label} scope="col" className={cn("px-3 py-2 text-left font-medium", c.className)}>
                {c.id ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(c.id!)}
                    aria-label={`Sort by ${c.label}`}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {c.label}
                    {sort === c.id && (c.id === "title" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {notes.map(n => {
            const words = (n.body ?? "").trim() ? (n.body.trim().split(/\s+/).length) : 0;
            let updated = "";
            try { updated = format(parseISO(n.updatedAt), "MMM d"); } catch { /* noop */ }
            return (
              <tr
                key={n.id}
                onClick={() => onSelect(n.id)}
                className={cn(
                  "cursor-pointer border-b border-border/30 last:border-b-0 hover:bg-muted/40",
                  selectedId === n.id && "bg-primary/5",
                )}
              >
                <td className="max-w-[280px] truncate px-3 py-2">{n.title || "Untitled"}</td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(n.tags ?? []).slice(0, 3).map(t => (
                      <TagChip key={t} name={t} size="xs" entityId={n.id} entityType="note" />
                    ))}
                  </div>
                </td>
                <td className="hidden px-3 py-2 capitalize text-muted-foreground sm:table-cell">{n.kind ?? "note"}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground lg:table-cell">{noteNodes(n.body).length}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">{words}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{updated}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
