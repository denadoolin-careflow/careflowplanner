/**
 * "Linked from" — every note or task that mentions this item, one click away.
 *
 * List or gallery view (device-local). Each item can be opened, or edited in
 * place: notes open in a side editor sheet, tasks in the quick editor.
 */
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, CheckSquare, Link2, ArrowUpRight, Clock, Pencil, LayoutGrid, List } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useBacklinks, type Backlink } from "@/lib/backlinks";
import type { EntityType } from "@/lib/note-links";
import { openTaskQuickEdit } from "@/lib/open-task-quick-edit";
import { NoteQuickEditSheet } from "@/components/notes/NoteQuickEditSheet";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, parseISO } from "date-fns";

const VIEW_KEY = "careflow:backlinks-view";
export type LinkedView = "list" | "gallery";
export function useLinkedView(): [LinkedView, (v: LinkedView) => void] {
  const [view, setView] = useState<LinkedView>(() => (typeof window !== "undefined" && localStorage.getItem(VIEW_KEY) === "gallery" ? "gallery" : "list"));
  return [view, (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } }];
}

export function LinkedViewToggle({ view, onChange }: { view: LinkedView; onChange: (v: LinkedView) => void }) {
  return (
    <div role="group" aria-label="Linked items view" className="ml-auto inline-flex rounded-full border border-border/60 p-0.5 normal-case tracking-normal">
      {(["list", "gallery"] as const).map(v => {
        const Icon = v === "list" ? List : LayoutGrid;
        return (
          <button key={v} type="button" aria-pressed={view === v} aria-label={v === "list" ? "List view" : "Gallery view"} onClick={() => onChange(v)}
            className={cn("grid h-7 w-7 place-items-center rounded-full", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

const ago = (iso?: string) => { if (!iso) return ""; try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); } catch { return ""; } };

export function BacklinksSection({ entityType, entityId, className, compact }: {
  entityType: EntityType;
  entityId: string | null;
  className?: string;
  compact?: boolean;
}) {
  const { links, loading, reload } = useBacklinks(entityType, entityId);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [view, setView] = useLinkedView();
  const [focusIdx, setFocusIdx] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  if (!entityId || loading || links.length === 0) return null;

  const move = (delta: number) => {
    const next = Math.min(links.length - 1, Math.max(0, focusIdx + delta));
    setFocusIdx(next);
    listRef.current?.querySelectorAll<HTMLElement>("[data-backlink-row]")[next]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
  };
  const edit = (l: Backlink) => l.sourceType === "task" ? openTaskQuickEdit(l.sourceId) : setEditNoteId(l.sourceId);

  const EditBtn = ({ l }: { l: Backlink }) => (
    <button type="button" onClick={() => edit(l)} aria-label={`Edit ${l.title}`}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );

  const rowCls = "group/backlink flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/60 focus:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

  const opener = (l: Backlink, i: number, cls: string, children: React.ReactNode) => l.sourceType === "task" ? (
    <button type="button" data-backlink-row tabIndex={i === focusIdx ? 0 : -1} onFocus={() => setFocusIdx(i)} onClick={() => openTaskQuickEdit(l.sourceId)} aria-label={`Open task ${l.title}`} className={cls}>{children}</button>
  ) : (
    <Link to={l.route} data-backlink-row tabIndex={i === focusIdx ? 0 : -1} onFocus={() => setFocusIdx(i)} aria-label={`Open note ${l.title}`} className={cls}>{children}</Link>
  );

  return (
    <section className={cn("rounded-2xl border border-border/60 bg-card/40 p-3", className)} aria-label="Linked from">
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" aria-hidden />
        Linked from
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal">
          {links.length} mention{links.length === 1 ? "" : "s"}
        </span>
        <LinkedViewToggle view={view} onChange={setView} />
      </h3>
      {view === "gallery" ? (
        <ul ref={listRef} className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list" onKeyDown={onKeyDown}>
          {links.map((l, i) => {
            const Icon = l.sourceType === "note" ? FileText : CheckSquare;
            return (
              <li key={`${l.sourceType}:${l.sourceId}`} className="relative flex min-h-[124px] flex-col rounded-xl border border-border/60 bg-background/60 transition hover:border-primary/40">
                {opener(l, i, "flex flex-1 flex-col gap-1.5 rounded-xl p-3 pr-11 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", <>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" />{l.kindLabel ?? (l.sourceType === "note" ? "Note" : "Task")}</span>
                  <span className="line-clamp-2 font-display text-sm font-semibold leading-snug">{l.title}</span>
                  <span className="line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">{l.preview || l.snippet || "No additional context."}</span>
                  {l.updatedAt && <span className="mt-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{ago(l.updatedAt)}</span>}
                </>)}
                <div className="absolute right-1 top-1"><EditBtn l={l} /></div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul ref={listRef} className="space-y-1" role="list" onKeyDown={onKeyDown}>
          {links.map((l, i) => {
            const Icon = l.sourceType === "note" ? FileText : CheckSquare;
            return (
              <li key={`${l.sourceType}:${l.sourceId}`} className="flex items-start gap-1">
                <HoverCard openDelay={220} closeDelay={80}>
                  <HoverCardTrigger asChild>
                    {opener(l, i, rowCls, <>
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{l.title}</span>
                        {!compact && l.snippet && <span className="block truncate text-[11px] text-muted-foreground">{l.snippet}</span>}
                      </span>
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/backlink:opacity-100" aria-hidden />
                    </>)}
                  </HoverCardTrigger>
                  <HoverCardContent align="start" side="right" className="w-80 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{l.kindLabel ?? (l.sourceType === "note" ? "Note" : "Task")}</span>
                      {l.updatedAt && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" aria-hidden />{ago(l.updatedAt)}</span>}
                    </div>
                    <p className="text-sm font-medium leading-snug">{l.title}</p>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{l.preview || l.snippet || "No additional context."}</p>
                  </HoverCardContent>
                </HoverCard>
                <EditBtn l={l} />
              </li>
            );
          })}
        </ul>
      )}
      <NoteQuickEditSheet noteId={editNoteId} onOpenChange={o => { if (!o) setEditNoteId(null); }} onSaved={() => void reload()} />
    </section>
  );
}
