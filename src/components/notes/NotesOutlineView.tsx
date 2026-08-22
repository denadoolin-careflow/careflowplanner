/**
 * Tana-style outline of the notes list.
 *
 * Every note is a node: expand it in place to see the outline living inside
 * the note (its headings and bullets) plus the tasks that share its tags, so
 * the whole workspace can be browsed without opening a single document.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, FileText, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { TagChip } from "@/components/tags/TagChip";
import type { Note } from "@/lib/notes";

const EXPAND_KEY = "careflow.notes.outline.expanded";

const loadExpanded = (): string[] => {
  try {
    const raw = localStorage.getItem(EXPAND_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

interface OutlineNode { text: string; depth: number }

/** Headings and bullets inside a note body become its child nodes. */
export function noteNodes(body: string): OutlineNode[] {
  const out: OutlineNode[] = [];
  for (const raw of (body ?? "").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const heading = /^(#{1,6})\s+(.*)$/.exec(line.trim());
    if (heading) { out.push({ text: heading[2], depth: heading[1].length - 1 }); continue; }
    const bullet = /^(\s*)[-*+]\s+(?:\[[ xX]\]\s+)?(.*)$/.exec(line);
    if (bullet) {
      out.push({ text: bullet[2].trim(), depth: Math.min(3, Math.floor(bullet[1].length / 2) + 1) });
    }
    if (out.length >= 40) break;
  }
  return out;
}

interface Props {
  notes: Note[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  /** Filter term — child nodes are narrowed to matches while searching. */
  term?: string;
}

export function NotesOutlineView({ notes, selectedId, onSelect, term = "" }: Props) {
  const { state } = useStore();
  const [expanded, setExpanded] = useState<string[]>(() => loadExpanded());

  useEffect(() => {
    try { localStorage.setItem(EXPAND_KEY, JSON.stringify(expanded)); } catch { /* noop */ }
  }, [expanded]);

  const toggle = (id: string) =>
    setExpanded(e => (e.includes(id) ? e.filter(x => x !== id) : [...e, id]));

  const tasksByTag = useMemo(() => {
    const m = new Map<string, { id: string; title: string; done: boolean }[]>();
    for (const t of state.tasks ?? []) {
      for (const tag of t.tags ?? []) {
        const k = tag.toLowerCase();
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push({ id: t.id, title: t.title, done: !!t.done });
      }
    }
    return m;
  }, [state.tasks]);

  const lc = term.trim().toLowerCase();

  return (
    <ul className="overflow-hidden rounded-2xl border border-border/60 bg-card/50">
      {notes.map(note => {
        const open = expanded.includes(note.id) || Boolean(lc);
        const nodes = noteNodes(note.body).filter(n => !lc || n.text.toLowerCase().includes(lc));
        const linked = (note.tags ?? [])
          .flatMap(t => tasksByTag.get(t.toLowerCase()) ?? [])
          .filter(t => !lc || t.title.toLowerCase().includes(lc))
          .slice(0, 8);
        const Chevron = open ? ChevronDown : ChevronRight;

        return (
          <li key={note.id} className="border-b border-border/40 last:border-b-0">
            <div
              className={cn(
                "group flex items-center gap-1.5 px-2 py-1.5",
                selectedId === note.id && "bg-primary/5",
              )}
            >
              <button
                type="button"
                onClick={() => toggle(note.id)}
                aria-expanded={open}
                aria-label={`${open ? "Collapse" : "Expand"} ${note.title || "Untitled"}`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Chevron className="h-3.5 w-3.5" />
              </button>
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              <button
                type="button"
                onClick={() => onSelect(note.id)}
                className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
              >
                {note.title || "Untitled"}
              </button>
              <div className="hidden shrink-0 items-center gap-1 sm:flex">
                {(note.tags ?? []).slice(0, 3).map(t => (
                  <TagChip key={t} name={t} size="xs" entityId={note.id} entityType="note" />
                ))}
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {nodes.length ? `${nodes.length} nodes` : ""}
              </span>
            </div>

            {open && (nodes.length > 0 || linked.length > 0) && (
              <div className="pb-1.5 pl-8 pr-2">
                {nodes.map((n, i) => (
                  <button
                    key={`${i}-${n.text}`}
                    type="button"
                    onClick={() => onSelect(note.id)}
                    style={{ paddingLeft: `${n.depth * 14}px` }}
                    className="flex w-full items-center gap-2 rounded-lg py-0.5 pr-2 text-left text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  >
                    <FileText className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{n.text}</span>
                  </button>
                ))}
                {linked.length > 0 && (
                  <div className="mt-1 space-y-0.5 border-l border-border/50 pl-2">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Hash className="h-2.5 w-2.5" /> Tagged tasks
                    </div>
                    {linked.map(t => (
                      <Link
                        key={t.id}
                        to={`/anytime?taskId=${t.id}`}
                        className="flex items-center gap-2 rounded-lg py-0.5 text-[12px] hover:bg-muted/50"
                      >
                        {t.done
                          ? <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                          : <Circle className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
                        <span className={cn("min-w-0 flex-1 truncate", t.done && "line-through opacity-60")}>{t.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
