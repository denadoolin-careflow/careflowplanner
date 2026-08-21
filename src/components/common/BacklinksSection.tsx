/** "Linked from" — every note or task that mentions this item. */
import { Link } from "react-router-dom";
import { FileText, CheckSquare, Link2 } from "lucide-react";
import { useBacklinks } from "@/lib/backlinks";
import type { EntityType } from "@/lib/note-links";
import { cn } from "@/lib/utils";

export function BacklinksSection({ entityType, entityId, className, compact }: {
  entityType: EntityType;
  entityId: string | null;
  className?: string;
  compact?: boolean;
}) {
  const { links, loading } = useBacklinks(entityType, entityId);
  if (!entityId || loading || links.length === 0) return null;

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
        {links.map(l => {
          const Icon = l.sourceType === "note" ? FileText : CheckSquare;
          return (
            <li key={`${l.sourceType}:${l.sourceId}`}>
              <Link
                to={l.route}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-muted/60"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{l.title}</span>
                  {!compact && l.snippet && (
                    <span className="block truncate text-[11px] text-muted-foreground">{l.snippet}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
