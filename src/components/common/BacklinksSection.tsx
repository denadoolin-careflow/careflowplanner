/** "Linked from" — every note or task that mentions this item, one click away. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, CheckSquare, Link2, ArrowUpRight } from "lucide-react";
import { useBacklinks, type Backlink } from "@/lib/backlinks";
import { useStore } from "@/lib/store";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import type { EntityType } from "@/lib/note-links";
import { cn } from "@/lib/utils";

export function BacklinksSection({ entityType, entityId, className, compact }: {
  entityType: EntityType;
  entityId: string | null;
  className?: string;
  compact?: boolean;
}) {
  const { links, loading } = useBacklinks(entityType, entityId);
  const { state } = useStore() as any;
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = (state.tasks ?? []).find((t: any) => t.id === openTaskId) ?? null;

  if (!entityId || loading || links.length === 0) return null;

  const body = (l: Backlink) => {
    const Icon = l.sourceType === "note" ? FileText : CheckSquare;
    return (
      <>
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{l.title}</span>
          {!compact && l.snippet && (
            <span className="block truncate text-[11px] text-muted-foreground">{l.snippet}</span>
          )}
        </span>
        <ArrowUpRight
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/backlink:opacity-100 group-focus-visible/backlink:opacity-100"
          aria-hidden
        />
      </>
    );
  };

  const rowCls =
    "group/backlink flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <section className={cn("rounded-2xl border border-border/60 bg-card/40 p-3", className)} aria-label="Linked from">
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" aria-hidden />
        Linked from
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal">
          {links.length} mention{links.length === 1 ? "" : "s"}
        </span>
      </h3>
      <ul className="space-y-1">
        {links.map(l => (
          <li key={`${l.sourceType}:${l.sourceId}`}>
            {l.sourceType === "task" ? (
              <button
                type="button"
                onClick={() => setOpenTaskId(l.sourceId)}
                aria-label={`Open task ${l.title}`}
                className={rowCls}
              >
                {body(l)}
              </button>
            ) : (
              <Link to={l.route} aria-label={`Open note ${l.title}`} className={rowCls}>
                {body(l)}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {openTask && (
        <TaskEditor
          task={openTask}
          open={!!openTask}
          onOpenChange={(o: boolean) => { if (!o) setOpenTaskId(null); }}
        />
      )}
    </section>
  );
}
