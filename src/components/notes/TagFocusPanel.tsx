import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckSquare, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { TagChip } from "@/components/tags/TagChip";

/** Inline view of one tag: other notes and open tasks carrying it. */
export function TagFocusPanel({ tag, currentNoteId, onClose }: { tag: string; currentNoteId?: string; onClose: () => void }) {
  const { state } = useStore();
  const [notes, setNotes] = useState<{ id: string; title: string; updated_at: string }[] | null>(null);
  const lc = tag.toLowerCase();
  const tasks = (state.tasks ?? []).filter(t => !t.done && (t.tags ?? []).some(x => x.toLowerCase() === lc)).slice(0, 8);

  useEffect(() => {
    let alive = true;
    setNotes(null);
    void supabase.from("notes").select("id,title,updated_at").eq("archived", false)
      .contains("tags", [tag]).order("updated_at", { ascending: false }).limit(12)
      .then(({ data }) => { if (alive) setNotes((data ?? []).filter((n: any) => n.id !== currentNoteId) as any); });
    return () => { alive = false; };
  }, [tag, currentNoteId]);

  return (
    <section className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3" aria-label={`Tag ${tag}`}>
      <div className="mb-2 flex items-center gap-2">
        <TagChip name={tag} size="sm" />
        <Link to={`/tags/${encodeURIComponent(tag)}`} className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground">
          Open tag page <ArrowUpRight className="h-3 w-3" />
        </Link>
        <button type="button" onClick={onClose} className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close tag view">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
          {notes === null ? <p className="text-xs text-muted-foreground">Loading…</p> : notes.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">No other notes with this tag.</p>
          ) : (
            <ul className="space-y-0.5">
              {notes.map(n => (
                <li key={n.id}>
                  <Link to={`/notes/${n.id}`} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-muted">
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{n.title || "Untitled"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Open tasks</p>
          {tasks.length === 0 ? <p className="text-xs italic text-muted-foreground">No open tasks with this tag.</p> : (
            <ul className="space-y-0.5">
              {tasks.map(t => (
                <li key={t.id}>
                  <button type="button" onClick={() => openTaskEditor(t.id)} className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs hover:bg-muted">
                    <CheckSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
