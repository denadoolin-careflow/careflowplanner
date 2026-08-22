/**
 * "Linked from" — every note or task that mentions this item, one click away.
 *
 * Each row previews its source on hover (tap on touch) and on keyboard focus,
 * so you can confirm the context before jumping. The list is a proper roving
 * tabstop: one Tab lands in it, arrows move, Enter/Space opens.
 */
import { Suspense, lazy, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, CheckSquare, Link2, ArrowUpRight, Clock } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useBacklinks, type Backlink } from "@/lib/backlinks";
import { useStore } from "@/lib/store";
// Lazy: TaskEditor renders this section itself, so a static import would be
// a circular module reference.
const TaskEditor = lazy(() =>
  import("@/components/tasks/TaskEditor").then(m => ({ default: m.TaskEditor })));
import type { EntityType } from "@/lib/note-links";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, parseISO } from "date-fns";

export function BacklinksSection({ entityType, entityId, className, compact }: {
  entityType: EntityType;
  entityId: string | null;
  className?: string;
  compact?: boolean;
}) {
  const { links, loading } = useBacklinks(entityType, entityId);
  const { state } = useStore() as any;
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const openTask = (state.tasks ?? []).find((t: any) => t.id === openTaskId) ?? null;

  if (!entityId || loading || links.length === 0) return null;

  const move = (delta: number) => {
    const next = Math.min(links.length - 1, Math.max(0, focusIdx + delta));
    setFocusIdx(next);
    const el = listRef.current?.querySelectorAll<HTMLElement>("[data-backlink-row]")[next];
    el?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Home") { e.preventDefault(); setFocusIdx(0); move(-links.length); }
    else if (e.key === "End") { e.preventDefault(); move(links.length); }
  };

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
    "group/backlink flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/60 focus:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <section className={cn("rounded-2xl border border-border/60 bg-card/40 p-3", className)} aria-label="Linked from">
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" aria-hidden />
        Linked from
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal">
          {links.length} mention{links.length === 1 ? "" : "s"}
        </span>
      </h3>
      <ul ref={listRef} className="space-y-1" role="list" onKeyDown={onKeyDown}>
        {links.map((l, i) => (
          <li key={`${l.sourceType}:${l.sourceId}`}>
            <HoverCard openDelay={220} closeDelay={80}>
              <HoverCardTrigger asChild>
                {l.sourceType === "task" ? (
                  <button
                    type="button"
                    data-backlink-row
                    tabIndex={i === focusIdx ? 0 : -1}
                    onFocus={() => setFocusIdx(i)}
                    onClick={() => setOpenTaskId(l.sourceId)}
                    aria-label={`Open task ${l.title}`}
                    className={rowCls}
                  >
                    {body(l)}
                  </button>
                ) : (
                  <Link
                    to={l.route}
                    data-backlink-row
                    tabIndex={i === focusIdx ? 0 : -1}
                    onFocus={() => setFocusIdx(i)}
                    aria-label={`Open note ${l.title}`}
                    className={rowCls}
                  >
                    {body(l)}
                  </Link>
                )}
              </HoverCardTrigger>
              <HoverCardContent align="start" side="right" className="w-80 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {l.kindLabel ?? (l.sourceType === "note" ? "Note" : "Task")}
                  </span>
                  {l.updatedAt && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden />
                      {(() => { try { return formatDistanceToNow(parseISO(l.updatedAt), { addSuffix: true }); } catch { return ""; } })()}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium leading-snug">{l.title}</p>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {l.preview || l.snippet || "No additional context."}
                </p>
              </HoverCardContent>
            </HoverCard>
          </li>
        ))}
      </ul>
      {openTask && (
        <Suspense fallback={null}>
          <TaskEditor
            task={openTask}
            open={!!openTask}
            onOpenChange={(o: boolean) => { if (!o) setOpenTaskId(null); }}
          />
        </Suspense>
      )}
    </section>
  );
}
